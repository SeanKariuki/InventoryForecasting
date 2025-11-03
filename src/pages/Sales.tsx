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

interface Sale {
  id: number;
  invoice_number: string;
  total_amount: number;
  sale_date: string; // This will be the raw ISO string
}

const SalesPage = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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
      .select("sales_id, invoice_number, total_amount, sale_date");
    if (error) {
      setError(error.message);
    } else {
      setSales(
        (data || []).map((s: any) => ({
          id: s.sales_id,
          invoice_number: s.invoice_number,
          total_amount: s.total_amount,
          sale_date: s.sale_date,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handleAddOpen = () => {
    setForm({ total_amount: "", sale_date: "" });
    setIsEditMode(false);
    setEditingSale(null);
    setFormError(null);
    setFormDialogOpen(true);
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
    setFormDialogOpen(true);
  };

  const handleDeleteOpen = (sale: Sale) => {
    setSaleToDelete(sale);
    setDeleteDialogOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ---
  //
  // THIS FUNCTION IS NOW FIXED
  //
  // ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    if (!form.total_amount || !form.sale_date) {
      setFormError("All fields are required.");
      setFormLoading(false);
      return;
    }

    if (isEditMode && editingSale) {
      // --- FIX 1: UPDATE LOGIC ---
      // We must provide the invoice_number to satisfy TypeScript,
      // even though we aren't changing it.
      const saleData = {
        invoice_number: editingSale.invoice_number, // Pass the existing one
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
        setFormDialogOpen(false);
        toast({ title: "Success", description: "Sale record updated." });
        fetchSales();
      }
    } else {
      // --- FIX 2: CREATE LOGIC ---
      // We add a dummy invoice_number to satisfy TypeScript.
      // The database trigger will overwrite this value.
      const saleData = {
        invoice_number: "PENDING", // This will be ignored and replaced by the trigger
        total_amount: Number(form.total_amount),
        sale_date: form.sale_date,
        tax_amount: 0,
        discount_amount: 0,
      };

      const { error } = await supabase.from("sales").insert([saleData]);

      setFormLoading(false);
      if (error) {
        setFormError(error.message);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setFormDialogOpen(false);
        toast({ title: "Success", description: "Sale record created." });
        fetchSales();
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!saleToDelete) return;
    setFormLoading(true);

    const { error: itemsError } = await supabase
      .from("sales_items")
      .delete()
      .eq("sales_id", saleToDelete.id);

    if (itemsError) {
      setFormLoading(false);
      toast({
        title: "Error",
        description: itemsError.message,
        variant: "destructive",
      });
      return;
    }

    const { error: saleError } = await supabase
      .from("sales")
      .delete()
      .eq("sales_id", saleToDelete.id);

    setFormLoading(false);
    if (saleError) {
      toast({
        title: "Error",
        description: saleError.message,
        variant: "destructive",
      });
      return;
    }

    setDeleteDialogOpen(false);
    toast({ title: "Success", description: "Sale record deleted." });
    fetchSales();
  };

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
          Add Sale
        </Button>
      </div>
      <Card className="shadow-xl rounded-xl">
        <CardHeader className="bg-muted/40 rounded-t-xl">
          <CardTitle className="text-lg font-semibold">Sales List</CardTitle>
          <CardDescription>All sales in your database</CardDescription>
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
                  {sales.length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="px-6 py-4 text-center text-muted-foreground"
                        colSpan={4}
                      >
                        No sales found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.map((sale) => (
                      <TableRow
                        key={sale.id}
                        className="hover:bg-muted/20 transition"
                      >
                        <TableCell className="px-6 py-4 font-medium">
                          {sale.invoice_number}
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

      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Sale" : "Add New Sale"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isEditMode && (
              <div className="space-y-1">
                <Label htmlFor="invoice_number_display">Invoice Number</Label>
                <Input
                  id="invoice_number_display"
                  value={editingSale?.invoice_number}
                  readOnly
                  disabled
                />
              </div>
            )}

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
                {formLoading
                  ? isEditMode
                    ? "Updating..."
                    : "Adding..."
                  : isEditMode
                  ? "Update Sale"
                  : "Add Sale"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
    </div>
  );
};

export default SalesPage;