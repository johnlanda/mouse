from typing import List, Dict
import json
import requests
import os
import re
from markdownify import markdownify
from smolagents import ToolCallingAgent, tool
from smolagents.models import OpenAIServerModel

from models.price_data import PriceData

class PriceAgent:
    def __init__(self):
        # Initialize the OpenAI model
        self.model = OpenAIServerModel(
            model_id="gpt-4o-mini",
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        # Create a single agent with both tools
        self.agent = ToolCallingAgent(
            model=self.model,
            tools=[self.get_provider_info, self.fetch_pricing_page],
            name="pricing_agent",
            description="Fetches and analyzes pricing information from AI model providers",
        )

    def fetch_prices(self) -> List[PriceData]:
        """Fetch and parse prices from all providers using the agent."""
        all_prices = []
        
        try:
            result = self.agent.run("""You are an expert at extracting pricing information and model metadata from AI model provider websites.
                Your task is to analyze the provided content and extract pricing information for each model.
                For each model, you should identify:
                1. The model name
                2. The provider name (the hosting provider where the pricing info came from -- e.g. "OpenAI", "AWS Bedrock", "Anthropic", etc.)
                3. The model origin if different from the provider name (e.g. "OpenAI" is the creator of "gpt-4", but the provider could be "AWS Bedrock" if that is where the model is hosted)
                4. The input price per 1M tokens (aka Mtok)
                5. The output price per 1M tokens (aka Mtok)
                
                If prices are given in different units (e.g., per 1K tokens), convert them to dollars per 1M tokens.
                Return the data in a structured JSON format.
                
                Example output format:
                {
                    "prices": [
                        {
                            "model": "gpt-4",
                            "provider": "openai",
                            "model_origin": "openai",
                            "input_price_per_1m": 30.0,
                            "output_price_per_1m": 60.0
                        }
                    ]
                }
                
                First, fetch the list of supported providers and their pricing pages from the get_provider_info tool.
                Then, for each provider and pricing page, use the fetch_pricing_pages tool to fetch the pricing data.
                Finally, analyze the pricing data and return the results in the structured JSON format.
                """)
            
            # Handle both dictionary and AgentText responses
            if isinstance(result, dict):
                prices = result.get("prices", [])
            else:
                # Try to parse the AgentText response as JSON
                try:
                    # Remove escaped newlines and parse
                    cleaned_result = str(result).replace('\\n', '').replace('\\', '')
                    parsed_result = json.loads(cleaned_result)
                    prices = parsed_result.get("prices", [])
                except json.JSONDecodeError as e:
                    print(f"Could not parse agent response as JSON: {str(e)}")
                    print(f"Raw response: {result}")
                    return all_prices
            
            if not isinstance(prices, list):
                print(f"Expected 'prices' to be a list, got {type(prices)}")
                return all_prices
            
            # Convert to PriceData objects
            for price_info in prices:
                try:
                    price = PriceData(
                        model=price_info.get("model"),
                        provider=price_info.get("provider"),
                        input_price_per_1m=price_info.get("input_price_per_1m"),
                        output_price_per_1m=price_info.get("output_price_per_1m"),
                    )
                    all_prices.append(price)
                except Exception as e:
                    print(f"Error creating PriceData object: {str(e)}")
                    print(f"Price info: {price_info}")

        except Exception as e:
            print(f"Error in fetch_prices: {str(e)}")

        return all_prices

    @tool
    def get_provider_info() -> Dict[str, str]:
        """Returns information about known AI model providers and their pricing pages.

        Args:
            None

        Returns:
            A dictionary where keys are provider names and values are their pricing page URLs.
            Example:
            {
                "OpenAI": "https://platform.openai.com/docs/pricing",
                "AWS Bedrock": "https://aws.amazon.com/bedrock/pricing/",
                "Anthropic": "https://www.anthropic.com/pricing"
            }
        """
        provider_info = {
            # TODO: Cloudflare prevents simple scraping of OpenAI Pricing
            # "OpenAI": "https://platform.openai.com/docs/pricing",
            # TODO: AWS puts prices in a table element that is not easily scraped
            #"AWS Bedrock": "https://aws.amazon.com/bedrock/pricing/",
            "Anthropic": "https://www.anthropic.com/pricing",
            "Cohere": "https://cohere.com/pricing"
        }

        print(f"Getting provider info: {provider_info}\n")

        return provider_info

    @tool
    def fetch_pricing_page(provider_name: str, provider_pricing_url: str) -> str:
        """Fetches pricing page from a provider and converts it to markdown.

        Args:
            provider_name: The name of the provider
            provider_pricing_url: The URL of the provider's model pricing page

        Returns:
            The markdown content of the pricing page.
            If a page cannot be fetched, the value will be an error message.
        """
        result = {}
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        }
        
        try:
            print(f"Fetching pricing page for {provider_name} from {provider_pricing_url}")
            response = requests.get(provider_pricing_url, headers=headers)
            print(f"Response code: {response.status_code}")
            if response.status_code == 200:
                html_content = response.text
                # Convert HTML to markdown and clean up
                markdown_content = markdownify(html_content).strip()
                markdown_content = re.sub(r"\n{3,}", "\n\n", markdown_content)
                result = markdown_content
            else:
                result = f"Error: HTTP {response.status_code} when fetching {provider_name} pricing page"
                print(f"Error fetching {provider_name} pricing page: {response}")
        except requests.RequestException as e:
            result = f"Error fetching {provider_name} pricing page: {str(e)}"
        except Exception as e:
            result = f"Unexpected error with {provider_name} pricing page: {str(e)}"
        
        return result