import { useEffect, useState } from "react"; // Added
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client"; // Added
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Added
import { Badge } from "@/components/ui/badge"; // Added

// --- Interface for our fetched inventory data ---
interface InventoryItem {
  id: number;
  productName: string;
  sku: string;
  category: string;
  quantity: number;
  reorderLevel: number;
}

// --- Helper function to determine stock status ---
const getStockStatus = (quantity: number, reorderLevel: number) => {
  if (quantity === 0) {
    return (
      <Badge variant="destructive" className="bg-red-700 text-white">
        Out of Stock
      </Badge>
    );
  }
  if (quantity < reorderLevel) {
    return <Badge variant="destructive">Low Stock</Badge>;
  }
  if (quantity < reorderLevel * 1.5) {
    return <Badge variant="secondary">Good</Badge>;
  }
  return <Badge className="bg-green-600 text-white">High</Badge>;
};

// --- Component 1: Current Stock ---
// This is now the real, data-driven component
const CurrentStockView = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInventory = async () => {
      setLoading(true);
      setError(null);

      // This query joins inventory with products and categories
      const { data, error } = await supabase
        .from("inventory")
        .select(`
          inventory_id,
          quantity_on_hand,
          products (
            product_name,
            sku,
            reorder_level,
            categories ( category_name )
          )
        `);

      if (error) {
        setError(error.message);
      } else {
        const mapped = (data || []).map((item: any) => ({
          id: item.inventory_id,
          quantity: item.quantity_on_hand,
          productName: item.products.product_name,
          sku: item.products.sku,
          reorderLevel: item.products.reorder_level,
          category: item.products.categories?.category_name || "N/A",
        }));
        setInventory(mapped);
      }
      setLoading(false);
    };

    fetchInventory();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Stock Levels</CardTitle>
        <CardDescription>
          A live view of all products in your inventory.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <span className="animate-pulse text-muted-foreground">
              Loading inventory...
            </span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-destructive">Error: {error}</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="px-6 py-4 text-center text-muted-foreground"
                      colSpan={5}
                    >
                      No inventory records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  inventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.productName}
                      </TableCell>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="text-right font-bold">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStockStatus(item.quantity, item.reorderLevel)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// --- Placeholder Component 2: Stock Adjustments ---
const StockAdjustments = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Adjustments</CardTitle>
        <CardDescription>
          Manually adjust stock for damages, returns, or new arrivals.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>Stock Adjustment Form will go here...</p>
        <Button>Submit Adjustment</Button>
      </CardContent>
    </Card>
  );
};

// --- Placeholder Component 3: Transaction History ---
const TransactionHistory = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>
          A log of all stock movements from sales, adjustments, and returns.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>Transaction History Data Table will go here...</p>
      </CardContent>
    </Card>
  );
};

// --- Main Inventory Page ---
const Inventory = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Inventory Management
          </h1>
          <p className="text-muted-foreground">
            Track stock levels, make adjustments, and view history.
          </p>
        </div>

        <Tabs defaultValue="current-stock" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
            <TabsTrigger value="current-stock">Current Stock</TabsTrigger>
            <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="current-stock" className="mt-4">
            <CurrentStockView />
          </TabsContent>

          <TabsContent value="adjustments" className="mt-4">
            <StockAdjustments />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <TransactionHistory />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  </div>
);

export default Inventory;