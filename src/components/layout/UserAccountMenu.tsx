import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";

const UserAccountMenu = () => {
  const { profile, setProfile } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    email: profile?.email || "",
    role: profile?.role || "",
  });
  const [saving, setSaving] = useState(false);
  const isAdmin = profile?.role === "admin";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (value: string) => {
    setForm({ ...form, role: value });
  };

  const handleSave = async () => {
    setSaving(true);
    const updateData: any = { email: form.email };
    if (isAdmin) updateData.role = form.role;
    const { error } = await supabase.from("users").update(updateData).eq("id", profile.id);
    if (!error) {
      setProfile({ ...profile, ...updateData });
      setEditMode(false);
    } else {
      alert("Failed to update profile: " + error.message);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4 p-4">
      {!editMode ? (
        <>
          <div className="space-y-1">
            <div className="font-semibold">Email</div>
            <div className="text-muted-foreground">{profile.email}</div>
          </div>
          <div className="space-y-1">
            <div className="font-semibold">Role</div>
            <div className="text-muted-foreground">{profile.role}</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
            Edit Profile
          </Button>
        </>
      ) : (
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleSave(); }}>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input name="email" value={form.email} onChange={handleChange} disabled={!isAdmin} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            {isAdmin ? (
              <Select value={form.role} onValueChange={handleRoleChange}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input name="role" value={form.role} disabled />
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="default" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button size="sm" variant="outline" type="button" onClick={() => setEditMode(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default UserAccountMenu;
