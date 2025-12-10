# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15.4 (security patched) application configured to deploy on Cloudflare Workers using OpenNext.js. It provides a modern starter template with AI capabilities and uses:
- **Framework**: Next.js App Router with TypeScript, React 19
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **Database**: Cloudflare D1 (SQLite) with Drizzle ORM
- **Auth**: Better Auth with magic link authentication
- **Admin**: Built-in admin interface with user management
- **Storage**: Cloudflare R2 (S3-compatible object storage)
- **AI Image Gen**: Replicate (Imagen 4, FLUX models)
- **AI LLM**: OpenRouter + AI SDK 5 (GPT, Gemini, Claude)
- **Analytics**: Google Analytics + PostHog (privacy-first, cookie consent integrated)
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

# production and staging migrations ARE APPLIED AUTOMATICALLY ON DEPLOY VIA GH-ACTIONS

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
- **Runtime**: Use Node.js runtime (default), NOT edge runtime. Do not add `export const runtime = "edge"` to API routes - OpenNext.js requires Node.js runtime for Cloudflare Workers deployment

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

### Required GitHub Secrets (12 total)
The setup script can configure these automatically via GitHub CLI, or you can add them manually:

**Cloudflare:**
- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with Workers and D1 edit permissions
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

**Auth (Different per environment):**
- `BETTER_AUTH_SECRET_STAGING`: Auth secret for staging (generate with `openssl rand -base64 32`)
- `BETTER_AUTH_SECRET_PRODUCTION`: Auth secret for production (use different value!)

**Email (Shared):**
- `POSTMARK_API_KEY`: Email service API key
- `EMAIL_FROM`: Email sender address

**R2 Storage (Different per environment):**
- `R2_ACCESS_KEY_ID_STAGING`: R2 access key for staging bucket
- `R2_SECRET_ACCESS_KEY_STAGING`: R2 secret key for staging bucket
- `R2_ACCESS_KEY_ID_PRODUCTION`: R2 access key for production bucket
- `R2_SECRET_ACCESS_KEY_PRODUCTION`: R2 secret key for production bucket

**AI Features (Shared, optional):**
- `REPLICATE_API_KEY`: For AI image generation
- `OPENROUTER_API_KEY`: For LLM chatbot

**Note**: The setup script creates R2 credentials automatically and can set all GitHub secrets via `gh` CLI.

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

### Theming & Dark Mode

This starter includes a complete theming system with dark mode support via `next-themes`.

**Architecture:**
- **Theme Provider**: `src/components/theme-provider.tsx` - Wraps app with next-themes
- **Mode Toggle**: `src/components/mode-toggle.tsx` - Sun/moon dropdown for theme switching
- **CSS Variables**: All colors defined in `src/app/globals.css` using OKLCH color space

**Color System:**
All colors use semantic CSS variables that automatically adapt to light/dark themes:

| Variable | Usage |
|----------|-------|
| `bg-background`, `text-foreground` | Main page background/text |
| `bg-card`, `text-card-foreground` | Card components |
| `bg-primary`, `text-primary-foreground` | Primary buttons, links |
| `bg-secondary`, `text-secondary-foreground` | Secondary elements |
| `bg-muted`, `text-muted-foreground` | Muted/disabled states |
| `bg-accent`, `text-accent-foreground` | Accent highlights |
| `bg-destructive`, `text-destructive-foreground` | Delete/error actions |
| `bg-success`, `text-success` | Success states |
| `bg-warning`, `text-warning` | Warning states |
| `bg-info`, `text-info` | Informational states |
| `border-border` | Borders |
| `bg-input` | Form inputs |

**Font System:**
Fonts are centralized in `src/lib/fonts.ts` with three semantic variables:

| Variable | CSS Class | Purpose |
|----------|-----------|---------|
| `--font-heading` | `font-heading` | Headings (h1, h2, etc.) |
| `--font-body` | `font-body` | Body text |
| `--font-mono` | `font-mono` | Code blocks |

**Customizing Fonts (2 steps):**

**Step 1:** Edit `src/lib/fonts.ts` to import your Google Fonts:
```typescript
import { Inter, Playfair_Display, Fira_Code } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
});

export const fontVariables = `${inter.variable} ${playfair.variable} ${firaCode.variable}`;
```

**Step 2:** Update `src/app/globals.css` to map your fonts:
```css
@theme inline {
  --font-sans: var(--font-inter);
  --font-heading: var(--font-playfair);
  --font-body: var(--font-inter);
  --font-mono: var(--font-fira-code);
}
```

Browse fonts at: https://fonts.google.com

**Customizing Colors:**

1. **Change colors**: Edit CSS variables in `src/app/globals.css` under `:root` (light) and `.dark` (dark)
2. **Add brand colors**: Add new variables following the pattern:
   ```css
   /* In :root and .dark */
   --brand: oklch(0.6 0.2 250);
   --brand-foreground: oklch(1 0 0);

   /* In @theme inline */
   --color-brand: var(--brand);
   --color-brand-foreground: var(--brand-foreground);
   ```

**IMPORTANT - Avoid Hardcoded Colors:**
Never use hardcoded Tailwind colors like `text-gray-500`, `bg-red-100`, etc. Always use semantic variables:
- `text-gray-500` → `text-muted-foreground`
- `bg-gray-50` → `bg-muted`
- `text-red-600` → `text-destructive`
- `bg-green-100` → `bg-success/10`
- `border-gray-300` → `border-border`

### Better Auth
Authentication is handled by Better Auth with magic link (email-only):
- **Server Config**: `src/lib/auth.ts` (creates auth instance per-request)
- **Client Config**: `src/lib/auth-client.ts` (browser-side auth client)
- **Auth Routes**: `/api/auth/[...all]` handles all auth endpoints
- **Sign In**: `/sign-in` page with magic link form
- **Protected Routes**: Check session with `createAuth()` in server components
- **Database**: Uses Better Auth's automatic D1 table creation

**Important**: Auth instance must be created per-request using `createAuth()` to access Cloudflare context.

### Admin Interface
The starter includes a built-in admin interface at `/admin`:
- **Authorization**: Email-based whitelist in `admin_emails` table
- **Layout**: `src/app/admin/layout.tsx` - Sidebar-based layout with auth check
- **Dashboard**: `src/app/admin/page.tsx` - Overview with user stats
- **Users Page**: `src/app/admin/users/page.tsx` - User management
- **Components**: `src/components/admin/` - AdminSidebar, AdminHeader, UsersTable
- **Helpers**: `src/lib/admin.ts` - `isAdmin()`, `addAdminEmail()`, `removeAdminEmail()`
- **API Routes**: `/api/admin/users/toggle-admin`, `/api/admin/users/delete`

**Setup**: The setup script prompts for an admin email and seeds it into the database.

**Adding admins programmatically**:
```typescript
import { addAdminEmail, removeAdminEmail, isAdmin } from '@/lib/admin';

// Grant admin access
await addAdminEmail('user@example.com');

// Check if user is admin
const admin = await isAdmin('user@example.com');

// Revoke admin access
await removeAdminEmail('user@example.com');
```

### User Dashboard
Sidebar-based dashboard at `/dashboard` with AI features and user management:

- **Layout**: `src/app/dashboard/layout.tsx` - Auth-protected sidebar layout
- **Sidebar**: `src/components/dashboard/dashboard-sidebar.tsx` - Nav items, admin link (if admin), user badge
- **Header**: `src/components/dashboard/dashboard-header.tsx` - Page title and sidebar trigger
- **Pages**:
  - `/dashboard` - AI Chat (LLM chatbot with model selection)
  - `/dashboard/upload` - Image Upload (drag-and-drop to R2)
  - `/dashboard/generate` - Image Generation (Replicate AI)
  - `/dashboard/account` - Account Settings (profile management)

**Shared Components**:
- `src/components/sidebar-user-badge.tsx` - Reusable user badge with dropdown (used in both admin and dashboard sidebars)
  - DiceBear avatars (`notionists-neutral` style) based on email
  - Display name from Better Auth `name` field, or derived from email (capitalize part before @ and first `.`)
  - Dropdown menu with Account Settings, Contact Us, and Sign out

**Important**: Dashboard pages require `export const dynamic = "force-dynamic"` for Cloudflare context access.

### User Profiles
Extended user data beyond Better Auth's core user table:

- **Schema**: `src/db/schema/user-profiles.ts` - `user_profile` table
- **API Route**: `src/app/api/profile/route.ts` - GET/POST for profile data
- **Form**: `src/components/dashboard/account-settings-form.tsx` - Profile editing UI

**Data Separation**:
- **Better Auth manages**: `name`, `email`, `image` (via `authClient.updateUser()`)
- **Custom table manages**: `bio` (and future extended fields)

```typescript
// Update Better Auth fields (name, image)
import { authClient } from '@/lib/auth-client';
await authClient.updateUser({ name: "New Name", image: "url" });

// Update custom profile fields (bio)
await fetch('/api/profile', {
  method: 'POST',
  body: JSON.stringify({ bio: "My bio text" })
});
```

**Schema**:
```typescript
export const userProfile = sqliteTable("user_profile", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  bio: text("bio"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
});
```

### Contact Page
Public contact form at `/contact`:

- **Page**: `src/app/contact/page.tsx` - Server component (checks auth for pre-fill)
- **Form**: `src/components/contact-form.tsx` - Client component with form UI
- **API Route**: `src/app/api/contact/route.ts` - Sends email via Postmark

**Features**:
- Pre-fills name/email for authenticated users (email field disabled when pre-filled)
- Sends formatted HTML/text email to admin (configured in `appConfig.email`)
- Success state with "Message Sent!" confirmation
- Accessible from user dropdown in dashboard sidebar

### AI Features

#### OpenRouter LLM Integration
This starter includes LLM integration via OpenRouter and AI SDK 5:

- **Service Layer**: `src/lib/services/llm/` - LLM service with text generation, streaming, and structured output
- **Chat API**: `src/app/api/chat/route.ts` - Streaming chat endpoint using AI SDK
- **Chatbot Component**: `src/components/chatbot.tsx` - UI with model selection (GPT-4.1 Mini, Gemini 2.5 Flash, Claude Haiku 4.5)
- **Models**: Configured in `src/lib/services/llm/types.ts`

**Setup:**
```typescript
// In API route (uses Node.js runtime, NOT edge):
import { streamText } from 'ai';
import { getOpenRouter } from '@/lib/services/llm/llm';

const openrouter = getOpenRouter();
const result = streamText({
  model: openrouter('openai/gpt-4.1-mini'),
  messages,
});

return result.toUIMessageStreamResponse();
```

**Important**:
- Do NOT use `export const runtime = "edge"` - OpenNext.js requires Node.js runtime
- Streaming works perfectly with Node.js runtime on Cloudflare Workers
- The AI SDK `streamText()` and `toUIMessageStreamResponse()` support both runtimes

**Environment variable**: `OPENROUTER_API_KEY` (required for LLM features)

#### Replicate AI Integration
Image generation via Replicate API:

- **Service Layer**: `src/lib/services/replicate/` - Image generation with multiple models
- **Image Generator**: `src/components/image-generator.tsx` - UI for generating images
- **Supported Models**: Google Imagen 4 Ultra, FLUX 1.1 Pro, FLUX Schnell
- **Storage**: Generated images automatically uploaded to R2

**Environment variable**: `REPLICATE_API_KEY` (required for image generation)

#### Cloudflare R2 Storage
Object storage for user uploads and AI-generated content using **native Cloudflare Workers R2 bindings**:

- **Service Layer**: `src/lib/services/s3/` - Native R2 client using Workers API
- **Upload API**: `src/app/api/upload/route.ts` - Multi-file upload endpoint
- **Image Upload**: `src/components/image-upload.tsx` - Drag-and-drop upload UI
- **CDN Integration**: Automatic image transformations via Cloudflare
- **Helper**: `getTransformedImageUrl()` for responsive images

**Setup:**
```typescript
// Access R2 bucket via Cloudflare context
import { getCloudflareContext } from '@opennextjs/cloudflare';

const { env } = await getCloudflareContext();
const bucket = env.R2_BUCKET;

// Upload file
await bucket.put(key, fileBody, {
  httpMetadata: { contentType: 'image/jpeg' },
  customMetadata: { userId: '123' }
});
```

**Configuration:**
- R2 bucket binding added to `wrangler.jsonc` as `R2_BUCKET`
- Bucket names: `{project-name}-storage` (production), `{project-name}-storage-staging` (staging)
- Setup script automatically creates buckets and configures bindings

**Environment variables:**
- `S3_PUBLIC_ENDPOINT` - CDN URL for serving files (e.g., `https://cdn.your-domain.com`)
- `NEXT_PUBLIC_S3_ENDPOINT` - Client-side CDN URL (same as above for public access)

**Important Notes:**
- ✅ **Production/Staging**: Uses native R2 bindings (optimized for Cloudflare Workers)
- ✅ **Local Development**: Uses AWS SDK with staging R2 credentials (allows real URLs for AI API testing)
- ✅ AWS SDK is installed as `devDependency` only - not included in production builds
- ✅ Local dev uploads to real staging R2 bucket so AI APIs (Replicate, OpenAI) can access the images
- ✅ Automatic environment detection via `process.env.NODE_ENV`

**Local Development Setup:**
To test file uploads locally with real URLs, ensure `.dev.vars` contains:
```bash
S3_ENDPOINT_URL=https://....r2.cloudflarestorage.com
S3_ACCESS_ID_KEY=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=your-project-storage-staging
S3_PUBLIC_ENDPOINT=https://cdn-staging.your-domain.com
```
These credentials are automatically configured by the setup script to point to your staging R2 bucket.
- ✅ Custom domain configured via Cloudflare dashboard connects to R2 bucket
- ✅ R2 buckets and custom domains are created automatically by the setup script

### Analytics

Privacy-first analytics with Google Analytics and PostHog support, integrated with cookie consent:

- **Service Layer**: `src/lib/analytics/` - Type-safe analytics tracking
- **Providers**: Google Analytics 4, PostHog, Console (dev)
- **Cookie Consent**: Analytics only loads after user accepts cookies
- **Auto-tracking**: Page views, user identification, sign in/out events

**Folder Structure:**
```
src/lib/analytics/
├── index.ts              # Main exports
├── tracker.ts            # Core AnalyticsTracker class
├── events.ts             # Event definitions and types
├── hooks.ts              # React hooks (useAnalytics, useIdentifyUser)
├── components/
│   └── analytics-provider.tsx  # Root provider component
└── providers/
    ├── types.ts          # Provider interface
    ├── posthog.ts        # PostHog provider
    └── console.ts        # Console provider (dev)
```

**Usage:**
```typescript
import { track, AnalyticsEvents, useAnalytics } from "@/lib/analytics";

// Direct tracking (anywhere)
track(AnalyticsEvents.BUTTON_CLICKED, { buttonId: "signup" });

// Hook-based (in React components)
const { track, identify, reset } = useAnalytics();
track(AnalyticsEvents.FORM_SUBMITTED, { formId: "contact" });
```

**Available Events:**
- `SIGN_IN`, `SIGN_OUT`, `SIGN_UP` - Authentication
- `BUTTON_CLICKED`, `FORM_SUBMITTED`, `LINK_CLICKED` - User actions
- `PAGE_VIEWED`, `MODAL_OPENED`, `MODAL_CLOSED` - Navigation
- `FEATURE_USED`, `SEARCH_PERFORMED`, `FILTER_APPLIED` - Engagement
- `ERROR_OCCURRED`, `ERROR_BOUNDARY_TRIGGERED` - Errors

**Environment Variables:**
```bash
# Google Analytics 4
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

**Behavior by Environment:**
- **Development**: Console provider only (styled logs)
- **Production**: GA + PostHog (if configured)
- **Cookie Consent**: Analytics provider only initializes after user accepts cookies

**Adding Custom Events:**
1. Add event name to `AnalyticsEvents` in `src/lib/analytics/events.ts`
2. Add type-safe properties to `EventProperties` interface
3. Use `track(AnalyticsEvents.YOUR_EVENT, { ...props })`

**Adding New Providers:**
1. Create provider in `src/lib/analytics/providers/`
2. Implement `AnalyticsProvider` interface
3. Add to `AnalyticsProvider` component initialization
