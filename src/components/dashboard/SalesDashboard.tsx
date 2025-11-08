import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Package } from "lucide-react";
import { useSalesDashboardData } from "./_SalesDashboardData";

const SalesDashboard = () => {
  const { totalValue, itemsSold, availableProducts, transactions, recentSales, loading, error } = useSalesDashboardData();
  const stats = [
    {
      title: "Total Value of Products",
      value: loading ? "..." : `$${totalValue.toLocaleString()}`,
      description: "Stock value",
      icon: DollarSign,
    },
    {
      title: "Items Sold",
      value: loading ? "..." : itemsSold.toLocaleString(),
      description: "Today",
      icon: ShoppingCart,
    },
    {
      title: "Available Products",
      value: loading ? "..." : availableProducts.toLocaleString(),
      description: "In stock",
      icon: Package,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sales Dashboard</h2>
          <p className="text-muted-foreground">Record and track your sales</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
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

      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
          <CardDescription>Top 5 latest transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loading ? (
              <div className="text-muted-foreground py-4">Loading recent sales...</div>
            ) : recentSales.length === 0 ? (
              <div className="text-muted-foreground py-4">No recent sales found.</div>
            ) : (
              recentSales.map((sale, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="text-sm font-medium">{sale.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">{sale.items_count} items • {new Date(sale.sale_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <span className="text-sm font-medium">${sale.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesDashboard;
