export interface Provider {
  name: string;
  model_count: number;
}

export interface Price {
  model: string;
  provider: string;
  input_price_per_1m: number;
  output_price_per_1m: number;
  input_price_change?: number;
  output_price_change?: number;
  last_updated: string;
}

export interface Model {
  display_name: string;
  provider: string;
}

export interface HistoricalPrice {
  model: string;
  prices: Array<{
    timestamp: string;
    input_price_per_1m: number;
    output_price_per_1m: number;
  }>;
}

export const api = {
  async getProviders(): Promise<Provider[]> {
    return [
      { name: "OpenAI", model_count: 5 },
      { name: "AWS Bedrock", model_count: 3 },
      { name: "Anthropic", model_count: 2 },
    ];
  },

  async getModels(): Promise<Model[]> {
    return [
      { display_name: "GPT-4", provider: "OpenAI" },
      { display_name: "GPT-3.5-Turbo", provider: "OpenAI" },
      { display_name: "Claude-3-Opus", provider: "Anthropic" },
      { display_name: "Claude-3-Sonnet", provider: "Anthropic" },
      { display_name: "Titan Text G1", provider: "AWS Bedrock" },
    ];
  },

  async getPricesByProvider(provider: string): Promise<Price[]> {
    const mockPrices: Price[] = [
      {
        model: "GPT-4",
        provider: "OpenAI",
        input_price_per_1m: 30.0,
        output_price_per_1m: 60.0,
        input_price_change: -5.2,
        output_price_change: 2.1,
        last_updated: new Date().toISOString(),
      },
      {
        model: "GPT-3.5-Turbo",
        provider: "OpenAI",
        input_price_per_1m: 1.5,
        output_price_per_1m: 2.0,
        input_price_change: 0,
        output_price_change: 0,
        last_updated: new Date().toISOString(),
      },
      {
        model: "Claude-3-Opus",
        provider: "Anthropic",
        input_price_per_1m: 15.0,
        output_price_per_1m: 75.0,
        input_price_change: 3.5,
        output_price_change: -1.8,
        last_updated: new Date().toISOString(),
      },
      {
        model: "Claude-3-Sonnet",
        provider: "Anthropic",
        input_price_per_1m: 3.0,
        output_price_per_1m: 15.0,
        last_updated: new Date().toISOString(),
      },
      {
        model: "Titan Text G1",
        provider: "AWS Bedrock",
        input_price_per_1m: 0.5,
        output_price_per_1m: 0.65,
        last_updated: new Date().toISOString(),
      },
    ];

    if (provider === 'all') {
      return mockPrices;
    }
    
    return mockPrices.filter(price => price.provider === provider);
  },

  async getPriceHistory(model: string, provider: string, days: number): Promise<HistoricalPrice> {
    const prices: Array<{
      timestamp: string;
      input_price_per_1m: number;
      output_price_per_1m: number;
    }> = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const baseInput = model === "GPT-4" ? 30.0 : model === "Claude-3-Opus" ? 15.0 : 1.5;
      const baseOutput = model === "GPT-4" ? 60.0 : model === "Claude-3-Opus" ? 75.0 : 2.0;
      
      const variation = (Math.random() - 0.5) * 0.1;
      
      prices.push({
        timestamp: date.toISOString(),
        input_price_per_1m: baseInput * (1 + variation),
        output_price_per_1m: baseOutput * (1 + variation),
      });
    }

    return {
      model,
      prices,
    };
  },

  async refreshPrices(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 1000));
  },
};
