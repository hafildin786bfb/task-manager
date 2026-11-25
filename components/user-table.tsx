"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  CheckCircle2,
  GitFork,
  Loader2,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import {
  createUserSchema,
  CreateUserInput,
  assignRelationshipSchema,
  AssignRelationshipInput,
} from "@/lib/validations/user";
import {
  createUserAction,
  deleteUserAction,
  assignRelationshipAction,
  removeRelationshipAction,
} from "@/app/actions/user-actions";

export interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "manager" | "employee";
  created_at: string;
}

export interface ManagerMapping {
  manager_id: string;
  manager_name: string;
  employee_id: string;
  employee_name: string;
}

interface UserTableProps {
  users: UserRow[];
  relationships: ManagerMapping[];
  currentAdminId: string;
  onRefresh?: () => void;
}

export function UserTable({
  users,
  relationships,
  currentAdminId,
  onRefresh,
}: UserTableProps) {
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [showAssignModal, setShowAssignModal] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Form: Create User
  const {
    register: registerUser,
    handleSubmit: handleCreateUserSubmit,
    reset: resetCreateUser,
    formState: { errors: userErrors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      password: "",
      full_name: "",
      role: "employee",
    },
  });

  // Form: Assign Relationship
  const managers = users.filter((u) => u.role === "manager");
  const employees = users.filter((u) => u.role === "employee");

  const {
    register: registerAssign,
    handleSubmit: handleAssignSubmit,
    reset: resetAssign,
    formState: { errors: assignErrors },
  } = useForm<AssignRelationshipInput>({
    resolver: zodResolver(assignRelationshipSchema),
    defaultValues: {
      manager_id: managers.length > 0 ? managers[0].id : "",
      employee_id: employees.length > 0 ? employees[0].id : "",
    },
  });

  const onCreateUser = async (data: CreateUserInput) => {
    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);

    const result = await createUserAction(data);
    setIsProcessing(false);

    if (result.success) {
      setActionSuccess(result.message || "User created successfully.");
      setShowCreateModal(false);
      resetCreateUser();
      onRefresh?.();
    } else {
      setActionError(result.error || "Failed to create user.");
    }
  };

  const onAssignRelationship = async (data: AssignRelationshipInput) => {
    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);

    const result = await assignRelationshipAction(data);
    setIsProcessing(false);

    if (result.success) {
      setActionSuccess(result.message || "Relationship linked successfully.");
      setShowAssignModal(false);
      resetAssign();
      onRefresh?.();
    } else {
      setActionError(result.error || "Failed to link relationship.");
    }
  };

  const onDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to permanently delete ${userName}? This will remove all their records.`)) {
      return;
    }

    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);

    const result = await deleteUserAction(userId);
    setIsProcessing(false);

    if (result.success) {
      setActionSuccess(result.message || "User deleted.");
      onRefresh?.();
    } else {
      setActionError(result.error || "Failed to delete user.");
    }
  };

  const onRemoveRelationship = async (managerId: string, employeeId: string) => {
    setIsProcessing(true);
    setActionError(null);
    setActionSuccess(null);

    const result = await removeRelationshipAction(managerId, employeeId);
    setIsProcessing(false);

    if (result.success) {
      setActionSuccess("Relationship unlinked.");
      onRefresh?.();
    } else {
      setActionError(result.error || "Failed to unlink relationship.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            Staff Directory & Hierarchy
          </h2>
          <p className="text-xs text-slate-500">
            Manage organization members, assign roles, and configure who reports to whom.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAssignModal(true)}
            className="text-xs gap-1.5"
            disabled={managers.length === 0 || employees.length === 0}
          >
            <GitFork className="h-3.5 w-3.5" />
            Assign Hierarchy
          </Button>

          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="text-xs gap-1.5 bg-slate-900 hover:bg-slate-800"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add Staff Member
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {actionError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <Card className="border-slate-300 shadow-md">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Onboard New Staff Member</CardTitle>
              <CardDescription className="text-xs">
                Creates account in Supabase Auth and registers role in database
              </CardDescription>
            </div>
            <button
              onClick={() => setShowCreateModal(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUserSubmit(onCreateUser)} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="full_name" className="text-xs">Full Name *</Label>
                  <Input
                    id="full_name"
                    placeholder="Jane Doe"
                    disabled={isProcessing}
                    className="h-8 text-xs"
                    {...registerUser("full_name")}
                  />
                  {userErrors.full_name && (
                    <p className="text-[11px] text-red-600">{userErrors.full_name.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane@taskflow.internal"
                    disabled={isProcessing}
                    className="h-8 text-xs"
                    {...registerUser("email")}
                  />
                  {userErrors.email && (
                    <p className="text-[11px] text-red-600">{userErrors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="password" className="text-xs">Initial Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min 8 characters"
                    disabled={isProcessing}
                    className="h-8 text-xs"
                    {...registerUser("password")}
                  />
                  {userErrors.password && (
                    <p className="text-[11px] text-red-600">{userErrors.password.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="role" className="text-xs">App Role *</Label>
                  <select
                    id="role"
                    className="flex h-8 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                    disabled={isProcessing}
                    {...registerUser("role")}
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isProcessing}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isProcessing}
                  className="h-8 text-xs gap-1.5"
                >
                  {isProcessing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Create Staff Account
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ASSIGN HIERARCHY MODAL */}
      {showAssignModal && (
        <Card className="border-slate-300 shadow-md">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Define Reporting Hierarchy</CardTitle>
              <CardDescription className="text-xs">
                Select an employee to report directly to a manager
              </CardDescription>
            </div>
            <button
              onClick={() => setShowAssignModal(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAssignSubmit(onAssignRelationship)} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="manager_id" className="text-xs">Supervising Manager *</Label>
                  <select
                    id="manager_id"
                    className="flex h-8 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm"
                    disabled={isProcessing}
                    {...registerAssign("manager_id")}
                  >
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.email})
                      </option>
                    ))}
                  </select>
                  {assignErrors.manager_id && (
                    <p className="text-[11px] text-red-600">{assignErrors.manager_id.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="employee_id" className="text-xs">Reporting Employee *</Label>
                  <select
                    id="employee_id"
                    className="flex h-8 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm"
                    disabled={isProcessing}
                    {...registerAssign("employee_id")}
                  >
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.full_name} ({e.email})
                      </option>
                    ))}
                  </select>
                  {assignErrors.employee_id && (
                    <p className="text-[11px] text-red-600">{assignErrors.employee_id.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAssignModal(false)}
                  disabled={isProcessing}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isProcessing}
                  className="h-8 text-xs gap-1.5"
                >
                  {isProcessing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Reporting Line
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* USERS TABLE */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Name & Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Reporting Hierarchy</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const userBadgeVariant =
                  u.role === "admin"
                    ? "roleAdmin"
                    : u.role === "manager"
                    ? "roleManager"
                    : "roleEmployee";

                // Subordinates if manager
                const subordinateMappings = relationships.filter((r) => r.manager_id === u.id);
                // Managers if employee
                const supervisorMappings = relationships.filter((r) => r.employee_id === u.id);

                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div>{u.full_name}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={userBadgeVariant} className="text-[10px]">
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {u.role === "manager" && (
                        <div className="flex flex-wrap gap-1">
                          {subordinateMappings.length === 0 ? (
                            <span className="text-slate-400 italic">No assigned staff</span>
                          ) : (
                            subordinateMappings.map((rel) => (
                              <span
                                key={rel.employee_id}
                                className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700"
                              >
                                {rel.employee_name}
                                <button
                                  type="button"
                                  onClick={() => onRemoveRelationship(u.id, rel.employee_id)}
                                  className="text-slate-400 hover:text-red-600"
                                  title="Unlink"
                                >
                                  ×
                                </button>
                              </span>
                            ))
                          )}
                        </div>
                      )}
                      {u.role === "employee" && (
                        <div className="flex flex-wrap gap-1">
                          {supervisorMappings.length === 0 ? (
                            <span className="text-slate-400 italic">Unassigned</span>
                          ) : (
                            supervisorMappings.map((rel) => (
                              <span
                                key={rel.manager_id}
                                className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-700"
                              >
                                Reports to: {rel.manager_name}
                                <button
                                  type="button"
                                  onClick={() => onRemoveRelationship(rel.manager_id, u.id)}
                                  className="text-indigo-400 hover:text-red-600"
                                  title="Unlink"
                                >
                                  ×
                                </button>
                              </span>
                            ))
                          )}
                        </div>
                      )}
                      {u.role === "admin" && (
                        <span className="text-slate-400 italic">Global Oversight</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.id !== currentAdminId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                          onClick={() => onDeleteUser(u.id, u.full_name)}
                          disabled={isProcessing}
                          title="Delete user"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
