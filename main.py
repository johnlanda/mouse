from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from urllib.parse import unquote
from sqlalchemy.orm import Session

from services.price_service import PriceService
from models.price_data import PriceData
from database import SessionLocal

app = FastAPI(title="AI Model Pricing API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

price_service = PriceService()

class PriceResponse(BaseModel):
    model: str
    provider: str
    input_price_per_1m: float
    output_price_per_1m: float
    last_updated: datetime

class HistoricalPriceResponse(BaseModel):
    model: str
    provider: str
    prices: List[dict]
    time_range: dict

class ModelInfo(BaseModel):
    normalized_id: str
    display_name: str
    provider: str
    last_updated: datetime

@app.get("/")
async def root():
    return {"message": "AI Model Pricing API"}

@app.get("/models", response_model=List[ModelInfo])
async def get_all_models():
    """Get all known models with their normalized IDs and display names"""
    db = SessionLocal()
    try:
        # Get unique models from the database
        models = db.query(PriceData.normalized_id, PriceData.display_name, PriceData.provider, PriceData.timestamp).distinct().all()
        
        # Convert to ModelInfo objects
        return [{
            "normalized_id": model.normalized_id,
            "display_name": model.display_name,
            "provider": model.provider,
            "last_updated": model.timestamp
        } for model in models]
    finally:
        db.close()

@app.get("/prices", response_model=List[PriceResponse])
async def get_all_prices():
    """Get all current prices"""
    return price_service.get_all_prices()

@app.get("/prices/{provider}", response_model=List[PriceResponse])
async def get_prices_by_provider(provider: str):
    """Get prices for a specific provider"""
    return price_service.get_prices_by_provider(provider)

@app.get("/prices/model/{model_name}", response_model=List[PriceResponse])
async def get_price_by_model(model_name: str):
    """Get prices for a specific model from all providers"""
    prices = price_service.get_price_by_model(model_name)
    if not prices:
        raise HTTPException(status_code=404, detail="Model not found")
    return prices

@app.get("/prices/history/{model_name}", response_model=List[HistoricalPriceResponse])
async def get_price_history(model_name: str, provider: Optional[str] = None, days: Optional[int] = 30):
    """Get historical price data for a specific model, optionally filtered by provider"""
    # Decode the URL-encoded model name
    decoded_model_name = unquote(model_name)
    return price_service.get_price_history(decoded_model_name, provider, days)

@app.post("/refresh")
async def refresh_prices():
    """Force refresh of all pricing data"""
    await price_service.refresh_prices()
    return {"message": "Prices refreshed successfully"} 