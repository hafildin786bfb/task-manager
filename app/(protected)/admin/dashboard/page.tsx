import { requireRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserTable, UserRow, ManagerMapping } from "@/components/user-table";
import { TaskCard, TaskRecord } from "@/components/task-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Layers,
  Send,
  Users,
} from "lucide-react";

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const session = await requireRole("admin");
  const adminClient = createAdminClient();

  // 1. Fetch all users with profiles and roles
  const { data: rawProfiles } = await adminClient
    .from("profiles")
    .select("id, full_name, email, created_at");

  const { data: rawRoles } = await adminClient
    .from("user_roles")
    .select("user_id, role");

  const roleMap = new Map((rawRoles || []).map((r) => [r.user_id, r.role]));

  const users: UserRow[] = (rawProfiles || []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
    role: (roleMap.get(p.id) as "admin" | "manager" | "employee") || "employee",
    created_at: p.created_at,
  }));

  const userMap = new Map(users.map((u) => [u.id, u]));

  // 2. Fetch manager_employees mappings
  const { data: rawMappings } = await adminClient
    .from("manager_employees")
    .select("manager_id, employee_id");

  const relationships: ManagerMapping[] = (rawMappings || []).map((m) => ({
    manager_id: m.manager_id,
    manager_name: userMap.get(m.manager_id)?.full_name || m.manager_id,
    employee_id: m.employee_id,
    employee_name: userMap.get(m.employee_id)?.full_name || m.employee_id,
  }));

  // 3. Fetch all tasks across the company
  const { data: rawTasks } = await adminClient
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  const tasks: TaskRecord[] = (rawTasks || []).map((t) => ({
    ...t,
    assignee: userMap.get(t.assigned_to)
      ? {
          full_name: userMap.get(t.assigned_to)!.full_name,
          email: userMap.get(t.assigned_to)!.email,
        }
      : null,
    creator: userMap.get(t.assigned_by)
      ? {
          full_name: userMap.get(t.assigned_by)!.full_name,
          email: userMap.get(t.assigned_by)!.email,
        }
      : null,
  }));

  // 4. Calculate Aggregate Metrics
  const totalTasks = tasks.length;
  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const submittedCount = tasks.filter((t) => t.status === "submitted").length;
  const approvedCount = tasks.filter((t) => t.status === "approved").length;
  const rejectedCount = tasks.filter((t) => t.status === "rejected").length;

  // Breakdown by employee
  const employeeStats = users
    .filter((u) => u.role === "employee")
    .map((emp) => {
      const empTasks = tasks.filter((t) => t.assigned_to === emp.id);
      return {
        id: emp.id,
        name: emp.full_name,
        email: emp.email,
        total: empTasks.length,
        pending: empTasks.filter((t) => t.status === "pending").length,
        submitted: empTasks.filter((t) => t.status === "submitted").length,
        approved: empTasks.filter((t) => t.status === "approved").length,
        rejected: empTasks.filter((t) => t.status === "rejected").length,
      };
    });

  // Breakdown by manager
  const managerStats = users
    .filter((u) => u.role === "manager")
    .map((mgr) => {
      const mgrTasks = tasks.filter((t) => t.assigned_by === mgr.id);
      return {
        id: mgr.id,
        name: mgr.full_name,
        email: mgr.email,
        total: mgrTasks.length,
        pending: mgrTasks.filter((t) => t.status === "pending").length,
        submitted: mgrTasks.filter((t) => t.status === "submitted").length,
        approved: mgrTasks.filter((t) => t.status === "approved").length,
        rejected: mgrTasks.filter((t) => t.status === "rejected").length,
      };
    });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Executive Oversight Dashboard
        </h1>
        <p className="text-sm text-slate-500">
          Org-wide visibility into staff assignments, accountability pipelines, and task throughput.
        </p>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Tasks
            </CardTitle>
            <Layers className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{totalTasks}</div>
            <p className="text-[11px] text-slate-400">All tasks created</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-amber-700 uppercase tracking-wider">
              Pending
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900">{pendingCount}</div>
            <p className="text-[11px] text-amber-700">Awaiting employee report</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-blue-700 uppercase tracking-wider">
              Submitted
            </CardTitle>
            <Send className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{submittedCount}</div>
            <p className="text-[11px] text-blue-700">Awaiting manager review</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-emerald-700 uppercase tracking-wider">
              Approved
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">{approvedCount}</div>
            <p className="text-[11px] text-emerald-700">Verified & closed</p>
          </CardContent>
        </Card>

        <Card className="border-rose-200 bg-rose-50/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-rose-700 uppercase tracking-wider">
              Rejected
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-900">{rejectedCount}</div>
            <p className="text-[11px] text-rose-700">Sent back for revisions</p>
          </CardContent>
        </Card>
      </div>

      {/* Throughput Breakdown: Per Employee & Per Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee Throughput */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-sm font-semibold">Throughput per Employee</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-y border-slate-100">
                  <tr>
                    <th className="px-4 py-2.5">Employee</th>
                    <th className="px-2 py-2.5 text-center">Total</th>
                    <th className="px-2 py-2.5 text-center text-amber-700">Pending</th>
                    <th className="px-2 py-2.5 text-center text-blue-700">Submitted</th>
                    <th className="px-2 py-2.5 text-center text-emerald-700">Approved</th>
                    <th className="px-2 py-2.5 text-center text-rose-700">Rejected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employeeStats.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 text-center text-slate-400 italic">
                        No employees found.
                      </td>
                    </tr>
                  ) : (
                    employeeStats.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 font-medium text-slate-800">
                          <div>{e.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{e.email}</div>
                        </td>
                        <td className="px-2 py-2.5 text-center font-semibold">{e.total}</td>
                        <td className="px-2 py-2.5 text-center text-amber-600 font-medium">{e.pending}</td>
                        <td className="px-2 py-2.5 text-center text-blue-600 font-medium">{e.submitted}</td>
                        <td className="px-2 py-2.5 text-center text-emerald-600 font-medium">{e.approved}</td>
                        <td className="px-2 py-2.5 text-center text-rose-600 font-medium">{e.rejected}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Manager Throughput */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-sm font-semibold">Throughput per Manager</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-y border-slate-100">
                  <tr>
                    <th className="px-4 py-2.5">Manager</th>
                    <th className="px-2 py-2.5 text-center">Assigned</th>
                    <th className="px-2 py-2.5 text-center text-amber-700">Pending</th>
                    <th className="px-2 py-2.5 text-center text-blue-700">Submitted</th>
                    <th className="px-2 py-2.5 text-center text-emerald-700">Approved</th>
                    <th className="px-2 py-2.5 text-center text-rose-700">Rejected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {managerStats.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 text-center text-slate-400 italic">
                        No managers found.
                      </td>
                    </tr>
                  ) : (
                    managerStats.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 font-medium text-slate-800">
                          <div>{m.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{m.email}</div>
                        </td>
                        <td className="px-2 py-2.5 text-center font-semibold">{m.total}</td>
                        <td className="px-2 py-2.5 text-center text-amber-600 font-medium">{m.pending}</td>
                        <td className="px-2 py-2.5 text-center text-blue-600 font-medium">{m.submitted}</td>
                        <td className="px-2 py-2.5 text-center text-emerald-600 font-medium">{m.approved}</td>
                        <td className="px-2 py-2.5 text-center text-rose-600 font-medium">{m.rejected}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff Management & Organization Hierarchy */}
      <UserTable
        users={users}
        relationships={relationships}
        currentAdminId={session.user!.id}
      />

      {/* All Tasks Detail Feed (Read-Only Oversight) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            Company-Wide Task Feed
          </h2>
          <p className="text-xs text-slate-500">
            Read-only audit stream of all delegated work and verification statuses across the enterprise.
          </p>
        </div>

        {tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400 text-sm">
            No tasks created in the system yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                viewerRole="admin"
                currentUserId={session.user!.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
