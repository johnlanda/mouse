"""Tests for data models."""

from models.price_data import PriceData


class TestPriceData:
    """Test cases for PriceData model."""
    
    def test_price_data_creation(self, sample_price_data):
        """Test creating a PriceData instance."""
        price = PriceData(
            model=sample_price_data["model"],
            provider=sample_price_data["provider"],
            input_price_per_1m=sample_price_data["input_price_per_1m"],
            output_price_per_1m=sample_price_data["output_price_per_1m"]
        )
        
        assert price.display_name == "GPT-4"
        assert price.provider == "OpenAI"
        assert price.input_price_per_1m == 30.0
        assert price.output_price_per_1m == 60.0
        assert price.normalized_id == "gpt-4"
    
    def test_model_name_normalization(self):
        """Test that model names are properly normalized."""
        test_cases = [
            ("GPT-4 Turbo+", "gpt-4_turbo_"),
            ("Claude 2.1", "claude_2.1"),
            ("  Llama 2 Chat  ", "llama_2_chat"),
            ("Model+Name", "model_name")
        ]
        
        for original, expected in test_cases:
            price = PriceData(
                model=original,
                provider="Test Provider",
                input_price_per_1m=10.0,
                output_price_per_1m=20.0
            )
            assert price.normalized_id == expected
    
    def test_provider_name_stripped(self):
        """Test that provider names are stripped of whitespace."""
        price = PriceData(
            model="Test Model",
            provider="  OpenAI  ",
            input_price_per_1m=10.0,
            output_price_per_1m=20.0
        )
        assert price.provider == "OpenAI"
    
    def test_display_name_stripped(self):
        """Test that display names are stripped of whitespace."""
        price = PriceData(
            model="  GPT-4  ",
            provider="OpenAI",
            input_price_per_1m=10.0,
            output_price_per_1m=20.0
        )
        assert price.display_name == "GPT-4"
    
    def test_id_generation(self):
        """Test that unique IDs are generated."""
        price1 = PriceData("GPT-4", "OpenAI", 30.0, 60.0)
        price2 = PriceData("GPT-4", "OpenAI", 30.0, 60.0)
        
        assert price1.id != price2.id
        assert price1.id.startswith("GPT-4_")
        assert price2.id.startswith("GPT-4_")
    
    def test_timestamp_default(self):
        """Test that timestamp is set by default."""
        price = PriceData("GPT-4", "OpenAI", 30.0, 60.0)
        assert hasattr(price, 'timestamp')
