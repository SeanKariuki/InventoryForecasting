import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Index from "./pages/Index";
import AlertsPage from "./pages/Alerts";
import Auth from "./pages/Auth";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import NotFound from "./pages/NotFound";
import SupplierPage from "./pages/Supplier";
import SalesPage from "./pages/Sales";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
  {/* Remove Sonner if not imported or needed */}
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-background">
                  <Navbar />
                  <div className="flex">
                    <Sidebar />
                    <main className="flex-1 p-6">
                      <Products />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <Inventory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supplier"
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-background">
                  <Navbar />
                  <div className="flex">
                    <Sidebar />
                    <main className="flex-1 p-6">
                      <SupplierPage />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
            <Route
              path="/sales"
              element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-background">
                    <Navbar />
                    <div className="flex">
                      <Sidebar />
                      <main className="flex-1 p-6">
                        <SalesPage />
                      </main>
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-background">
                  <Navbar />
                  <div className="flex">
                    <Sidebar />
                    <main className="flex-1 p-6">
                      <AlertsPage />
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
