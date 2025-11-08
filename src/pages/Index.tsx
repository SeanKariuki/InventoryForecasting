import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import InventoryDashboard from "@/components/dashboard/InventoryDashboard";
import SalesDashboard from "@/components/dashboard/SalesDashboard";

const Index = () => {
  const { profile, loading } = useAuth();

  const renderDashboard = () => {
    switch (profile?.role) {
      case "admin":
        return <AdminDashboard />;
      case "inventory_manager":
        return <InventoryDashboard />;
      case "sales_staff":
        return <SalesDashboard />;
      default:
        return <SalesDashboard />;
    }
  };

  // Only show loading overlay if profile is null and loading is true (initial app load)
  if (loading && !profile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4">
          <span className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-muted-foreground text-lg animate-pulse">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return renderDashboard();
};

export default Index;
