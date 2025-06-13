from sqlalchemy import Column, String, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timezone
from utils import normalize_model_name

Base = declarative_base()

class PriceData(Base):
    __tablename__ = 'price_data'

    id = Column(String, primary_key=True)
    normalized_id = Column(String, nullable=False, index=True)  # Normalized lowercase model name
    display_name = Column(String, nullable=False)  # Original model name
    provider = Column(String, nullable=False)
    input_price_per_1m = Column(Float, nullable=False)
    output_price_per_1m = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def __init__(self, model: str, provider: str, input_price_per_1m: float, output_price_per_1m: float):
        self.id = f"{model}_{datetime.now(timezone.utc).isoformat()}"
        # Replace spaces with underscores and handle + characters
        self.normalized_id = normalize_model_name(model)
        self.display_name = model.strip()
        self.provider = provider.strip()
        self.input_price_per_1m = input_price_per_1m
        self.output_price_per_1m = output_price_per_1m   