# Next.js + Cloudflare Workers + AI (chat and images) Starter

A production-ready Next.js 15 starter template optimized for Cloudflare Workers with D1 database, authentication via magic link, primitives for AI chats and image gen, and automated deployments.

## Features

- ✨ **Next.js 15.4** (security patched) with App Router and React 19
- ⚡ **Cloudflare Workers** deployment via OpenNext.js
- 🗄️ **Cloudflare D1** serverless SQLite database
- 🔍 **Drizzle ORM** for type-safe database access
- 🔐 **Better Auth** with magic link authentication
- 👑 **Admin interface** with user management
- 🎨 **Tailwind CSS v4** + **shadcn/ui** components
- 📧 **Postmark** email integration
- 🪣 **Cloudflare R2** object storage with CDN
- 🖼️ **Image transformations** via Cloudflare
- 🤖 **Replicate AI** integration for image generation
- 🧠 **OpenRouter LLM** integration with AI SDK 6 (chatbot with GPT, Gemini, Claude, Mistral)
- 📊 **Analytics** with Google Analytics + PostHog support (privacy-first, cookie consent integrated)
- 🚀 **GitHub Actions** CI/CD pipeline
- 🌍 **Three-environment setup**: Local → Staging → Production
- 📜 **Legal pages** (Privacy Policy & Terms of Service) with MDX support

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Cloudflare account (free tier works!)
- Postmark account (free tier available)
- Replicate account (optional, for AI features)
- OpenRouter account (optional, for LLM chatbot)
- GitHub CLI (optional, for automated setup)
- gum (optional, for enhanced setup UI) - `brew install gum`

### Installation

**Automated Setup (Recommended)**

```bash
git clone https://github.com/GeorgeStrakhov/next-ai-cloudflare-starter
cd next-ai-cloudflare-starter

# Optional: Install gum for beautiful interactive UI
brew install gum

# Run setup script
bash scripts/setup.sh
```

**What the setup script does:**

1. **Collects configuration** - Project name, domains, API keys, legal company name
2. **Creates Cloudflare resources** - D1 databases (staging/prod), R2 buckets, API tokens
3. **⚠️ Wipes .git directory** - Removes template history, creates fresh git repo for your project
4. **Updates all config files** - package.json, wrangler.jsonc, environment files
5. **Configures legal pages** - Privacy Policy & Terms of Service with your company info
6. **Installs dependencies** - Runs pnpm install and database migrations
7. **GitHub setup** (if GitHub CLI installed):
   - Creates new GitHub repository
   - Pushes all branches (main, stage, prod)
   - Sets all 12 GitHub secrets for CI/CD

After completion: `pnpm dev` starts your app at http://localhost:3000

**Manual Setup (if you prefer)**

```bash
# Clone and install
git clone https://github.com/GeorgeStrakhov/next-ai-cloudflare-starter
cd next-ai-cloudflare-starter
pnpm install

# Copy environment variables
cp .dev.vars.example .dev.vars

# Edit .dev.vars with your values
# Then run:
pnpm dev
```

Visit http://localhost:3000

## Documentation

📚 **Complete guides available:**

- **[SETUP.md](./SETUP.md)** - Complete setup and deployment guide (start here!)
- **[CLAUDE.md](./CLAUDE.md)** - Detailed development documentation for Claude Code and developers
- **[.dev.vars.example](./.dev.vars.example)** - Environment variables reference

## Tech Stack

| Category       | Technology                    |
|----------------|-------------------------------|
| Framework      | Next.js 15.4 (security patched) |
| Runtime        | Cloudflare Workers            |
| Database       | Cloudflare D1 (SQLite)        |
| ORM            | Drizzle ORM                   |
| Auth           | Better Auth (magic link)      |
| Admin          | Built-in admin panel          |
| Email          | Postmark                      |
| Storage        | Cloudflare R2 (S3-compatible) |
| AI Images      | Replicate                     |
| AI LLM         | OpenRouter + AI SDK 6         |
| Analytics      | Google Analytics + PostHog    |
| Styling        | Tailwind CSS v4               |
| UI Components  | shadcn/ui + Radix UI          |
| Content        | MDX (for legal pages)         |
| Package Manager| pnpm                          |
| CI/CD          | GitHub Actions                |

## Key Commands

### Development
```bash
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm lint             # Run linter
pnpm preview          # Preview production build
```

### Database
```bash
pnpm db:generate             # Generate migrations
pnpm db:migrate:local        # Run migrations locally
pnpm db:studio               # Open database GUI
```

### Deployment
```bash
pnpm deploy:staging          # Deploy to staging
pnpm deploy:production       # Deploy to production
```

See [SETUP.md](./SETUP.md) for more commands and details.

## Deployment Strategy

Three-branch workflow for safe deployments:

```
main (local development)
  ↓ merge
stage → auto-deploys to staging.your-domain.com
  ↓ merge
prod → auto-deploys to your-domain.com
```

**What Happens on Push:**
1. Database migrations automatically applied
2. Application built and deployed
3. Zero downtime

**Benefits:**
- Test changes on staging before production
- Automated database migrations (no manual steps!)
- Zero-downtime deployments
- Easy rollbacks

## Customization

Everything is configured through environment variables and `src/lib/config.ts`:

**Set these variables:**
```bash
NEXT_PUBLIC_APP_NAME=My App
NEXT_PUBLIC_APP_DESCRIPTION=My awesome application
NEXT_PUBLIC_SUPPORT_EMAIL=support@mydomain.com
EMAIL_FROM=noreply@mydomain.com
```

**Replace these values:**
- Project name: `my-app` → `your-app-name` (lowercase, alphanumeric, dashes only)
  - Update in: `wrangler.jsonc`, `package.json`, `scripts/`
  - Requirements: lowercase letters, numbers, dashes only (no dots, underscores, or spaces)
- Logo: `/public/logo.svg`

**Theming & Fonts:**
- **Colors**: Edit CSS variables in `src/app/globals.css` (supports light/dark mode)
- **Fonts**: Edit `src/lib/fonts.ts` to change Google Fonts
- **Dark mode**: Toggle included in dashboard header (uses `next-themes`)

See [CLAUDE.md](./CLAUDE.md#theming--dark-mode) for detailed theming guide.

## Project Structure

```
src/
├── app/                      # Next.js pages
│   ├── page.tsx              # Home page
│   ├── sign-in/              # Auth pages
│   ├── dashboard/            # Protected routes
│   ├── admin/                # Admin interface
│   │   ├── page.tsx          # Dashboard with stats
│   │   └── users/            # User management
│   ├── (legal)/              # Legal pages (MDX)
│   │   ├── privacy/          # Privacy Policy
│   │   └── terms/            # Terms of Service
│   └── api/                  # API routes
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── admin/                # Admin components
│   └── auth/                 # Auth components
├── db/
│   └── schema/               # Database schema
├── lib/
│   ├── config.ts             # 🎯 Central configuration
│   ├── auth.ts               # Auth setup
│   ├── admin.ts              # Admin authorization helpers
│   ├── analytics/            # Analytics tracking
│   ├── email/                # Email templates
│   └── services/             # Service layers
└── styles/
```

## Authentication

Uses Better Auth with magic link (passwordless):

1. User enters email
2. Receives magic link via email
3. Clicks link to sign in
4. Session persists for 7 days

**Protect routes:**
```typescript
import { createAuth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const auth = await createAuth();
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) redirect("/sign-in");

  return <div>Welcome {session.user.email}!</div>;
}
```

## Admin Interface

Built-in admin panel at `/admin` with:
- **Dashboard** - User stats (total users, admins, new this week)
- **User Management** - View all users, grant/revoke admin access, delete users
- **Email-based access** - Simple whitelist in `admin_emails` database table

**First admin**: The setup script prompts for an admin email and seeds it automatically.

**Adding more admins**: Use the admin interface or programmatically:
```typescript
import { addAdminEmail } from '@/lib/admin';
await addAdminEmail('newadmin@example.com');
```

## User Dashboard

Sidebar-based dashboard at `/dashboard` with:
- **AI Chat** - LLM chatbot with model selection
- **Image Upload** - Upload images to R2 storage
- **Image Generation** - AI image generation via Replicate
- **Account Settings** - Update name, profile picture, bio

**User profiles**: Extended profile data stored in `user_profile` table (bio, etc.), while core user data (name, image) is managed by Better Auth.

## Contact Page

Public contact form at `/contact`:
- Pre-fills name/email for authenticated users
- Sends formatted email to admin via Postmark
- Accessible from user dropdown in dashboard

## Environment Variables

### Required
| Variable              | Description                    |
|-----------------------|--------------------------------|
| `BETTER_AUTH_SECRET`  | Auth secret (32+ chars)        |
| `BETTER_AUTH_URL`     | Auth callback URL              |
| `EMAIL_FROM`          | Verified sender address        |

### Required for Production
| Variable              | Description                    |
|-----------------------|--------------------------------|
| `POSTMARK_API_KEY`    | Email API key (optional for local dev - emails logged to console) |

### Optional (AI Features)
| Variable              | Description                    |
|-----------------------|--------------------------------|
| `REPLICATE_API_KEY`   | AI image generation (optional) |
| `OPENROUTER_API_KEY`  | LLM chatbot (optional)         |

### Optional (Analytics)
| Variable                       | Description                    |
|--------------------------------|--------------------------------|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`| Google Analytics 4 ID          |
| `NEXT_PUBLIC_POSTHOG_KEY`      | PostHog project key            |
| `NEXT_PUBLIC_POSTHOG_HOST`     | PostHog host URL               |

### Recommended
| Variable                      | Description                 |
|-------------------------------|-----------------------------|
| `NEXT_PUBLIC_APP_NAME`        | Your app name               |
| `NEXT_PUBLIC_APP_DESCRIPTION` | App tagline                 |
| `NEXT_PUBLIC_APP_ENV`         | Environment (dev/stage/prod)|

See [.dev.vars.example](./.dev.vars.example) for complete list.

## Production Checklist

The setup script handles most of these automatically, but if setting up manually:

- [ ] Run `bash scripts/setup.sh` (recommended) OR:
  - [ ] Update project name in `wrangler.jsonc`, `package.json`, and scripts
  - [ ] Create D1 databases (staging + production)
  - [ ] Create R2 buckets (staging + production)
  - [ ] Set GitHub secrets for CI/CD (16 secrets)
  - [ ] Configure custom domains in Cloudflare
  - [ ] Update legal pages with your company info
- [ ] Verify email sender in Postmark
- [ ] Test auth flow end-to-end
- [ ] Test AI features (image generation, chatbot) if API keys are configured
- [ ] Review legal pages (Privacy Policy & Terms of Service)
- [ ] Review security settings

**Note:** Database migrations run automatically via GitHub Actions on deployment!

**See [SETUP.md](./SETUP.md) for step-by-step manual guide.**

## Why This Stack?

**Cloudflare Workers**
- ⚡ Edge deployment (low latency worldwide)
- 💰 Generous free tier
- 🔒 Built-in DDoS protection

**Cloudflare D1**
- 🚀 Serverless SQLite
- 🆓 5M reads/day free
- 🔄 Point-in-time recovery

**Better Auth**
- 🔐 Secure passwordless auth
- 📧 Magic link out-of-the-box
- 🎨 Customizable

**Next.js 15**
- ⚛️ React 19 with Server Components
- 🎯 App Router for modern patterns
- 🔥 Turbopack for fast dev

## Known Limitations

1. Worker bundle size: 1MB compressed
2. D1 free tier: 5M reads, 100k writes/day
3. Cold starts: ~50-100ms
4. No WebSockets (use Durable Objects instead)

## Troubleshooting

**TypeScript errors after setup?**
```bash
pnpm cf-typegen  # Regenerate Cloudflare types
```

**Database not working?**
```bash
pnpm db:migrate:local  # Apply migrations
```

**Email not sending?**
- Verify sender in Postmark dashboard
- Check `EMAIL_FROM` matches verified address
- View logs in Postmark

**More help:** See [SETUP.md](./SETUP.md#troubleshooting)

## Contributing

Contributions welcome! Please:

1. Fork the repo
2. Create a feature branch
3. Test your changes
4. Submit a PR

## License

MIT License

## Support

- 📖 [Setup Guide](./SETUP.md)
- 📚 [Development Docs](./CLAUDE.md)
- 💬 [GitHub Issues](https://github.com/GeorgeStrakhov/next-cloudflare-starter/issues)
- 🌐 [Cloudflare Community](https://community.cloudflare.com/)

## Acknowledgments

Built with amazing open source tools:
- [Next.js](https://nextjs.org/)
- [OpenNext.js](https://opennext.js.org/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Better Auth](https://better-auth.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [MDX](https://mdxjs.com/)
- [PostHog](https://posthog.com/)

---

**🚀 Ready to build? [Start with the setup guide →](./SETUP.md)**
