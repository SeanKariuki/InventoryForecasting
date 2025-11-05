import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ChartContainer } from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";


interface ReportRow {
  id: number;
  report_type: string;
  generated_at: string;
  summary: string;
}

interface Product {
  id: number;
  name: string;
}

interface ActualSales {
  period_date: string;
  sales_quantity: number | null;
}

interface PredictedSales {
  forecast_date: string;
  predicted_quantity: number;
}


const ReportsPage = () => {
  // Stock Valuation Report state
  const [stockValuation, setStockValuation] = useState<any[]>([]);
  const [stockValuationLoading, setStockValuationLoading] = useState(true);

  // Fetch Stock Valuation Report data
  useEffect(() => {
    const fetchStockValuation = async () => {
      setStockValuationLoading(true);
      // Join products and inventory
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          inventory_id,
          quantity_on_hand,
          products (
            product_id,
            product_name,
            cost_price
          )
        `);
      if (error || !data) {
        setStockValuation([]);
        setStockValuationLoading(false);
        return;
      }
      // Map to table rows
      setStockValuation(
        data
          .filter((row: any) => row.products && row.products.product_name)
          .map((row: any) => ({
            productName: row.products.product_name,
            quantityOnHand: row.quantity_on_hand,
            costPrice: row.products.cost_price ?? 0,
            value: (row.quantity_on_hand ?? 0) * (row.products.cost_price ?? 0),
          }))
      );
      setStockValuationLoading(false);
    };
    fetchStockValuation();
  }, []);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [actualSales, setActualSales] = useState<ActualSales[]>([]);
  const [predictedSales, setPredictedSales] = useState<PredictedSales[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  // Future Demand Forecast Chart state
  const [futureDemandData, setFutureDemandData] = useState<any[]>([]);
  const [futureDemandLoading, setFutureDemandLoading] = useState(true);
  // Fixed 30-day period


  // Fetch products for dropdown
  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase.from("products").select("product_id, product_name");
      if (data) {
        setProducts(data.map((p: any) => ({ id: p.product_id, name: p.product_name })));
      }
    };
    fetchProducts();
  }, []);

  // Fetch future demand forecast data
  useEffect(() => {
    const fetchFutureDemand = async () => {
      setFutureDemandLoading(true);
      // Get today in YYYY-MM-DD
      const today = new Date().toISOString().split("T")[0];
      // Get 30 days from now in YYYY-MM-DD
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      // Fetch forecasts in the next 30 days
      const { data, error } = await supabase
        .from("forecasts")
        .select("product_id, forecast_date, predicted_quantity, products ( product_name )")
        .gte("forecast_date", today)
        .lte("forecast_date", futureDate);
      if (error) {
        setFutureDemandData([]);
        setFutureDemandLoading(false);
        return;
      }
      // Group by product_id, sum predicted_quantity
      const grouped: Record<string, { product_name: string; total_predicted: number }> = {};
      for (const row of data) {
        const pid = row.product_id;
        const pname = row.products?.product_name || "Unknown";
        if (!grouped[pid]) {
          grouped[pid] = { product_name: pname, total_predicted: 0 };
        }
        grouped[pid].total_predicted += row.predicted_quantity || 0;
      }
      setFutureDemandData(Object.values(grouped));
      setFutureDemandLoading(false);
    };
    fetchFutureDemand();
  }, []);

  // Fetch reports table
  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("forecasts")
        .select("forecast_id, forecast_period, generated_at, product_name")
        .order("generated_at", { ascending: false });
      if (data) {
        setReports(
          data.map((row: any) => ({
            id: row.forecast_id,
            report_type: row.forecast_period,
            generated_at: row.generated_at ?? row.forecast_date,
            summary: row.product_name,
          }))
        );
      }
      setLoading(false);
    };
    fetchReports();
  }, []);

  // Fetch chart data when product changes
  useEffect(() => {
    if (!selectedProductId) {
      setActualSales([]);
      setPredictedSales([]);
      return;
    }
    setChartLoading(true);
    Promise.all([
      supabase
        .from("historical_data")
        .select("period_date, sales_quantity")
        .eq("product_id", Number(selectedProductId))
        .order("period_date", { ascending: false }),
      supabase
        .from("forecasts")
        .select("forecast_date, predicted_quantity")
        .eq("product_id", Number(selectedProductId))
        .order("forecast_date", { ascending: false })
    ]).then(([actualRes, predictedRes]) => {
      setActualSales(actualRes.data || []);
      setPredictedSales(predictedRes.data || []);
      setChartLoading(false);
    });
  }, [selectedProductId]);


  // Merge dates for chart labels (newest to oldest)
  const allDates = Array.from(new Set([
    ...actualSales.map(a => a.period_date),
    ...predictedSales.map(p => p.forecast_date)
  ])).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const actualDataMap = Object.fromEntries(actualSales.map(a => [a.period_date, a.sales_quantity ?? null]));
  const predictedDataMap = Object.fromEntries(predictedSales.map(p => [p.forecast_date, p.predicted_quantity]));

  const chartData = {
    labels: allDates,
    datasets: [
      {
        label: "Actual Sales",
        data: allDates.map(date => actualDataMap[date] ?? null),
        borderColor: "#6366f1",
        backgroundColor: "rgba(99,102,241,0.1)",
        borderWidth: 2,
        pointRadius: 3,
        spanGaps: false,
      },
      {
        label: "Predicted Sales",
        data: allDates.map(date => predictedDataMap[date] ?? null),
        borderColor: "#f59e42",
        backgroundColor: "rgba(245,158,66,0.1)",
        borderWidth: 2,
        pointRadius: 3,
        spanGaps: false,
        borderDash: [8, 4],
      },
    ],
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-8 bg-background">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight mb-1">Reports</h2>
        <p className="text-muted-foreground">View and analyze system reports.</p>
      </div>

      {/* Stock Valuation Report */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Stock Valuation Report</CardTitle>
          <CardDescription>
            Total value of all stock on hand. Value is calculated as quantity on hand × cost price.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stockValuationLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="animate-pulse text-muted-foreground">Loading stock valuation...</span>
            </div>
          ) : stockValuation.length === 0 ? (
            <div className="text-muted-foreground py-8">No stock records found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity On Hand</TableHead>
                  <TableHead className="text-right">Cost Price</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockValuation.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell className="text-right">{item.quantityOnHand}</TableCell>
                    <TableCell className="text-right">{item.costPrice?.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</TableCell>
                    <TableCell className="text-right font-bold">{item.value?.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Future Demand Forecast Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Future Demand Forecast Chart</CardTitle>
          <CardDescription>
            Total predicted sales for the next 30 days, by product.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Forecast period selection removed, fixed to 30 days */}
          {futureDemandLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="animate-pulse text-muted-foreground">Loading chart...</span>
            </div>
          ) : futureDemandData.length > 0 ? (
            <ChartContainer config={{}}>
              <>
                <ResponsiveContainer width="100%" height={600} minWidth={320} minHeight={480}>
                  <BarChart
                    data={futureDemandData}
                    margin={{ top: 128, right: 120, left: 120, bottom: 160 }}
                    barCategoryGap={80}
                  >
                    <XAxis
                      dataKey="product_name"
                      interval={0}
                      height={80}
                      tick={props => {
                        const { x, y, payload } = props;
                        return (
                          <text
                            x={x}
                            y={y + 10}
                            textAnchor="end"
                            fontSize={15}
                            fill="#222"
                            fontWeight={500}
                            transform={`rotate(-45,${x},${y + 10})`}
                          >
                            {payload.value}
                          </text>
                        );
                      }}
                      label={{ value: "Product", position: "bottom", offset: 40, fontSize: 16, fill: "#444", fontWeight: 600 }}
                      axisLine={{ stroke: "#d1d5db" }}
                      tickLine={{ stroke: "#d1d5db" }}
                    />
                    <YAxis
                      tick={{ fontSize: 15, fill: "#222", fontWeight: 500 }}
                      label={{ value: "Total Predicted Sales", angle: -90, position: "insideLeft", fontSize: 16, fill: "#444", fontWeight: 600 }}
                      axisLine={{ stroke: "#d1d5db" }}
                      tickLine={{ stroke: "#d1d5db" }}
                      allowDecimals={false}
                      width={60}
                    />
                    <Tooltip
                      cursor={{ fill: "#f3f4f6" }}
                      contentStyle={{ borderRadius: 10, fontSize: 15, background: "#fff", boxShadow: "0 2px 8px #0001" }}
                      labelStyle={{ fontWeight: 600, color: "#222" }}
                    />
                    <Legend
                      verticalAlign="top"
                      wrapperStyle={{ fontSize: 16, marginBottom: 16, color: "#222", fontWeight: 600 }}
                    />
                    <Bar
                      dataKey="total_predicted"
                      name="Predicted Sales"
                      fill="url(#barGradient)"
                      radius={[12, 12, 12, 12]}
                      label={({ x, y, width, value }) => (
                        <text
                          x={x + width / 2}
                          y={y - 8}
                          textAnchor="middle"
                          fontSize={15}
                          fontWeight="bold"
                          fill="#222"
                          style={{ textShadow: "0 1px 4px #fff8" }}
                        >
                          {value}
                        </text>
                      )}
                      stroke="#e5e7eb"
                      strokeWidth={1.5}
                      barSize={isNaN(window.innerWidth) ? 32 : Math.max(18, Math.min(40, window.innerWidth / (futureDemandData.length + 2)))}
                      background={{ fill: "#f3f4f6", radius: 12 }}
                      style={{ filter: "drop-shadow(0 2px 8px #6366f133)" }}
                    />
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.85} />
                        <stop offset="100%" stopColor="#a5b4fc" stopOpacity={0.85} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 2" vertical={false} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            </ChartContainer>
          ) : (
            <div className="text-muted-foreground py-8">No future forecasts found.</div>
          )}
        </CardContent>
      </Card>

      {/* Predicted vs Actual Sales Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Predicted vs. Actual Sales Chart</CardTitle>
          <CardDescription>
            Select a product to view its actual and predicted sales over time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 max-w-xs">
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
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
          {chartLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="animate-pulse text-muted-foreground">Loading chart...</span>
            </div>
          ) : selectedProductId && allDates.length > 0 ? (
            <ChartContainer config={{}}>
              <LineChart data={allDates.map((date) => ({
                date,
                actual: actualDataMap[date] ?? null,
                predicted: predictedDataMap[date] ?? null,
              }))} width={700} height={320}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="actual" name="Actual Sales" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="predicted" name="Predicted Sales" stroke="#f59e42" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="8 4" />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="text-muted-foreground py-8">Select a product to view its chart.</div>
          )}
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
          <CardDescription>All available reports in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="animate-pulse text-muted-foreground">Loading reports...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                      No reports found.
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.report_type}</TableCell>
                      <TableCell>{new Date(r.generated_at).toLocaleString()}</TableCell>
                      <TableCell>{r.summary}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;
