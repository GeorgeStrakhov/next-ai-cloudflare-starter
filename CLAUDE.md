# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15.4 application configured to deploy on Cloudflare Workers using OpenNext.js. It provides a modern starter template and uses:
- **Framework**: Next.js App Router with TypeScript, React 19
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **Database**: Cloudflare D1 (SQLite) with Drizzle ORM
- **Auth**: Better Auth with magic link authentication
- **Package Manager**: pnpm (not npm)

## Centralized Configuration

This starter uses a centralized configuration system in `src/lib/config.ts` that pulls values from environment variables.

### Configuration File

All app settings are defined in `src/lib/config.ts`:

```typescript
export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "My App",
  description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || "...",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@example.com",
  noreplyEmail: process.env.EMAIL_FROM || "noreply@example.com",
};

export const dbConfig = {
  bindingName: "DB" as const, // Must match wrangler.jsonc
};
```

### Environment-Based Configuration

- **Local**: Set variables in `.dev.vars`
- **Staging/Production**: Set variables in `wrangler.jsonc` vars or as secrets
- **Environment Detection**: Use `NEXT_PUBLIC_APP_ENV` (development/staging/production)

This makes customization easy - update environment variables instead of code!

## Development Commands

### Local Development
```bash
pnpm dev
# Starts Next.js dev server with Turbopack
# Enables getCloudflareContext() for local Cloudflare integration testing
```

**Important**: This project uses **pnpm**, not npm. Always use `pnpm` commands.

### Building and Deployment
```bash
pnpm build
# Standard Next.js production build

pnpm deploy:staging
# Builds with OpenNext.js and deploys to staging (staging.your-domain.com)

pnpm deploy:production
# Builds with OpenNext.js and deploys to production (your-domain.com)

pnpm preview
# Builds and previews locally before deploying
```

**Production Deployment**: Automated via GitHub Actions. See branch structure below. See `DEPLOYMENT.md` for complete setup.

### Database Commands (Cloudflare D1)
```bash
pnpm db:generate
# Generates SQL migration files from Drizzle schema

pnpm db:migrate:local
# Applies migrations to local D1 database (for development)

pnpm db:migrate:staging
# Applies migrations to staging D1 database (remote)

pnpm db:migrate:production ## DON'T USE THIS. BECAUSE MIGRATIONS ARE APPLIED AUTOMATICALLY ON DEPLOY VIA GH-ACTIONS
# Applies migrations to production D1 database (remote)

pnpm db:studio
# Opens Drizzle Studio for local database at http://localhost:4983

pnpm db:studio:stage
# Downloads staging database snapshot and opens Drizzle Studio (read-only)

pnpm db:studio:prod
# Downloads production database snapshot and opens Drizzle Studio (read-only)
```

**Note**: Remote studio commands are read-only. Changes made in Studio won't affect the remote database. Use migrations for schema changes.

### Code Quality
```bash
pnpm lint
# Runs Next.js ESLint with TypeScript rules
```

### Cloudflare Types
```bash
pnpm cf-typegen
# Generates TypeScript types for Cloudflare bindings
# Updates cloudflare-env.d.ts with CloudflareEnv interface
```

## Architecture

### Deployment Target: Cloudflare Workers
This application is configured specifically for Cloudflare Workers deployment via `@opennextjs/cloudflare`. Key considerations:

- **Worker Configuration**: `wrangler.jsonc` defines the worker setup with `nodejs_compat` compatibility flag
- **OpenNext Config**: `open-next.config.ts` contains Cloudflare-specific Next.js build configuration
- **Assets**: Static assets are served from `.open-next/assets` directory via Cloudflare's asset binding
- **Worker Entry**: Main worker file is `.open-next/worker.js` (generated during build)
- **Cloudflare Context**: Use `getCloudflareContext()` to access Cloudflare bindings (env vars, KV, R2, etc.) during request handling

### App Structure
- **App Router**: Uses Next.js App Router (`src/app/` directory)
- **Path Aliases**: `@/*` maps to `./src/*` for imports
- **Styling**: Tailwind CSS v4 with custom theme using CSS variables and `@theme inline`
- **UI Components**: shadcn/ui components in `src/components/ui/`
- **Fonts**: Google Fonts (Geist Sans and Geist Mono) loaded via `next/font`
- **TypeScript**: Strict mode enabled with ES2017 target
- **Authentication**: Better Auth with magic link (email-only, no password)

### Key Files
- `next.config.ts`: Next.js configuration with OpenNext.js Cloudflare dev initialization
- `wrangler.jsonc`: Cloudflare Worker configuration (compatibility flags, assets, observability)
- `open-next.config.ts`: OpenNext.js Cloudflare adapter configuration (incremental cache, overrides)
- `tsconfig.json`: TypeScript config with Cloudflare environment types
- `src/app/layout.tsx`: Root layout with font configuration and metadata
- `src/app/page.tsx`: Homepage component
- `src/app/globals.css`: Global styles with Tailwind v4 and CSS variable theme system

### Caching
The OpenNext.js configuration supports R2 incremental cache (currently commented out). To enable:
1. Uncomment the `incrementalCache` option in `open-next.config.ts`
2. Import: `import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache"`
3. See https://opennext.js.org/cloudflare/caching for details

## Deployment

### Branch Structure
This project uses a three-branch deployment strategy:

- **`main`**: Local development only (no auto-deploy)
- **`stage`**: Auto-deploys to staging → `staging.your-domain.com`
- **`prod`**: Auto-deploys to production → `your-domain.com`

**Workflow**:
```bash
# Develop on main
git checkout main
# ... make changes ...
git push origin main

# Deploy to staging
git checkout stage
git merge main
git push origin stage  # → Triggers deploy to staging.your-domain.com

# Deploy to production (always promote from staging)
git checkout prod
git merge stage  # NOT main!
git push origin prod  # → Triggers deploy to your-domain.com
```

### CI/CD Pipeline
This project uses GitHub Actions for automated deployments:

- **Workflow**: `.github/workflows/deploy.yml`
- **Triggers**: Pushes to `stage` or `prod` branches
- **Process**:
  1. Generate migrations (`pnpm db:generate`)
  2. Apply migrations to target database (`pnpm db:migrate:staging` or `pnpm db:migrate:production`)
  3. Build with OpenNext.js
  4. Deploy to Cloudflare Workers
- **Important**: Database migrations run automatically on every deployment - no manual migration commands needed!
- **Setup**: See `SETUP.md` for complete setup instructions

### Required GitHub Secrets
- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with Workers and D1 edit permissions
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
- `BETTER_AUTH_SECRET_STAGING`: Auth secret for staging (generate with `openssl rand -base64 32`)
- `BETTER_AUTH_SECRET_PRODUCTION`: Auth secret for production (use different value!)
- `POSTMARK_API_KEY`: Email service API key (shared across environments)
- `EMAIL_FROM`: Email sender address (shared across environments)

Note: No DATABASE_URL needed - D1 is accessed via Cloudflare bindings.

## Environment Variables

### Local Development (`.dev.vars`)
Create a `.dev.vars` file (gitignored) for local development. See `.dev.vars.example` for template:
```bash
# Better Auth (Required)
BETTER_AUTH_SECRET=your-secret-key  # Generate with: openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000

# Email (Required for magic link auth)
POSTMARK_API_KEY=your-postmark-api-key
EMAIL_FROM=noreply@your-domain.com

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Note: D1 database access is via bindings, not environment variables.

### Server-Side Variables and Bindings
**IMPORTANT**: Cannot use `process.env` for server variables on Cloudflare Workers. Must use `getCloudflareContext()`:

```typescript
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';

export async function GET() {
  const { env } = await getCloudflareContext();

  // Access D1 database via binding
  const db = drizzle(env.DB);  // ✅ Correct

  // Access other environment variables
  const apiKey = env.OPENAI_API_KEY;  // ✅ Correct
  const wrongKey = process.env.API_KEY; // ❌ Won't work
}
```

### Client-Side Variables
The `NEXT_PUBLIC_` prefix works as normal:
```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL; // ✅ Works in browser
```

### Setting Production Variables
1. **Non-sensitive values**: Add to `wrangler.jsonc` under `vars`
2. **Secrets**: Use `npx wrangler secret put SECRET_NAME` or Cloudflare dashboard

### Type Generation
After adding variables to `wrangler.jsonc`, run `pnpm cf-typegen` to update TypeScript types.

## Database (Cloudflare D1)

### Overview
This project uses **Cloudflare D1** (SQLite) with **Drizzle ORM**. D1 is Cloudflare's native serverless SQL database.

### Setup and Usage
See `D1_SETUP.md` for complete setup instructions.

### Quick Reference
- **Schema**: Define tables in `src/db/schema/` (exported via `src/db/schema/index.ts`)
- **Client**: Access D1 via `getCloudflareContext()` in server code
- **Migrations**: Generate with `pnpm db:generate`, apply with migration commands
- **Local Database**: Stored in `.wrangler/state/v3/d1/` (auto-created)
- **Access**: Via `env.DB` binding (not connection string)
- **Better Auth Tables**: Automatically created by Better Auth migrations

### Development Workflow
1. Update schema in `src/db/schema/`
2. Generate migration: `pnpm db:generate`
3. Apply locally: `pnpm db:migrate:local`
4. Test: `pnpm dev`
5. Deploy to staging: merge to `stage` branch (auto-runs migrations)
6. Deploy to production: merge to `prod` branch (auto-runs migrations)

### Important Notes
- D1 uses SQLite syntax, not PostgreSQL
- Use `integer({ mode: 'timestamp' })` for timestamps
- Use `text` for UUIDs (store as strings)
- No `ENUM` types - use text with validation

## Development Notes

### Working with Cloudflare Bindings
When accessing Cloudflare resources (KV, R2, D1, Durable Objects, etc.):
1. Add bindings to `wrangler.jsonc`
2. Run `pnpm cf-typegen` to update TypeScript types
3. Use `getCloudflareContext()` from `@opennextjs/cloudflare` in route handlers or server components

**Important**: `getCloudflareContext()` can only be called during request handling, not at module initialization. For per-request setup (like auth), create instances during request handling.

### Testing Locally
The `initOpenNextCloudflareForDev()` call in `next.config.ts` enables local testing of Cloudflare context during development with `pnpm dev`.

### Tailwind CSS v4 & shadcn/ui
This project uses:
- **Tailwind v4**: `@import "tailwindcss"` syntax with `@theme inline` for custom configuration
- **shadcn/ui**: Component library configured for Next.js App Router
- **CSS Variables**: Defined in `:root` and automatically integrate with Tailwind
- **Adding Components**: Use `pnpm dlx shadcn@latest add <component-name>`

**IMPORTANT**: Always install official shadcn/ui components using the CLI command above. Never create custom UI components manually if an official shadcn version exists. This ensures consistent styling, accessibility, and compatibility with the rest of the UI system.

### Better Auth
Authentication is handled by Better Auth with magic link (email-only):
- **Server Config**: `src/lib/auth.ts` (creates auth instance per-request)
- **Client Config**: `src/lib/auth-client.ts` (browser-side auth client)
- **Auth Routes**: `/api/auth/[...all]` handles all auth endpoints
- **Sign In**: `/sign-in` page with magic link form
- **Protected Routes**: Check session with `createAuth()` in server components
- **Database**: Uses Better Auth's automatic D1 table creation

**Important**: Auth instance must be created per-request using `createAuth()` to access Cloudflare context.
