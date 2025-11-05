import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { X, Plus } from "lucide-react";
import Fuse from "fuse.js";

// ---
// Type for decrease_inventory RPC arguments
type DecreaseInventoryArgs = {
  prod_id: number;
  sold_quantity: number;
  ref_id: number;
  ref_type: string;
};
// SHARED INTERFACES
// ---
interface SaleItem {
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Sale {
  id: number;
  invoice_number: string;
  total_amount: number;
  sale_date: string;
  items_summary: string;
  items: SaleItem[];
}

interface ProductSearch {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock: number;
}

interface CartItem {
  product_id: number;
  name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

// ---
// MAIN SALES PAGE COMPONENT
// ---
const SalesPage = () => {
  const [salesSearch, setSalesSearch] = useState("");
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [quickSaleOpen, setQuickSaleOpen] = useState(false);

  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);

  const [form, setForm] = useState({ total_amount: "", sale_date: "" });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSales = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("sales")
      .select(`
        sales_id,
        invoice_number,
        total_amount,
        sale_date,
        discount_amount,
        discount_type,
        discount_value,
        sales_items (
          quantity,
          unit_price,
          total_price,
          products ( product_name, sku )
        )
      `);

    if (error) {
      setError(error.message);
    } else {
      const mapped = (data || []).map((s: any) => {
        const items: SaleItem[] = (s.sales_items || []).map((item: any) => ({
          quantity: item.quantity,
          productName: item.products?.product_name || "N/A",
          sku: item.products?.sku || "N/A",
          unitPrice: item.unit_price,
          totalPrice: item.total_price,
        }));

        const summary = items
          .map((item) => `${item.quantity}x ${item.productName}`)
          .join(", ");

        return {
          id: s.sales_id,
          invoice_number: s.invoice_number,
          total_amount: s.total_amount,
          sale_date: s.sale_date,
          items_summary: summary,
          items: items,
          discount_amount: s.discount_amount ?? 0,
          discount_type: s.discount_type ?? null,
          discount_value: s.discount_value ?? null,
        };
      });
      setSales(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handleAddOpen = () => {
    setQuickSaleOpen(true);
  };

  const handleEditOpen = (sale: Sale) => {
    const formattedDate = sale.sale_date
      ? new Date(sale.sale_date).toISOString().split("T")[0]
      : "";
    setForm({
      total_amount: sale.total_amount.toString(),
      sale_date: formattedDate,
    });
    setIsEditMode(true);
    setEditingSale(sale);
    setFormError(null);
    setEditDialogOpen(true);
  };

  const handleDeleteOpen = (sale: Sale) => {
    setSaleToDelete(sale);
    setDeleteDialogOpen(true);
  };

  const handleViewOpen = (sale: Sale) => {
    setViewingSale(sale);
    setViewDialogOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditMode || !editingSale) return;

    setFormLoading(true);
    setFormError(null);

    if (!form.total_amount || !form.sale_date) {
      setFormError("All fields are required.");
      setFormLoading(false);
      return;
    }

    const saleData = {
      invoice_number: editingSale.invoice_number,
      total_amount: Number(form.total_amount),
      sale_date: form.sale_date,
      tax_amount: 0,
      discount_amount: 0,
    };

    const { error } = await supabase
      .from("sales")
      .update(saleData)
      .eq("sales_id", editingSale.id);

    setFormLoading(false);
    if (error) {
      setFormError(error.message);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setEditDialogOpen(false);
      toast({ title: "Success", description: "Sale record updated." });
      fetchSales();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!saleToDelete) return;
    setFormLoading(true);

    const { error } = await supabase
      .from("sales")
      .delete()
      .eq("sales_id", saleToDelete.id);

    setFormLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setDeleteDialogOpen(false);
    toast({ title: "Success", description: "Sale record deleted." });
    fetchSales();
  };

  // Sort sales from newest to oldest
  const sortedSales = [...sales].sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
  // Fuzzy search for sales
  const fuse = new Fuse(sortedSales, {
    keys: ["invoice_number", "items_summary", "sale_date"],
    threshold: 0.4,
    ignoreLocation: true,
  });
  const filteredSales = salesSearch.trim()
    ? fuse.search(salesSearch).map(result => result.item)
    : sortedSales;

  return (
    <div className="relative min-h-screen bg-background py-8 px-4 sm:px-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Sales</h2>
          <p className="text-muted-foreground">Manage your sales records</p>
        </div>
        <Button
          className="w-full sm:w-auto shadow-lg rounded-full px-6 py-2 text-base font-semibold flex items-center gap-2"
          onClick={handleAddOpen}
        >
          <Plus className="h-5 w-5" />
          Add Sale
        </Button>
      </div>
      <Card className="shadow-xl rounded-xl">
        <CardHeader className="bg-muted/40 rounded-t-xl">
          <CardTitle className="text-lg font-semibold">Sales List</CardTitle>
          <CardDescription>All sales in your database</CardDescription>
          <div className="mt-4 flex justify-start">
            <div className="w-full max-w-xs">
              <Input
                type="text"
                className="px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-primary"
                placeholder="Search sales by invoice, product, or date..."
                value={salesSearch}
                onChange={e => setSalesSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="animate-pulse text-muted-foreground">
                Loading sales...
              </span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-destructive">Error: {error}</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-full border rounded-xl bg-card">
                <TableHeader className="bg-muted/60">
                  <TableRow>
                    <TableHead className="px-6 py-3 text-left font-medium text-muted-foreground">
                      Invoice #
                    </TableHead>
                    <TableHead className="px-6 py-3 text-left font-medium text-muted-foreground">
                      Items Sold
                    </TableHead>
                    <TableHead className="px-6 py-3 text-left font-medium text-muted-foreground">
                      Total Amount
                    </TableHead>
                    <TableHead className="px-6 py-3 text-left font-medium text-muted-foreground">
                      Sale Date
                    </TableHead>
                    <TableHead className="px-6 py-3 text-left font-medium text-muted-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="px-6 py-4 text-center text-muted-foreground"
                        colSpan={5}
                      >
                        No sales found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSales.map((sale) => (
                      <TableRow
                        key={sale.id}
                        className="hover:bg-muted/20 transition"
                      >
                        <TableCell className="px-6 py-4 font-medium">
                          {sale.invoice_number}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground truncate max-w-xs">
                          {sale.items_summary || "N/A"}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          ${sale.total_amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {new Date(sale.sale_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="px-6 py-4 space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewOpen(sale)}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEditOpen(sale)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteOpen(sale)}
                          >
                            Delete
                          </Button>
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

      {/* --- Edit Dialog --- */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Edit Sale</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="invoice_number_display">Invoice Number</Label>
              <Input
                id="invoice_number_display"
                value={editingSale?.invoice_number}
                readOnly
                disabled
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="total_amount">Total Amount</Label>
              <Input
                id="total_amount"
                name="total_amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g., 129.99"
                value={form.total_amount}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sale_date">Sale Date</Label>
              <Input
                id="sale_date"
                name="sale_date"
                type="date"
                value={form.sale_date}
                onChange={handleChange}
                required
              />
            </div>
            {formError && (
              <div className="text-destructive text-sm">{formError}</div>
            )}
            <DialogFooter>
              <Button type="submit" disabled={formLoading} className="w-full">
                {formLoading ? "Updating..." : "Update Sale"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- Delete Alert Dialog --- */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the sale record and all its associated
              items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={formLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {formLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- View Sale Details Dialog --- */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg mx-auto">
          <DialogHeader>
            <DialogTitle>Sale Details</DialogTitle>
            <DialogDescription>
              Invoice: {viewingSale?.invoice_number}
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <ScrollArea className="h-[200px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingSale?.items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        No items found for this sale.
                      </TableCell>
                    </TableRow>
                  ) : (
                    viewingSale?.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {item.productName}
                        </TableCell>
                        <TableCell>{item.sku}</TableCell>
                        <TableCell className="text-center">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          ${item.unitPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          ${item.totalPrice.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
          <DialogFooter className="sm:justify-between items-center">
            <div className="flex flex-col gap-1">
              <div className="text-sm text-muted-foreground">
                Sale Date: {viewingSale ? new Date(viewingSale.sale_date).toLocaleDateString() : "N/A"}
              </div>
              {viewingSale && (viewingSale as any).discount_amount > 0 && (
                <div className="text-sm text-blue-700 font-semibold">
                  Discount Applied: -${(viewingSale as any).discount_amount.toFixed(2)}
                </div>
              )}
            </div>
            <div className="text-lg font-bold">
              Grand Total: ${viewingSale?.total_amount.toFixed(2)}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Quick Sale Dialog is now in this file --- */}
      <QuickSaleDialog
        open={quickSaleOpen}
        onOpenChange={setQuickSaleOpen}
        onSaleCreated={fetchSales} // Pass the refresh function
      />
    </div>
  );
};

// ---
//
// QUICK SALE DIALOG COMPONENT
//
// ---

type QuickSaleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaleCreated: () => void; // Function to refresh the sales list
};

const QuickSaleDialog = ({
  open,
  onOpenChange,
  onSaleCreated,
}: QuickSaleDialogProps) => {
  const [products, setProducts] = useState<ProductSearch[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [discountType, setDiscountType] = useState<'percent'|'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const { toast } = useToast();

  // Fetch products for the search bar
  const fetchProducts = async () => {
    // Use left join to ensure all products are fetched, even if no inventory row exists
    const { data, error } = await supabase
      .from("products")
      .select(`
        product_id,
        product_name,
        sku,
        unit_price,
        inventory:inventory(product_id, quantity_on_hand)
      `)
      .limit(100);

    // Debug log: see what is returned from Supabase
    console.log("Supabase products data:", data);

    if (data) {
      const mapped: ProductSearch[] = data.map((p: any) => ({
        id: p.product_id,
        name: p.product_name,
        sku: p.sku,
        price: p.unit_price,
        // If inventory row is missing, treat stock as 0
        stock: Array.isArray(p.inventory) && p.inventory.length > 0
          ? p.inventory[0].quantity_on_hand || 0
          : 0,
      }));
      console.log("Mapped products:", mapped);
      setProducts(mapped);
    }
  };

  useEffect(() => {
    if (open) {
      fetchProducts();
      setCart([]);
    }
  }, [open]);

  const handleProductSelect = (product: ProductSearch) => {
    // Check for stock
    if (product.stock <= 0) {
      toast({
        title: "Out of Stock",
        description: `${product.name} is currently out of stock.`,
        variant: "destructive",
      });
      return;
    }
    
    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.product_id === product.id
      );

      if (existingItem) {
        // Check stock before incrementing
        if (existingItem.quantity + 1 > product.stock) {
           toast({
            title: "Stock Limit Reached",
            description: `Only ${product.stock} units of ${product.name} available.`,
            variant: "destructive",
          });
          return currentCart;
        }
        // Increment quantity
        return currentCart.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total_price: (item.quantity + 1) * item.unit_price,
              }
            : item
        );
      } else {
        // Add new item to cart
        return [
          ...currentCart,
          {
            product_id: product.id,
            name: product.name,
            sku: product.sku,
            quantity: 1,
            unit_price: product.price,
            total_price: product.price,
          },
        ];
      }
    });
    setSearchQuery("");
  };

  const handleQuantityChange = (productId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      setCart(cart.filter((item) => item.product_id !== productId));
      return;
    }

    // Check stock on quantity change
    const product = products.find(p => p.id === productId);
    if (product && newQuantity > product.stock) {
      toast({
        title: "Stock Limit Reached",
        description: `Only ${product.stock} units of ${product.name} available.`,
        variant: "destructive",
      });
      // Set to max available stock instead of blocking
      setCart(
        cart.map((item) =>
          item.product_id === productId
            ? {
                ...item,
                quantity: product.stock,
                total_price: product.stock * item.unit_price,
              }
            : item
        )
      );
      return;
    }

    setCart(
      cart.map((item) =>
        item.product_id === productId
          ? {
              ...item,
              quantity: newQuantity,
              total_price: newQuantity * item.unit_price,
            }
          : item
      )
    );
  };

  const handleRemoveItem = (productId: number) => {
    setCart(cart.filter((item) => item.product_id !== productId));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.total_price, 0);
  };
  const totalAmount = calculateTotal();
  // Calculate discount
  const discountAmount = discountType === 'percent'
    ? (totalAmount * (discountValue / 100))
    : discountValue;
  const finalAmount = Math.max(totalAmount - discountAmount, 0);

  const handleSubmitSale = async () => {
    if (cart.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Add products to the cart before submitting.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create the main 'sales' record
      const { data: newSale, error: saleError } = await supabase
        .from("sales")
        .insert({
          invoice_number: "PENDING", // Satisfy TypeScript
          total_amount: finalAmount,
          sale_date: new Date().toISOString(),
          tax_amount: 0,
          discount_amount: discountAmount,
          sale_status: "completed",
          payment_method: "cash",
          discount_type: discountType,
          discount_value: discountValue,
        })
        .select()
        .single();

      if (saleError || !newSale) {
        throw new Error(saleError?.message || "An unknown error occurred creating the sale.");
      }

      // Step 2: Prepare the 'sales_items' records
      const saleItemsData = cart.map((item) => ({
        sales_id: newSale.sales_id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }));

      // Step 3: Insert all 'sales_items'
      const { error: itemsError } = await supabase
        .from("sales_items")
        .insert(saleItemsData);

      if (itemsError) {
        // This is a critical error, we should try to roll back the sale
        // For now, we'll just show a scary toast
        throw new Error(`Sale ${newSale.invoice_number} was created, but items failed to add: ${itemsError.message}`);
      }

      // Step 4: Update inventory USING THE RPC FUNCTION
      // This will either succeed or throw an error if stock is too low
      for (const item of cart) {
        const { error: rpcError } = await (supabase.rpc as any)(
          "decrease_inventory",
          {
            prod_id: item.product_id,
            sold_quantity: item.quantity,
            ref_id: newSale.sales_id,
            ref_type: "sale",
          }
        );
        
        if (rpcError) {
          // This is where the "Not enough stock" error will be caught
          throw new Error(`Failed to update stock for ${item.name}: ${rpcError.message}`);
        }
      }

      // If all steps succeeded:
      setLoading(false);
      toast({
        title: "Sale Created!",
        description: `Invoice ${newSale.invoice_number} successfully created.`,
      });
      onSaleCreated(); // Refresh the sales list
      onOpenChange(false); // Close the dialog

    } catch (error: any) {
      // This single block will catch ANY error from the steps above
      setLoading(false);
      toast({
        title: "Sale Failed",
        description: error.message,
        variant: "destructive",
        duration: 7000,
      });
    }
  };

  // Filter products for the search command
  const filteredProducts = searchQuery
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl mx-auto">
        <DialogHeader>
          <DialogTitle>Create New Sale (POS)</DialogTitle>
          <DialogDescription>
            Search for products to add them to the cart.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-6">
          {/* Left Side: Product Search */}
          <div className="col-span-1">
            <Command>
              <CommandInput
                placeholder="Search by name or SKU..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <ScrollArea className="h-[300px]">
                  <CommandEmpty>No products found.</CommandEmpty>
                  <CommandGroup>
                    {filteredProducts.map((product) => (
                      <CommandItem
                        key={product.id}
                        onSelect={() => handleProductSelect(product)}
                        className={
                          `cursor-pointer transition-colors duration-150 ` +
                          `hover:bg-[#E3E8FF] ` +
                          (product.stock <= 0 ? 'opacity-50 pointer-events-none' : '')
                        }
                        disabled={product.stock <= 0}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{product.name}</span>
                          <span className="text-sm text-muted-foreground">
                            SKU: {product.sku} | Stock: {product.stock} | $
                            {product.price.toFixed(2)}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </ScrollArea>
              </CommandList>
            </Command>
          </div>

          {/* Right Side: Cart */}
          <div className="col-span-2">
            <h3 className="text-lg font-semibold mb-2">Cart</h3>
            <ScrollArea className="h-[300px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="w-[100px]">Qty</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground"
                      >
                        Cart is empty
                      </TableCell>
                    </TableRow>
                  ) : (
                    cart.map((item) => (
                      <TableRow key={item.product_id}>
                        <TableCell>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            ${item.unit_price.toFixed(2)} each
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) =>
                              handleQuantityChange(
                                item.product_id,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${item.total_price.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.product_id)}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
            {/* Discount Section */}
            <div className="flex flex-col gap-2 mt-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Discount:</span>
                <select
                  value={discountType}
                  onChange={e => setDiscountType(e.target.value as 'percent'|'fixed')}
                  className="border rounded px-2 py-1"
                >
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed ($)</option>
                </select>
                <Input
                  type="number"
                  min="0"
                  max={discountType === 'percent' ? 100 : totalAmount}
                  value={discountValue}
                  onChange={e => setDiscountValue(Number(e.target.value))}
                  className="w-24"
                  placeholder={discountType === 'percent' ? 'e.g. 10' : 'e.g. 5'}
                />
              </div>
              <div className="flex justify-end items-center gap-4">
                <span className="text-base">Subtotal: ${totalAmount.toFixed(2)}</span>
                <span className="text-base">Discount: -${discountAmount.toFixed(2)}</span>
                <span className="text-xl font-bold">Final Total: ${finalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmitSale}
            disabled={loading || cart.length === 0}
          >
            {loading ? "Submitting..." : "Submit Sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SalesPage;