# Overview

IndiaCorp DB is a corporate directory web application for Indian companies. It allows users to browse, search, and view detailed information about companies registered in India (CIN, capital, incorporation dates, etc.). The app includes an admin dashboard for managing company data, including bulk upload via Excel/CSV files. Authentication is handled through Replit Auth (OpenID Connect).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack React Query for server state (data fetching, caching, mutations)
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS
- **Styling**: Tailwind CSS with CSS variables for theming, custom corporate color palette (deep blues and clean greys)
- **Animations**: Framer Motion for page transitions and UI animations
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend
- **Framework**: Express.js running on Node with TypeScript (tsx for dev, esbuild for production)
- **API Design**: RESTful JSON API under `/api/` prefix. Route definitions and Zod validation schemas are shared between client and server via `shared/routes.ts`
- **File Upload**: Multer (memory storage) for Excel/CSV company data bulk uploads, parsed with the `xlsx` library
- **Session Management**: express-session with connect-pg-simple (PostgreSQL-backed sessions)
- **Build**: Custom build script (`script/build.ts`) that uses Vite for client and esbuild for server, outputting to `dist/`

### Database
- **Database**: PostgreSQL (required, via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with drizzle-zod for schema-to-validation integration
- **Schema location**: `shared/schema.ts` and `shared/models/auth.ts`
- **Migrations**: Drizzle Kit with `db:push` command for schema synchronization
- **Key tables**:
  - `companies` — Corporate directory entries with fields like CIN, name, status, capital, location, dates
  - `admins` — Email whitelist for admin access
  - `users` — Replit Auth user records (mandatory, do not drop)
  - `sessions` — Session storage (mandatory for Replit Auth, do not drop)

### Authentication & Authorization
- **Auth Provider**: Replit Auth via OpenID Connect (OIDC)
- **Implementation**: Located in `server/replit_integrations/auth/` — includes Passport.js strategy, session config, user upsert logic
- **Auth Flow**: Users log in via `/api/login`, session stored in PostgreSQL, user info available at `/api/auth/user`
- **Admin Check**: `/api/admin/check` endpoint; currently any authenticated user is treated as admin (MVP), with infrastructure to enforce email-based admin whitelist via `admins` table
- **Important**: The `users` and `sessions` tables are mandatory for Replit Auth and must not be dropped

### Shared Code
- `shared/schema.ts` — Drizzle table definitions and Zod insert schemas (companies, admins, re-exports auth models)
- `shared/routes.ts` — API route definitions with paths, methods, input/output Zod schemas
- `shared/models/auth.ts` — User and session table definitions

### Key Pages
- `/` — Home page with company search, alphabetical filtering, and paginated grid
- `/company/:id` — Company detail page with full corporate information
- `/admin` — Admin dashboard for managing companies and bulk data upload

## External Dependencies

- **PostgreSQL** — Primary database, required via `DATABASE_URL` environment variable
- **Replit Auth (OIDC)** — Authentication provider, uses `ISSUER_URL` (defaults to `https://replit.com/oidc`) and `REPL_ID`
- **Session Secret** — `SESSION_SECRET` environment variable required for express-session
- **Google Fonts** — Inter and Playfair Display loaded via CDN for typography
- **npm packages of note**: `xlsx` for spreadsheet parsing, `react-dropzone` for file upload UI, `recharts` for admin dashboard charts, `date-fns` for date formatting, `framer-motion` for animations