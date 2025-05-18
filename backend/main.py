import asyncio
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from exa_py import Exa
from openai import AsyncOpenAI
import json
from fastapi.middleware.cors import CORSMiddleware

EXA_API_KEY = "temp"
OPENAI_API_KEY = "temp"

app = FastAPI(title="News Analysis Backend - Exa")
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
exa_client = Exa(EXA_API_KEY)
openai_client = None
try:
    openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    print("OpenAI AsyncClient initialized.")
except Exception as e:
    print(f"CRITICAL: Failed to initialize OpenAI client: {e}")
    
class NewsQueryRequest(BaseModel):
    topic: str
    country: str

class AnalyzedArticleData(BaseModel):
    headline: str | None = None
    url: str
    source_domain: str | None = None
    full_text: str | None = None
    summary: str | None = "N/A"
    sentiment: str | None = "N/A"
    source_background: str | None = "N/A"

class NewsAnalysisResponse(BaseModel):
    status: str
    data: list[AnalyzedArticleData] | None = None
    error_message: str | None = None

async def analyze_article_with_openai(
    full_text: str | None,
    article_title: str | None,
    source_domain_name: str | None
) -> dict:
    if not openai_client:
        return {"error": "OpenAI client not initialized."}
    if not full_text and not source_domain_name:
         return {"summary": "N/A", "sentiment": "N/A", "source_background": "Insufficient data for analysis", "error": "Insufficient data"}

    model_name = "gpt-3.5-turbo"
    prompt_parts = ["Analyze the following news article and its source."]
    if article_title: prompt_parts.append(f"\nArticle Title: \"{article_title}\"")
    if source_domain_name: prompt_parts.append(f"\nSource Domain: \"{source_domain_name}\"")
    
    text_to_analyze = full_text[:12000] if full_text else ""
    if text_to_analyze:
        prompt_parts.append(f"\nArticle Text:\n\"\"\"\n{text_to_analyze}\n\"\"\"")
    
    prompt_parts.append(
        "\n\nPlease provide the following information in a single, valid JSON object with these exact keys and string values:\n"
        "1. \"summary\": A concise, neutral summary of the article (2-3 sentences). If article text is missing or insufficient, state that.\n"
        "2. \"sentiment\": The overall sentiment of the article (ONLY 'positive', 'negative', or 'neutral'). If article text is missing or insufficient, state 'N/A'.\n"
        "3. \"source_background\": A brief, neutral overview of the news organization '{source_domain_name}' (2-3 sentences on its founding, general reputation, or leanings, if widely known). If no source domain provided, state that."
        "\n\nRespond ONLY with the JSON object."
    )
    full_prompt = "\n".join(prompt_parts)

    analysis_result = {
        "summary": "N/A (LLM Error)", "sentiment": "N/A (LLM Error)",
        "source_background": "N/A (LLM Error)", "error": "LLM processing error"
    }

    try:
        chat_completion = await openai_client.chat.completions.create(
            messages=[{"role": "user", "content": full_prompt}],
            model=model_name,
            max_tokens=600, # increased slightly for safety
            temperature=0.2,
            response_format={"type": "json_object"}
        )

        if chat_completion.choices and chat_completion.choices[0].message and chat_completion.choices[0].message.content:
            response_text = chat_completion.choices[0].message.content.strip()
            try:
                parsed_json = json.loads(response_text)
                analysis_result["summary"] = parsed_json.get("summary", "OpenAI: Summary not in JSON.")
                analysis_result["sentiment"] = parsed_json.get("sentiment", "OpenAI: Sentiment not in JSON.")
                analysis_result["source_background"] = parsed_json.get("source_background", "OpenAI: Background not in JSON.")
                analysis_result.pop("error", None)
            except json.JSONDecodeError:
                print(f"OpenAI JSON Parse Error for '{article_title or source_domain_name}'. Response: {response_text}")
                analysis_result["error"] = "OpenAI returned malformed JSON."
                analysis_result["summary"] = response_text
        else:
            finish_reason = chat_completion.choices[0].finish_reason if chat_completion.choices else 'N/A'
            error_msg = f"OpenAI produced no content for '{article_title or source_domain_name}'. Finish reason: {finish_reason}"
            print(error_msg)
            analysis_result["error"] = error_msg
    except Exception as e:
        print(f"OpenAI API Error for '{article_title or source_domain_name}': {e}")
        analysis_result["error"] = f"OpenAI API Error: {str(e)}"
    return analysis_result

async def process_single_exa_result(exa_search_result_item) -> AnalyzedArticleData:
    url = exa_search_result_item.url
    headline = exa_search_result_item.title or "N/A"
    source_domain = "Unknown Source"
    if url:
        try:
            source_domain = url.split('/')[2].replace('www.', '')
        except IndexError:
            pass
    
    # print(f"Processing Exa result: {headline} from {source_domain} ({url})")
    full_text = None
    if not url:
        return AnalyzedArticleData(
            headline=headline, url="N/A", source_domain=source_domain,
            full_text="URL missing, content not retrieved.",
            summary="N/A", sentiment="N/A", source_background="N/A"
        )

    try:
        contents_response = await asyncio.to_thread(exa_client.get_contents, [exa_search_result_item.id])
        if contents_response.results and contents_response.results[0].text:
            full_text = contents_response.results[0].text
        else:
            full_text = exa_search_result_item.text # Fallback
            if not full_text and hasattr(exa_search_result_item, 'highlights'):
                 highlights = getattr(exa_search_result_item, 'highlights')
                 if isinstance(highlights, list): full_text = " ".join(highlights) if highlights else None
    except Exception as e:
        print(f"Exa get_contents Error for {url} (ID: {exa_search_result_item.id}): {e}")
        full_text = exa_search_result_item.text

    llm_analysis = await analyze_article_with_openai(full_text, headline, source_domain)

    return AnalyzedArticleData(
        headline=headline, url=url, source_domain=source_domain, full_text=full_text,
        summary=llm_analysis.get("summary"),
        sentiment=llm_analysis.get("sentiment"),
        source_background=llm_analysis.get("source_background")
    )

@app.post("/api/analyze-news/", response_model=NewsAnalysisResponse)
async def analyze_news_endpoint(request: NewsQueryRequest):
    print(f"Request: Topic='{request.topic}', Country='{request.country}'")
    exa_query = f"latest news {request.topic} {request.country}"
    
    processed_articles_data: list[AnalyzedArticleData] = []
    try:
        search_response = await asyncio.to_thread(
            exa_client.search, exa_query, num_results=3, type="neural"
        )

        if not search_response.results:
            msg = f"No Exa search results for: '{exa_query}'."
            print(msg)
            return NewsAnalysisResponse(status="error", error_message=msg)

        tasks = [process_single_exa_result(result) for result in search_response.results]
        results_from_gather = await asyncio.gather(*tasks, return_exceptions=True)
        
        for res in results_from_gather:
            if isinstance(res, Exception):
                print(f"Error processing an article: {res}")
            elif res:
                processed_articles_data.append(res)

    except Exception as e:
        print(f"Exa search or top-level processing error: {e}")
        return NewsAnalysisResponse(status="error", error_message=f"Request processing error: {str(e)}")

    if not processed_articles_data:
         msg = "No articles processed successfully."
         print(msg)
         return NewsAnalysisResponse(status="error", error_message=msg)

    print(f"\n--- OpenAI Full News Analysis for Topic: '{request.topic}', Country: '{request.country}' ---")
    for article in processed_articles_data:
        print(f"\nHeadline: {article.headline}\nURL: {article.url}\nSource: {article.source_domain}")
        print(f"Summary: {article.summary}\nSentiment: {article.sentiment}\nSource Background: {article.source_background}")
    print("--- End of OpenAI Full Analysis Report ---")
    
    return NewsAnalysisResponse(status="success", data=processed_articles_data)


# 1. pip install fastapi uvicorn openai exa-py python-dotenv
# 3. uvicorn main:app --reload