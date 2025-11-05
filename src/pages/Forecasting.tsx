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

// ---
// This function is unchanged
// ---
const generateFakeForecast = async (
  productId: number,
  forecastDays: number
) => {
  // 1. Simulate a "long" computation
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 2. Get the product's details and current stock
  const { data: productData, error: productError } = await supabase
    .from("products")
    .select("product_name, unit_price, reorder_quantity")
    .eq("product_id", productId)
    .single();

  const { data: inventoryData, error: inventoryError } = await supabase
    .from("inventory")
    .select("quantity_on_hand")
    .eq("product_id", productId)
    .single();

  if (productError || inventoryError) {
    throw new Error(productError?.message || inventoryError?.message);
  }

  const productName = productData.product_name;
  const currentStock = inventoryData.quantity_on_hand || 0;
  const avgDailySales = (productData.reorder_quantity || 30) / 30;

  let totalPredictedSales = 0;
  for (let i = 1; i <= forecastDays; i++) {
    const randomVariance = (Math.random() - 0.5) * (avgDailySales / 2);
    const predicted_quantity = Math.max(
      0,
      Math.round(avgDailySales + randomVariance)
    );
    totalPredictedSales += predicted_quantity;
  }

  const forecastPeriodString = `${forecastDays} Days`;

  const newForecastRow = {
    product_id: productId,
    forecast_date: new Date().toISOString().split("T")[0],
    forecast_period: forecastPeriodString,
    predicted_quantity: totalPredictedSales,
    predicted_revenue: totalPredictedSales * productData.unit_price,
    // model_version, confidence_lower, confidence_upper omitted for DB defaults/triggers
  };

  const { error: forecastError } = await supabase
    .from("forecasts")
    .upsert(newForecastRow, {
      onConflict: "product_id, forecast_date, forecast_period",
    });

  if (forecastError) {
    if (forecastError.message.includes("forecasts_forecast_period_check")) {
      throw new Error(
        `Database Constraint Error. Run this SQL: ALTER TABLE public.forecasts DROP CONSTRAINT forecasts_forecast_period_check;`
      );
    }
    throw new Error(`Failed to save forecasts: ${forecastError.message}`);
  }

  if (currentStock < totalPredictedSales) {
    const daysToStockout = Math.floor(
      currentStock / (totalPredictedSales / forecastDays)
    );

    await supabase.from("alerts").insert({
      alert_type: "stockout_predicted",
      product_id: productId,
      alert_title: `Predicted Stockout for ${productName}`,
      alert_message: `Based on a ${forecastDays}-day forecast, stock is predicted to run out in ~${daysToStockout} days.`,
      severity: "high",
      current_value: daysToStockout,
      threshold_value: 0,
    });
  }

  return {
    success: true,
    rowsAdded: 1,
    alertsCreated: currentStock < totalPredictedSales ? 1 : 0,
  };
};

// ---
// This function is unchanged
// ---
const generateFakeBatchForecast = async (forecastDays: number) => {
  await new Promise((resolve) => setTimeout(resolve, 4000));

  const { data: allProducts, error: allProductsError } = await supabase
    .from("products")
    .select(
      `
      product_id,
      product_name,
      unit_price,
      reorder_quantity,
      inventory ( quantity_on_hand )
    `
    );

  if (allProductsError) {
    throw new Error(allProductsError.message);
  }

  const allForecastRows = [];
  const allAlerts = [];
  const forecastPeriodString = `${forecastDays} Days`;

  for (const product of allProducts) {
    const productName = product.product_name;
    const currentStock = (product.inventory as any)?.quantity_on_hand || 0;
    const avgDailySales = (product.reorder_quantity || 30) / 30;
    let totalPredictedSales = 0;

    for (let i = 1; i <= forecastDays; i++) {
      const randomVariance = (Math.random() - 0.5) * (avgDailySales / 2);
      const predicted_quantity = Math.max(
        0,
        Math.round(avgDailySales + randomVariance)
      );
      totalPredictedSales += predicted_quantity;
    }

    allForecastRows.push({
      product_id: product.product_id,
      forecast_date: new Date().toISOString().split("T")[0],
      forecast_period: forecastPeriodString,
      predicted_quantity: totalPredictedSales,
      predicted_revenue: totalPredictedSales * product.unit_price,
      // model_version, confidence_lower, confidence_upper omitted for DB defaults/triggers
    });

    if (currentStock < totalPredictedSales) {
      const daysToStockout = Math.floor(
        currentStock / (totalPredictedSales / forecastDays)
      );
      allAlerts.push({
        alert_type: "stockout_predicted",
        product_id: product.product_id,
        alert_title: `Predicted Stockout for ${productName}`,
        alert_message: `Based on a ${forecastDays}-day forecast, stock is predicted to run out in ~${daysToStockout} days.`,
        severity: "high",
        current_value: daysToStockout,
        threshold_value: 0,
      });
    }
  }

  const { error: forecastError } = await supabase
    .from("forecasts")
    .upsert(allForecastRows, {
      onConflict: "product_id, forecast_date, forecast_period",
    });

  if (forecastError) {
    if (forecastError.message.includes("forecasts_forecast_period_check")) {
      throw new Error(
        `Database Constraint Error. Run this SQL: ALTER TABLE public.forecasts DROP CONSTRAINT forecasts_forecast_period_check;`
      );
    }
    throw new Error(`Failed to save forecasts: ${forecastError.message}`);
  }

  if (allAlerts.length > 0) {
    await supabase.from("alerts").upsert(allAlerts, {
      onConflict: "product_id, alert_type, is_resolved",
    });
  }

  return {
    success: true,
    productsForecasted: allProducts.length,
    alertsCreated: allAlerts.length,
  };
};

// ---
// The main page component
// ---
const ForecastingPage = () => {
  const [forecasts, setForecasts] = useState<ForecastResult[]>([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingForecast, setViewingForecast] = useState<ForecastResult | null>(null);
  // ...existing code...
  // ...existing code...

  // ...existing state declarations...

  // Chart state for selected product
  const [chartProductId, setChartProductId] = useState<string>("");
  // Chart data for selected product
  const selectedProductForecasts = chartProductId
    ? forecasts.filter(f => f.product_id === Number(chartProductId))
    : [];
  // Sort by forecast_date ascending
  const sortedForecasts = [...selectedProductForecasts].sort((a, b) => new Date(a.forecast_date).getTime() - new Date(b.forecast_date).getTime());
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
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [selectedPeriod, setSelectedPeriod] = useState<string>("30");
  const [activeTab, setActiveTab] = useState<"single" | "batch">("single");
  const [loading, setLoading] = useState(false); // For generator
  const [loadingForecasts, setLoadingForecasts] = useState(true); // For table
  const { toast } = useToast();

  // ...existing code...

  // --- NEW: Function to fetch forecast results for the table ---
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

  const handleRunForecast = async () => {
    if (activeTab === "single" && !selectedProductId) {
      toast({ title: "No product selected", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      if (activeTab === "single") {
        const result = await generateFakeForecast(
          Number(selectedProductId),
          Number(selectedPeriod)
        );
        toast({
          title: "Forecast Generated!",
          description: `Successfully saved ${result.rowsAdded} new forecast record.`,
        });
      } else {
        const result = await generateFakeBatchForecast(Number(selectedPeriod));
        toast({
          title: "Batch Forecast Complete!",
          description: `Forecasted ${result.productsForecasted} products and created ${result.alertsCreated} new alerts.`,
        });
      }
      // --- REFRESH THE TABLE ---
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

      {/* --- NEW: Main Tabs --- */}
      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px] mb-4">
          <TabsTrigger value="generate">Generate Forecast</TabsTrigger>
          <TabsTrigger value="results">View Forecasts</TabsTrigger>
        </TabsList>

        {/* --- GENERATE TAB --- */}
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

        {/* --- RESULTS TAB --- */}
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
                <div className="text-muted-foreground py-8">Select a product to view its chart.</div>
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
      </Tabs>

      {/* --- View Details Dialog --- */}
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
            <div className="flex justify-between">
              <span className="text-muted-foreground">Confidence (Lower):</span>
              <span className="font-medium">
                {viewingForecast?.confidence_lower ?? "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Confidence (Upper):</span>
              <span className="font-medium">
                {viewingForecast?.confidence_upper ?? "N/A"}
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
    </div>
  );
};

export default ForecastingPage;