import asyncio
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import cachetools
import logging

from models.price_data import PriceData
from services.price_agent import PriceAgent
from database import get_db, init_db

# Configure logging
logger = logging.getLogger(__name__)

class PriceService:
    def __init__(self):
        self.cache = cachetools.TTLCache(maxsize=100, ttl=1800)  # 30 minutes cache
        self.agent = PriceAgent()
        init_db()  # This will create the tables if they don't exist
        asyncio.create_task(self._periodic_refresh())

    async def _periodic_refresh(self):
        while True:
            await self.refresh_prices()
            await asyncio.sleep(1800)  # 30 minutes

    async def refresh_prices(self):
        """Refresh prices from all sources using the agent"""
        prices = self.agent.fetch_prices()
        self._update_cache(prices)
        await self._store_historical_prices(prices)

    def _update_cache(self, prices: List[PriceData]):
        """Update the cache with new prices"""
        for price in prices:
            self.cache[price.normalized_id] = {
                "model": price.display_name,
                "provider": price.provider,
                "input_price_per_1m": price.input_price_per_1m,
                "output_price_per_1m": price.output_price_per_1m,
                "last_updated": datetime.now(timezone.utc)
            }

    async def _store_historical_prices(self, prices: List[PriceData]):
        """Store historical price data in the database"""
        db = next(get_db())
        try:
            for price in prices:
                # Create a new PriceData instance with the current timestamp
                new_price = PriceData(
                    model=price.display_name,  # Use display_name for the model parameter
                    provider=price.provider,
                    input_price_per_1m=price.input_price_per_1m,
                    output_price_per_1m=price.output_price_per_1m
                )
                logger.info(f"Storing historical price for {new_price.display_name} (normalized: {new_price.normalized_id})")
                db.add(new_price)
            db.commit()
            logger.info("Successfully stored historical prices")
        except Exception as e:
            db.rollback()
            logger.error(f"Error storing historical prices: {str(e)}")
            raise
        finally:
            db.close()

    def get_all_prices(self) -> List[dict]:
        """Get all current prices from cache"""
        return list(self.cache.values())

    def get_prices_by_provider(self, provider: str) -> List[dict]:
        """Get prices for a specific provider"""
        return [price for price in self.cache.values() if price["provider"].lower() == provider.lower()]

    def get_price_by_model(self, model_name: str) -> List[dict]:
        """Get prices for a specific model from all providers"""
        # Normalize the model name by replacing spaces with underscores and handling + characters
        normalized_name = model_name.lower().strip().replace(' ', '_').replace('+', '_')
        
        # Get all prices from cache that match the normalized model name
        matching_prices = []
        for price in self.cache.values():
            if price["model"].lower().strip().replace(' ', '_').replace('+', '_') == normalized_name:
                matching_prices.append(price)
        
        return matching_prices

    def get_price_history(self, model_name: str, provider: Optional[str] = None, days: int = 30) -> List[dict]:
        """Get historical price data for a specific model, optionally filtered by provider"""
        db = next(get_db())
        try:
            end_date = datetime.now(timezone.utc)  # Use UTC time
            start_date = end_date - timedelta(days=days)
            
            # Normalize the model name by replacing spaces with underscores and handling + characters
            normalized_name = model_name.lower().strip().replace(' ', '_').replace('+', '_')
            
            # Get current prices from cache for this model
            current_prices = self.get_price_by_model(model_name)
            
            # If provider is specified, filter current prices
            if provider:
                current_prices = [p for p in current_prices if p["provider"].lower() == provider.lower()]
            
            # Get historical prices for each provider
            historical_data = []
            for current_price in current_prices:
                provider_name = current_price["provider"]
                
                logger.info(f"Searching for historical prices for model: {model_name} from provider: {provider_name}")
                logger.info(f"Normalized name: {normalized_name}")
                logger.info(f"Time range: {start_date} to {end_date}")
                
                # Query historical prices for this model and provider
                prices = db.query(PriceData).filter(
                    PriceData.normalized_id == normalized_name,
                    PriceData.provider == provider_name,
                    PriceData.timestamp >= start_date,
                    PriceData.timestamp <= end_date
                ).order_by(PriceData.timestamp).all()
                
                logger.info(f"Found {len(prices)} historical prices for {model_name} from {provider_name}")
                
                historical_data.append({
                    "model": model_name,
                    "provider": provider_name,
                    "prices": [{
                        "input_price_per_1m": price.input_price_per_1m,
                        "output_price_per_1m": price.output_price_per_1m,
                        "timestamp": price.timestamp.isoformat()
                    } for price in prices],
                    "time_range": {
                        "start": start_date.isoformat(),
                        "end": end_date.isoformat()
                    }
                })
            
            return historical_data
        except Exception as e:
            logger.error(f"Error fetching price history: {str(e)}")
            raise
        finally:
            db.close() 