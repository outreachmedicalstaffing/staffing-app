import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (user: string, pass: string) => {
    setLoading(true);
    console.log("[LOGIN] Attempting login with:", user);
    
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password: pass }),
        credentials: "include",
      });

      console.log("[LOGIN] Response status:", res.status);
      const data = await res.json();
      console.log("[LOGIN] Response data:", data);

      if (res.ok) {
        toast({
          title: "Success",
          description: "Logged in successfully",
        });
        setLocation("/");
      } else {
        toast({
          title: "Error",
          description: data.error || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[LOGIN] Error:", error);
      toast({
        title: "Error",
        description: "Failed to login",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(username, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-primary-foreground">
              <Shield className="h-6 w-6" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">OutreachOps</CardTitle>
          <CardDescription className="text-center">
            HIPAA-compliant workforce management platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                data-testid="input-username"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                data-testid="input-password"
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              data-testid="button-login"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Log In"}
            </Button>
          </form>
          
          <div className="mt-6 space-y-4">
            <div className="text-sm text-center text-muted-foreground">
              <p className="font-medium mb-2">Demo Accounts:</p>
              <p>Owner: owner / admin123</p>
              <p>Admin: admin / admin123</p>
              <p>Staff: jsmith / password123</p>
            </div>
            
            <div className="border-t pt-4 space-y-2">
              <p className="text-xs text-center text-muted-foreground mb-2">Quick Login:</p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => handleLogin("owner", "admin123")}
                disabled={loading}
                data-testid="button-quick-login-owner"
              >
                Login as Owner
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => handleLogin("admin", "admin123")}
                disabled={loading}
                data-testid="button-quick-login-admin"
              >
                Login as Admin
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => handleLogin("jsmith", "password123")}
                disabled={loading}
                data-testid="button-quick-login-staff"
              >
                Login as Staff (jsmith)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
