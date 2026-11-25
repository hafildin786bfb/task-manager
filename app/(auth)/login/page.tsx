"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Shield,
  ShieldAlert,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { loginSchema, LoginInput } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpotlightCard } from "@/components/react-bits/SpotlightCard";
import { ShinyText } from "@/components/react-bits/ShinyText";
import { AtmosphereBackground } from "@/components/react-bits/AtmosphereBackground";

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
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
      {/* React Bits: Atmospheric Particle & Mesh Background */}
      <AtmosphereBackground />

      <div className="w-full max-w-[440px] z-10 space-y-7">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-md shadow-inner shadow-indigo-500/20">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <ShinyText
              text="ENTERPRISE ACCOUNTABILITY LOOP"
              speed={5}
              className="text-[11px] font-semibold tracking-wider uppercase text-indigo-300"
            />
          </div>

          <div className="flex items-center justify-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 p-[1px] shadow-lg shadow-indigo-500/30">
              <div className="h-full w-full rounded-[11px] bg-slate-950 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-indigo-400" />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-sm font-sans">
              TaskFlow
            </h1>
          </div>

          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            Role-governed task assignment, execution verification, and oversight pipeline.
          </p>
        </div>

        {/* React Bits: Spotlight Card Container */}
        <SpotlightCard
          spotlightColor="rgba(129, 140, 248, 0.22)"
          className="border-slate-800/90 bg-slate-900/80 p-6 sm:p-8"
        >
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Sign in to your account
              </h2>
              <p className="text-xs text-slate-400">
                Enter your credentials or choose a pre-configured role below.
              </p>
            </div>

            {authError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 animate-in fade-in duration-200">
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <span className="font-medium">{authError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Work Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-slate-300">
                  Work Email
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500 transition-colors group-focus-within:text-indigo-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    className="h-10 pl-10 text-xs bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-all rounded-xl"
                    disabled={isLoading}
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-rose-400 font-medium pl-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-slate-300">
                  Password
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500 transition-colors group-focus-within:text-indigo-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    className="h-10 pl-10 pr-10 text-xs bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-all rounded-xl"
                    disabled={isLoading}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-slate-400" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[11px] text-rose-400 font-medium pl-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                className="w-full h-10 mt-1 text-xs font-semibold tracking-wide text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/30 rounded-xl transition-all active:scale-[0.99] gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying session...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </form>

            {/* Quick Demo Switcher */}
            <div className="space-y-3 pt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <KeyRound className="h-3 w-3 text-indigo-400" />
                  One-Click Demo Access
                </span>
                <span className="text-[10px] text-slate-500">Auto-fills credentials</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Custom Admin User */}
                <button
                  type="button"
                  onClick={() => fillCredentials("admin123@gmail.com", "admin123")}
                  className="col-span-2 group flex items-center justify-between p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 hover:border-purple-500/50 transition-all text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                    <div>
                      <div className="text-xs font-semibold text-purple-200">
                        admin123@gmail.com
                      </div>
                      <div className="text-[10px] text-purple-400/80">Password: admin123</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-purple-300 bg-purple-900/60 px-2 py-0.5 rounded-md border border-purple-400/20">
                    Admin
                  </span>
                </button>

                {/* Seed Admin */}
                <button
                  type="button"
                  onClick={() => fillCredentials("admin@taskflow.internal", "Password123!")}
                  className="flex items-center justify-between p-2 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-800/60 hover:border-slate-700 transition-all text-left"
                >
                  <div>
                    <div className="text-xs font-medium text-slate-300">Seed Admin</div>
                    <div className="text-[10px] text-slate-500">Executive role</div>
                  </div>
                  <Shield className="h-3.5 w-3.5 text-purple-400 opacity-60" />
                </button>

                {/* Seed Manager 1 */}
                <button
                  type="button"
                  onClick={() => fillCredentials("manager1@taskflow.internal", "Password123!")}
                  className="flex items-center justify-between p-2 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-800/60 hover:border-slate-700 transition-all text-left"
                >
                  <div>
                    <div className="text-xs font-medium text-slate-300">Manager 1</div>
                    <div className="text-[10px] text-slate-500">Engineering Lead</div>
                  </div>
                  <UserCheck className="h-3.5 w-3.5 text-indigo-400 opacity-60" />
                </button>

                {/* Seed Employee 1 */}
                <button
                  type="button"
                  onClick={() => fillCredentials("employee1@taskflow.internal", "Password123!")}
                  className="col-span-2 flex items-center justify-between p-2 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-800/60 hover:border-slate-700 transition-all text-left"
                >
                  <div>
                    <div className="text-xs font-medium text-slate-300">Employee 1 (Frontend Dev)</div>
                    <div className="text-[10px] text-slate-500">Reports to Manager 1 • Task execution</div>
                  </div>
                  <span className="text-[10px] font-semibold text-teal-300 bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-500/20">
                    Employee
                  </span>
                </button>
              </div>
            </div>
          </div>
        </SpotlightCard>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <Shield className="h-3 w-3 text-slate-600" />
          <span>Protected by PostgreSQL Row-Level Security & Encrypted JWTs</span>
        </div>
      </div>
    </div>
  );
}
