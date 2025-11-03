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
import { Label } from "@/components/ui/label"; // Added
import { Textarea } from "@/components/ui/textarea"; // Added
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
import { useToast } from "@/hooks/use-toast"; // Added
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Added

// UPDATED: Interface includes all fields
interface Supplier {
  id: number;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}

const SupplierPage = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const { toast } = useToast(); // Added

  // UPDATED: Form state includes all fields
  const defaultFormState = {
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
  };
  const [form, setForm] = useState(defaultFormState);
  
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // UPDATED: Fetches all supplier fields
  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("suppliers")
      .select("supplier_id, supplier_name, contact_person, email, phone, address"); // Added all fields

    if (error) {
      setError(error.message);
    } else {
      setSuppliers(
        (data || []).map((s: any) => ({
          id: s.supplier_id,
          name: s.supplier_name,
          contact_person: s.contact_person,
          email: s.email,
          phone: s.phone,
          address: s.address,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // UPDATED: Resets all fields
  const handleAddOpen = () => {
    setForm(defaultFormState);
    setIsEditMode(false);
    setEditingSupplier(null);
    setFormError(null);
    setFormDialogOpen(true);
  };

  // UPDATED: Populates all fields for editing
  const handleEditOpen = (supplier: Supplier) => {
    setForm({
      name: supplier.name,
      contact_person: supplier.contact_person || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
    });
    setIsEditMode(true);
    setEditingSupplier(supplier);
    setFormError(null);
    setFormDialogOpen(true);
  };

  const handleDeleteOpen = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setDeleteDialogOpen(true);
  };

  // UPDATED: Handles changes from any Input or Textarea
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // UPDATED: Handles submit for all fields
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    
    if (!form.name) {
      setFormError("Supplier name is required.");
      setFormLoading(false);
      return;
    }

    // Prepare data, sending null if optional fields are empty
    const supplierData = {
      supplier_name: form.name,
      contact_person: form.contact_person || null,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
    };

    if (isEditMode && editingSupplier) {
      // --- UPDATE LOGIC ---
      const { error } = await supabase
        .from("suppliers")
        .update(supplierData)
        .eq("supplier_id", editingSupplier.id);
      
      setFormLoading(false);
      if (error) {
        setFormError(error.message);
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        setFormDialogOpen(false);
        toast({ title: "Success", description: "Supplier updated." });
        fetchSuppliers();
      }
    } else {
      // --- CREATE LOGIC ---
      const { error } = await supabase
        .from("suppliers")
        .insert([supplierData]);
      
      setFormLoading(false);
      if (error) {
        setFormError(error.message);
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        setFormDialogOpen(false);
        toast({ title: "Success", description: "Supplier created." });
        fetchSuppliers();
      }
    }
  };

  // UPDATED: Adds toasts for delete
  const handleDeleteConfirm = async () => {
    if (!supplierToDelete) return;
    setFormLoading(true);
    
    const { error } = await supabase
      .from("suppliers")
      .delete()
      .eq("supplier_id", supplierToDelete.id);
    
    setFormLoading(false);
    if (error) {
      toast({ title: "Error", description: "This supplier is likely in use by a product. You must remove it from all products first.", variant: "destructive" });
      return;
    }
    
    setDeleteDialogOpen(false);
    toast({ title: "Success", description: "Supplier deleted." });
    fetchSuppliers();
  };

  return (
    <div className="relative min-h-screen bg-background py-8 px-4 sm:px-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Suppliers</h2>
          <p className="text-muted-foreground">Manage your suppliers</p>
        </div>
        <Button
          className="w-full sm:w-auto shadow-lg rounded-full px-6 py-2 text-base font-semibold flex items-center gap-2"
          onClick={handleAddOpen}
        >
          Add Supplier
        </Button>
      </div>
      <Card className="shadow-xl rounded-xl">
        <CardHeader className="bg-muted/40 rounded-t-xl">
          <CardTitle className="text-lg font-semibold">Supplier List</CardTitle>
          <CardDescription>All suppliers in your database</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="animate-pulse text-muted-foreground">Loading suppliers...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-destructive">Error: {error}</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* UPDATED: Table component used */}
              <Table className="min-w-full border rounded-xl bg-card">
                <TableHeader className="bg-muted/60">
                  <TableRow>
                    <TableHead className="px-6 py-3 text-left font-medium text-muted-foreground">Name</TableHead>
                    <TableHead className="px-6 py-3 text-left font-medium text-muted-foreground">Contact</TableHead>
                    <TableHead className="px-6 py-3 text-left font-medium text-muted-foreground">Email</TableHead>
                    <TableHead className="px-6 py-3 text-left font-medium text-muted-foreground">Phone</TableHead>
                    <TableHead className="px-6 py-3 text-left font-medium text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-6 py-4 text-center text-muted-foreground" colSpan={5}>
                        No suppliers found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    suppliers.map((supplier) => (
                      <TableRow key={supplier.id} className="hover:bg-muted/20 transition">
                        <TableCell className="px-6 py-4 font-medium">{supplier.name}</TableCell>
                        <TableCell className="px-6 py-4">{supplier.contact_person || "N/A"}</TableCell>
                        <TableCell className="px-6 py-4">{supplier.email || "N/A"}</TableCell>
                        <TableCell className="px-6 py-4">{supplier.phone || "N/A"}</TableCell>
                        <TableCell className="px-6 py-4 space-x-2">
                          <Button size="sm" variant="secondary" onClick={() => handleEditOpen(supplier)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteOpen(supplier)}>
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
      
      {/* UPDATED: Form now has all fields */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Supplier" : "Add New Supplier"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Supplier Name</Label>
              <Input id="name" name="name" placeholder="e.g., Techtronics Inc." value={form.name} onChange={handleChange} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input id="contact_person" name="contact_person" placeholder="e.g., Jane Doe" value={form.contact_person} onChange={handleChange} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="e.g., jane@techtronics.com" value={form.email} onChange={handleChange} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" placeholder="e.g., +1 234 567 890" value={form.phone} onChange={handleChange} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="address">Address (Optional)</Label>
              <Textarea id="address" name="address" placeholder="e.g., 123 Tech Way, Silicon Valley" value={form.address} onChange={handleChange} />
            </div>
            {formError && <div className="text-destructive text-sm">{formError}</div>}
            <DialogFooter>
              <Button type="submit" disabled={formLoading} className="w-full">
                {formLoading ? (isEditMode ? "Updating..." : "Adding...") : (isEditMode ? "Update Supplier" : "Add Supplier")}
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
              This action cannot be undone. This will permanently delete the supplier "{supplierToDelete?.name}".
              This will fail if any products are using this supplier.
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

export default SupplierPage;