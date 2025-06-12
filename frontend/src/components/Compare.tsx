import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, isWithinInterval } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { api } from '@/lib/api';
import type { Model, Price, HistoricalPrice } from '@/lib/api';
import { Check, GitCompare, X, ChevronLeft, TrendingDown, TrendingUp as TrendingUpIcon, Calendar } from 'lucide-react';
import { DateRangePicker } from './ui/date-range-picker';
import { useNavigate } from 'react-router-dom';

interface CompareProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export function Compare({ theme, toggleTheme }: CompareProps) {
  const navigate = useNavigate();
  const [models, setModels] = useState<Model[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComparison, setShowComparison] = useState(false);
  const [priceType, setPriceType] = useState<'input' | 'output'>('input');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Fetch models and prices on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const modelsData = await api.getModels();
        
        // Fetch all prices - try different approaches
        let pricesData: Price[] = [];
        try {
          // First try to get all providers and fetch their prices
          const providers = await api.getProviders();
          const pricePromises = providers.map(p => api.getPricesByProvider(p.name));
          const priceResults = await Promise.all(pricePromises);
          pricesData = priceResults.flat();
        } catch (err) {
          console.error('Failed to fetch prices by provider:', err);
        }
        setModels(modelsData);
        setPrices(pricesData);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Handle model selection
  const toggleModelSelection = (modelName: string) => {
    if (selectedModels.includes(modelName)) {
      setSelectedModels(selectedModels.filter(m => m !== modelName));
      setShowComparison(false);
    } else if (selectedModels.length < 2) {
      setSelectedModels([...selectedModels, modelName]);
    }
  };

  // Handle compare action
  const handleCompare = async () => {
    if (selectedModels.length !== 2) return;
    
    setLoading(true);
    try {
      const promises = selectedModels.map(modelName => {
        const model = models.find(m => m.display_name === modelName);
        if (model) {
          return api.getPriceHistory(model.display_name, model.provider, 30);
        }
        return null;
      });
      
      const results = await Promise.all(promises);
      setHistoricalData(results.filter(Boolean).flat() as HistoricalPrice[]);
      setShowComparison(true);
    } catch (err) {
      console.error('Failed to fetch historical data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Transform historical data for comparison chart with date filtering
  const getComparisonChartData = () => {
    if (historicalData.length === 0) return [];

    const pricesByTime: { [key: string]: any } = {};
    
    historicalData.forEach(modelData => {
      modelData.prices.forEach(price => {
        const priceDate = new Date(price.timestamp);
        
        // Filter by date range if specified
        if (dateRange?.from && dateRange?.to) {
          if (!isWithinInterval(priceDate, { start: dateRange.from, end: dateRange.to })) {
            return;
          }
        }
        
        const timestamp = format(priceDate, 'MMM dd');
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

  const chartData = getComparisonChartData();
  const selectedPrices = prices.filter(p => selectedModels.includes(p.model));

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Back to Dashboard */}
      <div className="mb-4">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
      </div>
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Compare Models</h1>
        <p className="text-muted-foreground mt-2">Select two models to compare their pricing</p>
      </div>

      {/* Selected Models Preview */}
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map((index) => {
            const model = selectedModels[index];
            const price = model ? prices.find(p => p.model === model) : null;
            
            return (
              <Card key={index} className={`border-2 ${model ? 'border-primary' : 'border-dashed border-muted'}`}>
                {model && price ? (
                  <>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{model}</CardTitle>
                        <button
                          onClick={() => toggleModelSelection(model)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <CardDescription>{price.provider}</CardDescription>
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
                  </>
                ) : (
                  <CardContent className="py-12">
                    <p className="text-center text-muted-foreground">
                      {index === 0 ? 'Select first model' : 'Select second model'}
                    </p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
        
        {selectedModels.length === 2 && (
          <div className="mt-4 text-center">
            <button
              onClick={handleCompare}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <GitCompare className="h-5 w-5" />
              Compare Selected Models
            </button>
          </div>
        )}
      </div>

      {/* Model Selection Grid */}
      {!showComparison && (
        <Card className="border-muted">
          <CardHeader>
            <CardTitle className="text-xl">Available Models</CardTitle>
            <CardDescription>Click to select models for comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {prices.map((price) => {
                const isSelected = selectedModels.includes(price.model);
                const isDisabled = !isSelected && selectedModels.length >= 2;
                
                return (
                  <Card
                    key={price.model}
                    className={`bg-muted/50 border-muted cursor-pointer transition-all ${
                      isSelected 
                        ? 'ring-2 ring-primary' 
                        : isDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => !isDisabled && toggleModelSelection(price.model)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-medium">{price.model}</CardTitle>
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                      </div>
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
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Chart */}
      {showComparison && chartData.length > 0 && (
        <Card className="border-muted">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Price Comparison</CardTitle>
                <CardDescription className="mt-1">
                  Price history for {selectedModels[0]} vs {selectedModels[1]}
                  {dateRange?.from && dateRange?.to && (
                    <span className="ml-2">
                      ({format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd')})
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <DateRangePicker
                    date={dateRange}
                    onDateChange={setDateRange}
                    placeholder="Select date range"
                  />
                </div>
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
                <Line
                  type="monotone"
                  dataKey={selectedModels[0]}
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  dot={false}
                  name={`${selectedModels[0]} (${priceType})`}
                />
                <Line
                  type="monotone"
                  dataKey={selectedModels[1]}
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={false}
                  name={`${selectedModels[1]} (${priceType})`}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}