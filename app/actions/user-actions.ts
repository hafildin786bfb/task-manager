"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/get-session";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createUserSchema,
  CreateUserInput,
  assignRelationshipSchema,
  AssignRelationshipInput,
} from "@/lib/validations/user";

export type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
};

/**
 * Admin action: Provision a new user and assign their role
 */
export async function createUserAction(rawInput: CreateUserInput): Promise<ActionResult> {
  const session = await getCurrentSession();
  if (session.role !== "admin") {
    return { success: false, error: "Unauthorized: Only administrators can create users." };
  }

  const parsed = createUserSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Invalid input data." };
  }

  const { email, password, full_name, role } = parsed.data;

  try {
    const adminClient = createAdminClient();

    // 1. Create user in Supabase Auth via Admin API
    const { data: userData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        user_role: role,
      },
    });

    if (authError || !userData.user) {
      return { success: false, error: authError?.message || "Failed to create user." };
    }

    const newUserId = userData.user.id;

    // 2. Insert role into public.user_roles
    const { error: roleError } = await adminClient.from("user_roles").upsert({
      user_id: newUserId,
      role: role,
    });

    if (roleError) {
      // Rollback user creation on role assignment failure
      await adminClient.auth.admin.deleteUser(newUserId);
      return { success: false, error: `Failed to set role: ${roleError.message}` };
    }

    // 3. Upsert into public.profiles
    await adminClient.from("profiles").upsert({
      id: newUserId,
      full_name,
      email,
    });

    revalidatePath("/admin/dashboard");
    return { success: true, message: `User ${full_name} (${role}) created successfully.` };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected server error occurred.",
    };
  }
}

/**
 * Admin action: Delete a user
 */
export async function deleteUserAction(userId: string): Promise<ActionResult> {
  const session = await getCurrentSession();
  if (session.role !== "admin") {
    return { success: false, error: "Unauthorized: Only administrators can delete users." };
  }

  if (session.user?.id === userId) {
    return { success: false, error: "Security restriction: You cannot delete your own admin account." };
  }

  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.deleteUser(userId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/dashboard");
    return { success: true, message: "User deleted successfully." };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete user.",
    };
  }
}

/**
 * Admin action: Map an employee to report to a manager
 */
export async function assignRelationshipAction(rawInput: AssignRelationshipInput): Promise<ActionResult> {
  const session = await getCurrentSession();
  if (session.role !== "admin") {
    return { success: false, error: "Unauthorized: Only administrators can assign reporting structures." };
  }

  const parsed = assignRelationshipSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Invalid input data." };
  }

  const { manager_id, employee_id } = parsed.data;

  if (manager_id === employee_id) {
    return { success: false, error: "A user cannot report to themselves." };
  }

  try {
    const adminClient = createAdminClient();

    // Verify manager has role 'manager'
    const { data: mgrRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", manager_id)
      .maybeSingle();

    if (mgrRole?.role !== "manager") {
      return { success: false, error: "Selected manager does not have the MANAGER role." };
    }

    // Verify employee has role 'employee'
    const { data: empRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", employee_id)
      .maybeSingle();

    if (empRole?.role !== "employee") {
      return { success: false, error: "Selected employee does not have the EMPLOYEE role." };
    }

    // Insert relationship
    const { error } = await adminClient.from("manager_employees").upsert({
      manager_id,
      employee_id,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/dashboard");
    return { success: true, message: "Reporting relationship assigned successfully." };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to assign relationship.",
    };
  }
}

/**
 * Admin action: Remove a manager-employee relationship
 */
export async function removeRelationshipAction(
  managerId: string,
  employeeId: string
): Promise<ActionResult> {
  const session = await getCurrentSession();
  if (session.role !== "admin") {
    return { success: false, error: "Unauthorized: Only administrators can remove relationships." };
  }

  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("manager_employees")
      .delete()
      .eq("manager_id", managerId)
      .eq("employee_id", employeeId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/dashboard");
    return { success: true, message: "Relationship removed." };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to remove relationship.",
    };
  }
}
