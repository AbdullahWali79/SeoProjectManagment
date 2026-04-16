# SEO Project Management

Supabase-backed SEO project and task management app for an SEO software house:

- Admin can create users
- Admin can create client projects
- Admin can define strategy
- Admin can assign SEO tasks to employees/interns
- Employees can update task status, hours, blockers, and results
- Employees can submit daily reports
- Admin can review project progress in table form before client meetings

## Run locally

```bash
npm install
npm run dev
```

Required environment variables:

```bash
APP_SESSION_SECRET=your-random-secret
DATABASE_URL=your-supabase-postgres-connection-string
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Database setup:

1. Open Supabase SQL Editor
2. Paste and run [scripts/supabase-schema.sql](./scripts/supabase-schema.sql)
3. Add the environment variables above locally and in Vercel

## Demo credentials

- Admin: `admin@agency.local` / `Passw0rd!`
- Employee: `ali@agency.local` / `Passw0rd!`

## Current stack

- Next.js + React
- Supabase Postgres
- Custom cookie session auth

## Important note

For Vercel deployment, make sure `DATABASE_URL` points to your Supabase Postgres instance and redeploy after adding the environment variables.
