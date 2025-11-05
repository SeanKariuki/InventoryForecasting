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
import Fuse from "fuse.js";

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
  // Sorting state
  const [sortBy, setSortBy] = useState<"productName"|"sku"|"category"|"quantity">("productName");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");
  const [search, setSearch] = useState("");

  // Fuzzy search setup
  const fuse = new Fuse(inventory, {
    keys: ["productName", "sku", "category"],
    threshold: 0.4,
    ignoreLocation: true,
  });

  // Filter inventory by fuzzy search
  let filteredInventory = search.trim()
    ? fuse.search(search).map(result => result.item)
    : inventory;

  // Sort filtered inventory before rendering
  const sortedInventory = [...filteredInventory].sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];
    if (typeof valA === "string" && typeof valB === "string") {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }
    if (valA < valB) return sortDir === "asc" ? -1 : 1;
    if (valA > valB) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  // Handle sort change
  const handleSort = (col: "productName"|"sku"|"category"|"quantity") => {
    if (sortBy === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

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
            product_id,
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
          productId: item.products.product_id,
        }));
        setInventory(mapped);

        // --- ALERT CREATION LOGIC ---
        for (const item of mapped) {
          // Out of Stock
          if (item.quantity === 0) {
            await supabase.from("alerts").insert({
              alert_type: "stock",
              alert_title: `Out of Stock: ${item.productName}`,
              alert_message: `${item.productName} (SKU: ${item.sku}) is out of stock!`,
              severity: "critical",
              product_id: item.productId,
              is_read: false,
              is_resolved: false,
              created_at: new Date().toISOString(),
            });
          } else if (item.quantity < item.reorderLevel) {
            await supabase.from("alerts").insert({
              alert_type: "stock",
              alert_title: `Low Stock: ${item.productName}`,
              alert_message: `${item.productName} (SKU: ${item.sku}) is below reorder level (${item.quantity} < ${item.reorderLevel})`,
              severity: "high",
              product_id: item.productId,
              is_read: false,
              is_resolved: false,
              created_at: new Date().toISOString(),
            });
          }
        }
        // --- END ALERT CREATION ---
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
        {/* Search Filter */}
        <div className="mb-4 max-w-md">
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Search by product name, SKU, or category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
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
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("productName")}
                  >
                    Product Name {sortBy === "productName" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("sku")}
                  >
                    SKU {sortBy === "sku" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("category")}
                  >
                    Category {sortBy === "category" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer select-none"
                    onClick={() => handleSort("quantity")}
                  >
                    Quantity {sortBy === "quantity" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </TableHead>
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
                  sortedInventory.map((item) => (
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