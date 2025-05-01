# AI Model Pricing API

A FastAPI service that provides up-to-date pricing information for various AI models from different providers.

## Features

- Real-time price updates from multiple AI model providers (Every 30 minutes)
- Historical price tracking
- Support for multiple providers offering the same model
- Normalized model names for consistent lookups
- RESTful API endpoints

## Project Structure

```
.
├── README.md
├── requirements.txt
├── main.py              # FastAPI application entry point
├── database.py          # Database configuration
├── models/
│   └── price_data.py    # SQLAlchemy model for price data
└── services/
    ├── price_service.py # Main service for managing prices
    └── price_agent.py   # AI agent for extracting prices
```

## Installation

1. Clone the repository

2. Install and setup Python 3.12 using pyenv:
```bash
# Install pyenv if you haven't already
brew install pyenv

# Configure shell for pyenv (~/.zshrc, ~/.bashrc, etc)
# # pyenv setup
#export PYENV_ROOT="$HOME/.pyenv"
#export PATH="$PYENV_ROOT/bin:$PATH"
#eval "$(pyenv init --path)"
#eval "$(pyenv init -)"
#eval "$(pyenv virtualenv-init -)"

# Install Python 3.12
pyenv install 3.12.3
pyenv virtualenv 3.12.3 venv
pyenv activate venv
```

4. Install PyTorch:
```bash
# For Apple Silicon (M1/M2/M3):
pip install torch torchvision torchaudio

# For CPU-only (if you don't have a GPU):
pip install torch torchvision torchaudio

# For CUDA 12.1 (if you have an NVIDIA GPU):
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

5. Install the remaining dependencies:
```bash
pip install -r requirements.txt
```

Note: The API uses the Mistral-7B-Instruct model for price extraction. Make sure you have sufficient GPU memory available if using CUDA.

## Development

### Managing Dependencies

To add a new dependency:
```bash
pip install <package-name>
pip freeze > requirements.txt
```

To update all dependencies:
```bash
pip install --upgrade -r requirements.txt
```

### Running the API

Start the API server:
```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Get All Models
```
GET /models
```
Returns a list of all known models with their normalized IDs and display names.

Example response:
```json
[
  {
    "normalized_id": "gpt-4",
    "display_name": "GPT-4",
    "provider": "OpenAI",
    "last_updated": "2024-03-20T12:00:00"
  }
]
```

### Get All Current Prices
```
GET /prices
```
Returns current prices for all models from all providers.

Example response:
```json
[
  {
    "model": "GPT-4",
    "provider": "OpenAI",
    "input_price_per_1m": 30.0,
    "output_price_per_1m": 60.0,
    "last_updated": "2024-03-20T12:00:00"
  }
]
```

### Get Prices by Provider
```
GET /prices/{provider}
```
Returns current prices for all models from a specific provider.

Example response:
```json
[
  {
    "model": "GPT-4",
    "provider": "OpenAI",
    "input_price_per_1m": 30.0,
    "output_price_per_1m": 60.0,
    "last_updated": "2024-03-20T12:00:00"
  }
]
```

### Get Prices by Model
```
GET /prices/model/{model_name}
```
Returns current prices for a specific model from all providers. The model name can include spaces and special characters, which will be automatically normalized.

Example response:
```json
[
  {
    "model": "GPT-4",
    "provider": "OpenAI",
    "input_price_per_1m": 30.0,
    "output_price_per_1m": 60.0,
    "last_updated": "2024-03-20T12:00:00"
  },
  {
    "model": "GPT-4",
    "provider": "AWS Bedrock",
    "input_price_per_1m": 35.0,
    "output_price_per_1m": 65.0,
    "last_updated": "2024-03-20T12:00:00"
  }
]
```

### Get Price History
```
GET /prices/history/{model_name}?provider={provider}&days={days}
```
Returns historical price data for a specific model. Optionally filter by provider and specify the number of days of history to retrieve.

Parameters:
- `provider` (optional): Filter results by provider name
- `days` (optional): Number of days of history to retrieve (default: 30)

Example response:
```json
[
  {
    "model": "GPT-4",
    "provider": "OpenAI",
    "prices": [
      {
        "input_price_per_1m": 30.0,
        "output_price_per_1m": 60.0,
        "timestamp": "2024-03-20T12:00:00"
      }
    ],
    "time_range": {
      "start": "2024-02-20T12:00:00",
      "end": "2024-03-20T12:00:00"
    }
  },
  {
    "model": "GPT-4",
    "provider": "AWS Bedrock",
    "prices": [
      {
        "input_price_per_1m": 35.0,
        "output_price_per_1m": 65.0,
        "timestamp": "2024-03-20T12:00:00"
      }
    ],
    "time_range": {
      "start": "2024-02-20T12:00:00",
      "end": "2024-03-20T12:00:00"
    }
  }
]
```

### Force Price Refresh
```
POST /refresh
```
Manually triggers a refresh of all pricing data.

## Model Name Normalization

The API automatically normalizes model names for consistent lookups:
- Spaces are replaced with underscores
- Special characters (like `+`) are replaced with underscores
- Names are converted to lowercase
- Leading and trailing whitespace is removed

For example:
- "GPT-4 Turbo+" becomes "gpt-4_turbo_"
- "Claude 2.1" becomes "claude_2.1"

The original display name is preserved in the `display_name` field, while the normalized version is used for lookups in the `normalized_id` field.

## How It Works

The API uses an AI agent powered by the gpt-4o-mini model to extract pricing information from provider websites. The agent:

1. Fetches the HTML content from each provider's pricing page
2. Analyzes the content to identify model names and prices
3. Normalizes prices to per 1M tokens
4. Returns structured data that's stored in the cache and database

This approach makes the system more resilient to website layout changes, as the AI agent can adapt to different page structures.

## Data Storage

The API uses SQLite to store historical price data. The database file is created automatically at `prices.db`.
