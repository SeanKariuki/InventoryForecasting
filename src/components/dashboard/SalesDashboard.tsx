import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, ShoppingCart, Package, Plus } from "lucide-react";
import { Link } from "react-router-dom";

const SalesDashboard = () => {
  const stats = [
    {
      title: "Today's Sales",
      value: "$1,240",
      description: "8 transactions",
      icon: DollarSign,
    },
    {
      title: "Items Sold",
      value: "24",
      description: "Today",
      icon: ShoppingCart,
    },
    {
      title: "Available Products",
      value: "156",
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
        <Link to="/sales/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Sale
          </Button>
        </Link>
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
          <CardDescription>Latest transactions from today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium">INV-20250118-0023</p>
                <p className="text-xs text-muted-foreground">2 items • 10:45 AM</p>
              </div>
              <span className="text-sm font-medium">$245.00</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium">INV-20250118-0022</p>
                <p className="text-xs text-muted-foreground">1 item • 10:30 AM</p>
              </div>
              <span className="text-sm font-medium">$89.99</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesDashboard;
