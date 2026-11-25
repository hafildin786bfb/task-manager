-- ==============================================================================
-- TASKFLOW: Complete Database Schema, Enums, RLS Policies, Triggers & Auth Hook
-- ==============================================================================

-- 1. Create Enums
create type public.app_role as enum ('admin', 'manager', 'employee');
create type public.task_status as enum ('pending', 'submitted', 'approved', 'rejected');

-- 2. Create user_roles Table
create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now()
);

-- 3. Create profiles Table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

-- 4. Create manager_employees Table (Many-to-Many mapping)
create table public.manager_employees (
  manager_id uuid not null references auth.users(id) on delete cascade,
  employee_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (manager_id, employee_id),
  constraint unique_manager_employee unique (manager_id, employee_id)
);

-- 5. Create tasks Table
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assigned_to uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid not null references auth.users(id) on delete cascade,
  status public.task_status not null default 'pending',
  report_content text,
  report_submitted_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes for performance
create index idx_user_roles_role on public.user_roles(role);
create index idx_manager_employees_manager on public.manager_employees(manager_id);
create index idx_manager_employees_employee on public.manager_employees(employee_id);
create index idx_tasks_assigned_to on public.tasks(assigned_to);
create index idx_tasks_assigned_by on public.tasks(assigned_by);
create index idx_tasks_status on public.tasks(status);

-- ==============================================================================
-- 6. Helper Functions for Auth & Claims
-- ==============================================================================

-- Function to safely fetch the current caller's app_role from JWT claims or user_roles table
create or replace function public.get_auth_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb->>'user_role', '')::public.app_role,
    (select role from public.user_roles where user_id = auth.uid())
  );
$$;

-- Function: Supabase Custom Access Token Auth Hook
-- Injects role as `user_role` into JWT claims on token issuance / refresh
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  claims jsonb;
  user_role public.app_role;
begin
  -- Fetch the user's role from user_roles
  select role into user_role
  from public.user_roles
  where user_id = (event->>'user_id')::uuid;

  claims := event->'claims';

  if user_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role::text));
  else
    claims := jsonb_set(claims, '{user_role}', '"employee"'::jsonb);
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- Grant required permissions to supabase_auth_admin for the Auth Hook
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
grant select on table public.user_roles to supabase_auth_admin;

-- Auto-provision profile on auth.users creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, created_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    now()
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, profiles.full_name),
    email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert or update on auth.users
for each row execute function public.handle_new_user();

-- ==============================================================================
-- 7. DB-Level Business Rules & Triggers
-- ==============================================================================

-- Trigger: Enforce Task Status Transitions & Permissions at the Postgres level
create or replace function public.enforce_task_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
begin
  caller_id := auth.uid();

  -- If status has changed, validate permissions and transition logic
  if OLD.status is distinct from NEW.status then
    -- Transition 1: pending -> submitted (Only assigned employee)
    if OLD.status = 'pending' and NEW.status = 'submitted' then
      if caller_id is distinct from NEW.assigned_to and caller_id is not null then
        raise exception 'Only the assigned employee can submit a report for this task.';
      end if;
      if NEW.report_content is null or trim(NEW.report_content) = '' then
        raise exception 'Submission report content cannot be empty.';
      end if;
      NEW.report_submitted_at := now();

    -- Transition 2: submitted -> approved (Only assigning manager)
    elsif OLD.status = 'submitted' and NEW.status = 'approved' then
      if caller_id is distinct from NEW.assigned_by and caller_id is not null then
        raise exception 'Only the assigning manager can approve this report.';
      end if;
      NEW.rejection_reason := null;

    -- Transition 3: submitted -> rejected (Only assigning manager)
    elsif OLD.status = 'submitted' and NEW.status = 'rejected' then
      if caller_id is distinct from NEW.assigned_by and caller_id is not null then
        raise exception 'Only the assigning manager can reject this report.';
      end if;

    -- Transition 4: rejected -> submitted (Employee re-submitting after fixing report)
    elsif OLD.status = 'rejected' and NEW.status = 'submitted' then
      if caller_id is distinct from NEW.assigned_to and caller_id is not null then
        raise exception 'Only the assigned employee can re-submit a report.';
      end if;
      if NEW.report_content is null or trim(NEW.report_content) = '' then
        raise exception 'Submission report content cannot be empty.';
      end if;
      NEW.report_submitted_at := now();

    else
      raise exception 'Illegal task status transition from % to %.', OLD.status, NEW.status;
    end if;
  end if;

  NEW.updated_at := now();
  return NEW;
end;
$$;

create trigger tr_tasks_status_transition
before update on public.tasks
for each row execute function public.enforce_task_status_transition();

-- Trigger: Enforce Manager-Employee Assignment Hierarchy upon Task Creation
create or replace function public.enforce_task_assignment_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.app_role;
begin
  caller_role := public.get_auth_role();

  -- Managers can only assign tasks to employees mapped to them in manager_employees
  if caller_role = 'manager' then
    if not exists (
      select 1 from public.manager_employees
      where manager_id = NEW.assigned_by and employee_id = NEW.assigned_to
    ) then
      raise exception 'Manager % is not authorized to assign tasks to employee %.', NEW.assigned_by, NEW.assigned_to;
    end if;
  end if;

  return NEW;
end;
$$;

create trigger tr_tasks_assignment_hierarchy
before insert on public.tasks
for each row execute function public.enforce_task_assignment_hierarchy();

-- ==============================================================================
-- 8. Row Level Security (RLS) Policies
-- ==============================================================================

-- Enable RLS on all tables
alter table public.user_roles enable row level security;
alter table public.profiles enable row level security;
alter table public.manager_employees enable row level security;
alter table public.tasks enable row level security;

-- Grant schema and table access to API roles (anon, authenticated, service_role)
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- Table: user_roles
-- ------------------------------------------------------------------------------
-- Users can read their own role
create policy "user_roles_select_own"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id);

-- Admins can read all roles
create policy "user_roles_admin_select"
on public.user_roles
for select
to authenticated
using (public.get_auth_role() = 'admin');

-- Admins can insert/update/delete roles
create policy "user_roles_admin_all"
on public.user_roles
for all
to authenticated
using (public.get_auth_role() = 'admin')
with check (public.get_auth_role() = 'admin');

-- ------------------------------------------------------------------------------
-- Table: profiles
-- ------------------------------------------------------------------------------
-- Users can view their own profile
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

-- Users can update their own profile
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Admins can view all profiles
create policy "profiles_admin_select"
on public.profiles
for select
to authenticated
using (public.get_auth_role() = 'admin');

-- Managers can view profiles of their assigned employees
create policy "profiles_manager_select_subordinates"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1 from public.manager_employees
    where manager_id = auth.uid() and employee_id = profiles.id
  )
);

-- Employees can view profiles of their assigning managers
create policy "profiles_employee_select_supervisors"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1 from public.manager_employees
    where employee_id = auth.uid() and manager_id = profiles.id
  )
);

-- ------------------------------------------------------------------------------
-- Table: manager_employees
-- ------------------------------------------------------------------------------
-- Admins have full CRUD on manager_employees
create policy "manager_employees_admin_all"
on public.manager_employees
for all
to authenticated
using (public.get_auth_role() = 'admin')
with check (public.get_auth_role() = 'admin');

-- Managers can read their own assigned subordinates
create policy "manager_employees_manager_select"
on public.manager_employees
for select
to authenticated
using (manager_id = auth.uid());

-- Employees can read their manager relationships
create policy "manager_employees_employee_select"
on public.manager_employees
for select
to authenticated
using (employee_id = auth.uid());

-- ------------------------------------------------------------------------------
-- Table: tasks
-- ------------------------------------------------------------------------------
-- Admin: Read-only access to all tasks across the company
create policy "tasks_admin_select_all"
on public.tasks
for select
to authenticated
using (public.get_auth_role() = 'admin');

-- Manager: View tasks they assigned
create policy "tasks_manager_select_assigned_by"
on public.tasks
for select
to authenticated
using (assigned_by = auth.uid());

-- Manager: Create tasks for employees assigned to them
create policy "tasks_manager_insert"
on public.tasks
for insert
to authenticated
with check (
  assigned_by = auth.uid()
  and exists (
    select 1 from public.manager_employees
    where manager_id = auth.uid() and employee_id = assigned_to
  )
);

-- Manager: Update tasks (Approve or Reject submitted reports)
create policy "tasks_manager_update"
on public.tasks
for update
to authenticated
using (assigned_by = auth.uid())
with check (assigned_by = auth.uid());

-- Employee: View tasks assigned to them
create policy "tasks_employee_select_assigned_to"
on public.tasks
for select
to authenticated
using (assigned_to = auth.uid());

-- Employee: Update tasks (Submit report only for assigned tasks)
create policy "tasks_employee_update_submission"
on public.tasks
for update
to authenticated
using (assigned_to = auth.uid())
with check (assigned_to = auth.uid());
