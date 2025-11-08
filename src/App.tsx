          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-background">
                  <Navbar />
                  <div className="flex">
                    <Sidebar />
                    <main className="flex-1 p-6">
                      <AccountPage />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Index from "./pages/Index";
import AlertsPage from "./pages/Alerts";
import Auth from "./pages/Auth";
import Products from "./pages/Products";
import UsersPage from "./pages/Users";
import AccountPage from "./pages/Account";
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-background">
                  <Navbar />
                  <div className="flex">
                    <Sidebar />
                    <main className="flex-1 p-6">
                      <AccountPage />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
import Inventory from "./pages/Inventory";
import NotFound from "./pages/NotFound";
import ReportsPage from "./pages/Reports";
import SupplierPage from "./pages/Supplier";
import SalesPage from "./pages/Sales";
import Forecasting from "./pages/Forecasting";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="*"
            element={
              <div className="min-h-screen bg-background">
                <Navbar />
                <div className="flex">
                  <Sidebar />
                  <main className="flex-1 p-6">
                    <Routes>
                      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                      <Route path="/forecasting" element={<ProtectedRoute><Forecasting /></ProtectedRoute>} />
                      <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
                      <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
                      <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
                      <Route path="/supplier" element={<ProtectedRoute><SupplierPage /></ProtectedRoute>} />
                      <Route path="/sales" element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
                      <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
                      <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
                      <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                </div>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
