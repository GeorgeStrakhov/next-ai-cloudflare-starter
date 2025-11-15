# Setup Guide

Complete guide to set up and deploy this Next.js + Cloudflare Workers starter template.

> **🎯 Recommended Approach:** This starter is designed for **automated GitHub Actions CI/CD**. We recommend setting up GitHub Actions for staging and production deployments. Manual deployment via wrangler is supported but not the primary workflow.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Customization](#customization)
- [Database Setup](#database-setup)
- [Email Configuration](#email-configuration)
- [Deployment Setup](#deployment-setup)
- [GitHub Actions Setup](#github-actions-setup)
- [Custom Domains](#custom-domains)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:

1. **Node.js 20+** installed
2. **pnpm** installed (`npm install -g pnpm`)
3. **Cloudflare account** (free tier works)
4. **Postmark account** for email (free tier available)
5. **Replicate account** for AI image generation (optional)
6. **Git** for version control
7. **gum** for enhanced setup UI (optional) - `brew install gum`

---

## Quick Start

> **⚡ Fast Setup:** Use our interactive setup script to automate most of the configuration:
> ```bash
> bash scripts/setup.sh
> ```
> The script will guide you through project configuration, create D1 databases, and update all config files automatically.
>
> **💡 Tip:** Install `gum` (`brew install gum`) for a beautiful interactive UI with keyboard navigation and live filtering!

### Manual Setup

If you prefer to set up manually or want to understand each step:

#### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/GeorgeStrakhov/next-cloudflare-starter
cd next-cloudflare-starter

# Install dependencies
pnpm install
```

### 2. Configure Environment Variables

```bash
# Copy the example env file
cp .dev.vars.example .dev.vars

# Edit .dev.vars and fill in your values
```

Required variables for local development:
```bash
BETTER_AUTH_SECRET=<generate-with-openssl-rand-base64-32>
BETTER_AUTH_URL=http://localhost:3000
EMAIL_FROM=hello@your-domain.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_APP_NAME=My App
NEXT_PUBLIC_APP_DESCRIPTION=My awesome application
NEXT_PUBLIC_SUPPORT_EMAIL=hello@your-domain.com

# R2 Storage (auto-filled by setup script)
S3_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=weur
S3_ACCESS_ID_KEY=<your-r2-access-key>
S3_SECRET_ACCESS_KEY=<your-r2-secret-key>
S3_BUCKET_NAME=my-app-storage
S3_PUBLIC_ENDPOINT=https://cdn.your-domain.com
NEXT_PUBLIC_S3_ENDPOINT=https://cdn.your-domain.com
```

Optional:
```bash
POSTMARK_API_KEY=<your-postmark-api-key>  # Optional for dev - emails logged to console
REPLICATE_API_KEY=<your-replicate-api-key>  # Optional - for AI image generation
```

### 3. Run Locally

```bash
pnpm dev
```

Visit http://localhost:3000

---

## Customization

### Project Name Requirements

**Important:** Cloudflare Wrangler has strict naming requirements for workers and databases:
- Must be **lowercase**
- Only **alphanumeric characters** (a-z, 0-9) and **dashes** (-)
- Cannot start or end with a dash
- Cannot contain consecutive dashes
- No dots, underscores, spaces, or other special characters

**Examples:**
- ✅ `my-app`, `my-cool-app`, `app123`, `my-app-v2`
- ❌ `My-App` (uppercase), `my_app` (underscore), `my.app` (dot), `my app` (space)

The setup script will validate your project name and suggest corrections if needed.

### Update Project Name Throughout

Replace `my-app` with your project name in these files:

1. **`wrangler.jsonc`**:
   - Worker names: `my-app-production`, `my-app-staging`
   - Database names: `my-app-db`, `my-app-db-staging`

2. **`package.json`**:
   - `name`: Package name
   - `description`: Project description
   - `repository.url`: Your GitHub URL
   - Database migration scripts

3. **`scripts/db-studio.sh`**:
   - Database names

4. **Environment variables** (`.dev.vars`, wrangler.jsonc):
   - `NEXT_PUBLIC_APP_NAME`
   - `NEXT_PUBLIC_APP_DESCRIPTION`
   - Domain URLs

### Update Branding

The app uses centralized configuration in `src/lib/config.ts`. Most branding is controlled via environment variables, so you typically just need to set:

- `NEXT_PUBLIC_APP_NAME` - Shows in UI, emails, page titles
- `NEXT_PUBLIC_APP_DESCRIPTION` - Tagline/description
- `NEXT_PUBLIC_SUPPORT_EMAIL` - Support email for users
- `EMAIL_FROM` - Sender address for transactional emails

### Custom Logo

Replace `/public/logo.svg` with your own logo.

---

## Database Setup

This project uses Cloudflare D1 (serverless SQLite database).

### Create D1 Databases

You need two databases: one for staging, one for production.

```bash
# Login to Cloudflare
npx wrangler login

# Create production database
npx wrangler d1 create my-app-db

# Create staging database
npx wrangler d1 create my-app-db-staging
```

**Important**: Copy the `database_id` from each command output!

### Update wrangler.jsonc

Replace the placeholder database IDs:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "my-app-db",
      "database_id": "abc123...", // ← Paste your production DB ID
      "migrations_dir": "drizzle"
    }
  ],
  "env": {
    "staging": {
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "my-app-db-staging",
          "database_id": "xyz789...", // ← Paste your staging DB ID
          "migrations_dir": "drizzle"
        }
      ]
    }
  }
}
```

### Generate and Run Migrations

```bash
# Generate migration files from schema
pnpm db:generate

# Apply migrations locally
pnpm db:migrate:local

# Apply to staging (remote)
pnpm db:migrate:staging

# Apply to production (remote)
pnpm db:migrate:production
```

### View Database Contents

```bash
# Local database
pnpm db:studio

# Staging database (read-only snapshot)
pnpm db:studio:stage

# Production database (read-only snapshot)
pnpm db:studio:prod
```

---

## Email Configuration

This starter uses [Postmark](https://postmarkapp.com/) for transactional emails (magic link authentication).

### 1. Create Postmark Account

1. Sign up at https://postmarkapp.com/
2. Create a new "Server" for your app
3. Copy the **Server API Token**

### 2. Verify Sender Domain/Email

In Postmark dashboard:
1. Go to **Sender Signatures**
2. Add and verify your sending domain or email address
3. This must match your `EMAIL_FROM` environment variable

### 3. Set Environment Variables

**Local** (`.dev.vars`):
```bash
POSTMARK_API_KEY=your-server-api-token
EMAIL_FROM=noreply@your-domain.com
```

**Staging/Production** (set via wrangler or GitHub secrets):
```bash
npx wrangler secret put POSTMARK_API_KEY --env staging
npx wrangler secret put EMAIL_FROM --env staging
```

---

## Deployment Setup

### Three-Environment Strategy

This starter uses a branch-based deployment strategy:

| Branch  | Environment | URL                     | Auto-Deploy |
|---------|-------------|-------------------------|-------------|
| `main`  | Development | Local only              | No          |
| `stage` | Staging     | staging.your-domain.com | Yes (CI/CD) |
| `prod`  | Production  | your-domain.com         | Yes (CI/CD) |

### Manual Deployment

Deploy directly from your local machine:

```bash
# Deploy to staging
pnpm deploy:staging

# Deploy to production
pnpm deploy:production
```

### Preview Before Deploying

```bash
# Build and test locally before deploying
pnpm preview
```

---

## GitHub Actions Setup

Automate deployments using GitHub Actions (recommended).

### What the Automated Workflow Does

When you push to `stage` or `prod` branches, GitHub Actions automatically:

1. **Generates migrations** from your schema (`pnpm db:generate`)
2. **Applies database migrations** to the target environment
3. **Builds your application** with OpenNext.js
4. **Deploys to Cloudflare Workers**

**You never need to manually run migrations on staging or production** - the workflow handles it automatically!

### 1. Create GitHub Secrets

Go to your repo → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

#### Required for Both Environments

| Secret Name                 | Value                          | How to Get                                |
|-----------------------------|--------------------------------|-------------------------------------------|
| `CLOUDFLARE_API_TOKEN`      | Dedicated CI/CD token          | **Auto-generated by setup script** or create manually with Workers Scripts/Routes + D1 + R2 permissions |
| `CLOUDFLARE_ACCOUNT_ID`     | Your Cloudflare account ID     | **Auto-filled by setup script** or find in Cloudflare Dashboard |
| `POSTMARK_API_KEY`          | Your Postmark API token        | Postmark Dashboard → Servers → API Tokens |
| `EMAIL_FROM`                | noreply@your-domain.com        | Must be verified in Postmark              |
| `REPLICATE_API_KEY`         | Your Replicate API token       | https://replicate.com/account/api-tokens  |

#### Environment-Specific Secrets

| Secret Name                       | Value                           | How to Get                        |
|-----------------------------------|---------------------------------|-----------------------------------|
| `BETTER_AUTH_SECRET_STAGING`      | Random secret key for staging   | **Auto-generated by setup script** or `openssl rand -base64 32` |
| `BETTER_AUTH_SECRET_PRODUCTION`   | Random secret key for production| **Auto-generated by setup script** or `openssl rand -base64 32` (different!) |
| `R2_ACCESS_KEY_ID_STAGING`        | R2 staging access key           | **Auto-generated by setup script** or create at R2 API Tokens page |
| `R2_SECRET_ACCESS_KEY_STAGING`    | R2 staging secret key           | **Auto-generated by setup script** or create at R2 API Tokens page |
| `R2_ACCESS_KEY_ID_PRODUCTION`     | R2 production access key        | **Auto-generated by setup script** or create at R2 API Tokens page |
| `R2_SECRET_ACCESS_KEY_PRODUCTION` | R2 production secret key        | **Auto-generated by setup script** or create at R2 API Tokens page |

**Important Notes:**
- Use different `BETTER_AUTH_SECRET` values for staging and production!
- The setup script generates `.github-secrets-setup.txt` with all values - just copy/paste!
- `CLOUDFLARE_API_TOKEN` is a dedicated CI/CD token with minimal permissions (not your setup token)

### 2. Update Workflow File

Edit `.github/workflows/deploy.yml`:

1. Update database names (search for `my-app-db`)
2. Update environment URLs in the workflow

### 3. Create Deployment Branches

```bash
# Create staging branch
git checkout -b stage
git push -u origin stage

# Create production branch
git checkout -b prod
git push -u origin prod
```

### 4. Deployment Workflow

```bash
# Develop on main
git checkout main
# ... make changes ...
git commit -m "Add feature"
git push

# Deploy to staging
git checkout stage
git merge main
git push  # ← Triggers automatic deployment

# After testing staging, deploy to production
git checkout prod
git merge stage  # Always merge from stage, not main!
git push  # ← Triggers automatic deployment
```

---

## Custom Domains

### 1. Add Domain to Cloudflare

1. Go to Cloudflare Dashboard
2. Add your domain (if not already added)
3. Update nameservers at your registrar

### 2. Add Worker Routes

1. Go to **Workers & Pages**
2. Select your worker (e.g., `my-app-production`)
3. Go to **Settings** → **Domains & Routes**
4. Click **Add** → **Custom Domain**
5. Enter your domain (e.g., `your-domain.com`)
6. Wait for SSL certificate provisioning (~15 mins)

Repeat for:
- `www.your-domain.com` (production)
- `staging.your-domain.com` (staging)

### 3. Update wrangler.jsonc

Update the `routes` sections:

```jsonc
{
  "routes": [
    {
      "pattern": "your-domain.com",  // ← Your actual domain
      "custom_domain": true
    },
    {
      "pattern": "www.your-domain.com",
      "custom_domain": true
    }
  ],
  "env": {
    "staging": {
      "routes": [
        {
          "pattern": "staging.your-domain.com",
          "custom_domain": true
        }
      ]
    }
  }
}
```

### 4. Update Environment Variables

Update URLs in `wrangler.jsonc`:

```jsonc
{
  "vars": {
    "BETTER_AUTH_URL": "https://your-domain.com",
    "NEXT_PUBLIC_APP_URL": "https://your-domain.com"
  },
  "env": {
    "staging": {
      "vars": {
        "BETTER_AUTH_URL": "https://staging.your-domain.com",
        "NEXT_PUBLIC_APP_URL": "https://staging.your-domain.com"
      }
    }
  }
}
```

### 5. Redeploy

After updating domains:

```bash
# Redeploy staging
git checkout stage
git push

# Redeploy production
git checkout prod
git push
```

---

## Troubleshooting

### TypeScript Errors: "Property 'DB' does not exist"

After changing the database binding name, regenerate types:

```bash
pnpm cf-typegen
```

### "Module not found: @/lib/config"

Make sure path aliases are configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Database Migration Errors

If migrations fail:

1. Check database ID in `wrangler.jsonc`
2. Verify you're logged in: `npx wrangler whoami`
3. Check database exists: `npx wrangler d1 list`
4. Try applying migrations manually:
   ```bash
   npx wrangler d1 migrations apply my-app-db --remote
   ```

### Email Not Sending

1. Verify sender email/domain in Postmark
2. Check `POSTMARK_API_KEY` is set correctly
3. Check `EMAIL_FROM` matches verified address
4. View logs in Postmark dashboard

### GitHub Actions Failing

1. Verify all secrets are set correctly
2. Check secret names match exactly (case-sensitive)
3. Check database IDs in workflow file
4. View workflow logs in GitHub Actions tab

### Local Dev: "getCloudflareContext() failed"

Make sure you have `.dev.vars` file with required variables. The `getCloudflareContext()` function needs these to simulate Cloudflare bindings locally.

### Deployment: "Worker size exceeds limit"

If your worker bundle is too large:

1. Remove unused dependencies
2. Check for accidentally bundled files
3. Use dynamic imports for large libraries

---

## Next Steps

- [ ] Customize branding and styling
- [ ] Add your app's features
- [ ] Set up monitoring (Cloudflare dashboard)
- [ ] Configure analytics
- [ ] Add error tracking (e.g., Sentry)
- [ ] Set up backups for D1 database

For more detailed information, see:
- `CLAUDE.md` - Detailed development guide
- `README.md` - Project overview
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Next.js Docs](https://nextjs.org/docs)
