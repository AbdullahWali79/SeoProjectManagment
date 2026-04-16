-- Paste this entire script into the Supabase SQL Editor.
-- It creates the tables used by the current app and also seeds demo data.
-- Demo logins after seed:
-- admin@agency.local / Passw0rd!
-- ali@agency.local / Passw0rd!
-- sara@agency.local / Passw0rd!

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('admin', 'employee')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_name text not null,
  source_channel text not null,
  status text not null check (status in ('planning', 'active', 'review', 'done')),
  due_date date,
  summary text not null,
  is_archived boolean not null default false,
  archived_at timestamptz,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.strategies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  summary text not null,
  objective text not null,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  strategy_id uuid references public.strategies(id) on delete set null,
  title text not null,
  description text not null,
  priority text not null check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null check (status in ('backlog', 'todo', 'in_progress', 'review', 'completed')),
  assignee_id uuid references public.users(id),
  estimated_hours numeric(10,2) not null default 0,
  actual_hours numeric(10,2) not null default 0,
  due_date date,
  result_note text not null default '',
  current_blockers text not null default '',
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_updates (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id),
  status text not null check (status in ('backlog', 'todo', 'in_progress', 'review', 'completed')),
  time_spent_hours numeric(10,2) not null default 0,
  outcome text not null default '',
  blockers text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id),
  report_date date not null,
  summary text not null,
  next_steps text not null,
  total_hours numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (project_id, user_id, report_date)
);

create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_tasks_project_id on public.tasks(project_id);
create index if not exists idx_tasks_assignee_id on public.tasks(assignee_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_due_date on public.tasks(due_date);
create index if not exists idx_task_updates_task_id on public.task_updates(task_id);
create index if not exists idx_daily_reports_project_id on public.daily_reports(project_id);
create index if not exists idx_daily_reports_user_date on public.daily_reports(user_id, report_date);

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

do $$
declare
  v_admin_id uuid := '11111111-1111-1111-1111-111111111111';
  v_ali_id uuid := '22222222-2222-2222-2222-222222222222';
  v_sara_id uuid := '33333333-3333-3333-3333-333333333333';
  v_project_id uuid := '44444444-4444-4444-4444-444444444444';
  v_strategy_id uuid := '55555555-5555-5555-5555-555555555555';
  v_task_1_id uuid := '66666666-6666-6666-6666-666666666666';
  v_task_2_id uuid := '77777777-7777-7777-7777-777777777777';
  v_report_id uuid := '88888888-8888-8888-8888-888888888888';
  v_update_id uuid := '99999999-9999-9999-9999-999999999999';
  v_demo_password_hash text := '$2b$10$JH.xf1q0SUnAK33ztMfm0.IUM/gzl5el846cmUzMWtGV47FwJWzYi';
begin
  insert into public.users (id, full_name, email, password_hash, role, is_active)
  values
    (v_admin_id, 'Agency Admin', 'admin@agency.local', v_demo_password_hash, 'admin', true),
    (v_ali_id, 'Ali Intern', 'ali@agency.local', v_demo_password_hash, 'employee', true),
    (v_sara_id, 'Sara Intern', 'sara@agency.local', v_demo_password_hash, 'employee', true)
  on conflict (email) do nothing;

  insert into public.projects (
    id,
    name,
    client_name,
    source_channel,
    status,
    due_date,
    summary,
    is_archived,
    created_by
  )
  values (
    v_project_id,
    'Maple Dental SEO Sprint',
    'Maple Dental',
    'Fiverr',
    'active',
    (current_date + interval '7 days')::date,
    'Local SEO project with citation cleanup, on-page updates, and Google Business Profile optimization.',
    false,
    v_admin_id
  )
  on conflict (id) do nothing;

  insert into public.strategies (
    id,
    project_id,
    title,
    summary,
    objective,
    created_by
  )
  values (
    v_strategy_id,
    v_project_id,
    'Local SEO Recovery Plan',
    'Fix local presence and improve calls from Google Maps and branded search.',
    'Clean citations, optimize location pages, and publish weekly GBP updates.',
    v_admin_id
  )
  on conflict (id) do nothing;

  insert into public.tasks (
    id,
    project_id,
    strategy_id,
    title,
    description,
    priority,
    status,
    assignee_id,
    estimated_hours,
    actual_hours,
    due_date,
    result_note,
    current_blockers,
    created_by
  )
  values
    (
      v_task_1_id,
      v_project_id,
      v_strategy_id,
      'Audit top 25 local citations',
      'Check NAP consistency, mark wrong listings, and prepare correction sheet.',
      'high',
      'in_progress',
      v_ali_id,
      3,
      1.5,
      (current_date + interval '2 days')::date,
      '12 directories audited, 4 issues found.',
      'Need client approval to fix two listings.',
      v_admin_id
    ),
    (
      v_task_2_id,
      v_project_id,
      v_strategy_id,
      'Write GBP weekly post',
      'Prepare a promotional Google Business Profile post with tracked CTA.',
      'medium',
      'backlog',
      v_sara_id,
      1.5,
      0,
      (current_date + interval '1 day')::date,
      '',
      '',
      v_admin_id
    )
  on conflict (id) do nothing;

  insert into public.task_updates (
    id,
    task_id,
    user_id,
    status,
    time_spent_hours,
    outcome,
    blockers
  )
  values (
    v_update_id,
    v_task_1_id,
    v_ali_id,
    'in_progress',
    1.5,
    'Spreadsheet prepared with current NAP data.',
    'Need client approval to fix two listings.'
  )
  on conflict (id) do nothing;

  insert into public.daily_reports (
    id,
    project_id,
    user_id,
    report_date,
    summary,
    next_steps,
    total_hours
  )
  values (
    v_report_id,
    v_project_id,
    v_ali_id,
    current_date,
    'Citation audit started and inconsistencies documented.',
    'Finalize correction list and send to admin for review.',
    1.5
  )
  on conflict (project_id, user_id, report_date) do nothing;
end $$;
