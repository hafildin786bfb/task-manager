import React from "react";
import { AppRole } from "@/lib/auth/get-session";

interface RoleGuardProps {
  currentRole: AppRole | null;
  allowedRoles: AppRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({
  currentRole,
  allowedRoles,
  children,
  fallback = null,
}: RoleGuardProps) {
  if (!currentRole || !allowedRoles.includes(currentRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
