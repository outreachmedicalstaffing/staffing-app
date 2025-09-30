import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Shield } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      console.log("[FRONTEND] Attempting login with:", { username: data.username });
      const res = await apiRequest("POST", "/api/auth/login", data);
      console.log("[FRONTEND] Login response status:", res.status);
      const result = await res.json();
      console.log("[FRONTEND] Login response data:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("[FRONTEND] Login success:", data);
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      console.error("[FRONTEND] Login error:", error);
      toast({
        title: "Error",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter your username"
                        data-testid="input-username"
                        disabled={loginMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Enter your password"
                        data-testid="input-password"
                        disabled={loginMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                data-testid="button-login"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Logging in..." : "Log In"}
              </Button>
            </form>
          </Form>
          <div className="mt-6 space-y-4">
            <div className="text-sm text-center text-muted-foreground">
              <p>Demo Accounts:</p>
              <p className="mt-1">Owner: owner / admin123</p>
              <p>Admin: admin / admin123</p>
              <p>Staff: jsmith / password123</p>
            </div>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  form.setValue("username", "owner");
                  form.setValue("password", "admin123");
                  form.handleSubmit(onSubmit)();
                }}
                data-testid="button-quick-login-owner"
              >
                Quick Login as Owner
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  console.log("[DIRECT] Attempting direct fetch...");
                  try {
                    const res = await fetch("/api/auth/login", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ username: "owner", password: "admin123" }),
                      credentials: "include",
                    });
                    console.log("[DIRECT] Response status:", res.status);
                    const data = await res.json();
                    console.log("[DIRECT] Response data:", data);
                    if (res.ok) {
                      toast({ title: "Success", description: "Logged in!" });
                      setLocation("/");
                    } else {
                      toast({ title: "Error", description: "Login failed", variant: "destructive" });
                    }
                  } catch (error) {
                    console.error("[DIRECT] Error:", error);
                  }
                }}
                data-testid="button-direct-login"
              >
                Direct Login Test
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
