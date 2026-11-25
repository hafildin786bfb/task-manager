"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/get-session";
import { createClient } from "@/lib/supabase/server";
import {
  createTaskSchema,
  CreateTaskInput,
  submitReportSchema,
  SubmitReportInput,
  reviewTaskSchema,
  ReviewTaskInput,
} from "@/lib/validations/task";
import { ActionResult } from "./user-actions";

/**
 * Manager action: Create and assign a task to a subordinate
 */
export async function createTaskAction(rawInput: CreateTaskInput): Promise<ActionResult> {
  const session = await getCurrentSession();
  if (session.role !== "manager" || !session.user) {
    return { success: false, error: "Unauthorized: Only managers can create tasks." };
  }

  const parsed = createTaskSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Invalid input." };
  }

  const { title, description, assigned_to } = parsed.data;

  try {
    const supabase = createClient();

    // Verify subordinate relationship
    const { data: relationship } = await supabase
      .from("manager_employees")
      .select("employee_id")
      .eq("manager_id", session.user.id)
      .eq("employee_id", assigned_to)
      .maybeSingle();

    if (!relationship) {
      return {
        success: false,
        error: "Permission denied: You can only assign tasks to employees assigned to you.",
      };
    }

    const { error: insertError } = await supabase.from("tasks").insert({
      title,
      description: description || null,
      assigned_to,
      assigned_by: session.user.id,
      status: "pending",
    });

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    revalidatePath("/manager/dashboard");
    return { success: true, message: `Task "${title}" created and assigned.` };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create task.",
    };
  }
}

/**
 * Employee action: Submit completion report for a task
 */
export async function submitTaskReportAction(rawInput: SubmitReportInput): Promise<ActionResult> {
  const session = await getCurrentSession();
  if (session.role !== "employee" || !session.user) {
    return { success: false, error: "Unauthorized: Only employees can submit task reports." };
  }

  const parsed = submitReportSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Invalid input." };
  }

  const { task_id, report_content, attachment_url } = parsed.data;

  try {
    const supabase = createClient();

    // Verify task ownership
    const { data: task, error: fetchError } = await supabase
      .from("tasks")
      .select("id, assigned_to, status")
      .eq("id", task_id)
      .maybeSingle();

    if (fetchError || !task) {
      return { success: false, error: "Task not found." };
    }

    if (task.assigned_to !== session.user.id) {
      return { success: false, error: "Permission denied: You cannot submit reports for another employee's task." };
    }

    if (task.status !== "pending" && task.status !== "rejected") {
      return { success: false, error: `Cannot submit a report for a task with status "${task.status}".` };
    }

    let finalReportContent = report_content;
    if (attachment_url) {
      finalReportContent += `\n\nAttachment: ${attachment_url}`;
    }

    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        report_content: finalReportContent,
        report_submitted_at: new Date().toISOString(),
        status: "submitted",
      })
      .eq("id", task_id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath("/employee/dashboard");
    return { success: true, message: "Task report submitted successfully for manager review." };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to submit task report.",
    };
  }
}

/**
 * Manager action: Approve or Reject a submitted task report
 */
export async function reviewTaskAction(rawInput: ReviewTaskInput): Promise<ActionResult> {
  const session = await getCurrentSession();
  if (session.role !== "manager" || !session.user) {
    return { success: false, error: "Unauthorized: Only managers can review tasks." };
  }

  const parsed = reviewTaskSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || "Invalid input." };
  }

  const { task_id, decision, rejection_reason } = parsed.data;

  try {
    const supabase = createClient();

    // Fetch task and verify manager is the assigner
    const { data: task, error: fetchError } = await supabase
      .from("tasks")
      .select("id, assigned_by, status")
      .eq("id", task_id)
      .maybeSingle();

    if (fetchError || !task) {
      return { success: false, error: "Task not found." };
    }

    if (task.assigned_by !== session.user.id) {
      return { success: false, error: "Permission denied: You can only review tasks you assigned." };
    }

    if (task.status !== "submitted") {
      return { success: false, error: `Only submitted tasks can be reviewed. Current status: "${task.status}".` };
    }

    const newStatus = decision === "approve" ? "approved" : "rejected";

    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        status: newStatus,
        rejection_reason: decision === "reject" ? rejection_reason : null,
      })
      .eq("id", task_id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath("/manager/dashboard");
    return {
      success: true,
      message: decision === "approve" ? "Task approved successfully." : "Task rejected with feedback.",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to review task.",
    };
  }
}
