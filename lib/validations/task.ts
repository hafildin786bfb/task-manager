import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120, "Title is too long"),
  description: z.string().trim().max(1000, "Description is too long").optional().default(""),
  assigned_to: z.string().uuid("Please select a valid employee"),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const submitReportSchema = z.object({
  task_id: z.string().uuid("Invalid task ID"),
  report_content: z.string().trim().min(5, "Report must be at least 5 characters"),
  attachment_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export type SubmitReportInput = z.infer<typeof submitReportSchema>;

export const reviewTaskSchema = z.object({
  task_id: z.string().uuid("Invalid task ID"),
  decision: z.enum(["approve", "reject"]),
  rejection_reason: z.string().trim().max(500, "Rejection reason too long").optional(),
}).refine(
  (data) => {
    if (data.decision === "reject") {
      return !!data.rejection_reason && data.rejection_reason.trim().length > 0;
    }
    return true;
  },
  {
    message: "A rejection reason is required when rejecting a task",
    path: ["rejection_reason"],
  }
);

export type ReviewTaskInput = z.infer<typeof reviewTaskSchema>;
