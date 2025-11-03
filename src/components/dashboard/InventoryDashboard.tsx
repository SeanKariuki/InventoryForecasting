import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Package, TrendingDown, Warehouse } from "lucide-react";

const InventoryDashboard = () => {
  const stats = [
    {
      title: "Total Items",
      value: "156",
      description: "Active products",
      icon: Package,
    },
    {
      title: "Low Stock Items",
      value: "12",
      description: "Need reordering",
      icon: AlertTriangle,
    },
    {
      title: "Stock Value",
      value: "$45,230",
      description: "Total inventory value",
      icon: Warehouse,
    },
    {
      title: "Out of Stock",
      value: "3",
      description: "Requires immediate action",
      icon: TrendingDown,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Inventory Dashboard</h2>
        <p className="text-muted-foreground">Monitor and manage your stock levels</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      {/* Inventory Table Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Inventory Items</h3>
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90">Add Item</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border rounded-lg">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">SKU</th>
                <th className="px-4 py-2 text-left">Stock</th>
                <th className="px-4 py-2 text-left">Price</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Placeholder rows */}
              <tr>
                <td className="px-4 py-2">Laptop Stand Pro</td>
                <td className="px-4 py-2">LSP-001</td>
                <td className="px-4 py-2">0</td>
                <td className="px-4 py-2">$49.99</td>
                <td className="px-4 py-2 space-x-2">
                  <button className="bg-secondary px-2 py-1 rounded hover:bg-secondary/80">Edit</button>
                  <button className="bg-destructive text-white px-2 py-1 rounded hover:bg-destructive/80">Delete</button>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2">Wireless Mouse</td>
                <td className="px-4 py-2">WM-002</td>
                <td className="px-4 py-2">5</td>
                <td className="px-4 py-2">$19.99</td>
                <td className="px-4 py-2 space-x-2">
                  <button className="bg-secondary px-2 py-1 rounded hover:bg-secondary/80">Edit</button>
                  <button className="bg-destructive text-white px-2 py-1 rounded hover:bg-destructive/80">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ...existing cards for alerts and forecast summary... */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stock Alerts</CardTitle>
            <CardDescription>Items requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <div className="h-2 w-2 rounded-full bg-destructive" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Laptop Stand Pro</p>
                  <p className="text-xs text-muted-foreground">Out of stock</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-warning/20 bg-warning/5 p-3">
                <div className="h-2 w-2 rounded-full bg-warning" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Wireless Mouse</p>
                  <p className="text-xs text-muted-foreground">Low stock: 5 units</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Forecast Summary</CardTitle>
            <CardDescription>Predicted stock needs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Next 7 days</span>
                <span className="text-sm font-medium">92% accuracy</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Reorder suggestions</span>
                <span className="text-sm font-medium text-primary">8 products</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InventoryDashboard;
