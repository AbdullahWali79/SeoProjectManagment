# SEO Project Management

Local-first MVP for an SEO software house:

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
npm run db:init
npm run dev
```

## Demo credentials

- Admin: `admin@agency.local` / `Passw0rd!`
- Employee: `ali@agency.local` / `Passw0rd!`

## Current stack

- Next.js + React
- Local SQLite database file via `sql.js`
- Cookie session auth for local MVP

## Important note

This local SQLite setup is for development and validation only. For Vercel production deployment, the data layer should be moved to Supabase Postgres. The data model in this MVP was kept close to that migration path.
