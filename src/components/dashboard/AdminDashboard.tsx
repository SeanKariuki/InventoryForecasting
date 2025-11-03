import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users, DollarSign, TrendingUp } from "lucide-react";

const AdminDashboard = () => {
  const stats = [
    {
      title: "Total Products",
      value: "156",
      description: "+12 from last month",
      icon: Package,
      trend: "up",
    },
    {
      title: "Active Users",
      value: "8",
      description: "2 admins, 3 managers, 3 staff",
      icon: Users,
      trend: "neutral",
    },
    {
      title: "Monthly Revenue",
      value: "$24,580",
      description: "+18% from last month",
      icon: DollarSign,
      trend: "up",
    },
    {
      title: "Forecast Accuracy",
      value: "92.5%",
      description: "+2.3% improvement",
      icon: TrendingUp,
      trend: "up",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
        <p className="text-muted-foreground">Overview of your entire system</p>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>System events and user actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-lg border border-border p-4">
                <div className="h-2 w-2 rounded-full bg-success" />
                <div className="flex-1">
                  <p className="text-sm font-medium">New sale recorded</p>
                  <p className="text-xs text-muted-foreground">Invoice #INV-20250118-0023</p>
                </div>
                <span className="text-xs text-muted-foreground">2m ago</span>
              </div>
              <div className="flex items-center gap-4 rounded-lg border border-border p-4">
                <div className="h-2 w-2 rounded-full bg-warning" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Low stock alert</p>
                  <p className="text-xs text-muted-foreground">Product SKU-1234 below reorder level</p>
                </div>
                <span className="text-xs text-muted-foreground">15m ago</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <button className="w-full rounded-lg border border-border p-3 text-left text-sm hover:bg-muted">
                Add New User
              </button>
              <button className="w-full rounded-lg border border-border p-3 text-left text-sm hover:bg-muted">
                Generate Report
              </button>
              <button className="w-full rounded-lg border border-border p-3 text-left text-sm hover:bg-muted">
                View System Settings
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
