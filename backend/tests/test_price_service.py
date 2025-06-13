"""Tests for PriceService."""

import pytest
from unittest.mock import patch, AsyncMock
from datetime import datetime, timezone

from services.price_service import PriceService
from models.price_data import PriceData


class TestPriceService:
    """Test cases for PriceService."""
    
    @pytest.fixture
    def mock_price_service(self, mock_price_agent):
        """Create a PriceService with mocked dependencies."""
        with patch('services.price_service.init_db'), \
             patch('services.price_service.asyncio.create_task'):
            service = PriceService()
            service.agent = mock_price_agent
            return service
    
    def test_update_cache(self, mock_price_service, sample_price_data):
        """Test cache update functionality."""
        price = PriceData(
            model=sample_price_data["model"],
            provider=sample_price_data["provider"],
            input_price_per_1m=sample_price_data["input_price_per_1m"],
            output_price_per_1m=sample_price_data["output_price_per_1m"]
        )
        
        mock_price_service._update_cache([price])
        
        assert len(mock_price_service.cache) == 1
        cached_price = mock_price_service.cache[price.normalized_id]
        assert cached_price["model"] == "GPT-4"
        assert cached_price["provider"] == "OpenAI"
        assert cached_price["input_price_per_1m"] == 30.0
        assert cached_price["output_price_per_1m"] == 60.0
    
    def test_get_all_prices(self, mock_price_service):
        """Test getting all prices from cache."""
        mock_price_service.cache["gpt-4"] = {
            "model": "GPT-4",
            "provider": "OpenAI",
            "input_price_per_1m": 30.0,
            "output_price_per_1m": 60.0,
            "last_updated": datetime.now(timezone.utc)
        }
        
        prices = mock_price_service.get_all_prices()
        assert len(prices) == 1
        assert prices[0]["model"] == "GPT-4"
    
    def test_get_prices_by_provider(self, mock_price_service):
        """Test filtering prices by provider."""
        mock_price_service.cache["gpt-4"] = {
            "model": "GPT-4",
            "provider": "OpenAI",
            "input_price_per_1m": 30.0,
            "output_price_per_1m": 60.0,
            "last_updated": datetime.now(timezone.utc)
        }
        mock_price_service.cache["claude-2"] = {
            "model": "Claude 2",
            "provider": "Anthropic",
            "input_price_per_1m": 25.0,
            "output_price_per_1m": 50.0,
            "last_updated": datetime.now(timezone.utc)
        }
        
        openai_prices = mock_price_service.get_prices_by_provider("OpenAI")
        assert len(openai_prices) == 1
        assert openai_prices[0]["provider"] == "OpenAI"
        
        anthropic_prices = mock_price_service.get_prices_by_provider("Anthropic")
        assert len(anthropic_prices) == 1
        assert anthropic_prices[0]["provider"] == "Anthropic"
    
    def test_get_prices_by_provider_case_insensitive(self, mock_price_service):
        """Test that provider filtering is case insensitive."""
        mock_price_service.cache["gpt-4"] = {
            "model": "GPT-4",
            "provider": "OpenAI",
            "input_price_per_1m": 30.0,
            "output_price_per_1m": 60.0,
            "last_updated": datetime.now(timezone.utc)
        }
        
        prices = mock_price_service.get_prices_by_provider("openai")
        assert len(prices) == 1
        assert prices[0]["provider"] == "OpenAI"
    
    def test_get_price_by_model(self, mock_price_service):
        """Test getting prices for a specific model."""
        mock_price_service.cache["gpt-4"] = {
            "model": "GPT-4",
            "provider": "OpenAI",
            "input_price_per_1m": 30.0,
            "output_price_per_1m": 60.0,
            "last_updated": datetime.now(timezone.utc)
        }
        
        prices = mock_price_service.get_price_by_model("GPT-4")
        assert len(prices) == 1
        assert prices[0]["model"] == "GPT-4"
        
        prices = mock_price_service.get_price_by_model("gpt-4")
        assert len(prices) == 1
    
    def test_get_price_by_model_with_special_characters(self, mock_price_service):
        """Test model lookup with special characters."""
        mock_price_service.cache["gpt-4_turbo_"] = {
            "model": "GPT-4 Turbo+",
            "provider": "OpenAI",
            "input_price_per_1m": 35.0,
            "output_price_per_1m": 70.0,
            "last_updated": datetime.now(timezone.utc)
        }
        
        prices = mock_price_service.get_price_by_model("GPT-4 Turbo+")
        assert len(prices) == 1
        assert prices[0]["model"] == "GPT-4 Turbo+"
    
    @pytest.mark.asyncio
    async def test_refresh_prices(self, mock_price_service, sample_price_data):
        """Test price refresh functionality."""
        test_price = PriceData(
            model=sample_price_data["model"],
            provider=sample_price_data["provider"],
            input_price_per_1m=sample_price_data["input_price_per_1m"],
            output_price_per_1m=sample_price_data["output_price_per_1m"]
        )
        mock_price_service.agent.fetch_prices.return_value = [test_price]
        
        with patch.object(mock_price_service, '_store_historical_prices', new_callable=AsyncMock):
            await mock_price_service.refresh_prices()
        
        assert len(mock_price_service.cache) == 1
        assert mock_price_service.agent.fetch_prices.called
