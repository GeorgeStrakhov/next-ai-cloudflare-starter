# Template Development Guide

This guide is for **maintainers of this starter template**. If you're a user of the template, you don't need this file.

## The Problem

When testing `setup.sh`, it generates files that should NOT be committed to the template repository:
- `drizzle/` - Migration files (users will generate their own)
- `.wrangler/` - Local database state
- `.dev.vars`, `.env.local` - Environment files with test values
- Modified config files with test project names

However, these same files SHOULD be committed by users of the template. So we can't add them to `.gitignore`.

## Solution: Local-only Git Ignore

Git has a built-in feature for this: `.git/info/exclude`. This file works exactly like `.gitignore` but is **local to your machine** and not tracked in the repository.

### Quick Setup

Run this once to set up local ignores:

```bash
cat >> .git/info/exclude << 'EOF'

# Template testing artifacts (local only, not tracked)
# These files are generated when testing setup.sh

# Database migrations (users will generate their own)
drizzle/

# Wrangler local state
.wrangler/

# Environment files with test values
.dev.vars
.env.local

# GitHub secrets helper
.github-secrets-setup.txt

# Backup files from setup.sh
*.backup

# Generated favicons (if testing with logo)
public/favicon-16x16.png
public/favicon-32x32.png
public/android-chrome-192x192.png
public/android-chrome-512x512.png
public/apple-touch-icon.png
public/favicon.ico
EOF

echo "✓ Local git excludes configured"
```

After this, `git status` will ignore these files even after running `setup.sh`.

### View Current Excludes

```bash
cat .git/info/exclude
```

### Remove Excludes (if needed)

```bash
# Edit the file manually
nano .git/info/exclude
```

## Testing Workflow

### Method 1: Using --skip-cloudflare Flag (Recommended)

The setup script has built-in flags for template testing:

```bash
# Skip Cloudflare resource creation AND git reset
bash scripts/setup.sh --skip-cloudflare --skip-git-reset

# Or use the alias
bash scripts/setup.sh --local-only --skip-git-reset
```

**Flags:**
- `--skip-cloudflare` / `--local-only`: Skip D1, R2, and API token creation. Uses placeholder values.
- `--skip-git-reset`: Don't wipe `.git` and reinitialize. Preserves template repo history.
- `--help`: Show all available options.

This lets you test the entire setup flow (prompts, file modifications, migrations) without:
- Creating real Cloudflare resources that need cleanup
- Destroying the template git history
- Needing a Cloudflare API token

### Method 2: Using Local Excludes

For any files that still get created, use `.git/info/exclude`:

1. **Set up local excludes** (one time):
   ```bash
   # Run the command above to set up .git/info/exclude
   ```

2. **Test setup.sh**:
   ```bash
   bash scripts/setup.sh --skip-cloudflare --skip-git-reset
   # Enter test values, let it run
   ```

3. **Test the app**:
   ```bash
   pnpm dev
   # Verify everything works at http://localhost:3000
   ```

4. **Reset when done**:
   ```bash
   bash scripts/reset-template.sh
   ```

5. **Check git status**:
   ```bash
   git status
   # Should show clean working directory (no untracked files)
   ```

### Method 2: Using Git Worktree

Create a separate working directory that shares the same git history:

```bash
# Create worktree in sibling directory
git worktree add ../unstorm-test main

# Go there and test
cd ../unstorm-test
bash scripts/setup.sh

# Test everything
pnpm dev

# When done, remove the worktree
cd ..
rm -rf unstorm-test
git worktree remove unstorm-test
```

**Pros**: Complete isolation, can't accidentally commit test artifacts
**Cons**: Extra disk space, need to remember to clean up

### Method 3: Clone to Temp Directory

```bash
# Clone to temp location
git clone . /tmp/unstorm-test
cd /tmp/unstorm-test

# Test setup
bash scripts/setup.sh

# When done, just delete
rm -rf /tmp/unstorm-test
```

## Reset Script

The `scripts/reset-template.sh` script cleans up all generated files:

```bash
bash scripts/reset-template.sh
```

**What it does:**
- Removes `drizzle/`, `.wrangler/`
- Removes `.dev.vars`, `.env.local`, `.github-secrets-setup.txt`
- Removes backup files (`*.backup`)
- Restores modified files via `git checkout`
- Optionally removes `node_modules`

## Files Modified by setup.sh

For reference, here are the files that `setup.sh` modifies:

| File | What Changes |
|------|--------------|
| `wrangler.jsonc` | Project name, database IDs, R2 bucket names, domains |
| `package.json` | Project name, description, database script names |
| `next.config.ts` | CDN domain names |
| `scripts/db-studio.sh` | Database names |
| `.github/workflows/deploy.yml` | URLs, app name, description |
| `src/app/(legal)/privacy/page.mdx` | Company name, dates, email |
| `src/app/(legal)/terms/page.mdx` | Company name, dates, email |
| `public/site.webmanifest` | App name (if favicon generation runs) |

## Files Created by setup.sh

| File/Directory | Purpose |
|----------------|---------|
| `drizzle/` | Database migration files |
| `.wrangler/` | Local D1 database state |
| `.dev.vars` | Server-side environment variables |
| `.env.local` | Next.js environment variables |
| `.github-secrets-setup.txt` | GitHub secrets for CI/CD |
| `public/favicon-*.png` | Generated favicons (if ImageMagick + logo) |
| `public/android-chrome-*.png` | Generated icons |
| `public/apple-touch-icon.png` | iOS icon |
| `public/favicon.ico` | Browser favicon |

## Tips

1. **Always check `git status` before committing** - Even with local excludes, modified tracked files will show up.

2. **Use the reset script after testing** - It's the quickest way to get back to a clean state.

3. **Don't forget about Cloudflare resources** - The setup script creates real D1 databases and R2 buckets. You may want to delete these test resources from your Cloudflare dashboard.

4. **Test with different scenarios**:
   - With/without existing logo
   - With/without ImageMagick
   - With/without GitHub CLI
   - Skipping optional API keys

## Cloudflare Cleanup

After testing, you may have test databases and buckets in Cloudflare:

```bash
# List and delete test D1 databases
npx wrangler d1 list
npx wrangler d1 delete test-project-db
npx wrangler d1 delete test-project-db-staging

# List and delete test R2 buckets
npx wrangler r2 bucket list
npx wrangler r2 bucket delete test-project-storage
npx wrangler r2 bucket delete test-project-storage-staging
```

Or use the Cloudflare dashboard to clean up resources.