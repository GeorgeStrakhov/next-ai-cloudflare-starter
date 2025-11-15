#!/bin/bash
set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source UI library for consistent UI components
source "$SCRIPT_DIR/ui-lib.sh"

# =============================================================================
# WELCOME
# =============================================================================

clear
print_header "🚀 Next.js + Cloudflare Workers Starter - Setup Wizard"

echo "This script will help you set up your project in minutes!"
echo ""
echo "It will:"
echo "  • Configure your project name and branding"
echo "  • Create Cloudflare D1 databases"
echo "  • Update all configuration files"
echo "  • Generate authentication secrets"
echo "  • Install dependencies and setup database"
echo "  • Generate favicons from your logo (if available)"
echo "  • Set up Git branches for deployment"
echo ""
echo "After completion, you'll be ready to run: pnpm dev"
echo ""

if ! confirm "Ready to begin?"; then
    echo "Setup cancelled."
    exit 0
fi

# =============================================================================
# PREREQUISITES CHECK
# =============================================================================

print_header "📋 Checking Prerequisites"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installed: $NODE_VERSION"
else
    print_error "Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

# Check pnpm
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    print_success "pnpm installed: v$PNPM_VERSION"
else
    print_error "pnpm is not installed. Install with: npm install -g pnpm"
    exit 1
fi

# Check wrangler
if command -v wrangler &> /dev/null || command -v npx &> /dev/null; then
    print_success "wrangler available"
else
    print_error "wrangler is not available. This shouldn't happen if pnpm is installed."
    exit 1
fi

# Check wrangler login status
print_info "Checking Cloudflare authentication..."

# Run whoami command, allowing npx install prompt to show
WHOAMI_OUTPUT=$(npx wrangler whoami 2>&1)
WHOAMI_EXIT=$?

if [ $WHOAMI_EXIT -eq 0 ]; then
    if echo "$WHOAMI_OUTPUT" | grep -q "logged in"; then
        print_success "Logged in to Cloudflare"
    else
        print_warning "Not logged in to Cloudflare"
        if confirm "Would you like to login now?"; then
            npx wrangler login
        else
            print_error "Cloudflare login required for database creation. Run: npx wrangler login"
            exit 1
        fi
    fi
else
    print_error "Unable to check Cloudflare login status"
    echo "$WHOAMI_OUTPUT"
    exit 1
fi

# Check git
if command -v git &> /dev/null; then
    print_success "Git installed"
else
    print_warning "Git not found. Git is recommended for version control."
fi

# Check ImageMagick (optional, for favicon generation)
if command -v convert &> /dev/null; then
    print_success "ImageMagick installed (for favicon generation)"
    HAS_IMAGEMAGICK=true
else
    print_warning "ImageMagick not found. Favicon generation will be skipped."
    print_info "Install with: brew install imagemagick (macOS) or apt-get install imagemagick (Linux)"
    HAS_IMAGEMAGICK=false
fi

# Check for logo.svg
if [ -f "public/logo.svg" ]; then
    print_success "Logo found at public/logo.svg"
    HAS_LOGO=true
else
    print_warning "No logo.svg found at public/logo.svg"
    print_info "Add your logo to public/logo.svg for automatic favicon generation"
    print_info "You can add it now and re-run the script, or continue without it"
    if ! confirm "Continue without logo?"; then
        print_error "Setup cancelled. Add your logo to public/logo.svg and run the script again."
        exit 1
    fi
    HAS_LOGO=false
fi

echo ""
sleep 1

# =============================================================================
# PROJECT CONFIGURATION
# =============================================================================

print_header "⚙️  Project Configuration"

# Project name validation loop
# Cloudflare Wrangler requires: lowercase alphanumeric with dashes only
while true; do
    prompt "Project name (lowercase, alphanumeric, dashes only, e.g., my-cool-app)" "my-app" PROJECT_NAME

    # Convert to lowercase
    PROJECT_NAME=$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]')

    # Validate: only lowercase letters, numbers, and dashes
    if [[ "$PROJECT_NAME" =~ ^[a-z0-9-]+$ ]]; then
        # Additional check: cannot start or end with dash
        if [[ "$PROJECT_NAME" =~ ^- ]] || [[ "$PROJECT_NAME" =~ -$ ]]; then
            print_error "Project name cannot start or end with a dash"
            continue
        fi
        # Additional check: no consecutive dashes
        if [[ "$PROJECT_NAME" =~ -- ]]; then
            print_error "Project name cannot contain consecutive dashes"
            continue
        fi
        break
    else
        print_error "Invalid project name. Only lowercase letters, numbers, and dashes are allowed."

        # Suggest a sanitized version
        SANITIZED=$(echo "$PROJECT_NAME" | sed 's/[^a-z0-9-]/-/g' | sed 's/--*/-/g' | sed 's/^-//g' | sed 's/-$//g')
        if [ -n "$SANITIZED" ] && [ "$SANITIZED" != "$PROJECT_NAME" ]; then
            print_info "Suggestion: $SANITIZED"
        fi
    fi
done

PROJECT_NAME_LOWER="$PROJECT_NAME"  # Already lowercase from validation

prompt "Production domain (e.g., myapp.com)" "your-domain.com" PROD_DOMAIN
prompt "Staging domain (e.g., staging.myapp.com)" "staging.$PROD_DOMAIN" STAGING_DOMAIN
prompt "CDN custom domain for file storage (e.g., cdn.myapp.com)" "cdn.$PROD_DOMAIN" CDN_DOMAIN
STAGING_CDN_DOMAIN="cdn-staging.${PROD_DOMAIN}"
prompt "App display name" "My App" APP_NAME
prompt "App description" "My awesome application" APP_DESCRIPTION
prompt "Email address (for sending and support)" "hello@$PROD_DOMAIN" EMAIL_FROM

echo ""
print_info "Configuration summary:"
echo "  Project: $PROJECT_NAME"
echo "  App name: $APP_NAME"
echo "  Description: $APP_DESCRIPTION"
echo "  Production: $PROD_DOMAIN"
echo "  Staging: $STAGING_DOMAIN"
echo "  CDN: $CDN_DOMAIN"
echo "  Email: $EMAIL_FROM"
echo ""

if ! confirm "Does this look correct?"; then
    print_error "Setup cancelled. Please run the script again."
    exit 1
fi

echo ""
sleep 1

# =============================================================================
# CREDENTIALS COLLECTION
# =============================================================================

print_header "🔑 Credentials Setup"

echo "We need a few API keys to automate your setup."
echo "These will be stored locally in .dev.vars and .env.local (gitignored)."
echo "You'll need to add them to GitHub Secrets later for deployments."
echo ""

# Cloudflare API Token
print_info "Cloudflare API Token (Required)"
echo "This will be used to:"
echo "  • Create D1 databases"
echo "  • Create R2 buckets and connect domains"
echo "  • Generate R2 API tokens"
echo "  • Enable image transformations"
echo ""
echo "Create token at: https://dash.cloudflare.com/profile/api-tokens"
echo ""
echo "Suggested: Start with 'Edit Cloudflare Workers' template, then add:"
echo "  • User > API Tokens > Edit (needed for R2 token creation)"
echo "  • Account > D1 > Edit"
echo "  • Account > Workers R2 Storage > Edit"
echo "  • Zone > DNS > Edit"
echo "  • Zone > Zone Settings > Edit"
echo ""
prompt "Cloudflare API Token" "" CF_API_TOKEN

if [ -z "$CF_API_TOKEN" ]; then
    print_error "Cloudflare API Token is required"
    exit 1
fi

echo ""

# Postmark API Key (optional)
print_info "Postmark API Key (Optional - for email)"
echo "Get from: https://postmarkapp.com/"
echo "Note: If skipped, magic link emails will log to console in dev mode"
echo ""
prompt "Postmark API Key (or press Enter to skip)" "" POSTMARK_KEY

# Use placeholder if not provided
if [ -z "$POSTMARK_KEY" ]; then
    POSTMARK_KEY="your-postmark-api-key"
fi

echo ""

# Replicate API Key (optional)
print_info "Replicate API Key (Optional - for AI image generation)"
echo "Get from: https://replicate.com/account/api-tokens"
echo "Note: Can be added later when you need AI features"
echo ""
prompt "Replicate API Key (or press Enter to skip)" "" REPLICATE_KEY

# Use placeholder if not provided
if [ -z "$REPLICATE_KEY" ]; then
    REPLICATE_KEY="your-replicate-api-key"
fi

echo ""

# OpenRouter API Key (optional)
print_info "OpenRouter API Key (Optional - for LLM text generation)"
echo "Get from: https://openrouter.ai/keys"
echo "Note: Can be added later when you need LLM features"
echo ""
prompt "OpenRouter API Key (or press Enter to skip)" "" OPENROUTER_KEY

# Use placeholder if not provided
if [ -z "$OPENROUTER_KEY" ]; then
    OPENROUTER_KEY="your-openrouter-api-key"
fi

echo ""
print_success "Credentials collected! Starting automation..."
echo ""
sleep 2

# =============================================================================
# CREATE D1 DATABASES
# =============================================================================

print_header "🗄️  Creating Cloudflare D1 Databases"

print_info "Creating production database..."
PROD_DB_OUTPUT=$(npx wrangler d1 create "${PROJECT_NAME_LOWER}-db" 2>&1)
# Extract database ID - handle both formats: database_id = "..." and "database_id": "..."
PROD_DB_ID=$(echo "$PROD_DB_OUTPUT" | grep -o '[0-9a-f]\{8\}-[0-9a-f]\{4\}-[0-9a-f]\{4\}-[0-9a-f]\{4\}-[0-9a-f]\{12\}' | head -1)

if [ -z "$PROD_DB_ID" ]; then
    print_error "Failed to create production database or extract database ID"
    echo "$PROD_DB_OUTPUT"
    exit 1
fi

print_success "Production database created: $PROD_DB_ID"

print_info "Creating staging database..."
STAGING_DB_OUTPUT=$(npx wrangler d1 create "${PROJECT_NAME_LOWER}-db-staging" 2>&1)
# Extract database ID - handle both formats: database_id = "..." and "database_id": "..."
STAGING_DB_ID=$(echo "$STAGING_DB_OUTPUT" | grep -o '[0-9a-f]\{8\}-[0-9a-f]\{4\}-[0-9a-f]\{4\}-[0-9a-f]\{4\}-[0-9a-f]\{12\}' | head -1)

if [ -z "$STAGING_DB_ID" ]; then
    print_error "Failed to create staging database or extract database ID"
    echo "$STAGING_DB_OUTPUT"
    exit 1
fi

print_success "Staging database created: $STAGING_DB_ID"

echo ""
sleep 1

# =============================================================================
# CREATE R2 BUCKETS
# =============================================================================

print_header "🪣 Creating R2 Storage Buckets"

# Create production R2 bucket
print_info "Creating production R2 bucket..."
npx wrangler r2 bucket create "${PROJECT_NAME_LOWER}-storage" >/dev/null 2>&1
print_success "Production R2 bucket created: ${PROJECT_NAME_LOWER}-storage"

# Create staging R2 bucket
print_info "Creating staging R2 bucket..."
npx wrangler r2 bucket create "${PROJECT_NAME_LOWER}-storage-staging" >/dev/null 2>&1
print_success "Staging R2 bucket created: ${PROJECT_NAME_LOWER}-storage-staging"

# Get Cloudflare Account ID
print_info "Getting Cloudflare account ID..."
ACCOUNT_ID=$(npx wrangler whoami 2>&1 | grep -oE '[a-f0-9]{32}' | head -1)

if [ -z "$ACCOUNT_ID" ]; then
    print_error "Failed to get Cloudflare Account ID"
    print_info "Make sure you're logged in with: npx wrangler login"
    exit 1
fi

print_success "Account ID: $ACCOUNT_ID"

# Get zone ID for the domain (needed for R2 custom domains)
print_info "Looking up zone ID for ${PROD_DOMAIN}..."
ZONE_RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=${PROD_DOMAIN}" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json")

ZONE_ID=$(echo "$ZONE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$ZONE_ID" ]; then
    print_success "Zone ID found: $ZONE_ID"

    # Attach custom domain to production bucket
    print_info "Connecting custom domain to production bucket..."
    if npx wrangler r2 bucket domain add "${PROJECT_NAME_LOWER}-storage" --domain "${CDN_DOMAIN}" --zone-id "${ZONE_ID}" 2>&1 | grep -q "success\|Success\|added\|Added"; then
        print_success "Custom domain connected: ${CDN_DOMAIN}"
    else
        print_warning "Could not connect custom domain automatically"
        print_info "You can connect it manually in Cloudflare dashboard"
    fi

    # Attach custom domain to staging bucket
    print_info "Connecting custom domain to staging bucket..."
    if npx wrangler r2 bucket domain add "${PROJECT_NAME_LOWER}-storage-staging" --domain "${STAGING_CDN_DOMAIN}" --zone-id "${ZONE_ID}" 2>&1 | grep -q "success\|Success\|added\|Added"; then
        print_success "Staging domain connected: ${STAGING_CDN_DOMAIN}"
    else
        print_warning "Could not connect staging domain automatically"
        print_info "You can connect it manually in Cloudflare dashboard"
    fi
else
    print_warning "Domain ${PROD_DOMAIN} not found in Cloudflare"
    print_info "Please add your domain to Cloudflare first, then you can:"
    print_info "  1. Connect domains manually in Cloudflare dashboard"
    print_info "  2. Or re-run this script after adding the domain"
fi

echo ""
sleep 1

# =============================================================================
# CREATE R2 API TOKENS
# =============================================================================

print_header "🔐 Creating R2 API Tokens"

print_info "Attempting to create R2 API token for production..."

# Try to create R2 API token via Cloudflare API
R2_TOKEN_RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/user/tokens" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "'"${PROJECT_NAME_LOWER}"'-r2-production",
    "policies": [{
      "effect": "allow",
      "resources": {
        "com.cloudflare.edge.r2.bucket.'"${ACCOUNT_ID}"'_default_'"${PROJECT_NAME_LOWER}"'-storage": "*"
      },
      "permission_groups": [{
        "id": "2efd5506f9c8494dacb1fa10a3e7d5b6",
        "name": "Workers R2 Storage Bucket Item Write"
      }]
    }]
  }')

# Check if API call was successful
if echo "$R2_TOKEN_RESPONSE" | grep -q '"success"\s*:\s*true'; then
    # Extract token ID and value from response
    # For R2: Access Key ID = token id, Secret Access Key = SHA-256 of token value
    TOKEN_ID=$(echo "$R2_TOKEN_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    TOKEN_VALUE=$(echo "$R2_TOKEN_RESPONSE" | grep -o '"value":"[^"]*"' | cut -d'"' -f4)

    if [ -n "$TOKEN_ID" ] && [ -n "$TOKEN_VALUE" ]; then
        R2_ACCESS_KEY="$TOKEN_ID"
        # Create SHA-256 hash of the token value for the secret key
        R2_SECRET_KEY=$(echo -n "$TOKEN_VALUE" | shasum -a 256 | cut -d' ' -f1)
        print_success "R2 production API token created successfully"
    else
        R2_ACCESS_KEY=""
        R2_SECRET_KEY=""
    fi
else
    # API call failed - extract error message
    ERROR_MESSAGE=$(echo "$R2_TOKEN_RESPONSE" | grep -o '"message":"[^"]*"' | head -1 | cut -d'"' -f4)
    ERROR_CODE=$(echo "$R2_TOKEN_RESPONSE" | grep -o '"code":[0-9]*' | head -1 | cut -d':' -f2)

    R2_ACCESS_KEY=""
    R2_SECRET_KEY=""
fi

if [ -z "$R2_ACCESS_KEY" ] || [ -z "$R2_SECRET_KEY" ]; then
    print_warning "Automatic R2 token creation failed"

    if [ -n "$ERROR_MESSAGE" ]; then
        if [ "$ERROR_CODE" = "1001" ]; then
            print_error "Error: $ERROR_MESSAGE"
            print_info "You've reached Cloudflare's API token limit (50 tokens max)"
            print_info "Please delete unused tokens at: https://dash.cloudflare.com/profile/api-tokens"
            echo ""
            print_info "Then create R2 tokens manually at: https://dash.cloudflare.com/${ACCOUNT_ID}/r2/api-tokens"
        else
            print_error "Error: $ERROR_MESSAGE (code: $ERROR_CODE)"
            print_info "Create tokens manually at: https://dash.cloudflare.com/${ACCOUNT_ID}/r2/api-tokens"
        fi
    else
        print_info "Automatic creation requires 'User API Tokens - Edit' permission"
        print_info "Create tokens manually at: https://dash.cloudflare.com/${ACCOUNT_ID}/r2/api-tokens"
    fi

    echo ""
    echo "For production token:"
    echo "  • Permissions: Object Read & Write"
    echo "  • Bucket: ${PROJECT_NAME_LOWER}-storage"
    echo ""
    prompt "R2 Access Key ID (Production)" "" R2_ACCESS_KEY
    prompt "R2 Secret Access Key (Production)" "" R2_SECRET_KEY
fi

# Create R2 API token for staging
if [ -n "$R2_ACCESS_KEY" ] && [ -n "$R2_SECRET_KEY" ]; then
    print_info "Attempting to create R2 API token for staging..."

    R2_TOKEN_RESPONSE_STAGING=$(curl -s -X POST "https://api.cloudflare.com/client/v4/user/tokens" \
      -H "Authorization: Bearer ${CF_API_TOKEN}" \
      -H "Content-Type: application/json" \
      --data '{
        "name": "'"${PROJECT_NAME_LOWER}"'-r2-staging",
        "policies": [{
          "effect": "allow",
          "resources": {
            "com.cloudflare.edge.r2.bucket.'"${ACCOUNT_ID}"'_default_'"${PROJECT_NAME_LOWER}"'-storage-staging": "*"
          },
          "permission_groups": [{
            "id": "2efd5506f9c8494dacb1fa10a3e7d5b6",
            "name": "Workers R2 Storage Bucket Item Write"
          }]
        }]
      }')

    # Check if API call was successful
    if echo "$R2_TOKEN_RESPONSE_STAGING" | grep -q '"success"\s*:\s*true'; then
        # Extract token ID and value from response
        # For R2: Access Key ID = token id, Secret Access Key = SHA-256 of token value
        TOKEN_ID_STAGING=$(echo "$R2_TOKEN_RESPONSE_STAGING" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        TOKEN_VALUE_STAGING=$(echo "$R2_TOKEN_RESPONSE_STAGING" | grep -o '"value":"[^"]*"' | cut -d'"' -f4)

        if [ -n "$TOKEN_ID_STAGING" ] && [ -n "$TOKEN_VALUE_STAGING" ]; then
            R2_ACCESS_KEY_STAGING="$TOKEN_ID_STAGING"
            # Create SHA-256 hash of the token value for the secret key
            R2_SECRET_KEY_STAGING=$(echo -n "$TOKEN_VALUE_STAGING" | shasum -a 256 | cut -d' ' -f1)
            print_success "R2 staging API token created successfully"
        else
            R2_ACCESS_KEY_STAGING=""
            R2_SECRET_KEY_STAGING=""
        fi
    else
        # API call failed - extract error message
        ERROR_MESSAGE_STAGING=$(echo "$R2_TOKEN_RESPONSE_STAGING" | grep -o '"message":"[^"]*"' | head -1 | cut -d'"' -f4)
        ERROR_CODE_STAGING=$(echo "$R2_TOKEN_RESPONSE_STAGING" | grep -o '"code":[0-9]*' | head -1 | cut -d':' -f2)

        R2_ACCESS_KEY_STAGING=""
        R2_SECRET_KEY_STAGING=""
    fi
fi

# If automatic creation failed for staging, prompt manually
if [ -z "$R2_ACCESS_KEY_STAGING" ] || [ -z "$R2_SECRET_KEY_STAGING" ]; then
    echo ""

    if [ -n "$ERROR_MESSAGE_STAGING" ]; then
        print_warning "Automatic R2 token creation failed for staging"
        if [ "$ERROR_CODE_STAGING" = "1001" ]; then
            print_error "Error: $ERROR_MESSAGE_STAGING"
            print_info "You've reached Cloudflare's API token limit (50 tokens max)"
            print_info "Please delete unused tokens at: https://dash.cloudflare.com/profile/api-tokens"
        else
            print_error "Error: $ERROR_MESSAGE_STAGING (code: $ERROR_CODE_STAGING)"
        fi
        echo ""
    fi

    print_info "For staging token:"
    echo "  • Permissions: Object Read & Write"
    echo "  • Bucket: ${PROJECT_NAME_LOWER}-storage-staging"
    echo ""
    prompt "R2 Access Key ID (Staging)" "" R2_ACCESS_KEY_STAGING
    prompt "R2 Secret Access Key (Staging)" "" R2_SECRET_KEY_STAGING
fi

echo ""
sleep 1

# =============================================================================
# ENABLE IMAGE TRANSFORMATIONS
# =============================================================================

print_header "🖼️  Enabling Image Transformations"

# Get zone ID for the domain
print_info "Getting zone ID for ${PROD_DOMAIN}..."
ZONE_RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=${PROD_DOMAIN}" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json")

ZONE_ID=$(echo "$ZONE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$ZONE_ID" ]; then
    print_warning "Could not find zone for ${PROD_DOMAIN}"
    print_info "Make sure your domain is added to Cloudflare"
    print_info "You can enable image transformations manually later"
else
    print_success "Zone ID: $ZONE_ID"

    # Enable image transformations
    print_info "Enabling image transformations for zone..."
    TRANSFORM_RESPONSE=$(curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/settings/image_resizing" \
      -H "Authorization: Bearer ${CF_API_TOKEN}" \
      -H "Content-Type: application/json" \
      --data '{"value": "on"}' 2>&1)

    # Check if successful
    if echo "$TRANSFORM_RESPONSE" | grep -q '"success"\s*:\s*true'; then
        print_success "Image transformations enabled!"
    else
        print_warning "Could not enable image transformations automatically"
        print_info "Response: $TRANSFORM_RESPONSE"
        print_info "You can enable it manually in Cloudflare Dashboard:"
        print_info "  Speed → Optimization → Image Resizing → Enable"
    fi
fi

echo ""
sleep 1

# =============================================================================
# UPDATE CONFIGURATION FILES
# =============================================================================

print_header "📝 Updating Configuration Files"

# Update next.config.ts
print_info "Updating next.config.ts..."

# Backup original
cp next.config.ts next.config.ts.backup

# Update CDN domains for Next.js image optimization
sed -i.tmp "s|cdn.your-domain.com|${CDN_DOMAIN}|g" next.config.ts
sed -i.tmp "s|cdn-staging.your-domain.com|cdn-staging.${PROD_DOMAIN}|g" next.config.ts

# Clean up temp file
rm next.config.ts.tmp

print_success "next.config.ts updated"

# Update wrangler.jsonc
print_info "Updating wrangler.jsonc..."

# Backup original
cp wrangler.jsonc wrangler.jsonc.backup

# Update production worker name (use lowercase for wrangler)
sed -i.tmp "s/\"name\": \"my-app-production\"/\"name\": \"${PROJECT_NAME_LOWER}-production\"/" wrangler.jsonc

# Update staging worker name (use lowercase for wrangler)
sed -i.tmp "s/\"name\": \"my-app-staging\"/\"name\": \"${PROJECT_NAME_LOWER}-staging\"/" wrangler.jsonc

# Update production database (use lowercase for wrangler)
sed -i.tmp "s/\"database_name\": \"my-app-db\"/\"database_name\": \"${PROJECT_NAME_LOWER}-db\"/" wrangler.jsonc
sed -i.tmp "s/\"database_id\": \"YOUR_PRODUCTION_DATABASE_ID\"/\"database_id\": \"${PROD_DB_ID}\"/" wrangler.jsonc

# Update staging database (use lowercase for wrangler)
sed -i.tmp "s/\"database_name\": \"my-app-db-staging\"/\"database_name\": \"${PROJECT_NAME_LOWER}-db-staging\"/" wrangler.jsonc
sed -i.tmp "s/\"database_id\": \"YOUR_STAGING_DATABASE_ID\"/\"database_id\": \"${STAGING_DB_ID}\"/" wrangler.jsonc

# Update production R2 bucket (use lowercase for wrangler)
sed -i.tmp "s/\"bucket_name\": \"my-app-storage\"/\"bucket_name\": \"${PROJECT_NAME_LOWER}-storage\"/" wrangler.jsonc

# Update staging R2 bucket (use lowercase for wrangler)
sed -i.tmp "s/\"bucket_name\": \"my-app-storage-staging\"/\"bucket_name\": \"${PROJECT_NAME_LOWER}-storage-staging\"/" wrangler.jsonc

# Update production domains
sed -i.tmp "s/\"pattern\": \"your-domain.com\"/\"pattern\": \"${PROD_DOMAIN}\"/" wrangler.jsonc
sed -i.tmp "s/\"pattern\": \"www.your-domain.com\"/\"pattern\": \"www.${PROD_DOMAIN}\"/" wrangler.jsonc

# Update staging domain
sed -i.tmp "s/\"pattern\": \"staging.your-domain.com\"/\"pattern\": \"${STAGING_DOMAIN}\"/" wrangler.jsonc

# Update production environment variables
sed -i.tmp "s|\"BETTER_AUTH_URL\": \"https://your-domain.com\"|\"BETTER_AUTH_URL\": \"https://${PROD_DOMAIN}\"|" wrangler.jsonc
sed -i.tmp "s|\"NEXT_PUBLIC_APP_URL\": \"https://your-domain.com\"|\"NEXT_PUBLIC_APP_URL\": \"https://${PROD_DOMAIN}\"|" wrangler.jsonc

# Update staging environment variables
sed -i.tmp "s|\"BETTER_AUTH_URL\": \"https://staging.your-domain.com\"|\"BETTER_AUTH_URL\": \"https://${STAGING_DOMAIN}\"|" wrangler.jsonc
sed -i.tmp "s|\"NEXT_PUBLIC_APP_URL\": \"https://staging.your-domain.com\"|\"NEXT_PUBLIC_APP_URL\": \"https://${STAGING_DOMAIN}\"|" wrangler.jsonc

# Update app name and description in vars
sed -i.tmp "s/\"NEXT_PUBLIC_APP_NAME\": \"My App\"/\"NEXT_PUBLIC_APP_NAME\": \"${APP_NAME}\"/" wrangler.jsonc
sed -i.tmp "s/\"NEXT_PUBLIC_APP_DESCRIPTION\": \"My awesome application\"/\"NEXT_PUBLIC_APP_DESCRIPTION\": \"${APP_DESCRIPTION}\"/" wrangler.jsonc

# Clean up temp files
rm wrangler.jsonc.tmp

print_success "wrangler.jsonc updated"

# Update package.json
print_info "Updating package.json..."

cp package.json package.json.backup

sed -i.tmp "s/\"name\": \"cloudflare-nextjs-starter\"/\"name\": \"${PROJECT_NAME}\"/" package.json
sed -i.tmp "s/\"description\": \"Next.js 15 starter template for Cloudflare Workers with D1, Drizzle ORM, and Better Auth\"/\"description\": \"${APP_DESCRIPTION}\"/" package.json

# Update database migration scripts (use lowercase for wrangler database names)
sed -i.tmp "s/my-app-db-staging/${PROJECT_NAME_LOWER}-db-staging/" package.json
sed -i.tmp "s/my-app-db/${PROJECT_NAME_LOWER}-db/g" package.json

rm package.json.tmp

print_success "package.json updated"

# Update scripts/db-studio.sh
print_info "Updating scripts/db-studio.sh..."

cp scripts/db-studio.sh scripts/db-studio.sh.backup

# Use lowercase for wrangler database names
sed -i.tmp "s/my-app-db-staging/${PROJECT_NAME_LOWER}-db-staging/" scripts/db-studio.sh
sed -i.tmp "s/my-app-db/${PROJECT_NAME_LOWER}-db/g" scripts/db-studio.sh

rm scripts/db-studio.sh.tmp

print_success "scripts/db-studio.sh updated"

# Update .github/workflows/deploy.yml
if [ -f ".github/workflows/deploy.yml" ]; then
    print_info "Updating GitHub Actions workflow..."

    cp .github/workflows/deploy.yml .github/workflows/deploy.yml.backup

    # Update URLs
    sed -i.tmp "s|https://staging.your-domain.com|https://${STAGING_DOMAIN}|g" .github/workflows/deploy.yml
    sed -i.tmp "s|https://your-domain.com|https://${PROD_DOMAIN}|g" .github/workflows/deploy.yml

    # Update CDN endpoints
    sed -i.tmp "s|https://cdn-staging.your-domain.com|https://cdn-staging.${PROD_DOMAIN}|g" .github/workflows/deploy.yml
    sed -i.tmp "s|https://cdn.your-domain.com|https://${CDN_DOMAIN}|g" .github/workflows/deploy.yml

    # Update app name and description
    sed -i.tmp "s|NEXT_PUBLIC_APP_NAME: My App|NEXT_PUBLIC_APP_NAME: ${APP_NAME}|g" .github/workflows/deploy.yml
    sed -i.tmp "s|NEXT_PUBLIC_APP_DESCRIPTION: My awesome application|NEXT_PUBLIC_APP_DESCRIPTION: ${APP_DESCRIPTION}|g" .github/workflows/deploy.yml

    # Update support email
    sed -i.tmp "s|NEXT_PUBLIC_SUPPORT_EMAIL: hello@your-domain.com|NEXT_PUBLIC_SUPPORT_EMAIL: ${EMAIL_FROM}|g" .github/workflows/deploy.yml

    rm .github/workflows/deploy.yml.tmp

    print_success "GitHub Actions workflow updated"
fi

# Generate auth secret
if command -v openssl &> /dev/null; then
    AUTH_SECRET=$(openssl rand -base64 32)
    print_success "Generated BETTER_AUTH_SECRET"
else
    AUTH_SECRET="PLEASE_GENERATE_A_SECRET_KEY"
    print_warning "openssl not found - you'll need to generate BETTER_AUTH_SECRET manually"
fi

# Create .dev.vars file (for wrangler dev and server-side variables)
print_info "Creating .dev.vars file..."

cat > .dev.vars << EOF
# Server-side Environment Variables
# Used by: wrangler dev, wrangler deploy
# NOT used by: next dev (use .env.local for that)
# Generated by setup script on $(date)

# ===========================================
# Better Auth Configuration (Required)
# ===========================================
# Auto-generated by setup script
BETTER_AUTH_SECRET=${AUTH_SECRET}
BETTER_AUTH_URL=http://localhost:3000

# ===========================================
# Email Configuration (Required for Magic Link)
# ===========================================
# Get API key from: https://postmarkapp.com/
POSTMARK_API_KEY=${POSTMARK_KEY}
EMAIL_FROM=${EMAIL_FROM}

# ===========================================
# R2 Storage Configuration
# ===========================================
# Cloudflare R2 (S3-compatible object storage)
S3_ENDPOINT_URL=https://${ACCOUNT_ID}.r2.cloudflarestorage.com
S3_REGION=weur
S3_ACCESS_ID_KEY=${R2_ACCESS_KEY}
S3_SECRET_ACCESS_KEY=${R2_SECRET_KEY}
S3_BUCKET_NAME=${PROJECT_NAME_LOWER}-storage
S3_PUBLIC_ENDPOINT=https://${CDN_DOMAIN}

# ===========================================
# Replicate AI Configuration
# ===========================================
# Get API key from: https://replicate.com/account/api-tokens
REPLICATE_API_KEY=${REPLICATE_KEY}

# ===========================================
# OpenRouter LLM Configuration
# ===========================================
# Get API key from: https://openrouter.ai/keys
OPENROUTER_API_KEY=${OPENROUTER_KEY}
EOF

print_success ".dev.vars created"

# Create .env.local for Next.js (for next dev)
print_info "Creating .env.local for Next.js..."

cat > .env.local << EOF
# Next.js Environment Variables (for 'next dev')
# NEXT_PUBLIC_ variables are inlined at build time
# Server-side secrets should go in .dev.vars
# Generated by setup script on $(date)

# Public variables (available in browser)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_APP_NAME=${APP_NAME}
NEXT_PUBLIC_APP_DESCRIPTION=${APP_DESCRIPTION}
NEXT_PUBLIC_SUPPORT_EMAIL=${EMAIL_FROM}

# R2 Storage (Public CDN URL - uses staging for local dev)
NEXT_PUBLIC_S3_ENDPOINT=https://cdn-staging.${PROD_DOMAIN}

# Server-side variables (for next dev only, also in .dev.vars for wrangler)
EMAIL_FROM=${EMAIL_FROM}
BETTER_AUTH_SECRET=${AUTH_SECRET}
BETTER_AUTH_URL=http://localhost:3000
POSTMARK_API_KEY=${POSTMARK_KEY}
# Use STAGING credentials and bucket for local development
S3_ENDPOINT_URL=https://${ACCOUNT_ID}.r2.cloudflarestorage.com
S3_REGION=weur
S3_ACCESS_ID_KEY=${R2_ACCESS_KEY_STAGING}
S3_SECRET_ACCESS_KEY=${R2_SECRET_KEY_STAGING}
S3_BUCKET_NAME=${PROJECT_NAME_LOWER}-storage-staging
S3_PUBLIC_ENDPOINT=https://cdn-staging.${PROD_DOMAIN}
REPLICATE_API_KEY=${REPLICATE_KEY}
OPENROUTER_API_KEY=${OPENROUTER_KEY}
EOF

print_success ".env.local created"

echo ""
sleep 1

# =============================================================================
# INSTALL DEPENDENCIES
# =============================================================================

print_header "📦 Installing Dependencies"

print_info "Installing npm dependencies..."
if pnpm install; then
    print_success "Dependencies installed"
else
    print_error "Failed to install dependencies"
    print_warning "You'll need to run: pnpm install"
    exit 1
fi

echo ""
sleep 1

# =============================================================================
# GENERATE CLOUDFLARE TYPES
# =============================================================================

print_header "🔧 Generating Cloudflare TypeScript Types"

print_info "Generating TypeScript types for Cloudflare bindings..."
if pnpm cf-typegen; then
    print_success "TypeScript types generated (includes R2_BUCKET, DB, ASSETS)"
else
    print_warning "Type generation failed - you may need to run: pnpm cf-typegen"
fi

echo ""
sleep 1

# =============================================================================
# FAVICON GENERATION
# =============================================================================

if [ "$HAS_IMAGEMAGICK" = true ] && [ "$HAS_LOGO" = true ]; then
    print_header "🎨 Favicon Generation"

    if confirm "Generate favicons from public/logo.svg?"; then
            print_info "Generating favicons..."

            cd public

            # Generate various PNG sizes from SVG
            convert -background none -resize 16x16 logo.svg favicon-16x16.png 2>/dev/null || print_warning "Failed to generate favicon-16x16.png"
            convert -background none -resize 32x32 logo.svg favicon-32x32.png 2>/dev/null || print_warning "Failed to generate favicon-32x32.png"
            convert -background none -resize 192x192 logo.svg android-chrome-192x192.png 2>/dev/null || print_warning "Failed to generate android-chrome-192x192.png"
            convert -background none -resize 512x512 logo.svg android-chrome-512x512.png 2>/dev/null || print_warning "Failed to generate android-chrome-512x512.png"
            convert -background none -resize 180x180 logo.svg apple-touch-icon.png 2>/dev/null || print_warning "Failed to generate apple-touch-icon.png"

            # Generate favicon.ico from 32x32 PNG
            if [ -f "favicon-32x32.png" ]; then
                convert favicon-32x32.png favicon.ico 2>/dev/null || print_warning "Failed to generate favicon.ico"
            fi

            cd ..

            print_success "Favicons generated"

            # Update site.webmanifest
            print_info "Updating site.webmanifest..."

            cat > public/site.webmanifest << EOF
{
  "name": "${APP_NAME}",
  "short_name": "${APP_NAME}",
  "icons": [
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "display": "standalone"
}
EOF

            print_success "site.webmanifest updated"
    fi
elif [ "$HAS_IMAGEMAGICK" = false ]; then
    print_header "🎨 Favicon Generation"
    print_warning "Skipping favicon generation (ImageMagick not installed)"
elif [ "$HAS_LOGO" = false ]; then
    print_header "🎨 Favicon Generation"
    print_warning "Skipping favicon generation (no logo.svg found)"
fi

echo ""
sleep 1

# =============================================================================
# GIT SETUP - REINITIALIZE FOR YOUR PROJECT
# =============================================================================

if command -v git &> /dev/null; then
    print_header "🌿 Git Repository Setup"

    echo "This starter template needs a fresh git repository for your project."
    echo ""
    print_warning "⚠️  This will:"
    echo "  1. Remove the existing .git directory (template history)"
    echo "  2. Initialize a new git repository"
    echo "  3. Create main, stage, and prod branches"
    echo "  4. Make initial commit with your configuration"
    echo ""

    if ! confirm "Proceed with git reinitialization?"; then
        print_warning "Skipping git setup. You'll need to initialize git manually later."
    else
        # Remove old git directory
        print_info "Removing template git history..."
        rm -rf .git
        print_success "Removed .git directory"

        # Initialize fresh git repo
        print_info "Initializing new git repository..."
        git init -q
        git branch -M main
        print_success "Initialized git on 'main' branch"

        # Add all files and make initial commit
        print_info "Creating initial commit..."
        git add .
        git commit -q -m "Initial commit: ${PROJECT_NAME} setup

Project configured with:
- Database: ${PROJECT_NAME_LOWER}-db (staging + production)
- R2 Storage: ${PROJECT_NAME_LOWER}-storage (staging + production)
- Domain: ${PROD_DOMAIN}
- CDN: ${CDN_DOMAIN}

Generated by setup script on $(date)"

        print_success "Initial commit created"

        echo ""
        GIT_INITIALIZED=true
    fi
fi

echo ""
sleep 1

# =============================================================================
# SETUP DATABASE
# =============================================================================

print_header "🗄️  Setting Up Database"

print_info "Generating database migrations from schema..."
if pnpm db:generate; then
    print_success "Migrations generated"
else
    print_warning "Migration generation skipped (might not be needed for initial setup)"
fi

echo ""

print_info "Applying migrations to local database..."
if pnpm db:migrate:local; then
    print_success "Local database ready"
else
    print_warning "Database migration failed. You may need to run: pnpm db:migrate:local"
fi

echo ""

# Commit migrations to git if git was initialized
if [ "$GIT_INITIALIZED" = true ]; then
    if [ -d "drizzle" ] && [ -n "$(ls -A drizzle 2>/dev/null)" ]; then
        print_info "Committing database migrations to git..."
        git add drizzle/
        git commit -q -m "Add database migrations

Generated by Drizzle ORM from schema files."
        print_success "Migrations committed to git"

        # Create deployment branches after migrations are committed
        print_info "Creating deployment branches..."
        git branch stage
        git branch prod
        print_success "Created branches: main, stage, prod"
        echo ""
    fi
fi

sleep 1

# =============================================================================
# GENERATE GITHUB SECRETS HELPER FILE
# =============================================================================

print_header "📄 Generating GitHub Secrets Setup Helper"

# Generate two separate auth secrets for staging and production
if command -v openssl &> /dev/null; then
    AUTH_SECRET_STAGING=$(openssl rand -base64 32)
    AUTH_SECRET_PRODUCTION=$(openssl rand -base64 32)
else
    AUTH_SECRET_STAGING="PLEASE_GENERATE_STAGING_SECRET"
    AUTH_SECRET_PRODUCTION="PLEASE_GENERATE_PRODUCTION_SECRET"
fi

cat > .github-secrets-setup.txt << EOF
# GitHub Secrets Setup Helper
# Generated on $(date)
#
# INSTRUCTIONS:
# 1. Go to your GitHub repository
# 2. Navigate to: Settings → Secrets and variables → Actions
# 3. Click "New repository secret" for each secret below
# 4. Copy the values from the commands below
#
# OR use GitHub CLI to set them all at once:
# Copy and paste these commands into your terminal:

gh secret set CLOUDFLARE_API_TOKEN --body "${CF_API_TOKEN}"
gh secret set CLOUDFLARE_ACCOUNT_ID --body "${ACCOUNT_ID}"
gh secret set BETTER_AUTH_SECRET_STAGING --body "${AUTH_SECRET_STAGING}"
gh secret set BETTER_AUTH_SECRET_PRODUCTION --body "${AUTH_SECRET_PRODUCTION}"
gh secret set POSTMARK_API_KEY --body "${POSTMARK_KEY}"
gh secret set EMAIL_FROM --body "${EMAIL_FROM}"
gh secret set R2_ACCESS_KEY_ID_STAGING --body "${R2_ACCESS_KEY_STAGING}"
gh secret set R2_SECRET_ACCESS_KEY_STAGING --body "${R2_SECRET_KEY_STAGING}"
gh secret set R2_ACCESS_KEY_ID_PRODUCTION --body "${R2_ACCESS_KEY}"
gh secret set R2_SECRET_ACCESS_KEY_PRODUCTION --body "${R2_SECRET_KEY}"
gh secret set REPLICATE_API_KEY --body "${REPLICATE_KEY}"
gh secret set OPENROUTER_API_KEY --body "${OPENROUTER_KEY}"

# IMPORTANT NOTES:
# - CLOUDFLARE_API_TOKEN is your main Cloudflare API token (same one used for setup)
#   Required permissions: Workers Scripts/Routes, D1, R2, and deployment access
# - BETTER_AUTH_SECRET values are DIFFERENT for staging and production (security best practice)
# - R2 credentials are DIFFERENT for staging and production buckets
# - POSTMARK_API_KEY, EMAIL_FROM, REPLICATE_API_KEY, and OPENROUTER_API_KEY are shared across environments
# - These secrets are required for GitHub Actions deployments
# - Never commit this file to version control (it's in .gitignore)

# Manual setup (if you don't have GitHub CLI):
# Copy each value and add it manually in GitHub UI:

CLOUDFLARE_API_TOKEN=${CF_API_TOKEN}
CLOUDFLARE_ACCOUNT_ID=${ACCOUNT_ID}
BETTER_AUTH_SECRET_STAGING=${AUTH_SECRET_STAGING}
BETTER_AUTH_SECRET_PRODUCTION=${AUTH_SECRET_PRODUCTION}
POSTMARK_API_KEY=${POSTMARK_KEY}
EMAIL_FROM=${EMAIL_FROM}
R2_ACCESS_KEY_ID_STAGING=${R2_ACCESS_KEY_STAGING}
R2_SECRET_ACCESS_KEY_STAGING=${R2_SECRET_KEY_STAGING}
R2_ACCESS_KEY_ID_PRODUCTION=${R2_ACCESS_KEY}
R2_SECRET_ACCESS_KEY_PRODUCTION=${R2_SECRET_KEY}
REPLICATE_API_KEY=${REPLICATE_KEY}
OPENROUTER_API_KEY=${OPENROUTER_KEY}
EOF

print_success "GitHub secrets helper created: .github-secrets-setup.txt"
print_info "This file contains all the secrets you need to add to GitHub Actions"
print_warning "Keep this file secure! It's gitignored but contains sensitive data"

echo ""
sleep 1

# =============================================================================
# GITHUB REPOSITORY & SECRETS SETUP
# =============================================================================

if [ "$GIT_INITIALIZED" = true ]; then
    print_header "🐙 GitHub Repository Setup"

    # Check if GitHub CLI is installed
    if command -v gh &> /dev/null; then
        # Check if gh is authenticated
        if gh auth status &> /dev/null; then
            print_success "GitHub CLI detected and authenticated"
            echo ""
            echo "We can automatically:"
            echo "  • Create a new GitHub repository for your project"
            echo "  • Push all branches (main, stage, prod)"
            echo "  • Set all GitHub secrets for CI/CD"
            echo ""

            if confirm "Create GitHub repository and set up secrets automatically?"; then
                echo ""

                # Ask for repo visibility
                REPO_VISIBILITY="private"
                if confirm "Make repository public? (default: private)"; then
                    REPO_VISIBILITY="public"
                fi

                echo ""

                # Get authenticated username
                USERNAME=$(gh api user --jq '.login' 2>/dev/null)

                if [ -z "$USERNAME" ]; then
                    print_error "Failed to get GitHub username"
                    print_info "You can create the repository manually"
                else
                    # Get list of organizations
                    print_info "Checking your GitHub organizations..."
                    ORGS=$(gh org list --limit 100 2>/dev/null | awk '{print $1}')

                    # Determine repository owner
                    REPO_OWNER="$USERNAME"

                    if [ -n "$ORGS" ]; then
                        # Build options array for choose menu
                        OPTIONS=("Personal account: $USERNAME")

                        while IFS= read -r org; do
                            if [ -n "$org" ]; then
                                OPTIONS+=("Organization: $org")
                            fi
                        done <<< "$ORGS"

                        # Use choose function (gum or bash select)
                        SELECTED=$(choose "Select where to create the repository:" "${OPTIONS[@]}")

                        if [[ "$SELECTED" == "Personal account:"* ]]; then
                            REPO_OWNER="$USERNAME"
                            print_success "Selected: Personal account ($USERNAME)"
                        else
                            # Extract org name from "Organization: orgname" format
                            REPO_OWNER=$(echo "$SELECTED" | sed 's/^Organization: //')
                            print_success "Selected: Organization ($REPO_OWNER)"
                        fi
                    else
                        print_success "Will create repository in personal account: $USERNAME"
                    fi

                    echo ""
                fi

                # Create GitHub repository
                print_info "Creating GitHub repository..."
                if gh repo create "${REPO_OWNER}/${PROJECT_NAME_LOWER}" --${REPO_VISIBILITY} --source=. --remote=origin --description="${APP_DESCRIPTION}"; then
                    print_success "GitHub repository created"

                    # Set GitHub secrets first (before any deployments)
                    print_info "Setting GitHub secrets..."
                    gh secret set CLOUDFLARE_API_TOKEN --body "${CF_API_TOKEN}" 2>/dev/null
                    gh secret set CLOUDFLARE_ACCOUNT_ID --body "${ACCOUNT_ID}" 2>/dev/null
                    gh secret set BETTER_AUTH_SECRET_STAGING --body "${AUTH_SECRET_STAGING}" 2>/dev/null
                    gh secret set BETTER_AUTH_SECRET_PRODUCTION --body "${AUTH_SECRET_PRODUCTION}" 2>/dev/null
                    gh secret set POSTMARK_API_KEY --body "${POSTMARK_KEY}" 2>/dev/null
                    gh secret set EMAIL_FROM --body "${EMAIL_FROM}" 2>/dev/null
                    gh secret set R2_ACCESS_KEY_ID_STAGING --body "${R2_ACCESS_KEY_STAGING}" 2>/dev/null
                    gh secret set R2_SECRET_ACCESS_KEY_STAGING --body "${R2_SECRET_KEY_STAGING}" 2>/dev/null
                    gh secret set R2_ACCESS_KEY_ID_PRODUCTION --body "${R2_ACCESS_KEY}" 2>/dev/null
                    gh secret set R2_SECRET_ACCESS_KEY_PRODUCTION --body "${R2_SECRET_KEY}" 2>/dev/null
                    gh secret set REPLICATE_API_KEY --body "${REPLICATE_KEY}" 2>/dev/null
                    gh secret set OPENROUTER_API_KEY --body "${OPENROUTER_KEY}" 2>/dev/null
                    print_success "All GitHub secrets configured"

                    echo ""

                    # Push main branch
                    print_info "Pushing main branch to GitHub..."
                    git push -u origin main -q
                    print_success "Main branch pushed"

                    echo ""

                    # Ask about pushing to staging
                    if confirm "Push to staging branch now? (This will trigger deployment to ${STAGING_DOMAIN})"; then
                        print_info "Pushing staging branch..."
                        git push -u origin stage -q
                        print_success "Staging branch pushed - deployment will start automatically"
                    else
                        print_info "Skipped staging push. You can deploy later with:"
                        echo "  git push -u origin stage"
                    fi

                    echo ""

                    # Ask about pushing to production
                    if confirm "Push to production branch now? (This will trigger deployment to ${PROD_DOMAIN})"; then
                        print_info "Pushing production branch..."
                        git push -u origin prod -q
                        print_success "Production branch pushed - deployment will start automatically"
                    else
                        print_info "Skipped production push. You can deploy later with:"
                        echo "  git push -u origin prod"
                    fi

                    echo ""

                    GITHUB_SETUP_COMPLETE=true
                    REPO_URL=$(gh repo view --json url -q .url)

                    echo ""
                    print_success "✨ GitHub setup complete!"
                    echo ""
                    echo -e "Repository: ${BLUE}${REPO_URL}${NC}"
                    echo ""
                else
                    print_error "Failed to create GitHub repository"
                    print_info "You can create it manually and set secrets from .github-secrets-setup.txt"
                fi
            else
                print_info "Skipping automatic GitHub setup"
                print_info "You'll need to create a GitHub repository manually"
            fi
        else
            print_warning "GitHub CLI is installed but not authenticated"
            print_info "Run: gh auth login"
            print_info "Then you can use the commands in .github-secrets-setup.txt"
        fi
    else
        print_info "GitHub CLI (gh) not found"
        print_info "To enable automatic GitHub setup, install it:"
        echo "  • macOS: brew install gh"
        echo "  • Linux: See https://github.com/cli/cli#installation"
        echo "  • Windows: winget install GitHub.cli"
        echo ""
        print_info "For manual setup, follow the instructions below"
    fi

    echo ""
    sleep 1

    # Manual instructions if automatic setup wasn't completed
    if [ "$GITHUB_SETUP_COMPLETE" != true ]; then
        print_header "📋 Manual GitHub Setup Instructions"

        echo "To deploy your project, you need to:"
        echo ""
        echo -e "${YELLOW}1. Create a new GitHub repository${NC}"
        echo "   • Go to: https://github.com/new"
        echo "   • Name: ${PROJECT_NAME_LOWER}"
        echo "   • Owner: Choose your personal account or an organization"
        echo "   • Visibility: Private (recommended)"
        echo "   • Do NOT initialize with README, .gitignore, or license"
        echo ""

        echo -e "${YELLOW}2. Push your code to GitHub${NC}"
        echo -e "   ${BLUE}git remote add origin git@github.com:YOUR_USERNAME_OR_ORG/${PROJECT_NAME_LOWER}.git${NC}"
        echo -e "   ${BLUE}git push -u origin main${NC}"
        echo -e "   ${BLUE}git push -u origin stage${NC}  # Optional: triggers staging deployment"
        echo -e "   ${BLUE}git push -u origin prod${NC}   # Optional: triggers production deployment"
        echo ""

        echo -e "${YELLOW}3. Add GitHub secrets${NC}"
        echo "   All secrets are in: .github-secrets-setup.txt"
        echo ""
        echo "   Option A - Using GitHub CLI:"
        echo "     • Open .github-secrets-setup.txt"
        echo "     • Copy/paste the 'gh secret set' commands"
        echo ""
        echo "   Option B - Manual via GitHub UI:"
        echo "     • Go to: Settings → Secrets and variables → Actions"
        echo "     • Add each secret from .github-secrets-setup.txt"
        echo ""

        print_warning "⚠️  Secrets are required for deployments to work!"
        echo ""
    fi
fi

echo ""
sleep 1

# =============================================================================
# COMPLETION
# =============================================================================

print_header "✅ Setup Complete!"

echo -e "${GREEN}Your project is fully configured and ready to use!${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}What we just set up:${NC}"
echo ""
echo -e "  ${GREEN}✓${NC} Project: ${BLUE}$PROJECT_NAME${NC}"
echo -e "  ${GREEN}✓${NC} Cloudflare D1 databases (production + staging)"
echo -e "  ${GREEN}✓${NC} R2 object storage buckets (production + staging)"
echo -e "  ${GREEN}✓${NC} Custom CDN domain configured: ${BLUE}$CDN_DOMAIN${NC}"
echo -e "  ${GREEN}✓${NC} Image transformations enabled"
echo -e "  ${GREEN}✓${NC} R2 API tokens created (production + staging)"
echo -e "  ${GREEN}✓${NC} Better Auth configured (magic link authentication)"
echo -e "  ${GREEN}✓${NC} Postmark email integration"
echo -e "  ${GREEN}✓${NC} Replicate AI image generation"
echo -e "  ${GREEN}✓${NC} Local environment files (.dev.vars, .env.local)"
echo -e "  ${GREEN}✓${NC} Dependencies installed (R2, Replicate, Better Auth)"
echo -e "  ${GREEN}✓${NC} Local database initialized with migrations"
echo -e "  ${GREEN}✓${NC} GitHub secrets helper: ${BLUE}.github-secrets-setup.txt${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

print_header "🚀 Ready to Start Developing!"

echo "Your local environment is ready. Run:"
echo ""
echo -e "  ${BLUE}pnpm dev${NC}"
echo ""
echo -e "This will start your Next.js app at ${BLUE}http://localhost:3000${NC}"
echo ""
echo "Features available locally:"
echo "  • Magic link authentication (emails logged to console in dev mode)"
echo "  • File uploads to R2 storage"
echo "  • AI image generation with Replicate"
echo "  • Full database access with Drizzle ORM"
echo ""

print_header "📋 Next Steps for Deployment"

echo -e "${YELLOW}1. Test locally first:${NC}"
echo -e "   ${BLUE}pnpm dev${NC}                    # Start dev server"
echo -e "   ${BLUE}pnpm db:studio${NC}              # View local database"
echo ""

echo -e "${YELLOW}2. Push to GitHub:${NC}"
echo -e "   ${BLUE}git add .${NC}"
echo -e "   ${BLUE}git commit -m \"Initial setup\"${NC}"
echo -e "   ${BLUE}git push origin main${NC}"
echo ""
echo -e "   ${BLUE}git push origin main:stage${NC}  # Create stage branch"
echo -e "   ${BLUE}git push origin main:prod${NC}   # Create prod branch"
echo ""

echo -e "${YELLOW}3. Add GitHub secrets (required for CI/CD):${NC}"
echo ""
echo -e "   ${GREEN}Option A - Automatic (with GitHub CLI):${NC}"
echo -e "   • Open ${BLUE}.github-secrets-setup.txt${NC}"
echo -e "   • Copy/paste the gh secret commands to your terminal"
echo ""
echo -e "   ${GREEN}Option B - Manual:${NC}"
echo -e "   • Go to your repo → Settings → Secrets and variables → Actions"
echo -e "   • Add these 12 secrets from ${BLUE}.github-secrets-setup.txt${NC}:"
echo "     - CLOUDFLARE_API_TOKEN (your main Cloudflare API token)"
echo "     - CLOUDFLARE_ACCOUNT_ID"
echo "     - BETTER_AUTH_SECRET_STAGING"
echo "     - BETTER_AUTH_SECRET_PRODUCTION"
echo "     - POSTMARK_API_KEY"
echo "     - EMAIL_FROM"
echo "     - R2_ACCESS_KEY_ID_STAGING"
echo "     - R2_SECRET_ACCESS_KEY_STAGING"
echo "     - R2_ACCESS_KEY_ID_PRODUCTION"
echo "     - R2_SECRET_ACCESS_KEY_PRODUCTION"
echo "     - REPLICATE_API_KEY"
echo "     - OPENROUTER_API_KEY"
echo ""

echo -e "${YELLOW}4. Configure custom domains (in Cloudflare Dashboard):${NC}"
echo "   • Go to Workers & Pages → Select your worker"
echo "   • Settings → Domains & Routes → Add Custom Domain"
echo "   • Add these domains:"
echo -e "     - ${BLUE}$PROD_DOMAIN${NC} (production worker)"
echo -e "     - ${BLUE}$STAGING_DOMAIN${NC} (staging worker)"
echo -e "   • CDN domain ${BLUE}$CDN_DOMAIN${NC} is already connected to R2 ✓"
echo ""

echo -e "${YELLOW}5. Deploy to staging:${NC}"
echo -e "   ${BLUE}git checkout stage${NC}"
echo -e "   ${BLUE}git merge main${NC}"
echo -e "   ${BLUE}git push${NC}                    # Triggers auto-deploy to $STAGING_DOMAIN"
echo ""
echo -e "   ${GREEN}What happens automatically:${NC}"
echo "   • Database migrations applied to staging D1"
echo "   • App built with OpenNext.js"
echo "   • Deployed to Cloudflare Workers"
echo "   • Available at: https://$STAGING_DOMAIN"
echo ""

echo -e "${YELLOW}6. Deploy to production (after testing staging):${NC}"
echo -e "   ${BLUE}git checkout prod${NC}"
echo -e "   ${BLUE}git merge stage${NC}             # Always merge from stage, not main!"
echo -e "   ${BLUE}git push${NC}                    # Triggers auto-deploy to $PROD_DOMAIN"
echo ""
echo -e "   ${GREEN}What happens automatically:${NC}"
echo "   • Database migrations applied to production D1"
echo "   • App built with OpenNext.js"
echo "   • Deployed to Cloudflare Workers"
echo "   • Available at: https://$PROD_DOMAIN"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}Typical development workflow:${NC}"
echo ""
echo -e "  1. Work on ${BLUE}main${NC} branch locally"
echo -e "  2. Test with ${BLUE}pnpm dev${NC}"
echo -e "  3. Commit and push to ${BLUE}main${NC}"
echo -e "  4. Merge to ${BLUE}stage${NC} → Auto-deploys to staging"
echo "  5. Test on staging: https://$STAGING_DOMAIN"
echo -e "  6. Merge to ${BLUE}prod${NC} → Auto-deploys to production"
echo "  7. Live at: https://$PROD_DOMAIN"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# =============================================================================
# CLEANUP BACKUP FILES
# =============================================================================

echo ""
print_info "Backup files were created during setup:"
echo "  - wrangler.jsonc.backup"
echo "  - package.json.backup"
echo "  - scripts/db-studio.sh.backup"
if [ -f ".github/workflows/deploy.yml.backup" ]; then
    echo "  - .github/workflows/deploy.yml.backup"
fi
echo ""

if confirm "Delete backup files now?"; then
    rm -f wrangler.jsonc.backup package.json.backup scripts/db-studio.sh.backup .github/workflows/deploy.yml.backup
    print_success "Backup files deleted"
else
    print_info "Backup files kept. You can:"
    echo "  - Review changes: diff wrangler.jsonc wrangler.jsonc.backup"
    echo "  - Delete later: rm *.backup scripts/*.backup .github/workflows/*.backup"
fi

echo ""
print_success "Happy building! 🚀"
echo ""
