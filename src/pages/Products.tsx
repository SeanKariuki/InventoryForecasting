import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
// Import Alert Dialog for delete confirmation
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // --- IMPORT TEXTAREA ---
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MoreVertical } from "lucide-react"; // Using MoreVertical for actions
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // To hold Edit/Delete
import { useToast } from "@/hooks/use-toast";
import Fuse from "fuse.js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Import Table components

// UPDATED: Interface no longer needs stock
interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  category_id: number; // For edit form
  supplier_id: number; // For edit form
  price: number;
}

// Interfaces for our dropdowns
interface Category {
  id: number;
  name: string;
  description: string; // --- ADDED DESCRIPTION ---
}
interface Supplier {
  id: number;
  name: string;
}

const Products = () => {
  // Sorting state
  const [sortBy, setSortBy] = useState<"name"|"sku"|"category"|"price">("name");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  // Fuzzy search setup
  const fuse = new Fuse(products, {
    keys: ["name", "sku", "category"],
    threshold: 0.4,
    ignoreLocation: true,
  });

  // Compute filtered products for table
  let filteredProducts = search.trim()
    ? fuse.search(search).map(result => result.item)
    : products;

  // Sort filtered products
  filteredProducts = [...filteredProducts].sort((a, b) => {
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
  const handleSort = (col: "name"|"sku"|"category"|"price") => {
    if (sortBy === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  };
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const { toast } = useToast();

  const defaultFormState = {
    name: "",
    sku: "",
    category_id: "",
    supplier_id: "",
    price: "",
  };
  const [form, setForm] = useState(defaultFormState);

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 1. UPDATED: Fetches products, no longer needs inventory
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.from("products").select(`
        product_id,
        product_name,
        sku,
        unit_price,
        category_id, 
        supplier_id,
        categories ( category_name )
      `);

    if (error) {
      setError(error.message);
    } else {
      const mapped = (data || []).map((item: any) => ({
        id: item.product_id.toString(),
        name: item.product_name,
        sku: item.sku,
        category: item.categories?.category_name || "N/A",
        category_id: item.category_id,
        supplier_id: item.supplier_id,
        price: item.unit_price || 0,
      }));
      setProducts(mapped);
    }
    setLoading(false);
  };

  // 2. Fetches categories and suppliers for the form dropdowns
  const fetchDropdownData = async () => {
    const [catRes, supRes] = await Promise.all([
      // --- UPDATED to fetch description ---
      supabase.from("categories").select("category_id, category_name, description"),
      supabase.from("suppliers").select("supplier_id, supplier_name"),
    ]);

    if (catRes.data) {
      setCategories(
        catRes.data.map((c: any) => ({
          id: c.category_id,
          name: c.category_name,
          description: c.description || "", // --- ADDED description ---
        }))
      );
    }
    if (supRes.data) {
      setSuppliers(
        supRes.data.map((s: any) => ({
          id: s.supplier_id,
          name: s.supplier_name,
        }))
      );
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchDropdownData();
  }, []);

  // 3. Handlers for opening dialogs
  const handleAddOpen = () => {
    setForm(defaultFormState);
    setIsEditMode(false);
    setEditingProduct(null);
    setFormError(null);
    setFormDialogOpen(true);
  };

  const handleEditOpen = (product: Product) => {
    if (!product) return;
    setForm({
      name: product.name,
      sku: product.sku,
      category_id: product.category_id.toString(),
      supplier_id: product.supplier_id.toString(),
      price: product.price.toString(),
    });
    setIsEditMode(true);
    setEditingProduct(product);
    setFormError(null);
    setFormDialogOpen(true);
  };

  const handleDeleteOpen = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm({ ...form, [name]: value });
  };

  // 4. Handles both Create and Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    if (!form.name || !form.sku || !form.category_id || !form.supplier_id || !form.price) {
      setFormError("All fields are required.");
      setFormLoading(false);
      return;
    }

    if (isEditMode && editingProduct) {
      // --- UPDATE LOGIC ---
      const { error: productError } = await supabase
        .from("products")
        .update({
          product_name: form.name,
          sku: form.sku,
          category_id: Number(form.category_id),
          supplier_id: Number(form.supplier_id),
          unit_price: Number(form.price),
        })
        .eq("product_id", Number(editingProduct.id));

      if (productError) {
        setFormError(productError.message);
        setFormLoading(false);
      } else {
        toast({ title: "Product Updated!", description: `${form.name} has been updated.` });
        setFormDialogOpen(false);
        setFormLoading(false);
        await fetchProducts();
      }
    } else {
      // --- CREATE LOGIC ---
      const { data: newProduct, error: productError } = await supabase
        .from("products")
        .insert([{
          product_name: form.name,
          sku: form.sku,
          category_id: Number(form.category_id),
          supplier_id: Number(form.supplier_id),
          unit_price: Number(form.price),
          cost_price: 0,
          reorder_level: 10,
          reorder_quantity: 50,
        }])
        .select()
        .single();

      if (productError || !newProduct) {
        setFormError(productError?.message || "Failed to create product.");
        setFormLoading(false);
        return;
      }

      const { error: inventoryError } = await supabase.from("inventory").insert([{
        product_id: newProduct.product_id,
        quantity_on_hand: 0, // Default to 0
      }]);

      if (inventoryError) {
        setFormError(`Product created, but failed to set stock: ${inventoryError.message}`);
        setFormLoading(false);
      } else {
        toast({ title: "Product Created!", description: `${form.name} has been added.` });
        setFormDialogOpen(false);
        setFormLoading(false);
        await fetchProducts();
        await fetchDropdownData();
      }
    }
  };

  // 5. Handle Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    setFormLoading(true);

    const { error: inventoryError } = await supabase
      .from("inventory")
      .delete()
      .eq("product_id", Number(productToDelete.id));

    if (inventoryError) {
      toast({ title: "Delete Error", description: inventoryError.message, variant: "destructive" });
      setFormLoading(false);
      return;
    }

    const { error: productError } = await supabase
      .from("products")
      .delete()
      .eq("product_id", Number(productToDelete.id));

    if (productError) {
      toast({ title: "Delete Error", description: productError.message, variant: "destructive" });
      setFormLoading(false);
      return;
    }

    toast({ title: "Product Deleted", description: `${productToDelete.name} has been deleted.` });
    setProductToDelete(null);
    setDeleteDialogOpen(false);
    setFormLoading(false);
    await fetchProducts();
  };

  return (
    <div className="relative min-h-screen bg-background py-8 px-4 sm:px-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Products</h2>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        <Button
          className="w-full sm:w-auto shadow-lg rounded-full px-6 py-2 text-base font-semibold flex items-center gap-2"
          onClick={handleAddOpen}
        >
          <Plus className="h-5 w-5" />
          Add Product
        </Button>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px] mb-4">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card className="shadow-xl rounded-xl">
            <CardHeader className="bg-muted/40 rounded-t-xl">
              <CardTitle className="text-lg font-semibold">Product List</CardTitle>
              <CardDescription>All products in your inventory</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search Filter - moved above table */}
              <div className="mb-4 max-w-md">
                <Input
                  type="text"
                  placeholder="Search products by name, SKU, or category..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="animate-pulse text-muted-foreground">
                    Loading products...
                  </span>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-destructive">Error: {error}</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border rounded-xl bg-card">
                    <thead className="bg-muted/60">
                      <tr>
                        <th
                          className="px-6 py-3 text-left font-medium text-muted-foreground cursor-pointer select-none"
                          onClick={() => handleSort("name")}
                        >
                          Name {sortBy === "name" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                        </th>
                        <th
                          className="px-6 py-3 text-left font-medium text-muted-foreground cursor-pointer select-none"
                          onClick={() => handleSort("sku")}
                        >
                          SKU {sortBy === "sku" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                        </th>
                        <th
                          className="px-6 py-3 text-left font-medium text-muted-foreground cursor-pointer select-none"
                          onClick={() => handleSort("category")}
                        >
                          Category {sortBy === "category" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                        </th>
                        <th
                          className="px-6 py-3 text-left font-medium text-muted-foreground cursor-pointer select-none"
                          onClick={() => handleSort("price")}
                        >
                          Price {sortBy === "price" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                        </th>
                        <th className="px-6 py-3 text-left font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td className="px-6 py-4 text-center text-muted-foreground" colSpan={5}>
                            No products found.
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((product) => (
                          <tr key={product.id} className="hover:bg-muted/20 transition">
                            <td className="px-6 py-4 font-medium">{product.name}</td>
                            <td className="px-6 py-4">{product.sku}</td>
                            <td className="px-6 py-4">{product.category}</td>
                            <td className="px-6 py-4">${product.price.toFixed(2)}</td>
                            <td className="px-6 py-4 text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditOpen(product)}>
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteOpen(product)}
                                    className="text-destructive"
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            className="fixed bottom-6 right-6 z-50 shadow-lg rounded-full px-6 py-3 text-base font-semibold flex items-center gap-2 sm:hidden"
            onClick={handleAddOpen}
          >
            <Plus className="h-5 w-5" />
            Add Product
          </Button>

          <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
            <DialogContent className="max-w-md mx-auto">
              <DialogHeader>
                <DialogTitle>
                  {isEditMode ? "Edit Product" : "Add New Product"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input name="name" placeholder="Product Name" value={form.name} onChange={handleChange} required />
                <Input name="sku" placeholder="SKU" value={form.sku} onChange={handleChange} required />
                <div className="space-y-1">
                  <Label htmlFor="category_id">Category</Label>
                  <Select name="category_id" onValueChange={(value) => handleSelectChange("category_id", value)} value={form.category_id} required>
                    <SelectTrigger id="category_id"><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id.toString()} value={cat.id.toString()}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="supplier_id">Supplier</Label>
                  <Select name="supplier_id" onValueChange={(value) => handleSelectChange("supplier_id", value)} value={form.supplier_id} required>
                    <SelectTrigger id="supplier_id"><SelectValue placeholder="Select a supplier" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map((sup) => (
                        <SelectItem key={sup.id.toString()} value={sup.id.toString()}>{sup.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input name="price" type="number" min="0" step="0.01" placeholder="Unit Price" value={form.price} onChange={handleChange} required />
                {formError && <div className="text-destructive text-sm">{formError}</div>}
                <DialogFooter>
                  <Button type="submit" disabled={formLoading} className="w-full">
                    {formLoading ? (isEditMode ? "Updating..." : "Adding...") : (isEditMode ? "Update Product" : "Add Product")}
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
                  This action cannot be undone. This will permanently delete the
                  product "{productToDelete?.name}" and all of its inventory data.
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
        </TabsContent>

        <TabsContent value="categories">
          <CategoryCrud
            categories={categories}
            fetchDropdownData={fetchDropdownData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ---
//
// THIS IS THE UPDATED CATEGORY COMPONENT
//
// ---

type CategoryCrudProps = {
  categories: Category[];
  fetchDropdownData: () => Promise<void>; 
};

const CategoryCrud = ({ categories, fetchDropdownData }: CategoryCrudProps) => {
  // --- UPDATED: Form state includes description ---
  const [form, setForm] = useState({ name: "", description: "" });
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const handleOpenAdd = () => {
    setEditId(null);
    setForm({ name: "", description: "" }); // Reset form
    setDialogOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditId(cat.id);
    setForm({ name: cat.name, description: cat.description || "" }); // Prefill form
    setDialogOpen(true);
  };

  const handleOpenDelete = (cat: Category) => {
    setCategoryToDelete(cat);
    setDeleteDialogOpen(true);
  };

  // --- UPDATED: Handles both inputs ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    setLoading(true);

    if (editId === null) {
      // --- ADD LOGIC ---
      const { data: newCategory, error } = await supabase
        .from("categories")
        .insert({ 
          category_name: form.name, 
          description: form.description 
        })
        .select()
        .single();
      
      setLoading(false);

      if (error) {
        toast({ title: "Error Adding Category", description: error.message, variant: "destructive" });
      } else if (newCategory) {
        toast({ title: "Category Added!", description: newCategory.category_name });
        setDialogOpen(false);
        await fetchDropdownData(); // Refreshes the list
      }
    } else {
      // --- UPDATE LOGIC ---
      const { data: updatedCategory, error } = await supabase
        .from("categories")
        .update({ 
          category_name: form.name, 
          description: form.description 
        })
        .eq('category_id', editId)
        .select()
        .single();
      
      setLoading(false);

      if (error) {
        toast({ title: "Error Updating Category", description: error.message, variant: "destructive" });
      } else if (updatedCategory) {
        toast({ title: "Category Updated!", description: updatedCategory.category_name });
        setDialogOpen(false);
        await fetchDropdownData(); // Refreshes the list
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    setLoading(true);

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq('category_id', categoryToDelete.id);

    setLoading(false);

    if (error) {
      toast({
        title: "Delete Error",
        description: "This category is likely in use by a product. You must remove it from all products before deleting it.",
        variant: "destructive",
      });
    } else {
      toast({ title: "Category Deleted" });
      setDeleteDialogOpen(false);
      await fetchDropdownData(); // Refreshes the list
    }
  };

  return (
    <>
      <Card className="shadow-xl rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Manage Categories</CardTitle>
            <CardDescription>Add, edit, or delete product categories.</CardDescription>
          </div>
          <Button onClick={handleOpenAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-full border rounded-lg">
              <TableHeader className="bg-muted/60">
                <TableRow>
                  <TableHead className="px-4 py-2 text-left">Name</TableHead>
                  {/* --- ADDED Description Column --- */}
                  <TableHead className="px-4 py-2 text-left">Description</TableHead>
                  <TableHead className="px-4 py-2 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    {/* --- UPDATED colSpan --- */}
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                      No categories found.
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map(cat => (
                    <TableRow key={cat.id}>
                      <TableCell className="px-4 py-2 font-medium">{cat.name}</TableCell>
                      {/* --- ADDED Description Cell --- */}
                      <TableCell className="px-4 py-2 text-sm text-muted-foreground truncate max-w-xs">
                        {cat.description || "N/A"}
                      </TableCell>
                      <TableCell className="px-4 py-2 space-x-2 text-right">
                        <Button size="sm" variant="secondary" onClick={() => handleOpenEdit(cat)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleOpenDelete(cat)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* --- UPDATED: Dialog for Add/Edit Category --- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Category" : "Add New Category"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="categoryName">Category Name</Label>
              <Input
                id="categoryName"
                name="name" // --- ADDED name prop ---
                placeholder="e.g., Electronics"
                value={form.name}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>
            {/* --- ADDED Description Textarea --- */}
            <div className="space-y-1">
              <Label htmlFor="categoryDescription">Description</Label>
              <Textarea
                id="categoryDescription"
                name="description" // --- ADDED name prop ---
                placeholder="A short description of the category..."
                value={form.description}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (editId ? "Updating..." : "Adding...") : (editId ? "Update Category" : "Add Category")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- Alert Dialog for Deleting Category --- */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the category "{categoryToDelete?.name}". 
              This will fail if any products are still using this category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Products;