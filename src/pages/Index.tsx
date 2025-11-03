import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import InventoryDashboard from "@/components/dashboard/InventoryDashboard";
import SalesDashboard from "@/components/dashboard/SalesDashboard";

const Index = () => {
  const { profile } = useAuth();

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">{renderDashboard()}</main>
      </div>
    </div>
  );
};

export default Index;
