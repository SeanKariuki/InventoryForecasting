import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";

const AccountPage = () => {
  const { profile, setProfile, loading } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    phone: "",
  });
  const [saving, setSaving] = useState(false);
  const isAdmin = profile?.role === "admin";

  // When entering edit mode, pre-fill form with current profile data
  const handleEditClick = () => {
    setForm({
      username: profile?.username || "",
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      phone: profile?.phone || "",
    });
    setEditMode(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    const updateData: any = {
      username: form.username,
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone,
    };
    const { error } = await supabase.from("users").update(updateData).eq("id", profile.id);
    if (!error) {
      setProfile({ ...profile, ...updateData });
      setEditMode(false);
    } else {
      alert("Failed to update profile: " + error.message);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="animate-pulse text-muted-foreground text-lg">Loading account...</span>
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-destructive text-lg">Profile not found.</span>
      </div>
    );
  }
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-8">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold tracking-tight mb-2">Account Management</h2>
        <p className="text-muted-foreground text-lg">Update your personal information below.</p>
      </div>
      <div className="bg-card rounded-2xl shadow-xl p-8 border border-border">
        {!editMode ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1">Username</div>
                <div className="font-semibold text-lg text-foreground">{profile.username || <span className="text-muted-foreground">-</span>}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1">Phone Number</div>
                <div className="font-semibold text-lg text-foreground">{profile.phone || <span className="text-muted-foreground">-</span>}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1">First Name</div>
                <div className="font-semibold text-lg text-foreground">{profile.first_name || <span className="text-muted-foreground">-</span>}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1">Last Name</div>
                <div className="font-semibold text-lg text-foreground">{profile.last_name || <span className="text-muted-foreground">-</span>}</div>
              </div>
            </div>
            <div className="flex justify-center mt-8">
              <Button size="lg" variant="default" onClick={handleEditClick}>
                Edit Profile
              </Button>
            </div>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={e => { e.preventDefault(); handleSave(); }}>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold mb-2 text-muted-foreground">Username</label>
                <Input name="username" value={form.username} onChange={handleChange} className="w-full focus:ring-2 focus:ring-primary focus:border-primary" autoComplete="username" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 text-muted-foreground">Phone Number</label>
                <Input name="phone" value={form.phone} onChange={handleChange} className="w-full focus:ring-2 focus:ring-primary focus:border-primary" autoComplete="tel" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 text-muted-foreground">First Name</label>
                <Input name="first_name" value={form.first_name} onChange={handleChange} className="w-full focus:ring-2 focus:ring-primary focus:border-primary" autoComplete="given-name" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 text-muted-foreground">Last Name</label>
                <Input name="last_name" value={form.last_name} onChange={handleChange} className="w-full focus:ring-2 focus:ring-primary focus:border-primary" autoComplete="family-name" />
              </div>
            </div>
            <div className="flex justify-center gap-4 mt-8">
              <Button size="lg" variant="default" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button size="lg" variant="outline" type="button" onClick={() => setEditMode(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AccountPage;
