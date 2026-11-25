import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { TaskCard, TaskRecord } from "@/components/task-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Clock, Inbox, Send } from "lucide-react";

export const revalidate = 0;

export default async function EmployeeDashboardPage() {
  const session = await requireRole("employee");
  const supabase = createClient();
  const employeeId = session.user!.id;

  // Fetch tasks assigned to this employee
  const { data: rawTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("assigned_to", employeeId)
    .order("created_at", { ascending: false });

  // Get assigning managers' IDs to fetch their names
  const managerIds = Array.from(new Set((rawTasks || []).map((t) => t.assigned_by)));

  let managers: { id: string; full_name: string; email: string }[] = [];
  if (managerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", managerIds);

    managers = profiles || [];
  }

  const managerMap = new Map(managers.map((m) => [m.id, m]));

  const tasks: TaskRecord[] = (rawTasks || []).map((t) => ({
    ...t,
    assignee: {
      full_name: session.profile?.full_name || "Employee",
      email: session.user!.email,
    },
    creator: managerMap.get(t.assigned_by) || null,
  }));

  // Metrics
  const totalTasks = tasks.length;
  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const submittedCount = tasks.filter((t) => t.status === "submitted").length;
  const approvedCount = tasks.filter((t) => t.status === "approved").length;
  const rejectedCount = tasks.filter((t) => t.status === "rejected").length;

  const actionRequiredTasks = tasks.filter(
    (t) => t.status === "pending" || t.status === "rejected"
  );
  const completedOrReviewTasks = tasks.filter(
    (t) => t.status === "submitted" || t.status === "approved"
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          My Assigned Tasks & Reporting
        </h1>
        <p className="text-sm text-slate-500">
          Review assignments from your manager, execute work, and submit verification reports.
        </p>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-amber-200 bg-amber-50/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-amber-700 uppercase tracking-wider">
              Pending Reports
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900">{pendingCount}</div>
            <p className="text-[11px] text-amber-600">Work in progress</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-blue-700 uppercase tracking-wider">
              Under Review
            </CardTitle>
            <Send className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{submittedCount}</div>
            <p className="text-[11px] text-blue-600">Awaiting manager sign-off</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-emerald-700 uppercase tracking-wider">
              Approved
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">{approvedCount}</div>
            <p className="text-[11px] text-emerald-600">Completed & verified</p>
          </CardContent>
        </Card>

        <Card className="border-rose-200 bg-rose-50/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-rose-700 uppercase tracking-wider">
              Needs Revision
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-900">{rejectedCount}</div>
            <p className="text-[11px] text-rose-600">Rejected with feedback</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Task List */}
      <div className="space-y-6">
        {/* Action Required Section */}
        {actionRequiredTasks.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-base font-bold text-slate-900">
                Action Required ({actionRequiredTasks.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {actionRequiredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  viewerRole="employee"
                  currentUserId={employeeId}
                />
              ))}
            </div>
          </div>
        )}

        {/* History / Completed / In Review */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">
            {actionRequiredTasks.length > 0 ? "Under Review & Completed History" : "My Tasks"}
          </h2>

          {tasks.length === 0 ? (
            <Card className="border-dashed border-slate-300 p-8 text-center">
              <Inbox className="mx-auto h-8 w-8 text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No Tasks Assigned Yet</p>
              <p className="text-xs text-slate-500 mt-1">
                When your manager assigns a task to you, it will appear here immediately.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedOrReviewTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  viewerRole="employee"
                  currentUserId={employeeId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
