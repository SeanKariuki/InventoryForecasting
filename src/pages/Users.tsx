import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role: string;
  created_at: string;
}

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [saving, setSaving] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
  const { data, error } = await supabase.from("users").select("id, email, username, first_name, last_name, phone, role, created_at");
      if (error) {
        setError(error.message);
        setUsers([]);
      } else {
        setUsers(data || []);
      }
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (!error) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast({ title: "User deleted", description: "The user was successfully removed.", variant: "default" });
    } else {
      alert("Failed to delete user: " + error.message);
    }
  };

  const handleEdit = (user: User) => {
    setEditId(user.id);
    setEditForm({
      username: user.username || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      phone: user.phone || "",
      role: user.role,
    });
    setEditDialogOpen(true);
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    const { username, first_name, last_name, phone, role } = editForm;
    const { error } = await supabase.from("users").update({ username, first_name, last_name, phone, role }).eq("id", id);
    if (!error) {
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, username, first_name, last_name, phone, role } : u));
      setEditId(null);
      setEditDialogOpen(false);
  toast({ title: "User updated", description: "User details were successfully saved.", variant: "default" });
    } else {
      alert("Failed to update user: " + error.message);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
        <p className="text-muted-foreground">Manage system users, roles, and access</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>All registered users</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading users...</div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">{error}</div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No users found.</div>
          ) : (
            <table className="min-w-full border rounded-lg">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left">Username</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Role</th>
                  <th className="px-4 py-2 text-left">Created At</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-2">{user.username || <span className="text-muted-foreground">-</span>}</td>
                    <td className="px-4 py-2">{user.email}</td>
                    <td className="px-4 py-2">{user.role}</td>
                    <td className="px-4 py-2">{new Date(user.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(user)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(user.id)} className="flex items-center gap-1">
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      <Dialog open={editDialogOpen} onOpenChange={open => { setEditDialogOpen(open); if (!open) setEditId(null); }}>
        <DialogContent className="max-w-lg bg-background rounded-xl border border-primary/30 shadow-2xl">
          <h3 className="text-2xl font-bold mb-2 text-primary">Edit User</h3>
          <p className="mb-6 text-muted-foreground">Update user details below. Email cannot be changed.</p>
          <form className="space-y-5" onSubmit={e => { e.preventDefault(); if (editId) handleSave(editId); }}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-muted-foreground">Username</label>
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1 focus:ring-2 focus:ring-primary"
                  value={editForm.username || ""}
                  onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))}
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-muted-foreground">Phone</label>
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1 focus:ring-2 focus:ring-primary"
                  value={editForm.phone || ""}
                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  autoComplete="tel"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-muted-foreground">First Name</label>
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1 focus:ring-2 focus:ring-primary"
                  value={editForm.first_name || ""}
                  onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))}
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-muted-foreground">Last Name</label>
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1 focus:ring-2 focus:ring-primary"
                  value={editForm.last_name || ""}
                  onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))}
                  autoComplete="family-name"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold mb-1 text-muted-foreground">Role</label>
                <Select value={editForm.role || ""} onValueChange={val => setEditForm(f => ({ ...f, role: val }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="inventory_manager">Inventory Manager</SelectItem>
                    <SelectItem value="sales_staff">Sales Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <Button
                size="lg"
                variant="default"
                type="submit"
                disabled={saving || !editId || !Object.keys(editForm).some(key => editForm[key] !== users.find(u => u.id === editId)?.[key])}
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    Saving...
                  </span>
                ) : "Save"}
              </Button>
              <Button size="lg" variant="outline" type="button" onClick={() => setEditDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
