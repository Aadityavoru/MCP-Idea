from typing import Any
import httpx
from mcp.server.fastmcp import FastMCP
from exa_py import Exa
import json

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

@mcp.tool()
async def analyze_climate_news(query: str, num_results: int = 5, start_year: int = 2020) -> str:
    """
    Analyze news articles about climate policies based on a text prompt.
    
    Args:
        query: A specific query about climate policies or environmental initiatives
        num_results: Number of results to return (1-10)
        start_year: The starting year for the search (default 2020)
    
    Returns:
        Analysis of news articles with structured information about climate policies
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
                }
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
        
        # Format the results
        formatted_results = []
        
        for i, item in enumerate(result.results):
            article_info = f"## Article {i+1}: {item.title}\n"
            article_info += f"Source: {item.url}\n"
            article_info += f"Published: {item.published_date}\n\n"
            
            # Add text snippet
            if hasattr(item, 'text') and item.text:
                article_info += f"Excerpt: {item.text}\n\n"
            
            # Add structured summary if available
            if hasattr(item, 'summary') and item.summary:
                summary = item.summary
                article_info += "### Policy Analysis:\n"
                if hasattr(summary, 'country') and summary.country:
                    article_info += f"Country: {summary.country}\n"
                if hasattr(summary, 'policy_name') and summary.policy_name:
                    article_info += f"Policy: {summary.policy_name}\n"
                if hasattr(summary, 'year') and summary.year:
                    article_info += f"Year: {summary.year}\n"
                
                if hasattr(summary, 'goals') and summary.goals:
                    article_info += "Goals:\n"
                    for goal in summary.goals:
                        article_info += f"- {goal}\n"
                    
                if hasattr(summary, 'key_measures') and summary.key_measures:
                    article_info += "Key Measures:\n"
                    for measure in summary.key_measures:
                        article_info += f"- {measure}\n"
            
            formatted_results.append(article_info)
        
        return "\n\n---\n\n".join(formatted_results)
    
    except Exception as e:
        return f"Error analyzing climate news: {str(e)}"


if __name__ == "__main__":
    # Initialize and run the server
    mcp.run(transport='stdio')