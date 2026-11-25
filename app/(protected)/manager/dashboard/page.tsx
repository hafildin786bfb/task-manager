import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { TaskForm } from "@/components/task-form";
import { TaskCard, TaskRecord } from "@/components/task-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, Inbox, PlusCircle, Send, XCircle } from "lucide-react";

export const revalidate = 0;

export default async function ManagerDashboardPage() {
  const session = await requireRole("manager");
  const supabase = createClient();
  const managerId = session.user!.id;

  // 1. Fetch assigned subordinates (reporting employees)
  const { data: rawMappings } = await supabase
    .from("manager_employees")
    .select("employee_id")
    .eq("manager_id", managerId);

  const subordinateIds = (rawMappings || []).map((m) => m.employee_id);

  let subordinates: { id: string; full_name: string; email: string }[] = [];
  if (subordinateIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", subordinateIds);

    subordinates = profiles || [];
  }

  // Map for easy lookup
  const subordinateMap = new Map(subordinates.map((s) => [s.id, s]));

  // 2. Fetch tasks created by this manager
  const { data: rawTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("assigned_by", managerId)
    .order("created_at", { ascending: false });

  const tasks: TaskRecord[] = (rawTasks || []).map((t) => ({
    ...t,
    assignee: subordinateMap.get(t.assigned_to) || null,
    creator: {
      full_name: session.profile?.full_name || "Manager",
      email: session.user!.email,
    },
  }));

  // Metrics
  const totalTasks = tasks.length;
  const pendingReview = tasks.filter((t) => t.status === "submitted").length;
  const inProgress = tasks.filter((t) => t.status === "pending").length;
  const approved = tasks.filter((t) => t.status === "approved").length;
  const rejected = tasks.filter((t) => t.status === "rejected").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Manager Delegation Hub
        </h1>
        <p className="text-sm text-slate-500">
          Delegate assignments downward to your direct reports and review submitted work.
        </p>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="border-slate-200">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Delegated
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-slate-900">{totalTasks}</div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-blue-700 uppercase tracking-wider">
              Requires Review
            </CardTitle>
            <Send className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-blue-900">{pendingReview}</div>
            <p className="text-[11px] text-blue-600 font-medium">Submitted by staff</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-amber-700 uppercase tracking-wider">
              In Progress
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-amber-900">{inProgress}</div>
            <p className="text-[11px] text-amber-600">Pending submission</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-emerald-700 uppercase tracking-wider">
              Approved
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-900">{approved}</div>
          </CardContent>
        </Card>

        <Card className="border-rose-200 bg-rose-50/30">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-rose-700 uppercase tracking-wider">
              Rejected
            </CardTitle>
            <XCircle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-rose-900">{rejected}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Create Task Form */}
        <div className="lg:col-span-1">
          <Card className="border-slate-200 shadow-sm sticky top-20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-slate-700" />
                <CardTitle className="text-base font-semibold">Delegate New Task</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Hand work down to your authorized reporting employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaskForm subordinates={subordinates} />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Delegated Tasks Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Delegated Tasks</h2>
              <p className="text-xs text-slate-500">
                Track status, review completion reports, and verify work
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {tasks.length} {tasks.length === 1 ? "task" : "tasks"} total
            </span>
          </div>

          {tasks.length === 0 ? (
            <Card className="border-dashed border-slate-300 p-8 text-center">
              <Inbox className="mx-auto h-8 w-8 text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No Tasks Assigned Yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Use the form on the left to assign your first task to a direct report.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  viewerRole="manager"
                  currentUserId={managerId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
