import { NavLink, useLocation } from "react-router-dom";
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
  const { profile, loading } = useAuth();
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

  if (loading) {
    // Show skeleton sidebar while loading
    return (
      <aside className="hidden w-64 border-r border-border bg-card lg:block sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto animate-pulse">
        <nav className="flex h-full flex-col gap-2 p-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="h-4 w-4 rounded bg-muted animate-pulse" />
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <aside className="hidden w-64 border-r border-border bg-card lg:block sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
      <nav className="flex h-full flex-col gap-2 p-4">
        {filteredNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;

          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
              end={item.href === "/"}
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
