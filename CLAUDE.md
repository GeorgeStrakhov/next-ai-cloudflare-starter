# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15.4 application configured to deploy on Cloudflare Workers using OpenNext.js. It provides a modern starter template with AI capabilities and uses:
- **Framework**: Next.js App Router with TypeScript, React 19
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **Database**: Cloudflare D1 (SQLite) with Drizzle ORM
- **Auth**: Better Auth with magic link authentication
- **Storage**: Cloudflare R2 (S3-compatible object storage)
- **AI Image Gen**: Replicate (Imagen 4, FLUX models)
- **AI LLM**: OpenRouter + AI SDK 5 (GPT, Gemini, Claude)
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

### Better Auth
Authentication is handled by Better Auth with magic link (email-only):
- **Server Config**: `src/lib/auth.ts` (creates auth instance per-request)
- **Client Config**: `src/lib/auth-client.ts` (browser-side auth client)
- **Auth Routes**: `/api/auth/[...all]` handles all auth endpoints
- **Sign In**: `/sign-in` page with magic link form
- **Protected Routes**: Check session with `createAuth()` in server components
- **Database**: Uses Better Auth's automatic D1 table creation

**Important**: Auth instance must be created per-request using `createAuth()` to access Cloudflare context.

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
