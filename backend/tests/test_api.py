"""Tests for API endpoints."""

from unittest.mock import patch, Mock



class TestAPIEndpoints:
    """Test cases for API endpoints."""
    
    def test_root_endpoint(self, client):
        """Test the root endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        assert response.json() == {"message": "AI Model Pricing API"}
    
    def test_health_endpoint(self, client):
        """Test the health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "1.0.0"
        assert "database" in data
        assert "timestamp" in data
    
    def test_get_all_prices(self, client):
        """Test getting all current prices."""
        with patch('main.price_service.get_all_prices') as mock_get_prices:
            mock_get_prices.return_value = [{
                "model": "GPT-4",
                "provider": "OpenAI",
                "input_price_per_1m": 30.0,
                "output_price_per_1m": 60.0,
                "last_updated": "2024-01-01T00:00:00Z"
            }]
            
            response = client.get("/prices")
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["model"] == "GPT-4"
    
    def test_get_prices_by_provider(self, client):
        """Test getting prices by provider."""
        with patch('main.price_service.get_prices_by_provider') as mock_get_prices:
            mock_get_prices.return_value = [{
                "model": "GPT-4",
                "provider": "OpenAI",
                "input_price_per_1m": 30.0,
                "output_price_per_1m": 60.0,
                "last_updated": "2024-01-01T00:00:00Z"
            }]
            
            response = client.get("/prices/OpenAI")
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["provider"] == "OpenAI"
    
    def test_get_price_by_model_found(self, client):
        """Test getting price by model when model exists."""
        with patch('main.price_service.get_price_by_model') as mock_get_price:
            mock_get_price.return_value = [{
                "model": "GPT-4",
                "provider": "OpenAI",
                "input_price_per_1m": 30.0,
                "output_price_per_1m": 60.0,
                "last_updated": "2024-01-01T00:00:00Z"
            }]
            
            response = client.get("/prices/model/GPT-4")
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["model"] == "GPT-4"
    
    def test_get_price_by_model_not_found(self, client):
        """Test getting price by model when model doesn't exist."""
        with patch('main.price_service.get_price_by_model') as mock_get_price:
            mock_get_price.return_value = []
            
            response = client.get("/prices/model/NonExistentModel")
            assert response.status_code == 404
            assert response.json()["detail"] == "Model not found"
    
    def test_get_price_history(self, client):
        """Test getting price history."""
        with patch('main.price_service.get_price_history') as mock_get_history:
            mock_get_history.return_value = [{
                "model": "GPT-4",
                "provider": "OpenAI",
                "prices": [{
                    "input_price_per_1m": 30.0,
                    "output_price_per_1m": 60.0,
                    "timestamp": "2024-01-01T00:00:00Z"
                }],
                "time_range": {
                    "start": "2023-12-01T00:00:00Z",
                    "end": "2024-01-01T00:00:00Z"
                }
            }]
            
            response = client.get("/prices/history/GPT-4")
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["model"] == "GPT-4"
    
    def test_get_price_history_with_parameters(self, client):
        """Test getting price history with provider and days parameters."""
        with patch('main.price_service.get_price_history') as mock_get_history:
            mock_get_history.return_value = []
            
            response = client.get("/prices/history/GPT-4?provider=OpenAI&days=7")
            assert response.status_code == 200
            
            mock_get_history.assert_called_once_with("GPT-4", "OpenAI", 7)
    
    def test_refresh_prices(self, client):
        """Test the refresh prices endpoint."""
        with patch('main.price_service.refresh_prices') as mock_refresh:
            async def mock_async_refresh():
                return None
            mock_refresh.return_value = mock_async_refresh()
            
            response = client.post("/refresh")
            assert response.status_code == 200
            assert response.json() == {"message": "Prices refreshed successfully"}
    
    def test_get_all_models(self, client):
        """Test getting all models from database."""
        from database import get_db
        from main import app
        
        def mock_get_db():
            mock_db = Mock()
            mock_result = Mock()
            mock_result.normalized_id = "gpt-4"
            mock_result.display_name = "GPT-4"
            mock_result.provider = "OpenAI"
            mock_result.timestamp = "2024-01-01T00:00:00Z"
            
            mock_db.query.return_value.distinct.return_value.all.return_value = [mock_result]
            yield mock_db
        
        app.dependency_overrides[get_db] = mock_get_db
        
        try:
            response = client.get("/models")
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["display_name"] == "GPT-4"
            assert data[0]["normalized_id"] == "gpt-4"
            assert data[0]["provider"] == "OpenAI"
        finally:
            app.dependency_overrides.clear()
    
    def test_get_all_providers(self, client):
        """Test getting all providers from database."""
        from database import get_db
        from main import app
        
        def mock_get_db():
            mock_db = Mock()
            mock_db.query.return_value.group_by.return_value.all.return_value = [
                ("OpenAI", 3, "2024-01-01T00:00:00Z"),
                ("Anthropic", 2, "2024-01-01T00:00:00Z")
            ]
            yield mock_db
        
        app.dependency_overrides[get_db] = mock_get_db
        
        try:
            response = client.get("/providers")
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            
            provider_names = [p["name"] for p in data]
            assert "OpenAI" in provider_names
            assert "Anthropic" in provider_names
        finally:
            app.dependency_overrides.clear()
