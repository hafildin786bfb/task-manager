"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, ShieldAlert } from "lucide-react";
import { loginSchema, LoginInput } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const supabase = createClient();
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email.trim(),
        password: data.password,
      });

      if (signInError || !authData.user) {
        setAuthError(signInError?.message || "Invalid email or password");
        setIsLoading(false);
        return;
      }

      // Query role to perform immediate client-side redirection
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      const userRole = roleRow?.role;

      if (userRole === "admin") {
        router.push("/admin/dashboard");
      } else if (userRole === "manager") {
        router.push("/manager/dashboard");
      } else if (userRole === "employee") {
        router.push("/employee/dashboard");
      } else {
        router.push("/unauthorized");
      }

      router.refresh();
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "An unexpected error occurred");
      setIsLoading(false);
    }
  };

  const fillCredentials = (email: string, pass: string) => {
    setValue("email", email);
    setValue("password", pass);
    setAuthError(null);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">TaskFlow</h1>
          <p className="mt-1 text-sm text-slate-500">Internal Accountability & Reporting System</p>
        </div>

        <Card className="border-slate-200 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Sign in to your account</CardTitle>
            <CardDescription>
              Enter your credentials to access your organization dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            {authError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Work Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    className="pl-9"
                    disabled={isLoading}
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-600 font-medium">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    className="pl-9 pr-10"
                    disabled={isLoading}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-600 font-medium">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                One-Click Quick Logins
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fillCredentials("admin123@gmail.com", "admin123")}
                  className="rounded border border-purple-300 bg-purple-50 p-2 text-xs font-semibold text-purple-800 hover:bg-purple-100 transition-colors text-center shadow-sm"
                >
                  ⚡ admin123@gmail.com
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("admin@taskflow.internal", "Password123!")}
                  className="rounded border border-slate-200 bg-slate-50 p-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors text-center"
                >
                  Demo Admin
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("manager1@taskflow.internal", "Password123!")}
                  className="rounded border border-indigo-200 bg-indigo-50/50 p-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors text-center"
                >
                  Demo Manager 1
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials("employee1@taskflow.internal", "Password123!")}
                  className="rounded border border-teal-200 bg-teal-50/50 p-2 text-xs font-medium text-teal-700 hover:bg-teal-100 transition-colors text-center"
                >
                  Demo Employee 1
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
