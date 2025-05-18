from typing import Any
import httpx
from mcp.server.fastmcp import FastMCP
from exa_py import Exa
import json
from datetime import datetime
from collections import Counter, defaultdict
import re
import asyncio

# Create a FastMCP server instance
mcp = FastMCP("weather")

NWS_API_BASE = "https://api.weather.gov"
USER_AGENT = "weather-app/1.0"
EXA_API_KEY = "f1ee87a5-5db0-4884-a3d1-4d3915cb7471"

# Initialize Exa client
exa_client = Exa(api_key=EXA_API_KEY)

async def make_nws_request(url: str) -> dict[str, Any] | None:
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/geo+json"
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=30.0)
            response.raise_for_status()
            return response.json()
        except Exception:
            return None

def format_alert(feature: dict) -> str:
    props = feature["properties"]
    return f""" Event: {props.get('event', 'Unknown')} Area: {props.get('areaDesc', 'Unknown')} Severity: {props.get('severity', 'Unknown')} Description: {props.get('description', 'No description available')} Instructions: {props.get('instruction', 'No specific instructions provided')}"""

@mcp.tool()
async def get_alerts(state: str) -> str:
    """Get weather alerts for a US state."""

    url = f"{NWS_API_BASE}/alerts/active/area/{state}"
    data = await make_nws_request(url)

    if not data or "features" not in data:
        return "Unable to fetch alerts or no alerts found."
    if not data["features"]:
        return "No active alerts for this state."

    alerts = [format_alert(feature) for feature in data["features"]]
    return "\n---\n".join(alerts)

@mcp.tool()
async def get_forecast(latitude: float, longitude: float) -> str:
    """Get weather forecast for a location."""
    
    points_url = f"{NWS_API_BASE}/points/{latitude},{longitude}"
    points_data = await make_nws_request(points_url)

    if not points_data:
        return "Unable to fetch forecast data for this location."

    forecast_url = points_data["properties"]["forecast"]
    forecast_data = await make_nws_request(forecast_url)

    if not forecast_data:
        return "Unable to fetch detailed forecast."

    periods = forecast_data["properties"]["periods"]
    forecasts = []
    for period in periods[:5]:
        forecast = f"""{period['name']}: Temperature: {period['temperature']}°{period['temperatureUnit']} Wind: {period['windSpeed']} {period['windDirection']} Forecast: {period['detailedForecast']}"""
        forecasts.append(forecast)

    return "\n---\n".join(forecasts)

def analyze_sentiment(text):
    """Simple sentiment analysis based on keyword matching"""
    positive_words = ["success", "successful", "benefit", "positive", "progress", "improve", "advantage", 
                      "effective", "efficient", "breakthrough", "innovation", "achievement", "solution"]
    negative_words = ["failure", "problem", "challenge", "difficult", "controversy", "criticism", "risk", 
                      "concern", "issue", "inadequate", "ineffective", "insufficient", "obstacle"]
    
    text_lower = text.lower()
    
    pos_count = sum(1 for word in positive_words if word in text_lower)
    neg_count = sum(1 for word in negative_words if word in text_lower)
    
    # Calculate sentiment score
    if pos_count > neg_count * 2:
        return "Very Positive"
    elif pos_count > neg_count:
        return "Positive"
    elif neg_count > pos_count * 2:
        return "Very Negative"
    elif neg_count > pos_count:
        return "Negative"
    else:
        return "Neutral"

def create_ascii_chart(data_dict, title, max_bar_length=30):
    """Create a simple ASCII bar chart"""
    if not data_dict:
        return "No data available for chart"
    
    chart = f"\n{title}\n" + "-" * 50 + "\n"
    
    # Find the max value for scaling
    max_value = max(data_dict.values())
    
    # Sort the data
    sorted_data = sorted(data_dict.items(), key=lambda x: x[1], reverse=True)
    
    for label, value in sorted_data:
        # Calculate the bar length proportionally
        bar_length = int((value / max_value) * max_bar_length) if max_value > 0 else 0
        bar = "█" * bar_length
        chart += f"{label[:20]:<20} | {bar} {value}\n"
    
    return chart

def extract_dates(articles):
    """Extract and parse dates from articles"""
    dates = []
    for article in articles:
        if hasattr(article, 'published_date') and article.published_date:
            try:
                # Parse the date string
                date_obj = datetime.fromisoformat(article.published_date.replace('Z', '+00:00'))
                dates.append(date_obj)
            except (ValueError, TypeError):
                pass
    return dates

def find_common_entities(articles, entity_type="policies"):
    """Extract common entities from article texts"""
    if entity_type == "policies":
        # Regex patterns for policy detection
        patterns = [
            r"([A-Z][a-z]+([ -][A-Z][a-z]+)*) (Policy|Initiative|Plan|Strategy|Act|Agreement|Framework|Roadmap|Program)",
            r"([A-Z][a-z]+([ -][A-Z][a-z]+)*) (policy|initiative|plan|strategy|act|agreement|framework|roadmap|program)"
        ]
    elif entity_type == "countries":
        # List of common country names
        countries = ["United States", "USA", "China", "India", "Germany", "France", "UK", 
                    "United Kingdom", "Japan", "Canada", "Australia", "Brazil", "Russia", 
                    "European Union", "EU", "Mexico", "Italy", "Spain", "South Korea"]
        patterns = [f"\\b({country})\\b" for country in countries]
    else:
        return {}
    
    entities_counter = Counter()
    
    for article in articles:
        text = ""
        if hasattr(article, 'text') and article.text:
            text += article.text + " "
        if hasattr(article, 'title') and article.title:
            text += article.title + " "
            
        for pattern in patterns:
            matches = re.findall(pattern, text)
            if matches:
                for match in matches:
                    if isinstance(match, tuple):
                        entity = match[0]  # Extract the name part
                    else:
                        entity = match
                    entities_counter[entity] += 1
    
    # Return top entities
    return dict(entities_counter.most_common(8))

@mcp.tool()
async def analyze_climate_news(query: str, num_results: int = 7, start_year: int = 2025, advanced: bool = True) -> str:
    """
    Analyze news articles about climate policies based on a text prompt with advanced analytics.
    
    Args:
        query: A specific query about climate policies or environmental initiatives
        num_results: Number of results to return (1-10)
        start_year: The starting year for the search (default 2025)
        advanced: Whether to include advanced analytics (default True)
    
    Returns:
        Rich analysis of news articles with structured information, trends, and visualizations
    """
    try:
        # Build the schema for structured policy information
        schema = {
            "type": "object",
            "properties": {
                "country": {"type": "string"},
                "policy_name": {"type": "string"},
                "year": {"type": "integer"},
                "goals": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "key_measures": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "implementation_status": {"type": "string", "enum": ["Planned", "In Progress", "Implemented", "Modified", "Canceled"]},
                "reported_effectiveness": {"type": "string", "enum": ["Not Yet Assessed", "Low", "Moderate", "High", "Controversial"]}
            }
        }
        
        # Set the date string
        start_date = f"{start_year}-01-01T00:00:00.000Z"
        
        # Cap num_results between 1 and 10
        num_results = max(1, min(10, num_results))
        
        # Make the Exa API call
        result = exa_client.search_and_contents(
            query,
            type="auto",
            category="news",
            num_results=num_results,
            start_published_date=start_date,
            text={"max_characters": 500},
            summary={
                "query": "What are the main policies implemented?",
                "schema": schema
            }
        )
        
        if not hasattr(result, 'results') or not result.results:
            return "No relevant news articles found."
            
        # Perform asynchronous advanced analysis tasks
        analysis_tasks = []
        if advanced:
            # Run multiple concurrent analysis tasks for advanced features
            # These could be more sophisticated ML tasks in a real implementation
            analysis_tasks.append(asyncio.create_task(asyncio.sleep(0.1)))  # Placeholder for async task
        
        # Wait for all advanced analysis tasks to complete if needed
        if analysis_tasks:
            await asyncio.gather(*analysis_tasks)
        
        # Format the results
        formatted_results = []
        all_policies = []
        all_countries = set()
        goal_counter = Counter()
        measure_counter = Counter()
        sentiments = []
        
        for i, item in enumerate(result.results):
            article_info = f"## Article {i+1}: {item.title}\n"
            
            # Add prominent source link
            if hasattr(item, 'url') and item.url:
                article_info += f"🔗 **Source**: [{item.url}]({item.url})\n"
                
            if hasattr(item, 'published_date') and item.published_date:
                article_info += f"📅 **Published**: {item.published_date}\n\n"
            
            # Add text snippet
            if hasattr(item, 'text') and item.text:
                sentiment = analyze_sentiment(item.text)
                sentiments.append(sentiment)
                article_info += f"📰 **Excerpt**: {item.text}\n"
                article_info += f"🔍 **Sentiment**: {sentiment}\n\n"
            
            # Add structured summary if available
            if hasattr(item, 'summary') and item.summary:
                summary = item.summary
                article_info += "### Policy Analysis:\n"
                
                country = None
                if hasattr(summary, 'country') and summary.country:
                    country = summary.country
                    all_countries.add(country)
                    article_info += f"🌍 **Country**: {country}\n"
                    
                if hasattr(summary, 'policy_name') and summary.policy_name:
                    policy = summary.policy_name
                    all_policies.append(policy)
                    article_info += f"📘 **Policy**: {policy}\n"
                    
                if hasattr(summary, 'year') and summary.year:
                    article_info += f"📅 **Year**: {summary.year}\n"
                
                if hasattr(summary, 'implementation_status') and summary.implementation_status:
                    article_info += f"📊 **Status**: {summary.implementation_status}\n"
                    
                if hasattr(summary, 'reported_effectiveness') and summary.reported_effectiveness:
                    article_info += f"⭐ **Effectiveness**: {summary.reported_effectiveness}\n"
                
                if hasattr(summary, 'goals') and summary.goals:
                    article_info += "🎯 **Goals**:\n"
                    for goal in summary.goals:
                        article_info += f"- {goal}\n"
                        goal_counter[goal] += 1
                    
                if hasattr(summary, 'key_measures') and summary.key_measures:
                    article_info += "🔧 **Key Measures**:\n"
                    for measure in summary.key_measures:
                        article_info += f"- {measure}\n"
                        measure_counter[measure] += 1
            
            formatted_results.append(article_info)
        
        # Create advanced analytics section if enabled
        if advanced and len(result.results) > 1:
            analytics = "\n\n## 📊 Advanced Analytics\n\n"
            
            # Entity detection
            detected_policies = find_common_entities(result.results, "policies")
            if detected_policies:
                analytics += create_ascii_chart(detected_policies, "📊 Most Mentioned Policies") + "\n"
                
            detected_countries = find_common_entities(result.results, "countries")
            if detected_countries:
                analytics += create_ascii_chart(detected_countries, "🌎 Most Active Countries") + "\n"
            
            # Sentiment distribution
            if sentiments:
                sentiment_counts = Counter(sentiments)
                analytics += create_ascii_chart(dict(sentiment_counts), "😀 Sentiment Distribution") + "\n"
            
            # Top goals and measures
            if goal_counter:
                analytics += create_ascii_chart(dict(goal_counter.most_common(5)), "🎯 Top Policy Goals") + "\n"
                
            if measure_counter:
                analytics += create_ascii_chart(dict(measure_counter.most_common(5)), "🔧 Top Implementation Measures") + "\n"
            
            # Cross-article insights
            analytics += "\n### 🔮 Key Insights\n\n"
            
            # Add countries count
            if all_countries:
                analytics += f"- Analysis covers policies from {len(all_countries)} different countries\n"
            
            # Add policy count
            if all_policies:
                analytics += f"- Identified {len(all_policies)} distinct climate policies\n"
            
            # Add temporal analysis
            dates = extract_dates(result.results)
            if len(dates) >= 2:
                date_range = max(dates) - min(dates)
                analytics += f"- Coverage spans {date_range.days} days of climate policy development\n"
            
            # Add recommendation
            most_common_country = next(iter(detected_countries), None) if detected_countries else None
            most_common_policy = next(iter(detected_policies), None) if detected_policies else None
            
            if most_common_country and most_common_policy:
                analytics += f"- For in-depth understanding, focus research on {most_common_policy} in {most_common_country}\n"
            
            formatted_results.append(analytics)
        
        return "\n\n---\n\n".join(formatted_results)
    
    except Exception as e:
        return f"Error analyzing climate news: {str(e)}"


if __name__ == "__main__":
    # Initialize and run the server
    mcp.run(transport='stdio')