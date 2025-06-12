import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import { api } from '@/lib/api';
import type { Provider, Price, HistoricalPrice } from '@/lib/api';
import { Activity, TrendingUp, DollarSign, RefreshCw, TrendingDown, TrendingUp as TrendingUpIcon, GitCompare } from 'lucide-react';
import { ThemeToggle } from './ui/theme-toggle';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export function Dashboard({ theme, toggleTheme }: DashboardProps) {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [prices, setPrices] = useState<Price[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceType, setPriceType] = useState<'input' | 'output'>('input');

  // Fetch providers on mount
  useEffect(() => {
    async function fetchProviders() {
      try {
        const data = await api.getProviders();
        setProviders(data);
        // Keep 'all' as default selection
      } catch (err) {
        setError('Failed to fetch providers');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchProviders();
  }, []);

  // Fetch prices when provider changes
  useEffect(() => {
    if (!selectedProvider) return;

    async function fetchPricesAndHistory() {
      setLoading(true);
      try {
        if (selectedProvider === 'all') {
          // Fetch data for all providers
          const models = await api.getModels();
          
          // Fetch all prices
          const allPricesPromises = providers.map(provider => 
            api.getPricesByProvider(provider.name)
          );
          const allPricesData = await Promise.all(allPricesPromises);
          setPrices(allPricesData.flat());

          // Fetch historical data for all models
          const historicalPromises = models.map(model => 
            api.getPriceHistory(model.display_name, model.provider, 30)
          );
          
          const allHistorical = await Promise.all(historicalPromises);
          setHistoricalData(allHistorical.flat());
        } else {
          // Fetch data for specific provider
          const [pricesData, models] = await Promise.all([
            api.getPricesByProvider(selectedProvider),
            api.getModels()
          ]);
          
          setPrices(pricesData);

          // Fetch historical data for all models from this provider
          const providerModels = models.filter(m => m.provider === selectedProvider);
          const historicalPromises = providerModels.map(model => 
            api.getPriceHistory(model.display_name, selectedProvider, 30)
          );
          
          const allHistorical = await Promise.all(historicalPromises);
          setHistoricalData(allHistorical.flat());
        }
      } catch (err) {
        setError('Failed to fetch price data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchPricesAndHistory();
  }, [selectedProvider, providers]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.refreshPrices();
      // Refetch current data
      if (selectedProvider) {
        const pricesData = await api.getPricesByProvider(selectedProvider);
        setPrices(pricesData);
      }
    } catch (err) {
      console.error('Failed to refresh prices:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Transform historical data for the chart
  const getChartData = () => {
    if (historicalData.length === 0) return [];

    // Group all prices by timestamp
    const pricesByTime: { [key: string]: any } = {};
    
    historicalData.forEach(modelData => {
      modelData.prices.forEach(price => {
        const timestamp = format(new Date(price.timestamp), 'MMM dd');
        if (!pricesByTime[timestamp]) {
          pricesByTime[timestamp] = { date: timestamp };
        }
        // Only add the selected price type
        pricesByTime[timestamp][modelData.model] = priceType === 'input' 
          ? price.input_price_per_1m 
          : price.output_price_per_1m;
      });
    });

    return Object.values(pricesByTime).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  const chartData = getChartData();
  const chartColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Real-time pricing data across providers</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Prices
          </button>
        </div>
      </div>
        
        {/* Provider Selection */}
        <div className="mb-8">
          <Card className="border-muted">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">Select Provider</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="w-full md:w-[400px]">
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center justify-between w-full">
                      <span>All Providers</span>
                      <span className="text-muted-foreground text-sm ml-4">
                        {providers.reduce((acc, p) => acc + p.model_count, 0)} models
                      </span>
                    </div>
                  </SelectItem>
                  {providers.map((provider) => (
                    <SelectItem key={provider.name} value={provider.name}>
                      <div className="flex items-center justify-between w-full">
                        <span>{provider.name}</span>
                        <span className="text-muted-foreground text-sm ml-4">{provider.model_count} models</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading pricing data...</div>
          </div>
        )}
        
        {error && (
          <div className="text-center py-12">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {!loading && !error && selectedProvider && (
          <>
            {/* Price History Chart */}
            {chartData.length > 0 && (
              <div className="mb-8">
                <Card className="border-muted">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-primary" />
                          <CardTitle className="text-xl">Price History</CardTitle>
                        </div>
                        <CardDescription className="mt-1">
                          Last 30 days pricing trends {selectedProvider === 'all' ? 'across all providers' : `for ${selectedProvider}`}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={priceType} onValueChange={(value: 'input' | 'output') => setPriceType(value)}>
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="input">Input Price</SelectItem>
                            <SelectItem value="output">Output Price</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis 
                          dataKey="date" 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          label={{ 
                            value: 'Price per 1M tokens', 
                            angle: -90, 
                            position: 'insideLeft',
                            offset: 10,
                            style: { fill: 'hsl(var(--muted-foreground))' }
                          }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--popover))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                        />
                        <Legend 
                          wrapperStyle={{ fontSize: '12px' }}
                          iconType="line"
                        />
                        {Object.keys(chartData[0])
                          .filter(key => key !== 'date')
                          .map((key, index) => (
                            <Line
                              key={key}
                              type="monotone"
                              dataKey={key}
                              stroke={chartColors[index % chartColors.length]}
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 4 }}
                            />
                          ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Current Prices Grid */}
            <Card className="border-muted">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <CardTitle className="text-xl">Current Prices</CardTitle>
                    </div>
                    <CardDescription className="mt-1">
                      Price per 1M tokens {selectedProvider === 'all' ? 'across all providers' : `for ${selectedProvider}`}
                    </CardDescription>
                  </div>
                  <button
                    onClick={() => navigate('/compare')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
                  >
                    <GitCompare className="h-4 w-4" />
                    Compare Models
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {prices.map((price) => (
                    <Card key={price.model} className="bg-muted/50 border-muted">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium">{price.model}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Input</span>
                            <div className="flex items-center">
                              <div className="w-20 flex items-center justify-end mr-2">
                                {price.input_price_change !== undefined && price.input_price_change !== 0 && (
                                  <div className={`flex items-center gap-1 text-xs ${price.input_price_change < 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {price.input_price_change < 0 ? (
                                      <TrendingDown className="h-3 w-3" />
                                    ) : (
                                      <TrendingUpIcon className="h-3 w-3" />
                                    )}
                                    <span>{Math.abs(price.input_price_change).toFixed(2)}%</span>
                                  </div>
                                )}
                              </div>
                              <span className="font-mono font-medium w-16 text-right">${price.input_price_per_1m}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Output</span>
                            <div className="flex items-center">
                              <div className="w-20 flex items-center justify-end mr-2">
                                {price.output_price_change !== undefined && price.output_price_change !== 0 && (
                                  <div className={`flex items-center gap-1 text-xs ${price.output_price_change < 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {price.output_price_change < 0 ? (
                                      <TrendingDown className="h-3 w-3" />
                                    ) : (
                                      <TrendingUpIcon className="h-3 w-3" />
                                    )}
                                    <span>{Math.abs(price.output_price_change).toFixed(2)}%</span>
                                  </div>
                                )}
                              </div>
                              <span className="font-mono font-medium w-16 text-right">${price.output_price_per_1m}</span>
                            </div>
                          </div>
                          <div className="pt-2 border-t border-border">
                            <p className="text-xs text-muted-foreground">
                              Updated {format(new Date(price.last_updated), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
    </div>
  );
}