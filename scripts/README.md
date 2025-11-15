# Setup Scripts

This directory contains interactive setup and utility scripts for the Next.js + Cloudflare starter.

## Main Scripts

### `setup.sh`
The main setup wizard that configures your entire project:
- Checks prerequisites (Node.js, pnpm, wrangler, etc.)
- Collects project configuration (name, domains, credentials)
- Creates Cloudflare D1 databases (production + staging)
- Creates R2 storage buckets with custom domains
- Generates R2 API tokens
- Enables Cloudflare image transformations
- Updates all configuration files
- Installs dependencies
- Initializes database with migrations
- Optionally creates GitHub repository and sets secrets

**Usage:**
```bash
./scripts/setup.sh
```

### `ui-lib.sh`
Reusable UI component library used by all setup scripts. Provides consistent, beautiful UI with optional `gum` enhancement.

**Features:**
- Auto-detects if `gum` is installed
- Falls back gracefully to standard bash if not
- Provides consistent UI components across all scripts

**Components:**
- `print_header()` - Section headers with styled borders
- `print_success()` - Success messages (green ✓)
- `print_error()` - Error messages (red ✗)
- `print_warning()` - Warning messages (yellow ⚠)
- `print_info()` - Info messages (blue ℹ)
- `prompt()` - Text input with placeholders and defaults
- `confirm()` - Yes/no confirmation dialogs
- `choose()` - Selection menus with keyboard navigation
- `spin()` - Spinners for long operations (gum only)

**Enhancement with gum:**

The setup script works perfectly fine without `gum`, but if you have it installed, you get a significantly better experience:

| Feature | Without gum | With gum |
|---------|-------------|----------|
| Headers | Colored text lines | Styled bordered boxes |
| Input | Simple text prompt | Interactive field with placeholder |
| Selection | Numbered list (type number) | Filterable menu (arrow keys + search) |
| Confirmation | [y/N] prompt | Interactive Yes/No selector |
| Progress | Silent execution | Animated spinner |

**Install gum (optional):**
```bash
# macOS
brew install gum

# Linux
# See https://github.com/charmbracelet/gum#installation
```

**Try it yourself:**
```bash
# Test with gum
./scripts/test-gum-ui.sh

# Test without gum (temporarily disable)
PATH="" ./scripts/test-gum-ui.sh
```

## Test Scripts

### `test-gum-ui.sh`
Interactive test demonstrating all UI components with both gum and fallback modes.

**Usage:**
```bash
./scripts/test-gum-ui.sh
```

## Utility Scripts

### `db-studio.sh`
Opens Drizzle Studio for database management. Supports local, staging, and production databases.

**Usage:**
```bash
./scripts/db-studio.sh          # Local database
./scripts/db-studio.sh stage    # Staging database (read-only snapshot)
./scripts/db-studio.sh prod     # Production database (read-only snapshot)
```

## Design Principles

1. **Graceful Degradation**: All scripts work without gum, but enhanced with it
2. **Reusability**: Common UI components in shared library
3. **Consistency**: Same look and feel across all scripts
4. **User-Friendly**: Clear prompts, validation, and error messages
5. **Safety**: Confirmation prompts for destructive operations

## Architecture

```
scripts/
├── setup.sh              # Main setup wizard (sources ui-lib.sh)
├── ui-lib.sh            # Shared UI component library
├── test-gum-ui.sh       # UI component demo/test
├── db-studio.sh         # Database studio launcher
└── README.md            # This file
```

All scripts that need UI components should source `ui-lib.sh`:

```bash
#!/bin/bash
set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source UI library
source "$SCRIPT_DIR/ui-lib.sh"

# Now use UI components
print_header "My Script"
print_success "Ready to go!"
```
