
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Package, TrendingDown, Warehouse } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStock: 0,
    outOfStock: 0,
    stockValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [categoryStock, setCategoryStock] = useState<any[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [lowStockLoading, setLowStockLoading] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("inventory")
        .select(`
          inventory_id,
          quantity_on_hand,
          products (
            product_id,
            product_name,
            cost_price,
            reorder_level,
            category_id,
            categories ( category_name )
          )
        `);
      if (error || !data) {
        setLoading(false);
        return;
      }
      let totalItems = 0;
      let lowStock = 0;
      let outOfStock = 0;
      let stockValue = 0;
      const categoryMap: Record<string, number> = {};
      const lowStockArr: any[] = [];
      for (const row of data) {
        if (!row.products) continue;
        totalItems++;
        const qty = row.quantity_on_hand ?? 0;
        const reorder = row.products.reorder_level ?? 0;
        const cost = row.products.cost_price ?? 0;
        stockValue += qty * cost;
        if (qty === 0) outOfStock++;
        else if (qty < reorder) lowStock++;
        const category = row.products.categories?.category_name || "Uncategorized";
        categoryMap[category] = (categoryMap[category] ?? 0) + qty * cost;
        if (qty < reorder) {
          lowStockArr.push({
            name: row.products.product_name,
            quantity: qty,
            reorder_level: reorder,
            category: category,
          });
        }
      }
      setStats({ totalItems, lowStock, outOfStock, stockValue });
      setCategoryStock(Object.entries(categoryMap).map(([name, value]) => ({ name, value })));
      lowStockArr.sort((a, b) => a.quantity - b.quantity);
      setLowStockItems(lowStockArr.slice(0, 10));
      setLoading(false);
      setCategoryLoading(false);
      setLowStockLoading(false);
    };
    const fetchAlerts = async () => {
      setAlertsLoading(true);
      const { data, error } = await supabase
        .from("alerts")
        .select("alert_id, alert_title, alert_message, severity, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error || !data) {
        setAlerts([]);
        setAlertsLoading(false);
        return;
      }
      setAlerts(data);
      setAlertsLoading(false);
    };
    fetchStats();
    fetchAlerts();
  }, []);

  const statCards = [
    {
      title: "Total Items",
      value: loading ? "..." : stats.totalItems,
      description: "Active products",
      icon: Package,
    },
    {
      title: "Low Stock Items",
      value: loading ? "..." : stats.lowStock,
      description: "Need reordering",
      icon: AlertTriangle,
    },
    {
      title: "Stock Value",
      value: loading ? "..." : `$${stats.stockValue.toLocaleString()}`,
      description: "Total inventory value",
      icon: Warehouse,
    },
    {
      title: "Out of Stock",
      value: loading ? "..." : stats.outOfStock,
      description: "Requires immediate action",
      icon: TrendingDown,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
        <p className="text-muted-foreground">Monitor and manage your stock levels</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions and Stock Value by Category */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions - left */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <button className="w-full rounded-lg border border-border p-3 text-left text-sm hover:bg-muted" onClick={() => navigate('/inventory')}>
                View Inventory
              </button>
              <button className="w-full rounded-lg border border-border p-3 text-left text-sm hover:bg-muted" onClick={() => navigate('/forecasting')}>
                Generate Forecast
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Stock Value by Category - right */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Value by Category</CardTitle>
            <CardDescription>Distribution of inventory value by product category</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryLoading ? (
              <div className="flex items-center justify-center py-8">
                <span className="animate-pulse text-muted-foreground">Loading chart...</span>
              </div>
            ) : categoryStock.length === 0 ? (
              <div className="text-muted-foreground py-8">No category data found.</div>
            ) : (
              <ResponsiveContainer width="100%" height={320} minWidth={320} minHeight={240}>
                <PieChart>
                  <Pie
                    data={categoryStock}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                  >
                    {categoryStock.map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={`hsl(var(--chart-${(idx % 5) + 1}))`}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  <Legend verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Top 10 Low Stock Items */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Alerts - left */}
        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
            <CardDescription>Overview of recent alerts</CardDescription>
          </CardHeader>
          <CardContent>
            {alertsLoading ? (
              <div className="flex items-center justify-center py-8">
                <span className="animate-pulse text-muted-foreground">Loading alerts...</span>
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-muted-foreground py-8">No recent alerts found.</div>
            ) : (
              <ul className="divide-y divide-muted">
                {alerts.map((alert) => (
                  <li
                    key={alert.alert_id}
                    className="flex flex-col gap-1 py-3 px-2 cursor-pointer hover:bg-muted/30 rounded transition"
                  >
                    <span className="font-medium text-sm truncate max-w-xs">
                      {alert.alert_title}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-md">
                      {alert.alert_message}
                    </span>
                    <span className={`text-xs font-semibold ${alert.severity === "high" ? "text-destructive" : alert.severity === "medium" ? "text-warning" : "text-muted-foreground"}`}>
                      {alert.severity?.charAt(0).toUpperCase() + alert.severity?.slice(1) || "Low"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Top 10 Low Stock Items - right of alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Low Stock Items</CardTitle>
            <CardDescription>Items near or below reorder level</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockLoading ? (
              <div className="flex items-center justify-center py-8">
                <span className="animate-pulse text-muted-foreground">Loading...</span>
              </div>
            ) : lowStockItems.length === 0 ? (
              <div className="text-muted-foreground py-8">No low stock items found.</div>
            ) : (
              <ul className="divide-y divide-muted">
                {lowStockItems.map((item, idx) => (
                  <li key={item.name} className="flex items-center justify-between py-3 px-2">
                    <span className="font-medium text-sm truncate max-w-xs">{item.name}</span>
                    <span className="text-xs font-mono px-2 py-1 rounded bg-muted/40 text-muted-foreground">{item.quantity}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
