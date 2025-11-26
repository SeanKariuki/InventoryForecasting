import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, FileSpreadsheet, TrendingUp, TrendingDown } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ChartContainer } from "@/components/ui/chart";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: number;
  name: string;
}

const ReportsPage = () => {
  const { toast } = useToast();

  // Stock Valuation Report state
  const [stockValuation, setStockValuation] = useState<any[]>([]);
  const [stockValuationLoading, setStockValuationLoading] = useState(true);

  // Forecast Confidence state
  const [forecastConfidence, setForecastConfidence] = useState<any[]>([]);
  const [confidenceLoading, setConfidenceLoading] = useState(true);

  // Category Performance state
  const [categoryPerformance, setCategoryPerformance] = useState<any[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);

  // Top-Selling Products state
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topProductsLoading, setTopProductsLoading] = useState(true);

  // Sales Trends state
  const [salesTrends, setSalesTrends] = useState<any[]>([]);
  const [salesTrendsLoading, setSalesTrendsLoading] = useState(true);
  const [trendsTimePeriod, setTrendsTimePeriod] = useState<string>("30"); // 7, 30, 90, 365, all

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Future Demand Forecast Chart state
  const [futureDemandData, setFutureDemandData] = useState<any[]>([]);
  const [futureDemandLoading, setFutureDemandLoading] = useState(true);

  // Fetch Stock Valuation Report data
  useEffect(() => {
    const fetchStockValuation = async () => {
      setStockValuationLoading(true);
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

  // Fetch Sales Trends data
  useEffect(() => {
    const fetchSalesTrends = async () => {
      setSalesTrendsLoading(true);
      
      // Calculate date range based on selected period
      const now = new Date();
      let startDate: Date;
      
      switch (trendsTimePeriod) {
        case "7":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "90":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case "365":
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        case "all":
        default:
          startDate = new Date(0); // Beginning of time
          break;
      }
      
      const startDateStr = startDate.toISOString().split('T')[0];
      
      // Fetch from historical_data table
      const { data, error } = await supabase
        .from("historical_data")
        .select("history_date, units_sold, sales_revenue")
        .gte("history_date", startDateStr)
        .eq("period_type", "daily")
        .order("history_date", { ascending: true });
      
      if (error) {
        console.error("Error fetching sales trends:", error);
        setSalesTrends([]);
        setSalesTrendsLoading(false);
        return;
      }
      
      if (!data || data.length === 0) {
        setSalesTrends([]);
        setSalesTrendsLoading(false);
        return;
      }
      
      // Type cast and group by date and aggregate
      const rows = data as any[];
      const dateMap: Record<string, { date: string; units_sold: number; sales_revenue: number }> = {};
      
      for (const row of rows) {
        const date = row.history_date;
        if (!dateMap[date]) {
          dateMap[date] = {
            date: date,
            units_sold: 0,
            sales_revenue: 0
          };
        }
        dateMap[date].units_sold += Number(row.units_sold) || 0;
        dateMap[date].sales_revenue += Number(row.sales_revenue) || 0;
      }
      
      const trendsData = Object.values(dateMap).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      setSalesTrends(trendsData);
      setSalesTrendsLoading(false);
    };
    
    fetchSalesTrends();
  }, [trendsTimePeriod]);

  // Download Sales Trends CSV
  const downloadSalesTrendsCSV = () => {
    if (salesTrends.length === 0) {
      toast({
        title: "No data to export",
        description: "Sales trends report is empty.",
        variant: "destructive"
      });
      return;
    }

    const headers = ["Date", "Units Sold", "Revenue"];
    const csvContent = [
      headers.join(","),
      ...salesTrends.map(item => 
        [
          item.date,
          item.units_sold,
          item.sales_revenue.toFixed(2)
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `sales_trends_${trendsTimePeriod}days_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: "Sales trends report downloaded as CSV."
    });
  };

  // Download Sales Trends PDF
  const downloadSalesTrendsPDF = () => {
    if (salesTrends.length === 0) {
      toast({
        title: "No data to export",
        description: "Sales trends report is empty.",
        variant: "destructive"
      });
      return;
    }

    const totalRevenue = salesTrends.reduce((sum, item) => sum + item.sales_revenue, 0);
    const totalUnits = salesTrends.reduce((sum, item) => sum + item.units_sold, 0);
    const avgDailyRevenue = totalRevenue / salesTrends.length;
    const avgDailyUnits = totalUnits / salesTrends.length;
    
    // Calculate growth
    const firstWeekRevenue = salesTrends.slice(0, 7).reduce((sum, item) => sum + item.sales_revenue, 0) / 7;
    const lastWeekRevenue = salesTrends.slice(-7).reduce((sum, item) => sum + item.sales_revenue, 0) / 7;
    const growthPercent = firstWeekRevenue > 0 ? ((lastWeekRevenue - firstWeekRevenue) / firstWeekRevenue * 100) : 0;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sales Trends Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
          .metadata { color: #666; margin-bottom: 30px; }
          .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
          .metric-card { background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; }
          .metric-label { font-size: 12px; color: #666; margin-bottom: 5px; }
          .metric-value { font-size: 24px; font-weight: bold; color: #6366f1; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #6366f1; color: white; padding: 12px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 40px; color: #666; font-size: 12px; }
          .growth-positive { color: #10b981; }
          .growth-negative { color: #ef4444; }
        </style>
      </head>
      <body>
        <h1>Sales Trends Report</h1>
        <div class="metadata">
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Period:</strong> Last ${trendsTimePeriod === 'all' ? 'All Time' : trendsTimePeriod + ' Days'}</p>
          <p><strong>Date Range:</strong> ${salesTrends[0]?.date} to ${salesTrends[salesTrends.length - 1]?.date}</p>
        </div>
        <div class="metrics">
          <div class="metric-card">
            <div class="metric-label">Total Revenue</div>
            <div class="metric-value">$${totalRevenue.toFixed(2)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Total Units Sold</div>
            <div class="metric-value">${totalUnits.toLocaleString()}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Avg Daily Revenue</div>
            <div class="metric-value">$${avgDailyRevenue.toFixed(2)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Growth Rate</div>
            <div class="metric-value ${growthPercent >= 0 ? 'growth-positive' : 'growth-negative'}">
              ${growthPercent >= 0 ? '+' : ''}${growthPercent.toFixed(1)}%
            </div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th style="text-align: right;">Units Sold</th>
              <th style="text-align: right;">Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${salesTrends.map(item => `
              <tr>
                <td>${new Date(item.date).toLocaleDateString()}</td>
                <td style="text-align: right;">${item.units_sold.toLocaleString()}</td>
                <td style="text-align: right;">$${item.sales_revenue.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>SmartStock Inventory Management System</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);

      toast({
        title: "Print dialog opened",
        description: "Save as PDF from the print dialog (Ctrl+P or Cmd+P)."
      });
    }
  };

  // Download Stock Valuation as CSV
  const downloadCSV = () => {
    if (stockValuation.length === 0) {
      toast({
        title: "No data to export",
        description: "Stock valuation report is empty.",
        variant: "destructive"
      });
      return;
    }

    const headers = ["Product", "Quantity On Hand", "Cost Price", "Value"];
    const csvContent = [
      headers.join(","),
      ...stockValuation.map(item => 
        [
          `"${item.productName}"`,
          item.quantityOnHand,
          item.costPrice.toFixed(2),
          item.value.toFixed(2)
        ].join(",")
      ),
      "", // Empty row
      "Total Value",
      `"","",$${stockValuation.reduce((sum, item) => sum + item.value, 0).toFixed(2)}`
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `stock_valuation_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: "Stock valuation report downloaded as CSV."
    });
  };

  // Download Stock Valuation as PDF
  const downloadPDF = () => {
    if (stockValuation.length === 0) {
      toast({
        title: "No data to export",
        description: "Stock valuation report is empty.",
        variant: "destructive"
      });
      return;
    }

    const totalValue = stockValuation.reduce((sum, item) => sum + item.value, 0);
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Stock Valuation Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
          .metadata { color: #666; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #6366f1; color: white; padding: 12px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .total-row { font-weight: bold; background-color: #e0e7ff !important; }
          .footer { margin-top: 40px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Stock Valuation Report</h1>
        <div class="metadata">
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Total Products:</strong> ${stockValuation.length}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th style="text-align: right;">Quantity On Hand</th>
              <th style="text-align: right;">Cost Price</th>
              <th style="text-align: right;">Value</th>
            </tr>
          </thead>
          <tbody>
            ${stockValuation.map(item => `
              <tr>
                <td>${item.productName}</td>
                <td style="text-align: right;">${item.quantityOnHand}</td>
                <td style="text-align: right;">$${item.costPrice.toFixed(2)}</td>
                <td style="text-align: right;">$${item.value.toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="3" style="text-align: right;">Total Stock Value:</td>
              <td style="text-align: right;">$${totalValue.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        <div class="footer">
          <p>SmartStock Inventory Management System</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);

      toast({
        title: "Print dialog opened",
        description: "Save as PDF from the print dialog (Ctrl+P or Cmd+P)."
      });
    }
  };

  // Download Category Performance as CSV
  const downloadCategoryCSV = () => {
    if (categoryPerformance.length === 0) {
      toast({
        title: "No data to export",
        description: "Category performance report is empty.",
        variant: "destructive"
      });
      return;
    }

    const headers = ["Category", "Total Units Sold", "Total Revenue", "Products", "Avg Revenue/Product"];
    const csvContent = [
      headers.join(","),
      ...categoryPerformance.map(cat => 
        [
          `"${cat.category_name}"`,
          cat.total_units,
          cat.total_revenue.toFixed(2),
          cat.product_count,
          cat.avg_revenue_per_product.toFixed(2)
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `category_performance_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: "Category performance report downloaded as CSV."
    });
  };

  // Download Category Performance as PDF
  const downloadCategoryPDF = () => {
    if (categoryPerformance.length === 0) {
      toast({
        title: "No data to export",
        description: "Category performance report is empty.",
        variant: "destructive"
      });
      return;
    }

    const totalRevenue = categoryPerformance.reduce((sum, cat) => sum + cat.total_revenue, 0);
    const totalUnits = categoryPerformance.reduce((sum, cat) => sum + cat.total_units, 0);
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Category Performance Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #333; border-bottom: 2px solid #10b981; padding-bottom: 10px; }
          .metadata { color: #666; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #10b981; color: white; padding: 12px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 40px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Category Performance Report</h1>
        <div class="metadata">
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Total Categories:</strong> ${categoryPerformance.length}</p>
          <p><strong>Total Units Sold:</strong> ${totalUnits.toLocaleString()}</p>
          <p><strong>Total Revenue:</strong> $${totalRevenue.toFixed(2)}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th style="text-align: right;">Total Units Sold</th>
              <th style="text-align: right;">Total Revenue</th>
              <th style="text-align: right;">Products</th>
              <th style="text-align: right;">Avg Revenue/Product</th>
            </tr>
          </thead>
          <tbody>
            ${categoryPerformance.map(cat => `
              <tr>
                <td>${cat.category_name}</td>
                <td style="text-align: right;">${cat.total_units.toLocaleString()}</td>
                <td style="text-align: right;">$${cat.total_revenue.toFixed(2)}</td>
                <td style="text-align: right;">${cat.product_count}</td>
                <td style="text-align: right;">$${cat.avg_revenue_per_product.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>SmartStock Inventory Management System</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);

      toast({
        title: "Print dialog opened",
        description: "Save as PDF from the print dialog (Ctrl+P or Cmd+P)."
      });
    }
  };

  // Download Top Products as CSV
  const downloadTopProductsCSV = () => {
    if (topProducts.length === 0) {
      toast({
        title: "No data to export",
        description: "Top products report is empty.",
        variant: "destructive"
      });
      return;
    }

    const headers = ["Rank", "Product", "Units Sold", "Total Revenue", "Unit Price"];
    const csvContent = [
      headers.join(","),
      ...topProducts.map((product, idx) => 
        [
          idx + 1,
          `"${product.product_name}"`,
          product.total_units,
          product.total_revenue.toFixed(2),
          product.unit_price.toFixed(2)
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `top_selling_products_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: "Top products report downloaded as CSV."
    });
  };

  // Download Top Products as PDF
  const downloadTopProductsPDF = () => {
    if (topProducts.length === 0) {
      toast({
        title: "No data to export",
        description: "Top products report is empty.",
        variant: "destructive"
      });
      return;
    }

    const totalRevenue = topProducts.reduce((sum, prod) => sum + prod.total_revenue, 0);
    const totalUnits = topProducts.reduce((sum, prod) => sum + prod.total_units, 0);
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Top-Selling Products Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #333; border-bottom: 2px solid #f59e42; padding-bottom: 10px; }
          .metadata { color: #666; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #f59e42; color: white; padding: 12px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .rank { font-weight: bold; color: #f59e42; }
          .footer { margin-top: 40px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Top-Selling Products Report</h1>
        <div class="metadata">
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Top Products:</strong> ${topProducts.length}</p>
          <p><strong>Combined Units Sold:</strong> ${totalUnits.toLocaleString()}</p>
          <p><strong>Combined Revenue:</strong> $${totalRevenue.toFixed(2)}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Product</th>
              <th style="text-align: right;">Units Sold</th>
              <th style="text-align: right;">Total Revenue</th>
              <th style="text-align: right;">Unit Price</th>
            </tr>
          </thead>
          <tbody>
            ${topProducts.map((product, idx) => `
              <tr>
                <td class="rank">#${idx + 1}</td>
                <td>${product.product_name}</td>
                <td style="text-align: right;">${product.total_units.toLocaleString()}</td>
                <td style="text-align: right;">$${product.total_revenue.toFixed(2)}</td>
                <td style="text-align: right;">$${product.unit_price.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>SmartStock Inventory Management System</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);

      toast({
        title: "Print dialog opened",
        description: "Save as PDF from the print dialog (Ctrl+P or Cmd+P)."
      });
    }
  };

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

  // Fetch ALL confidence data for all forecasts
  useEffect(() => {
    const fetchConfidenceData = async () => {
      setConfidenceLoading(true);
      
      const { data, error } = await supabase
        .from("forecasts")
        .select("forecast_id, forecast_period, explanation, generated_at, predicted_quantity, products(product_name)")
        .order("generated_at", { ascending: true });
      
      if (error) {
        console.error("Error fetching confidence data:", error);
        setForecastConfidence([]);
        setConfidenceLoading(false);
        return;
      }
      
      if (!data || data.length === 0) {
        setForecastConfidence([]);
        setConfidenceLoading(false);
        return;
      }
      
      // Filter and map forecasts with explanations
      const confidenceData = data
        .filter((row: any) => row.explanation && row.explanation.confidence_score)
        .map((row: any, index: number) => {
          const explanation = row.explanation as any;
          return {
            index: index + 1,
            forecast_id: row.forecast_id,
            period: row.forecast_period,
            confidence: explanation?.confidence_score || 0,
            confidence_level: explanation?.confidence_level || 'MEDIUM',
            generated_at: new Date(row.generated_at).toLocaleDateString(),
            predicted_quantity: row.predicted_quantity,
            product_name: row.products?.product_name || 'Unknown'
          };
        });
      
      setForecastConfidence(confidenceData);
      setConfidenceLoading(false);
    };
    
    fetchConfidenceData();
  }, []);

  // Fetch future demand forecast data
  useEffect(() => {
    const fetchFutureDemand = async () => {
      setFutureDemandLoading(true);
      const today = new Date().toISOString().split("T")[0];
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      
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
      
      const grouped: Record<string, { product_id: string; product_name: string; total_predicted: number }> = {};
      for (const row of data) {
        const pid = row.product_id.toString();
        const pname = row.products?.product_name || "Unknown";
        if (!grouped[pid]) {
          grouped[pid] = { product_id: pid, product_name: pname, total_predicted: 0 };
        }
        grouped[pid].total_predicted += row.predicted_quantity || 0;
      }
      
      const sortedData = Object.values(grouped).sort((a, b) => b.total_predicted - a.total_predicted);
      setFutureDemandData(sortedData);
      setFutureDemandLoading(false);
    };
    fetchFutureDemand();
  }, []);

  // Fetch Category Performance data
  useEffect(() => {
    const fetchCategoryPerformance = async () => {
      setCategoryLoading(true);
      
      // Get sales data from sales_items only
      const { data, error } = await supabase
        .from("sales_items")
        .select(`
          quantity,
          total_price,
          products (
            product_id,
            product_name,
            categories (
              category_id,
              category_name
            )
          )
        `);
      
      if (error) {
        console.error("Error fetching category data:", error);
        setCategoryPerformance([]);
        setCategoryLoading(false);
        return;
      }
      
      if (!data || data.length === 0) {
        setCategoryPerformance([]);
        setCategoryLoading(false);
        return;
      }
      
      // Group by category
      const categoryMap: Record<string, {
        category_name: string;
        total_units: number;
        total_revenue: number;
        product_count: Set<number>;
      }> = {};
      
      for (const row of data as any[]) {
        const category = row.products?.categories;
        if (!category || !category.category_name) continue;
        
        const catName = category.category_name;
        if (!categoryMap[catName]) {
          categoryMap[catName] = {
            category_name: catName,
            total_units: 0,
            total_revenue: 0,
            product_count: new Set()
          };
        }
        
        categoryMap[catName].total_units += row.quantity || 0;
        categoryMap[catName].total_revenue += Number(row.total_price) || 0;
        if (row.products?.product_id) {
          categoryMap[catName].product_count.add(row.products.product_id);
        }
      }
      
      // Convert to array and calculate averages
      const categoryData = Object.values(categoryMap)
        .map(cat => ({
          category_name: cat.category_name,
          total_units: cat.total_units,
          total_revenue: cat.total_revenue,
          product_count: cat.product_count.size,
          avg_revenue_per_product: cat.total_revenue / cat.product_count.size
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue);
      
      setCategoryPerformance(categoryData);
      setCategoryLoading(false);
    };
    
    fetchCategoryPerformance();
  }, []);

  // Fetch Top-Selling Products data
  useEffect(() => {
    const fetchTopProducts = async () => {
      setTopProductsLoading(true);
      
      // Get sales data from sales_items only
      const { data, error } = await supabase
        .from("sales_items")
        .select(`
          quantity,
          total_price,
          products (
            product_id,
            product_name,
            unit_price
          )
        `);
      
      if (error) {
        console.error("Error fetching top products:", error);
        setTopProducts([]);
        setTopProductsLoading(false);
        return;
      }
      
      if (!data || data.length === 0) {
        setTopProducts([]);
        setTopProductsLoading(false);
        return;
      }
      
      // Group by product
      const productMap: Record<number, {
        product_id: number;
        product_name: string;
        total_units: number;
        total_revenue: number;
        unit_price: number;
      }> = {};
      
      for (const row of data as any[]) {
        const product = row.products;
        if (!product || !product.product_name) continue;
        
        const pid = product.product_id;
        if (!productMap[pid]) {
          productMap[pid] = {
            product_id: pid,
            product_name: product.product_name,
            total_units: 0,
            total_revenue: 0,
            unit_price: Number(product.unit_price) || 0
          };
        }
        
        productMap[pid].total_units += row.quantity || 0;
        productMap[pid].total_revenue += Number(row.total_price) || 0;
      }
      
      // Get top 10 by total units sold
      const topProductsData = Object.values(productMap)
        .sort((a, b) => b.total_units - a.total_units)
        .slice(0, 10);
      
      setTopProducts(topProductsData);
      setTopProductsLoading(false);
    };
    
    fetchTopProducts();
  }, []);

  const totalStockValue = stockValuation.reduce((sum, item) => sum + item.value, 0);
  const avgConfidence = forecastConfidence.length > 0 
    ? Math.round(forecastConfidence.reduce((sum, item) => sum + item.confidence, 0) / forecastConfidence.length)
    : 0;

  // Calculate sales trends metrics
  const totalRevenue = salesTrends.reduce((sum, item) => sum + item.sales_revenue, 0);
  const totalUnits = salesTrends.reduce((sum, item) => sum + item.units_sold, 0);
  const avgDailyRevenue = salesTrends.length > 0 ? totalRevenue / salesTrends.length : 0;
  
  // Calculate growth (compare first week vs last week)
  const firstWeekRevenue = salesTrends.slice(0, Math.min(7, salesTrends.length)).reduce((sum, item) => sum + item.sales_revenue, 0) / Math.min(7, salesTrends.length);
  const lastWeekRevenue = salesTrends.slice(-Math.min(7, salesTrends.length)).reduce((sum, item) => sum + item.sales_revenue, 0) / Math.min(7, salesTrends.length);
  const growthPercent = firstWeekRevenue > 0 ? ((lastWeekRevenue - firstWeekRevenue) / firstWeekRevenue * 100) : 0;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-8 bg-background">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight mb-1">Reports & Analytics</h2>
        <p className="text-muted-foreground">View and analyze inventory performance metrics.</p>
      </div>
      <Accordion type="single" collapsible className="w-full space-y-4">
        <AccordionItem value="trends" className="rounded-lg shadow border bg-background">
          <AccordionTrigger className="px-6 py-4 text-lg font-semibold rounded-t-lg bg-muted hover:bg-accent focus:bg-accent transition-colors border-b data-[state=open]:bg-primary/10 data-[state=open]:text-primary">
            Sales Trends Over Time
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-2">
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Sales Trends Over Time</CardTitle>
                    <CardDescription>
                      Historical sales performance showing revenue and units sold over time. Analyze patterns and identify growth trends.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={downloadSalesTrendsCSV}
                      variant="outline"
                      size="sm"
                      disabled={salesTrendsLoading || salesTrends.length === 0}
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button
                      onClick={downloadSalesTrendsPDF}
                      variant="outline"
                      size="sm"
                      disabled={salesTrendsLoading || salesTrends.length === 0}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Time Period Selector */}
                <div className="mb-6">
                  <Label htmlFor="trends-period-select">Time Period</Label>
                  <Select
                    value={trendsTimePeriod}
                    onValueChange={setTrendsTimePeriod}
                  >
                    <SelectTrigger id="trends-period-select" className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 Days</SelectItem>
                      <SelectItem value="30">Last 30 Days</SelectItem>
                      <SelectItem value="90">Last 90 Days</SelectItem>
                      <SelectItem value="365">Last Year</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {salesTrendsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span className="animate-pulse text-muted-foreground">Loading sales trends...</span>
                  </div>
                ) : salesTrends.length === 0 ? (
                  <div className="text-muted-foreground py-8 text-center">
                    No sales data available for the selected period.
                  </div>
                ) : (
                  <>
                    {/* Metrics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">Total Revenue</div>
                          <div className="text-2xl font-bold text-primary">
                            ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">Total Units Sold</div>
                          <div className="text-2xl font-bold">
                            {totalUnits.toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">Avg Daily Revenue</div>
                          <div className="text-2xl font-bold">
                            ${avgDailyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-sm text-muted-foreground">Growth Rate</div>
                          <div className={`text-2xl font-bold flex items-center gap-2 ${growthPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {growthPercent >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                            {growthPercent >= 0 ? '+' : ''}{growthPercent.toFixed(1)}%
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Chart */}
                    <div className="mb-6">
                      <ChartContainer config={{}}>
                        <ResponsiveContainer width="100%" height={400}>
                          <LineChart
                            data={salesTrends}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                              dataKey="date"
                              tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              tick={{ fontSize: 11 }}
                              angle={-45}
                              textAnchor="end"
                              height={80}
                            />
                            <YAxis
                              yAxisId="left"
                              label={{ value: "Revenue ($)", angle: -90, position: "insideLeft" }}
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              label={{ value: "Units Sold", angle: 90, position: "insideRight" }}
                              tick={{ fontSize: 12 }}
                            />
                            <Tooltip
                              contentStyle={{ 
                                backgroundColor: "white", 
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                                padding: "12px"
                              }}
                              labelFormatter={(label) => new Date(label).toLocaleDateString()}
                              formatter={(value: any, name: string) => {
                                if (name === "sales_revenue") {
                                  return [`$${Number(value).toFixed(2)}`, "Revenue"];
                                }
                                if (name === "units_sold") {
                                  return [Number(value).toLocaleString(), "Units Sold"];
                                }
                                return [value, name];
                              }}
                            />
                            <Legend />
                            <Line
                              yAxisId="left"
                              type="monotone"
                              dataKey="sales_revenue"
                              name="Revenue"
                              stroke="#6366f1"
                              strokeWidth={2.5}
                              dot={{ r: 3 }}
                              activeDot={{ r: 5 }}
                            />
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="units_sold"
                              name="Units Sold"
                              stroke="#10b981"
                              strokeWidth={2.5}
                              dot={{ r: 3 }}
                              activeDot={{ r: 5 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>

                    {/* Data Table */}
                    <div className="mt-6">
                      <h4 className="font-semibold mb-3">Daily Breakdown</h4>
                      <div className="max-h-96 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead className="text-right">Units Sold</TableHead>
                              <TableHead className="text-right">Revenue</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {salesTrends.map((item, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">
                                  {new Date(item.date).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right">
                                  {item.units_sold.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  ${item.sales_revenue.toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="stock" className="rounded-lg shadow border bg-background">
          <AccordionTrigger className="px-6 py-4 text-lg font-semibold rounded-t-lg bg-muted hover:bg-accent focus:bg-accent transition-colors border-b data-[state=open]:bg-primary/10 data-[state=open]:text-primary">
            Stock Valuation Report
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-2">
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Stock Valuation Report</CardTitle>
                    <CardDescription>
                      Total value of all stock on hand. Value is calculated as quantity on hand × cost price.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={downloadCSV}
                      variant="outline"
                      size="sm"
                      disabled={stockValuationLoading || stockValuation.length === 0}
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button
                      onClick={downloadPDF}
                      variant="outline"
                      size="sm"
                      disabled={stockValuationLoading || stockValuation.length === 0}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                </div>
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
                  <>
                    <div className="mb-4 p-4 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">Total Stock Value</div>
                      <div className="text-3xl font-bold text-primary">
                        ${totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Across {stockValuation.length} products
                      </div>
                    </div>
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
                            <TableCell className="font-medium">{item.productName}</TableCell>
                            <TableCell className="text-right">{item.quantityOnHand}</TableCell>
                            <TableCell className="text-right">
                              ${item.costPrice?.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              ${item.value?.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="future" className="rounded-lg shadow border bg-background">
          <AccordionTrigger className="px-6 py-4 text-lg font-semibold rounded-t-lg bg-muted hover:bg-accent focus:bg-accent transition-colors border-b data-[state=open]:bg-primary/10 data-[state=open]:text-primary">
            Future Demand Forecast (Next 30 Days)
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-2">
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Future Demand Forecast (Next 30 Days)</CardTitle>
                <CardDescription>
                  Total predicted sales volume for each product over the next 30 days. Filter products to focus on specific items.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="font-semibold text-sm">Filter Products</label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedProductIds(products.map(p => p.id.toString()))}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedProductIds([])}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md bg-muted/30">
                    {products.map((p) => (
                      <label 
                        key={p.id} 
                        className="flex items-center gap-2 px-3 py-2 rounded border cursor-pointer text-sm bg-background hover:bg-accent transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(p.id.toString())}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedProductIds([...selectedProductIds, p.id.toString()]);
                            } else {
                              setSelectedProductIds(selectedProductIds.filter(id => id !== p.id.toString()));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="truncate">{p.name}</span>
                      </label>
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    {selectedProductIds.length === 0 
                      ? "Showing all products" 
                      : `Showing ${selectedProductIds.length} of ${products.length} products`}
                  </div>
                </div>
                {futureDemandLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span className="animate-pulse text-muted-foreground">Loading forecast data...</span>
                  </div>
                ) : futureDemandData.length > 0 ? (
                  <ChartContainer config={{}}>
                    <ResponsiveContainer width="100%" height={500}>
                      <BarChart
                        data={futureDemandData.filter(item => 
                          selectedProductIds.length === 0 || selectedProductIds.includes(item.product_id)
                        )}
                        margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="product_name"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          interval={0}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          label={{ value: "Predicted Units", angle: -90, position: "insideLeft" }}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: "white", 
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                          }}
                        />
                        <Bar
                          dataKey="total_predicted"
                          name="Predicted Sales"
                          fill="#6366f1"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="text-muted-foreground py-8 text-center">
                    No future forecasts available. Generate forecasts from the Forecasting page.
                  </div>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="confidence" className="rounded-lg shadow border bg-background">
          <AccordionTrigger className="px-6 py-4 text-lg font-semibold rounded-t-lg bg-muted hover:bg-accent focus:bg-accent transition-colors border-b data-[state=open]:bg-primary/10 data-[state=open]:text-primary">
            Forecast Confidence Levels
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-2">
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Forecast Confidence Levels</CardTitle>
                <CardDescription>
                  Confidence scores for all forecasts across all products. Each point represents how confident the model was when making that prediction.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {confidenceLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span className="animate-pulse text-muted-foreground">Loading confidence data...</span>
                  </div>
                ) : forecastConfidence.length === 0 ? (
                  <div className="text-muted-foreground py-8 text-center">
                    No confidence data available. Generate forecasts with explanations first.
                  </div>
                ) : (
                  <>
                    <div className="mb-6 p-4 bg-muted rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Average Confidence</div>
                          <div className="text-3xl font-bold text-primary">
                            {avgConfidence}%
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Total Forecasts</div>
                          <div className="text-3xl font-bold">
                            {forecastConfidence.length}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Confidence Range</div>
                          <div className="text-lg font-semibold">
                            {Math.min(...forecastConfidence.map(f => f.confidence))}% - {Math.max(...forecastConfidence.map(f => f.confidence))}%
                          </div>
                        </div>
                      </div>
                    </div>
                    <ChartContainer config={{}}>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={forecastConfidence} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <YAxis 
                            label={{ value: "Confidence Score (%)", angle: -90, position: "insideLeft" }}
                            domain={[0, 100]}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip
                            contentStyle={{ 
                              backgroundColor: "white", 
                              border: "1px solid #e5e7eb",
                              borderRadius: "8px",
                              padding: "12px"
                            }}
                            formatter={(value: any, name: string, props: any) => {
                              if (name === "confidence") {
                                return [
                                  `${value}%`,
                                  `${props.payload.product_name} - ${props.payload.confidence_level}`
                                ];
                              }
                              return [value, name];
                            }}
                            labelFormatter={(label) => `Forecast #${label}`}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="confidence" 
                            name="Confidence Score" 
                            stroke="#6366f1" 
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: "#6366f1" }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>About this chart:</strong> This line chart shows the confidence level for every forecast generated across all products. 
                        Each point represents how confident the forecasting model was when making that prediction. Higher confidence scores indicate 
                        the model had better data quality and more consistent patterns to work with.
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="category" className="rounded-lg shadow border bg-background">
          <AccordionTrigger className="px-6 py-4 text-lg font-semibold rounded-t-lg bg-muted hover:bg-accent focus:bg-accent transition-colors border-b data-[state=open]:bg-primary/10 data-[state=open]:text-primary">
            Category Performance Report
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-2">
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Category Performance Report</CardTitle>
                    <CardDescription>
                      Sales performance breakdown by product category. Shows total units sold, revenue, and average revenue per product.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={downloadCategoryCSV}
                      variant="outline"
                      size="sm"
                      disabled={categoryLoading || categoryPerformance.length === 0}
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button
                      onClick={downloadCategoryPDF}
                      variant="outline"
                      size="sm"
                      disabled={categoryLoading || categoryPerformance.length === 0}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {categoryLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span className="animate-pulse text-muted-foreground">Loading category data...</span>
                  </div>
                ) : categoryPerformance.length === 0 ? (
                  <div className="text-muted-foreground py-8 text-center">
                    No category data available.
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <ChartContainer config={{}}>
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart
                            data={categoryPerformance}
                            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                              dataKey="category_name"
                              angle={-45}
                              textAnchor="end"
                              height={80}
                              interval={0}
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis 
                              label={{ value: "Total Revenue ($)", angle: -90, position: "insideLeft" }}
                              tick={{ fontSize: 12 }}
                            />
                            <Tooltip
                              contentStyle={{ 
                                backgroundColor: "white", 
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                              }}
                              formatter={(value: any, name: string) => {
                                if (name === "total_revenue") {
                                  return [`$${Number(value).toFixed(2)}`, "Total Revenue"];
                                }
                                return [value, name];
                              }}
                            />
                            <Bar
                              dataKey="total_revenue"
                              name="Total Revenue"
                              fill="#10b981"
                              radius={[8, 8, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Total Units Sold</TableHead>
                          <TableHead className="text-right">Total Revenue</TableHead>
                          <TableHead className="text-right">Products</TableHead>
                          <TableHead className="text-right">Avg Revenue/Product</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryPerformance.map((cat, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{cat.category_name}</TableCell>
                            <TableCell className="text-right">{cat.total_units.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-semibold">
                              ${cat.total_revenue.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">{cat.product_count}</TableCell>
                            <TableCell className="text-right">
                              ${cat.avg_revenue_per_product.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="top" className="rounded-lg shadow border bg-background">
          <AccordionTrigger className="px-6 py-4 text-lg font-semibold rounded-t-lg bg-muted hover:bg-accent focus:bg-accent transition-colors border-b data-[state=open]:bg-primary/10 data-[state=open]:text-primary">
            Top-Selling Products Report
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-2">
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Top-Selling Products Report</CardTitle>
                    <CardDescription>
                      Top 10 products by total units sold. Shows sales volume and revenue performance.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={downloadTopProductsCSV}
                      variant="outline"
                      size="sm"
                      disabled={topProductsLoading || topProducts.length === 0}
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button
                      onClick={downloadTopProductsPDF}
                      variant="outline"
                      size="sm"
                      disabled={topProductsLoading || topProducts.length === 0}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {topProductsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span className="animate-pulse text-muted-foreground">Loading top products...</span>
                  </div>
                ) : topProducts.length === 0 ? (
                  <div className="text-muted-foreground py-8 text-center">
                    No sales data available.
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <ChartContainer config={{}}>
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart
                            data={topProducts}
                            layout="vertical"
                            margin={{ top: 20, right: 30, left: 150, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                              type="number"
                              label={{ value: "Units Sold", position: "insideBottom", offset: -10 }}
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis 
                              type="category"
                              dataKey="product_name"
                              width={140}
                              tick={{ fontSize: 11 }}
                            />
                            <Tooltip
                              contentStyle={{ 
                                backgroundColor: "white", 
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                              }}
                              formatter={(value: any, name: string) => {
                                if (name === "total_units") {
                                  return [Number(value).toLocaleString(), "Units Sold"];
                                }
                                return [value, name];
                              }}
                            />
                            <Bar
                              dataKey="total_units"
                              name="Units Sold"
                              fill="#f59e42"
                              radius={[0, 8, 8, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Units Sold</TableHead>
                          <TableHead className="text-right">Total Revenue</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topProducts.map((product, idx) => (
                          <TableRow key={product.product_id}>
                            <TableCell className="font-bold text-primary">#{idx + 1}</TableCell>
                            <TableCell className="font-medium">{product.product_name}</TableCell>
                            <TableCell className="text-right">{product.total_units.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-semibold">
                              ${product.total_revenue.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              ${product.unit_price.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default ReportsPage;