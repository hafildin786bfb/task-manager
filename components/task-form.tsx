"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { createTaskSchema, CreateTaskInput } from "@/lib/validations/task";
import { createTaskAction } from "@/app/actions/task-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EmployeeOption {
  id: string;
  full_name: string;
  email: string;
}

interface TaskFormProps {
  subordinates: EmployeeOption[];
  onTaskCreated?: () => void;
}

export function TaskForm({ subordinates, onTaskCreated }: TaskFormProps) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      assigned_to: subordinates.length > 0 ? subordinates[0].id : "",
    },
  });

  const onSubmit = async (data: CreateTaskInput) => {
    setIsSubmitting(true);
    setServerError(null);
    setServerSuccess(null);

    const result = await createTaskAction(data);
    setIsSubmitting(false);

    if (result.success) {
      setServerSuccess(result.message || "Task assigned successfully!");
      reset({
        title: "",
        description: "",
        assigned_to: subordinates.length > 0 ? subordinates[0].id : "",
      });
      onTaskCreated?.();
    } else {
      setServerError(result.error || "Failed to create task.");
    }
  };

  if (subordinates.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800">
        <AlertCircle className="mx-auto mb-2 h-6 w-6 text-amber-600" />
        <p className="font-semibold">No Employees Assigned to You Yet</p>
        <p className="mt-1 text-xs text-amber-700">
          An administrator must assign employees to your reporting roster before you can delegate tasks.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {serverSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{serverSuccess}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-xs font-semibold text-slate-700">
          Task Title *
        </Label>
        <Input
          id="title"
          placeholder="e.g. Q3 Sales Reconciliation"
          disabled={isSubmitting}
          className="text-sm"
          {...register("title")}
        />
        {errors.title && (
          <p className="text-xs text-red-600 font-medium">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="assigned_to" className="text-xs font-semibold text-slate-700">
          Assignee (Reporting Employees Only) *
        </Label>
        <select
          id="assigned_to"
          className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSubmitting}
          {...register("assigned_to")}
        >
          {subordinates.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.full_name} ({emp.email})
            </option>
          ))}
        </select>
        {errors.assigned_to && (
          <p className="text-xs text-red-600 font-medium">{errors.assigned_to.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-xs font-semibold text-slate-700">
          Task Description / Instructions
        </Label>
        <Textarea
          id="description"
          placeholder="Describe deliverables, success criteria, and expectations..."
          rows={3}
          disabled={isSubmitting}
          className="text-sm"
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-red-600 font-medium">{errors.description.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {isSubmitting ? "Assigning Task..." : "Create & Delegate Task"}
      </Button>
    </form>
  );
}
