"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface NavBarProps {
  user: {
    full_name: string;
    email: string;
  };
  role: "admin" | "manager" | "employee";
}

export function NavBar({ user, role }: NavBarProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  };

  const roleBadgeVariant =
    role === "admin"
      ? "roleAdmin"
      : role === "manager"
      ? "roleManager"
      : "roleEmployee";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white shadow">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-slate-900 text-lg">TaskFlow</span>
            <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-400">
              Accountability Loop
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 text-right">
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-800 leading-tight">
                {user.full_name || user.email}
              </p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 sm:hidden">
              <User className="h-4 w-4" />
            </div>
            <Badge variant={roleBadgeVariant} className="text-[11px]">
              {role}
            </Badge>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-slate-500 hover:text-slate-900 gap-1.5"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
