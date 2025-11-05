import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Warehouse,
  TrendingUp,
  Bell,
  Users,
  FileText,
} from "lucide-react";

const Sidebar = () => {
  const { profile } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["admin", "inventory_manager", "sales_staff"] },
    { name: "Products", href: "/products", icon: Package, roles: ["admin", "inventory_manager", "sales_staff"] },
    { name: "Inventory", href: "/inventory", icon: Warehouse, roles: ["admin", "inventory_manager"] },
    { name: "Sales", href: "/sales", icon: ShoppingCart, roles: ["admin", "inventory_manager", "sales_staff"] },
    { name: "Forecasting", href: "/forecasting", icon: TrendingUp, roles: ["admin", "inventory_manager"] },
    { name: "Alerts", href: "/alerts", icon: Bell, roles: ["admin", "inventory_manager", "sales_staff"] },
    { name: "Reports", href: "/reports", icon: FileText, roles: ["admin", "inventory_manager"] },
  { name: "Users", href: "/users", icon: Users, roles: ["admin"] },
  { name: "Suppliers", href: "/supplier", icon: Package, roles: ["admin", "inventory_manager"] },
  ];

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(profile?.role || "sales_staff")
  );

  return (
    <aside className="hidden w-64 border-r border-border bg-card lg:block">
      <nav className="flex h-full flex-col gap-2 p-4">
        {filteredNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;

          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
