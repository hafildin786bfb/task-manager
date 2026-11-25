import { createClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "manager" | "employee";

export interface UserSessionData {
  user: {
    id: string;
    email: string;
  } | null;
  profile: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  role: AppRole | null;
}

export async function getCurrentSession(): Promise<UserSessionData> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { user: null, profile: null, role: null };
    }

    // Attempt to read role: first check JWT custom claim, fallback to user_roles query
    let userRole: AppRole | null = null;

    // Check user_metadata or app_metadata if injected by hook
    const hookRole = (user.app_metadata as Record<string, unknown> | undefined)?.user_role;
    if (hookRole === "admin" || hookRole === "manager" || hookRole === "employee") {
      userRole = hookRole as AppRole;
    } else {
      // Query user_roles table directly
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleData?.role) {
        userRole = roleData.role as AppRole;
      }
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    return {
      user: {
        id: user.id,
        email: user.email ?? "",
      },
      profile: profile ?? {
        id: user.id,
        full_name: user.email?.split("@")[0] ?? "User",
        email: user.email ?? "",
      },
      role: userRole,
    };
  } catch {
    return { user: null, profile: null, role: null };
  }
}
