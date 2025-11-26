import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Product {
  id: number;
  name: string;
}

interface ForecastExplanation {
  summary: string;
  trend_direction: string;
  trend_percent: number;
  trend_confidence: string;
  comparison: string;
  historical_average: number;
  forecast: number;
  percent_change: number;
  confidence_level: string;
  confidence_score: number;
  confidence_reasons: string[];
  key_factors: string[];
  horizon_days: number;
  daily_rate: number;
  natural_language: string;
}

interface ForecastResult {
  forecast_id: number;
  product_id: number;
  product_name: string;
  forecast_date: string;
  forecast_period: string;
  predicted_quantity: number;
  actual_quantity: number | null;
  predicted_revenue: number | null;
  confidence_lower: number | null;
  confidence_upper: number | null;
  model_version: string | null;
  generated_at: string | null;
  explanation: ForecastExplanation | null;
}

interface DailyPrediction {
    date: string;
    product_id: string;
    predicted_quantity: number;
    predicted_revenue: number;
    confidence_lower: number | null;
    confidence_upper: number | null;
}

const API_BASE_URL = "http://127.0.0.1:8000/forecast";

const callForecastAPI = async (
    horizonDays: number, 
    productId: string | null, 
    isBatch: boolean
) => {
    const payload = {
        horizon_days: horizonDays,
        product_id: productId,
        is_batch: isBatch,
    };

    const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown API error' }));
        throw new Error(`API Error ${response.status}: ${errorData.detail || 'Failed to generate forecast.'}`);
    }

    const result = await response.json();
    
    const uniqueProductsForecasted = new Set(
        result.forecast_data.map((d: DailyPrediction) => d.product_id)
    ).size;

    return {
        success: true,
        productsForecasted: uniqueProductsForecasted,
        dailyPredictions: result.forecast_data.length,
        model_version: result.model_version,
    };
};

const ForecastingPage = () => {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") || "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };
  
  const [forecasts, setForecasts] = useState<ForecastResult[]>([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingForecast, setViewingForecast] = useState<ForecastResult | null>(null);
  const [chartProductId, setChartProductId] = useState<string>("");
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("30");
  const [activeTab, setActiveTab] = useState<"single" | "batch">("single");
  const [loading, setLoading] = useState(false);
  const [loadingForecasts, setLoadingForecasts] = useState(true);
  const { toast } = useToast();

  // Fetch historical sales data when product changes
  const fetchHistoricalData = async (productId: string) => {
    if (!productId) {
      setHistoricalData([]);
      return;
    }

    const { data, error } = await supabase
      .from("historical_data")
      .select("history_date, units_sold")
      .eq("product_id", Number(productId))
      .eq("period_type", "daily")
      .order("history_date", { ascending: true });

    if (data) {
      setHistoricalData(data);
    } else {
      setHistoricalData([]);
    }
  };

  // Fetch historical data when chart product changes
  useEffect(() => {
    if (chartProductId) {
      fetchHistoricalData(chartProductId);
    } else {
      setHistoricalData([]);
    }
  }, [chartProductId]);

  // Get forecasts for selected product
  const selectedProductForecasts = chartProductId
    ? forecasts.filter(f => f.product_id === Number(chartProductId))
    : [];
  
  const sortedForecasts = [...selectedProductForecasts].sort((a, b) => 
    new Date(a.forecast_date).getTime() - new Date(b.forecast_date).getTime()
  );

  // Prepare combined historical + forecast chart data
  const prepareChartData = () => {
    // Get last 14 days of historical data
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const recentHistory = historicalData
      .filter(h => new Date(h.history_date) >= fourteenDaysAgo)
      .map(h => ({
        date: h.history_date,
        actual: h.units_sold,
        predicted: null,
      }));

    // Get forecasts (future predictions)
    const forecastData = sortedForecasts.map(f => ({
      date: f.forecast_date,
      actual: null,
      predicted: f.predicted_quantity,
    }));

    // Combine and sort by date
    const combined = [...recentHistory, ...forecastData]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      labels: combined.map(d => new Date(d.date).toLocaleDateString()),
      actualValues: combined.map(d => d.actual),
      predictedValues: combined.map(d => d.predicted),
    };
  };

  const { labels: chartLabels, actualValues, predictedValues } = 
    chartProductId ? prepareChartData() : { labels: [], actualValues: [], predictedValues: [] };

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: "Historical Sales (Actual)",
        data: actualValues,
        borderColor: "#6366f1",
        backgroundColor: "rgba(99,102,241,0.1)",
        borderWidth: 2,
        pointRadius: 3,
        spanGaps: false,
        borderDash: [],
        tension: 0.2,
      },
      {
        label: "Forecast Sales (Predicted)",
        data: predictedValues,
        borderColor: "#f59e42",
        backgroundColor: "rgba(245,158,66,0.1)",
        borderWidth: 2,
        pointRadius: 3,
        spanGaps: false,
        borderDash: [8, 4],
        tension: 0.2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: "Historical vs Predicted Sales" },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        title: { display: true, text: 'Quantity (Units)' },
        beginAtZero: true,
      },
      x: {
        title: { display: true, text: 'Date' },
      },
    },
  };

  const fetchForecasts = async () => {
    setLoadingForecasts(true);
    const { data, error } = await supabase
      .from("forecasts")
      .select(
        `
        *,
        products ( product_name )
      `
      )
      .order("forecast_date", { ascending: false });

    if (data) {
      const mapped = data.map((f: any) => ({
        ...f,
        product_name: f.products?.product_name || "Unknown Product",
      }));
      setForecasts(mapped);
    }
    setLoadingForecasts(false);
  };

  useEffect(() => {
    const fetchProds = async () => {
      const { data } = await supabase
        .from("products")
        .select("product_id, product_name");
      if (data) {
        setProducts(
          data.map((p) => ({ id: p.product_id, name: p.product_name }))
        );
      }
    };
    fetchProds();
    fetchForecasts();
  }, []);

  const handleRunForecast = async () => {
    const horizonDays = Number(selectedPeriod);
    const isBatch = activeTab === "batch";
    const productId = isBatch ? null : selectedProductId;

    if (!isBatch && !productId) {
      toast({ title: "No product selected", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const result = await callForecastAPI(
        horizonDays,
        productId,
        isBatch
      );

      toast({
        title: "Forecast Complete!",
        description: `Generated ${result.dailyPredictions} daily predictions for ${result.productsForecasted} product(s). Final forecasts saved to database.`,
      });

      await fetchForecasts();
    } catch (error: any) {
      toast({
        title: "Error Generating Forecast",
        description: error.message,
        variant: "destructive",
        duration: 7000,
      });
    }

    setLoading(false);
  };

  const handleViewDetails = (forecast: ForecastResult) => {
    setViewingForecast(forecast);
    setViewDialogOpen(true);
  };

  return (
    <div className="relative min-h-screen bg-background py-8 px-4 sm:px-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight mb-1">Forecasting</h2>
        <p className="text-muted-foreground">
          Generate new sales and demand forecasts.
        </p>
      </div>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px] mb-4">
          <TabsTrigger value="generate">Generate Forecast</TabsTrigger>
          <TabsTrigger value="results">View Forecasts</TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Generate Form */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Generate New Forecast</CardTitle>
                  <CardDescription>
                    Select a forecast type and period. This may take a moment.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="period-select">Forecast Period</Label>
                    <Select
                      onValueChange={setSelectedPeriod}
                      value={selectedPeriod}
                      disabled={loading}
                    >
                      <SelectTrigger id="period-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 Days</SelectItem>
                        <SelectItem value="14">14 Days</SelectItem>
                        <SelectItem value="30">30 Days</SelectItem>
                        <SelectItem value="90">90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Tabs
                    defaultValue="single"
                    className="w-full"
                    onValueChange={(value) =>
                      setActiveTab(value as "single" | "batch")
                    }
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="single">Single Product</TabsTrigger>
                      <TabsTrigger value="batch">Batch (All Products)</TabsTrigger>
                    </TabsList>
                    <TabsContent value="single" className="pt-4">
                      <div className="space-y-1">
                        <Label htmlFor="product-select">Product</Label>
                        <Select
                          onValueChange={setSelectedProductId}
                          disabled={loading}
                          value={selectedProductId || ""}
                        >
                          <SelectTrigger id="product-select">
                            <SelectValue placeholder="Select a product..." />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id.toString()}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TabsContent>
                    <TabsContent value="batch" className="pt-4">
                      <CardDescription>
                        This will generate a {selectedPeriod}-day summary forecast
                        for all products in your catalog.
                      </CardDescription>
                    </TabsContent>
                  </Tabs>

                  <Button
                    onClick={handleRunForecast}
                    disabled={
                      loading || (activeTab === "single" && !selectedProductId)
                    }
                    className="w-full"
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {loading
                      ? "Generating Forecast..."
                      : activeTab === "single"
                      ? `Run ${selectedPeriod}-Day Forecast`
                      : `Run Batch Forecast`}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Quick Stats */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {/* Total Forecasts */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-primary">
                      {forecasts.length}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total Forecasts
                    </p>
                  </CardContent>
                </Card>

                {/* Most Forecasted Product */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm font-bold truncate">
                      {forecasts.length > 0
                        ? (() => {
                            const productCounts: Record<string, number> = {};
                            forecasts.forEach(f => {
                              productCounts[f.product_name] = (productCounts[f.product_name] || 0) + 1;
                            });
                            const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0];
                            return topProduct ? topProduct[0] : "N/A";
                          })()
                        : "N/A"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Most Forecasted
                    </p>
                  </CardContent>
                </Card>

                {/* Average Confidence */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-primary">
                      {forecasts.length > 0
                        ? (() => {
                            const withConfidence = forecasts.filter(f => f.explanation?.confidence_score);
                            if (withConfidence.length === 0) return "N/A";
                            const avg = withConfidence.reduce((sum, f) => sum + (f.explanation?.confidence_score || 0), 0) / withConfidence.length;
                            return `${Math.round(avg)}%`;
                          })()
                        : "N/A"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Avg Confidence
                    </p>
                  </CardContent>
                </Card>

                {/* Last Forecast */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm font-bold">
                      {forecasts.length > 0 && forecasts[0].generated_at
                        ? (() => {
                            const lastForecast = [...forecasts].sort((a, b) => {
                              const aDate = a.generated_at ? new Date(a.generated_at).getTime() : 0;
                              const bDate = b.generated_at ? new Date(b.generated_at).getTime() : 0;
                              return bDate - aDate;
                            })[0];
                            const now = new Date().getTime();
                            const forecastTime = new Date(lastForecast.generated_at!).getTime();
                            const diffMinutes = Math.floor((now - forecastTime) / (1000 * 60));
                            if (diffMinutes < 1) return "Just now";
                            if (diffMinutes < 60) return `${diffMinutes}m ago`;
                            const diffHours = Math.floor(diffMinutes / 60);
                            if (diffHours < 24) return `${diffHours}h ago`;
                            const diffDays = Math.floor(diffHours / 24);
                            return `${diffDays}d ago`;
                          })()
                        : "N/A"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last Generated
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Forecasts Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Forecasts</CardTitle>
                  <CardDescription>
                    Last 5 forecasts generated
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingForecasts ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span className="animate-pulse text-muted-foreground">
                        Loading...
                      </span>
                    </div>
                  ) : forecasts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No forecasts yet. Generate your first forecast above!
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead>Trend</TableHead>
                            <TableHead className="text-right">Predicted Qty</TableHead>
                            <TableHead className="text-center">Confidence</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...forecasts]
                            .sort((a, b) => {
                              const aDate = a.generated_at ? new Date(a.generated_at).getTime() : 0;
                              const bDate = b.generated_at ? new Date(b.generated_at).getTime() : 0;
                              return bDate - aDate;
                            })
                            .slice(0, 5)
                            .map((f) => (
                              <TableRow key={f.forecast_id}>
                                <TableCell className="font-medium">
                                  {f.product_name}
                                </TableCell>
                                <TableCell>{f.forecast_period}</TableCell>
                                <TableCell>
                                  {f.explanation?.trend_direction === 'GROWING' && (
                                    <Badge variant="default" className="gap-1 bg-green-600">
                                      <TrendingUp className="h-3 w-3" />
                                      Growing
                                    </Badge>
                                  )}
                                  {f.explanation?.trend_direction === 'DECLINING' && (
                                    <Badge variant="destructive" className="gap-1">
                                      <TrendingDown className="h-3 w-3" />
                                      Declining
                                    </Badge>
                                  )}
                                  {f.explanation?.trend_direction === 'STABLE' && (
                                    <Badge variant="secondary" className="gap-1">
                                      <Minus className="h-3 w-3" />
                                      Stable
                                    </Badge>
                                  )}
                                  {!f.explanation && (
                                    <Badge variant="outline">N/A</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {f.predicted_quantity}
                                </TableCell>
                                <TableCell className="text-center">
                                  {f.explanation?.confidence_level ? (
                                    <Badge 
                                      variant={
                                        f.explanation.confidence_level === 'HIGH' ? 'default' :
                                        f.explanation.confidence_level === 'MEDIUM' ? 'secondary' :
                                        'outline'
                                      }
                                    >
                                      {f.explanation.confidence_level}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">N/A</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="results">
          <Card className="shadow-xl rounded-xl mb-8">
            <CardHeader>
              <CardTitle>Historical vs Predicted Sales</CardTitle>
              <CardDescription>
                View past 14 days of actual sales and future forecast predictions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 flex flex-col gap-4">
                <Label htmlFor="chart-product-select">Select Product</Label>
                <Select
                  onValueChange={setChartProductId}
                  value={chartProductId}
                >
                  <SelectTrigger id="chart-product-select">
                    <SelectValue placeholder="Select a product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {chartProductId && (historicalData.length > 0 || selectedProductForecasts.length > 0) ? (
                <Line data={chartData} options={chartOptions} height={180} />
              ) : chartProductId ? (
                <div className="text-muted-foreground py-8 text-center">
                  No data available for this product.
                </div>
              ) : (
                <div className="text-muted-foreground py-8 text-center">
                  Select a product to view its chart.
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="shadow-xl rounded-xl">
            <CardHeader>
              <CardTitle>Forecast Results</CardTitle>
              <CardDescription>
                A log of all generated forecasts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingForecasts ? (
                <div className="flex items-center justify-center py-8">
                  <span className="animate-pulse text-muted-foreground">
                    Loading results...
                  </span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* Total Forecasts Count */}
                  {!loadingForecasts && (
                    <div className="mb-2 text-sm font-semibold text-muted-foreground">
                      Total Forecasts: {forecasts.length}
                    </div>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Forecast Date</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Trend</TableHead>
                        <TableHead className="text-right">Predicted Qty</TableHead>
                        <TableHead className="text-right">Predicted Revenue</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {forecasts.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center py-4 text-muted-foreground"
                          >
                            No forecasts found. Run one from the "Generate" tab.
                          </TableCell>
                        </TableRow>
                      ) : (
                        [...forecasts]
                          .sort((a, b) => {
                            const aDate = a.generated_at ? new Date(a.generated_at).getTime() : 0;
                            const bDate = b.generated_at ? new Date(b.generated_at).getTime() : 0;
                            return bDate - aDate;
                          })
                          .map((f) => (
                            <TableRow key={f.forecast_id}>
                              <TableCell className="font-medium">
                                {f.product_name}
                              </TableCell>
                              <TableCell>
                                {new Date(f.forecast_date).toLocaleDateString()}
                              </TableCell>
                              <TableCell>{f.forecast_period}</TableCell>
                              <TableCell>
                                {f.explanation?.trend_direction === 'GROWING' && (
                                  <Badge variant="default" className="gap-1 bg-green-600">
                                    <TrendingUp className="h-3 w-3" />
                                    Growing
                                  </Badge>
                                )}
                                {f.explanation?.trend_direction === 'DECLINING' && (
                                  <Badge variant="destructive" className="gap-1">
                                    <TrendingDown className="h-3 w-3" />
                                    Declining
                                  </Badge>
                                )}
                                {f.explanation?.trend_direction === 'STABLE' && (
                                  <Badge variant="secondary" className="gap-1">
                                    <Minus className="h-3 w-3" />
                                    Stable
                                  </Badge>
                                )}
                                {!f.explanation && (
                                  <Badge variant="outline">N/A</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {f.predicted_quantity}
                              </TableCell>
                              <TableCell className="text-right">
                                ${f.predicted_revenue?.toFixed(2) ?? "0.00"}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDetails(f)}
                                >
                                  View Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Forecast Details</DialogTitle>
              <DialogDescription>
                Full details for the forecast generated on{" "}
                {viewingForecast
                  ? new Date(viewingForecast.forecast_date).toLocaleDateString()
                  : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product:</span>
                  <span className="font-medium">
                    {viewingForecast?.product_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model Version:</span>
                  <span className="font-medium">
                    {viewingForecast?.model_version || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Generated At:</span>
                  <span className="font-medium">
                    {viewingForecast
                      ? new Date(viewingForecast.generated_at!).toLocaleString()
                      : "N/A"}
                  </span>
                </div>
              </div>

              {viewingForecast?.explanation && (
                <div className="mt-6 p-4 bg-muted rounded-lg space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      Forecast Explanation
                      {viewingForecast.explanation.trend_direction === 'GROWING' && (
                        <Badge variant="default" className="gap-1 bg-green-600">
                          <TrendingUp className="h-3 w-3" />
                          Growing
                        </Badge>
                      )}
                      {viewingForecast.explanation.trend_direction === 'DECLINING' && (
                        <Badge variant="destructive" className="gap-1">
                          <TrendingDown className="h-3 w-3" />
                          Declining
                        </Badge>
                      )}
                      {viewingForecast.explanation.trend_direction === 'STABLE' && (
                        <Badge variant="secondary" className="gap-1">
                          <Minus className="h-3 w-3" />
                          Stable
                        </Badge>
                      )}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {viewingForecast.explanation.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Historical Average:</span>
                      <p className="font-medium">
                        {viewingForecast.explanation.historical_average} units
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Confidence:</span>
                      <p className="font-medium">
                        {viewingForecast.explanation.confidence_level} ({viewingForecast.explanation.confidence_score}/100)
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Daily Rate:</span>
                      <p className="font-medium">
                        {viewingForecast.explanation.daily_rate} units/day
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Change:</span>
                      <p className="font-medium">
                        {viewingForecast.explanation.percent_change > 0 ? '+' : ''}
                        {viewingForecast.explanation.percent_change.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-sm text-muted-foreground">Key Factors:</span>
                    <ul className="mt-2 space-y-1">
                      {viewingForecast.explanation.key_factors.map((factor, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-muted-foreground">•</span>
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {viewingForecast.explanation.confidence_reasons && viewingForecast.explanation.confidence_reasons.length > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground">Confidence Factors:</span>
                      <ul className="mt-2 space-y-1">
                        {viewingForecast.explanation.confidence_reasons.map((reason, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-3 border-t">
                    <p className="text-sm leading-relaxed">
                      {viewingForecast.explanation.natural_language}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setViewDialogOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Tabs>
    </div>
  );
};

export default ForecastingPage;