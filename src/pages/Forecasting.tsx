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
import { Loader2 } from "lucide-react";
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

// Interface for products in the dropdown
interface Product {
  id: number;
  name: string;
}

// Interface for the results table and view dialog
interface ForecastResult {
  forecast_id: number;
  product_id: number;
  product_name: string; // From join
  forecast_date: string;
  forecast_period: string;
  predicted_quantity: number;
  actual_quantity: number | null;
  predicted_revenue: number | null;
  confidence_lower: number | null;
  confidence_upper: number | null;
  model_version: string | null;
  generated_at: string | null;
}

// Interface for the daily granular output from the FastAPI model
interface DailyPrediction {
    date: string;
    product_id: string; // Product IDs are strings in the model
    predicted_quantity: number;
    predicted_revenue: number;
    confidence_lower: number | null;
    confidence_upper: number | null;
}


// ============================================================
// CORRECTED: Call FastAPI (backend handles ALL database saves)
// ============================================================
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

    // FastAPI returns { message, forecast_data: List<DailyPrediction>, model_version }
    const result = await response.json();
    
    // ============================================================
    // REMOVED: Frontend no longer inserts to database!
    // The backend save_forecasts_to_database() already handles this.
    // It saves only the FINAL day per product to avoid duplicates.
    // ============================================================
    
    // Just return summary info
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


// ---
// The main page component
// ---
const ForecastingPage = () => {
  // --- Dark/Light Mode State & Handler ---
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

  // Chart state for selected product
  const [chartProductId, setChartProductId] = useState<string>("");
  
  // Chart data for selected product
  const selectedProductForecasts = chartProductId
    ? forecasts.filter(f => f.product_id === Number(chartProductId))
    : [];
  
  // Sort by forecast_date ascending
  const sortedForecasts = [...selectedProductForecasts].sort((a, b) => 
    new Date(a.forecast_date).getTime() - new Date(b.forecast_date).getTime()
  );
  
  const chartLabels = sortedForecasts.map(f => f.forecast_date);
  const actualSales = sortedForecasts.map(f => f.actual_quantity ?? null);
  const predictedSales = sortedForecasts.map(f => f.predicted_quantity);

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: "Actual Sales",
        data: actualSales,
        borderColor: "#6366f1",
        backgroundColor: "rgba(99,102,241,0.1)",
        borderWidth: 2,
        pointRadius: 3,
        spanGaps: false,
        borderDash: [], // solid
      },
      {
        label: "Predicted Sales",
        data: predictedSales,
        borderColor: "#f59e42",
        backgroundColor: "rgba(245,158,66,0.1)",
        borderWidth: 2,
        pointRadius: 3,
        spanGaps: false,
        borderDash: [8, 4], // dashed
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: "Actual vs Predicted Sales" },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        title: { display: true, text: 'Quantity' },
      },
      x: {
        title: { display: true, text: 'Date' },
      },
    },
    elements: {
      line: {
        tension: 0.2,
      },
    },
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("30");
  const [activeTab, setActiveTab] = useState<"single" | "batch">("single");
  const [loading, setLoading] = useState(false); // For generator
  const [loadingForecasts, setLoadingForecasts] = useState(true); // For table
  const { toast } = useToast();

  // Function to fetch forecast results for the table
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

  // Fetch products for the dropdown AND initial forecasts
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

  // ============================================================
  // CORRECTED: handleRunForecast - backend saves to database
  // ============================================================
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
      // Call the API - backend handles database save
      const result = await callForecastAPI(
        horizonDays,
        productId,
        isBatch
      );

      toast({
        title: "Forecast Complete!",
        description: `Generated ${result.dailyPredictions} daily predictions for ${result.productsForecasted} product(s). Final forecasts saved to database.`,
      });

      // Refresh the table to show new forecasts
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

      {/* Main Tabs */}
      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px] mb-4">
          <TabsTrigger value="generate">Generate Forecast</TabsTrigger>
          <TabsTrigger value="results">View Forecasts</TabsTrigger>
        </TabsList>

        {/* GENERATE TAB */}
        <TabsContent value="generate">
          <Card className="max-w-md">
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
        </TabsContent>

        {/* RESULTS TAB */}
        <TabsContent value="results">
          <Card className="shadow-xl rounded-xl mb-8">
            <CardHeader>
              <CardTitle>Selected Product Chart</CardTitle>
              <CardDescription>
                Visualize predicted quantity and revenue for a selected product.
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
              {chartProductId && selectedProductForecasts.length > 0 ? (
                <Line data={chartData} options={chartOptions} height={180} />
              ) : (
                <div className="text-muted-foreground py-8">
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Forecast Date</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Predicted Qty</TableHead>
                        <TableHead className="text-right">Predicted Revenue</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {forecasts.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
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

        {/* View Details Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle>Forecast Details</DialogTitle>
              <DialogDescription>
                Full details for the forecast generated on{" "}
                {viewingForecast
                  ? new Date(viewingForecast.forecast_date).toLocaleDateString()
                  : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
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