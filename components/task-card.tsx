"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  Send,
  User,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { submitReportSchema, SubmitReportInput } from "@/lib/validations/task";
import { submitTaskReportAction, reviewTaskAction } from "@/app/actions/task-actions";

export interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "submitted" | "approved" | "rejected";
  report_content: string | null;
  report_submitted_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  assigned_to: string;
  assigned_by: string;
  assignee?: { full_name: string; email: string } | null;
  creator?: { full_name: string; email: string } | null;
}

interface TaskCardProps {
  task: TaskRecord;
  viewerRole: "admin" | "manager" | "employee";
  currentUserId: string;
  onMutationSuccess?: () => void;
}

export function TaskCard({
  task,
  viewerRole,
  currentUserId,
  onMutationSuccess,
}: TaskCardProps) {
  const [showSubmitModal, setShowSubmitModal] = React.useState(false);
  const [showRejectInput, setShowRejectInput] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Form for employee report submission
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: formErrors },
  } = useForm<SubmitReportInput>({
    resolver: zodResolver(submitReportSchema),
    defaultValues: {
      task_id: task.id,
      report_content: "",
      attachment_url: "",
    },
  });

  const onSubmitReport = async (data: SubmitReportInput) => {
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    const result = await submitTaskReportAction(data);
    setIsSubmitting(false);

    if (result.success) {
      setActionSuccess("Report submitted successfully!");
      setShowSubmitModal(false);
      reset();
      onMutationSuccess?.();
    } else {
      setActionError(result.error || "Failed to submit report.");
    }
  };

  const handleReview = async (decision: "approve" | "reject") => {
    if (decision === "reject" && !rejectionReason.trim()) {
      setActionError("Please provide a reason for rejecting this report.");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    const result = await reviewTaskAction({
      task_id: task.id,
      decision,
      rejection_reason: decision === "reject" ? rejectionReason : undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      setActionSuccess(result.message || "Task reviewed.");
      setShowRejectInput(false);
      setRejectionReason("");
      onMutationSuccess?.();
    } else {
      setActionError(result.error || "Failed to process review.");
    }
  };

  const isAssignee = task.assigned_to === currentUserId;
  const isCreator = task.assigned_by === currentUserId;

  return (
    <Card className="flex flex-col border-slate-200 shadow-sm transition-all hover:border-slate-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold text-slate-900 leading-snug">
              {task.title}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(task.created_at)}
              </span>
              {task.assignee && (
                <span className="flex items-center gap-1 text-slate-700 font-medium">
                  <User className="h-3.5 w-3.5" />
                  To: {task.assignee.full_name || task.assignee.email}
                </span>
              )}
              {task.creator && viewerRole !== "manager" && (
                <span className="flex items-center gap-1 text-slate-500">
                  By: {task.creator.full_name || task.creator.email}
                </span>
              )}
            </div>
          </div>
          <Badge variant={task.status} className="shrink-0 uppercase tracking-wider text-[11px]">
            {task.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 pb-3 text-sm">
        {task.description && (
          <p className="text-slate-600 whitespace-pre-wrap">{task.description}</p>
        )}

        {/* Rejection notice if previously rejected */}
        {task.status === "rejected" && task.rejection_reason && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-rose-900">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              Manager Rejection Feedback
            </div>
            <p className="pl-5.5">{task.rejection_reason}</p>
          </div>
        )}

        {/* Submitted Report Preview */}
        {task.report_content && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-600 font-medium">
              <span className="flex items-center gap-1.5 text-slate-800">
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                Submitted Completion Report
              </span>
              {task.report_submitted_at && (
                <span className="text-[11px] text-slate-400">
                  {formatDate(task.report_submitted_at)}
                </span>
              )}
            </div>
            <p className="text-slate-700 whitespace-pre-wrap font-sans">
              {isExpanded ? task.report_content : `${task.report_content.slice(0, 160)}${task.report_content.length > 160 ? "..." : ""}`}
            </p>
            {task.report_content.length > 160 && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-900 flex items-center gap-0.5 mt-1"
              >
                {isExpanded ? (
                  <>Show less <ChevronUp className="h-3 w-3" /></>
                ) : (
                  <>Read full report <ChevronDown className="h-3 w-3" /></>
                )}
              </button>
            )}
          </div>
        )}

        {/* Feedback Alerts */}
        {actionError && (
          <div className="rounded-md bg-rose-50 p-2 text-xs text-rose-700 font-medium border border-rose-200">
            {actionError}
          </div>
        )}
        {actionSuccess && (
          <div className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-700 font-medium border border-emerald-200">
            {actionSuccess}
          </div>
        )}

        {/* Employee Submission Modal/Panel */}
        {showSubmitModal && (
          <form
            onSubmit={handleSubmit(onSubmitReport)}
            className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-900">
                Submit Proof of Completion
              </span>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="text-xs text-slate-400 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-1">
              <Label htmlFor={`report-${task.id}`} className="text-xs">
                Completion Report / Summary *
              </Label>
              <Textarea
                id={`report-${task.id}`}
                placeholder="Detail what was completed, outcomes, or notes..."
                rows={3}
                className="text-xs bg-white"
                disabled={isSubmitting}
                {...register("report_content")}
              />
              {formErrors.report_content && (
                <p className="text-[11px] text-red-600 font-medium">
                  {formErrors.report_content.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor={`att-${task.id}`} className="text-xs">
                Attachment URL (Optional)
              </Label>
              <Input
                id={`att-${task.id}`}
                type="url"
                placeholder="https://drive.google.com/... or PR link"
                className="h-8 text-xs bg-white"
                disabled={isSubmitting}
                {...register("attachment_url")}
              />
              {formErrors.attachment_url && (
                <p className="text-[11px] text-red-600 font-medium">
                  {formErrors.attachment_url.message}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-7 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Submit Report
              </Button>
            </div>
          </form>
        )}

        {/* Manager Rejection Dialog Panel */}
        {showRejectInput && (
          <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3 space-y-2">
            <Label className="text-xs font-semibold text-rose-900">
              Reason for Rejection *
            </Label>
            <Textarea
              placeholder="State what needs revision before approval..."
              rows={2}
              className="text-xs bg-white"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              disabled={isSubmitting}
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setShowRejectInput(false);
                  setRejectionReason("");
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-7 text-xs gap-1.5"
                disabled={isSubmitting}
                onClick={() => handleReview("reject")}
              >
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm Rejection
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="border-t border-slate-100 pt-3">
        {/* EMPLOYEE ACTIONS */}
        {viewerRole === "employee" && isAssignee && (
          <div className="w-full flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {task.status === "pending" && "Awaiting your submission"}
              {task.status === "submitted" && "Submitted — pending manager approval"}
              {task.status === "approved" && "Task verified & completed"}
              {task.status === "rejected" && "Requires revisions"}
            </span>

            {(task.status === "pending" || task.status === "rejected") && !showSubmitModal && (
              <Button
                size="sm"
                variant="default"
                className="h-8 text-xs gap-1.5"
                onClick={() => setShowSubmitModal(true)}
              >
                <Send className="h-3.5 w-3.5" />
                {task.status === "rejected" ? "Resubmit Report" : "Submit Report"}
              </Button>
            )}
          </div>
        )}

        {/* MANAGER ACTIONS */}
        {viewerRole === "manager" && isCreator && (
          <div className="w-full flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {task.status === "pending" && "Assigned — awaiting employee report"}
              {task.status === "submitted" && "Report submitted — action required"}
              {task.status === "approved" && "Approved"}
              {task.status === "rejected" && "Rejected — waiting on revision"}
            </span>

            {task.status === "submitted" && !showRejectInput && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                  disabled={isSubmitting}
                  onClick={() => setShowRejectInput(true)}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="success"
                  className="h-8 text-xs gap-1.5"
                  disabled={isSubmitting}
                  onClick={() => handleReview("approve")}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-3.5 w-3.5" />
                  )}
                  Approve
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ADMIN VIEW ONLY */}
        {viewerRole === "admin" && (
          <div className="w-full flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last updated: {formatDate(task.updated_at)}
            </span>
            <span>Task ID: {task.id.slice(0, 8)}...</span>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
