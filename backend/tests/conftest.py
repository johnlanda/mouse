"""Pytest configuration and fixtures."""

import os
import pytest
from unittest.mock import Mock
from fastapi.testclient import TestClient

os.environ["SQLALCHEMY_DATABASE_URL"] = "sqlite:///:memory:"
os.environ["OPENAI_API_KEY"] = "test-api-key-for-testing"

from main import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app=app)


@pytest.fixture
def mock_price_agent():
    """Mock PriceAgent for testing."""
    agent = Mock()
    agent.fetch_prices = Mock(return_value=[])
    return agent


@pytest.fixture
def sample_price_data():
    """Sample price data for testing."""
    return {
        "model": "GPT-4",
        "provider": "OpenAI",
        "input_price_per_1m": 30.0,
        "output_price_per_1m": 60.0
    }
