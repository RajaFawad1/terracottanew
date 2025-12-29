import { useState } from "react";
import { useLogin } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Logo } from "@/components/logo";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast({
        title: "Error",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }

    try {
      await login.mutateAsync({ username, password });
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/5 via-gray-500/5 to-black/5 animate-gradient-shift" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.05),transparent_50%)]" />
      
      <Card className="w-full max-w-md relative z-10 shadow-2xl border-2 border-black/20 dark:border-white/20 backdrop-blur-sm bg-card/95">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="transform hover:scale-110 transition-transform duration-300">
              <Logo size="lg" showText={true} />
            </div>
          </div>
          <CardDescription className="text-base mt-2">Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="username" className="text-sm font-semibold text-foreground mb-2 block">
                Username
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={login.isPending}
                  className="pl-4 pr-4 py-3 border-2 focus-visible:border-primary focus-visible:ring-primary/20 bg-background/50"
                  data-testid="input-username"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password" className="text-sm font-semibold text-foreground mb-2 block">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={login.isPending}
                  className="pl-4 pr-4 py-3 border-2 focus-visible:border-primary focus-visible:ring-primary/20 bg-background/50"
                  data-testid="input-password"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 font-semibold py-3 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
              disabled={login.isPending}
              data-testid="button-login"
            >
              {login.isPending ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-6 pt-6 border-t border-border/50 text-center text-sm">
            <p className="text-muted-foreground font-medium mb-2">Demo credentials:</p>
            <div className="space-y-1">
              <p className="text-xs">
                <span className="font-semibold text-foreground">Admin:</span>{" "}
                <span className="font-mono bg-black/10 dark:bg-white/10 px-2 py-1 rounded text-foreground">admin / admin123</span>
              </p>
              <p className="text-xs">
                <span className="font-semibold text-foreground">Member:</span>{" "}
                <span className="font-mono bg-black/10 dark:bg-white/10 px-2 py-1 rounded text-foreground">member / member123</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
