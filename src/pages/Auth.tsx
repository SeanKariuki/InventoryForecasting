import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Package } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();

  useEffect(() => {
    if (profile && !loading) {
      navigate("/");
    }
  }, [profile, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Check for unverified email error
          if (error.message && error.message.toLowerCase().includes("email not confirmed")) {
            toast({
              title: "Email not verified",
              description: "Please check your inbox and verify your email before logging in.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Login Error",
              description: error.message,
              variant: "destructive",
            });
          }
          // --- CHANGE 1: Stop loading and exit on error ---
          setLoading(false);
          return; 
        }

        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });

        // --- CHANGE 2: This is the fix. Redirect immediately. ---
        navigate("/");
        
      } else {
        const redirectUrl = `${window.location.origin}/`;
        
        const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
        emailRedirectTo: redirectUrl,
        data: {
        role: 'inventory_manager' // <-- Or 'sales_staff', or 'admin'
    }
  },
});

        if (error) {
          setLoading(false); // Also stop loading on signup error
          throw error;
        }

        toast({
          title: "Account created!",
          description: "Please check your email to verify your account.",
        });
        setLoading(false); // Stop loading after signup toast
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false); // Stop loading on catch
    } 
    // --- CHANGE 3: The 'finally' block is removed ---
    // We now handle setLoading(false) manually in each logic path
    // to prevent it from running after a successful redirect.
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Package className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {isLogin ? "Welcome Back" : "Create Account"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "Sign in to access your inventory dashboard"
              : "Sign up to start managing your inventory"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;