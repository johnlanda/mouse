"""Utility functions for the backend application."""

def normalize_model_name(model_name: str) -> str:
    """
    Normalize a model name for consistent lookups.
    
    Args:
        model_name: The original model name
        
    Returns:
        Normalized model name with spaces and special characters replaced
        
    Examples:
        >>> normalize_model_name("GPT-4 Turbo+")
        'gpt-4_turbo_'
        >>> normalize_model_name("Claude 2.1")
        'claude_2.1'
    """
    return model_name.lower().strip().replace(' ', '_').replace('+', '_')
