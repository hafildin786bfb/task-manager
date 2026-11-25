# TaskFlow — Role-Based Task Delegation & Accountability System

TaskFlow is a production-ready internal accountability web application built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL, Auth, RLS)**.

It provides a strict, role-based hierarchy and a verified execution loop:
$$\text{Assigned} \longrightarrow \text{Submitted} \longrightarrow \text{Verified (Approved/Rejected)}$$

---

## 1. Core Accountability Loop & Roles

| Role | Key Capabilities | Boundaries & Restrictions |
| :--- | :--- | :--- |
| **ADMIN** | Onboard staff, configure reporting hierarchy (`manager_employees`), view company-wide task throughput metrics. | Read-only on tasks. Cannot create, edit, or approve tasks. |
| **MANAGER** | Delegate tasks to authorized direct reports only, review submitted reports, approve or reject with feedback. | Cannot manage users or assign tasks outside their reporting roster. |
| **EMPLOYEE** | View assigned tasks, submit completion reports with proof/attachments. | Cannot see other employees' tasks. Cannot assign or review tasks. |

---

## 2. Quick Start & Setup Guide

### Prerequisites
- Node.js 18+ (tested on Node 20+)
- A Supabase Project ([supabase.com](https://supabase.com))

### Step 1: Clone & Install Dependencies
```bash
git clone https://github.com/hafildin786bfb/task-manager.git
cd task-manager
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your project credentials from your **Supabase Dashboard -> Project Settings -> API**:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> [!CAUTION]
> The `SUPABASE_SERVICE_ROLE_KEY` bypasses all Row Level Security. It is utilized **strictly on the server side** for administrative user provisioning in Server Actions. It is **never** bundled or exposed to the browser.

### Step 3: Run Database Migrations
1. Open your Supabase Dashboard -> **SQL Editor**.
2. Create a new query and paste the contents of `supabase/migrations/20240101000000_taskflow_init.sql`.
3. Click **Run**. This provisions all enums (`app_role`, `task_status`), tables (`user_roles`, `profiles`, `manager_employees`, `tasks`), RLS policies, business-rule triggers, and the Auth Hook function.

### Step 4: Enable the Custom Access Token Auth Hook
To have the user's role injected directly into their JWT session claims:
1. Go to Supabase Dashboard -> **Authentication** -> **Hooks**.
2. Under **Custom Access Token (JWT)**, click **Add Hook**.
3. Select **Postgres function** and choose `public.custom_access_token_hook`.
4. Click **Save**.

### Step 5: Seed Demo Users & Sample Tasks
Run the automated seed script to populate 1 Admin, 2 Managers, 4 Employees, and tasks across every status:
```bash
npm run seed
```

All seeded accounts share the password: `Password123!`
- **Admin**: `admin@taskflow.internal`
- **Manager 1 (Engineering Lead)**: `manager1@taskflow.internal`
- **Manager 2 (Operations Director)**: `manager2@taskflow.internal`
- **Employee 1 (Frontend Dev)**: `employee1@taskflow.internal` (Reports to Manager 1)
- **Employee 2 (Backend Dev)**: `employee2@taskflow.internal` (Reports to Manager 1)
- **Employee 3 (Operations Associate)**: `employee3@taskflow.internal` (Reports to Manager 2)
- **Employee 4 (QA Analyst)**: `employee4@taskflow.internal` (Reports to Manager 2)

### Step 6: Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 3. End-to-End User Journey Walkthrough (Verification Test)

Follow these steps to manually verify the complete accountability loop:

### Step 1: Admin Onboards Staff & Defines Reporting Line
1. Log in as `admin@taskflow.internal` (`Password123!`).
2. Redirected to `/admin/dashboard`.
3. Click **Add Staff Member** -> Create a new manager `m_test@company.com` and an employee `e_test@company.com`.
4. Click **Assign Hierarchy** -> Select `m_test` as manager and `e_test` as reporting employee.
5. Log out.

### Step 2: Manager Delegates a Task
1. Log in as `manager1@taskflow.internal`.
2. Redirected to `/manager/dashboard`.
3. Notice the **Assignee** dropdown only lists authorized subordinates (`Ethan Hunt` and `Elena Rostova`).
4. Fill in:
   - **Title**: `Q3 Performance Audit`
   - **Assignee**: `Ethan Hunt (employee1@taskflow.internal)`
   - **Description**: `Audit lighthouse scores across core routes.`
5. Click **Create & Delegate Task**. The task appears in "Delegated Tasks" as `PENDING`.
6. Log out.

### Step 3: Employee Receives Task & Submits Report
1. Log in as `employee1@taskflow.internal`.
2. Redirected to `/employee/dashboard`.
3. See `Q3 Performance Audit` under **Action Required** with status `PENDING`.
4. Click **Submit Report**:
   - **Report Summary**: `Completed audit. Mobile score is 98, desktop is 100.`
   - **Attachment URL**: `https://lighthouse.report/q3`
5. Click **Submit Report**.
6. The task badge instantly flips to `SUBMITTED` and moves under "Under Review".
7. Log out.

### Step 4: Manager Reviews & Approves/Rejects
1. Log in as `manager1@taskflow.internal`.
2. In `/manager/dashboard`, under "Requires Review", the task `Q3 Performance Audit` is flagged with status `SUBMITTED`.
3. Read the employee's submitted report.
4. Click **Approve** (or test **Reject** with revision feedback).
5. Task status flips to `APPROVED`.
6. Log out.

### Step 5: Admin Inspects Org-Wide Throughput
1. Log in as `admin@taskflow.internal`.
2. In `/admin/dashboard`:
   - Metric counters reflect the newly approved task.
   - The "Throughput per Employee" table shows +1 Approved for Ethan Hunt.
   - The "Throughput per Manager" table shows +1 Approved for Morgan Lee.
   - The task feed shows the full audit timeline (read-only).

---

## 4. Security & RLS Policy Checklist

| Table | Policy Name | Permitted Operations | Security Validation |
| :--- | :--- | :--- | :--- |
| `user_roles` | `user_roles_select_own` | `SELECT` | `auth.uid() = user_id` |
| `user_roles` | `user_roles_admin_all` | `ALL` | `get_auth_role() = 'admin'` |
| `profiles` | `profiles_select_own` | `SELECT` | `auth.uid() = id` |
| `profiles` | `profiles_update_own` | `UPDATE` | `auth.uid() = id` |
| `profiles` | `profiles_admin_select` | `SELECT` | `get_auth_role() = 'admin'` |
| `profiles` | `profiles_manager_select_subordinates` | `SELECT` | Assigned subordinates in `manager_employees` |
| `profiles` | `profiles_employee_select_supervisors` | `SELECT` | Assigned supervisors in `manager_employees` |
| `manager_employees` | `manager_employees_admin_all` | `ALL` | `get_auth_role() = 'admin'` |
| `manager_employees` | `manager_employees_manager_select` | `SELECT` | `manager_id = auth.uid()` |
| `manager_employees` | `manager_employees_employee_select` | `SELECT` | `employee_id = auth.uid()` |
| `tasks` | `tasks_admin_select_all` | `SELECT` | `get_auth_role() = 'admin'` (Read-only) |
| `tasks` | `tasks_manager_select_assigned_by` | `SELECT` | `assigned_by = auth.uid()` |
| `tasks` | `tasks_manager_insert` | `INSERT` | `assigned_by = auth.uid()` AND `assigned_to` in `manager_employees` |
| `tasks` | `tasks_manager_update` | `UPDATE` | `assigned_by = auth.uid()` |
| `tasks` | `tasks_employee_select_assigned_to` | `SELECT` | `assigned_to = auth.uid()` |
| `tasks` | `tasks_employee_update_submission` | `UPDATE` | `assigned_to = auth.uid()` |

### Database-Level Trigger Enforcements
- **`tr_tasks_status_transition`**: Ensures that:
  - Only the assigned employee can transition a task from `pending` -> `submitted`.
  - Only the assigning manager can transition a task from `submitted` -> `approved` or `rejected`.
  - Report content cannot be blank when submitting.
- **`tr_tasks_assignment_hierarchy`**: Prevents managers from creating tasks for any user not mapped to them in `manager_employees`.
