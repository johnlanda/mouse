"""Tests for utility functions."""

from utils import normalize_model_name


class TestNormalizeModelName:
    """Test cases for normalize_model_name function."""
    
    def test_basic_normalization(self):
        """Test basic model name normalization."""
        assert normalize_model_name("GPT-4") == "gpt-4"
        assert normalize_model_name("Claude 2.1") == "claude_2.1"
    
    def test_spaces_replaced_with_underscores(self):
        """Test that spaces are replaced with underscores."""
        assert normalize_model_name("GPT 4 Turbo") == "gpt_4_turbo"
        assert normalize_model_name("Llama 2 Chat") == "llama_2_chat"
    
    def test_plus_signs_replaced_with_underscores(self):
        """Test that plus signs are replaced with underscores."""
        assert normalize_model_name("GPT-4 Turbo+") == "gpt-4_turbo_"
        assert normalize_model_name("Claude+") == "claude_"
    
    def test_whitespace_stripped(self):
        """Test that leading and trailing whitespace is stripped."""
        assert normalize_model_name("  GPT-4  ") == "gpt-4"
        assert normalize_model_name("\tClaude 2.1\n") == "claude_2.1"
    
    def test_empty_string(self):
        """Test handling of empty string."""
        assert normalize_model_name("") == ""
        assert normalize_model_name("   ") == ""
    
    def test_complex_model_names(self):
        """Test complex model names with multiple special characters."""
        assert normalize_model_name("GPT-4 Turbo+ (Preview)") == "gpt-4_turbo__(preview)"
        assert normalize_model_name("Llama 2 70B Chat+") == "llama_2_70b_chat_"
