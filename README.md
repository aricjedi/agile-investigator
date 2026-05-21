# TrustQ

Corporate Investigations Program Health Platform

## Stack

- **Next.js 14** (App Router)
- **Supabase** — auth, database, RLS
- **Tailwind CSS**
- **TypeScript**

---

## Getting started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
# Fill in your Supabase URL and anon key
```

### 3. Run the database schema

Open the Supabase SQL Editor and paste the contents of `supabase/schema.sql`, then run it.

### 4. Start the dev server

```bash
npm run dev
```

---

## Project structure

```
trustq/
├── app/
│   ├── page.tsx              # Landing page
│   ├── auth/
│   │   ├── login/page.tsx    # Sign-in form
│   │   └── signup/page.tsx   # Registration form
│   ├── admin/
│   │   ├── layout.tsx        # Role guard + AdminLayout
│   │   └── page.tsx          # Admin dashboard shell
│   └── dashboard/
│       ├── layout.tsx        # Role guard + ClientLayout
│       └── page.tsx          # Client portal shell
├── components/
│   └── layouts/
│       ├── AdminLayout.tsx   # Sidebar with org list
│       └── ClientLayout.tsx  # Top nav with org name
├── lib/
│   └── supabase/
│       ├── client.ts         # Browser client
│       ├── server.ts         # Server Component client
│       └── middleware.ts     # Middleware client
├── middleware.ts             # Route protection + role enforcement
├── supabase/
│   └── schema.sql            # DDL + RLS policies
└── types/
    └── database.ts           # TypeScript types for DB tables
```

## Route access

| Route | Required role |
|---|---|
| `/` | Public |
| `/auth/login` | Public (redirects if signed in) |
| `/auth/signup` | Public (redirects if signed in) |
| `/admin` | `admin` |
| `/dashboard` | `client`, `viewer` |

## What's NOT built yet (future sprints)

- Survey / intake tools
- Health scoring engine
- Investigation management
- Reports & exports
- User provisioning / invite flow
- Password reset
- OAuth providers (Google, Microsoft)
- Organization settings pages
- Notifications
