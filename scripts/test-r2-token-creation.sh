#!/bin/bash
set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source UI library
source "$SCRIPT_DIR/ui-lib.sh"

# =============================================================================
# TEST R2 TOKEN CREATION
# =============================================================================

print_header "🧪 R2 Token Creation Test Script"

echo "This script will:"
echo "  1. Ask for your Cloudflare API token"
echo "  2. Get your account ID"
echo "  3. Create a test R2 bucket"
echo "  4. Attempt to create R2 API tokens for that bucket"
echo "  5. Show you the full API responses for debugging"
echo ""

if ! confirm "Ready to proceed?"; then
    echo "Test cancelled."
    exit 0
fi

echo ""

# =============================================================================
# GET CLOUDFLARE API TOKEN
# =============================================================================

print_header "🔑 Cloudflare API Token"

echo "Enter your Cloudflare API token"
echo "It should have permissions for:"
echo "  • Workers Scripts/Routes - Edit"
echo "  • Workers R2 Storage - Edit"
echo "  • User API Tokens - Edit (for creating R2 tokens)"
echo ""

prompt "Cloudflare API Token" "" CF_API_TOKEN

if [ -z "$CF_API_TOKEN" ]; then
    print_error "Cloudflare API Token is required"
    exit 1
fi

echo ""

# =============================================================================
# GET ACCOUNT ID
# =============================================================================

print_header "🆔 Getting Account ID"

print_info "Fetching account ID from Cloudflare..."
ACCOUNT_ID=$(npx wrangler whoami 2>&1 | grep -oE '[a-f0-9]{32}' | head -1)

if [ -z "$ACCOUNT_ID" ]; then
    print_error "Failed to get Cloudflare Account ID"
    print_info "Make sure you're logged in with: npx wrangler login"
    exit 1
fi

print_success "Account ID: $ACCOUNT_ID"

echo ""
sleep 1

# =============================================================================
# CREATE TEST R2 BUCKET
# =============================================================================

print_header "🪣 Creating Test R2 Bucket"

# Generate unique bucket name with timestamp
BUCKET_NAME="test-r2-token-$(date +%s)"
print_info "Creating bucket: $BUCKET_NAME"

if npx wrangler r2 bucket create "$BUCKET_NAME" >/dev/null 2>&1; then
    print_success "Test bucket created: $BUCKET_NAME"
else
    print_error "Failed to create test bucket"
    exit 1
fi

echo ""
sleep 1

# =============================================================================
# ATTEMPT TO CREATE R2 API TOKEN VIA CLOUDFLARE API
# =============================================================================

print_header "🔐 Creating R2 API Token (Automatic Method)"

print_info "Attempting to create R2 API token via Cloudflare API..."
echo ""

# Try to create R2 API token via Cloudflare API
print_info "Making API request..."
R2_TOKEN_RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/user/tokens" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "'"${BUCKET_NAME}"'-token",
    "policies": [{
      "effect": "allow",
      "resources": {
        "com.cloudflare.edge.r2.bucket.'"${ACCOUNT_ID}"'_default_'"${BUCKET_NAME}"'": "*"
      },
      "permission_groups": [{
        "id": "2efd5506f9c8494dacb1fa10a3e7d5b6",
        "name": "Workers R2 Storage Bucket Item Write"
      }]
    }]
  }')

echo ""
print_info "Full API Response:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$R2_TOKEN_RESPONSE" | jq '.' 2>/dev/null || echo "$R2_TOKEN_RESPONSE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Extract token ID and value from response
TOKEN_ID=$(echo "$R2_TOKEN_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
TOKEN_VALUE=$(echo "$R2_TOKEN_RESPONSE" | grep -o '"value":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN_ID" ] && [ -n "$TOKEN_VALUE" ]; then
    print_success "Successfully extracted token from API response"
    echo ""
    echo "Token ID: $TOKEN_ID"
    echo "Token Value: ${TOKEN_VALUE:0:20}..." # Show first 20 chars only
    echo ""

    # Create SHA-256 hash of the token value for the secret key
    R2_SECRET_KEY=$(echo -n "$TOKEN_VALUE" | shasum -a 256 | cut -d' ' -f1)

    print_info "For AWS SDK (R2) usage:"
    echo "  Access Key ID: $TOKEN_ID"
    echo "  Secret Access Key: $R2_SECRET_KEY"
else
    print_error "Failed to extract token from API response"
    print_info "This means automatic token creation is not working"
fi

echo ""
sleep 1

# =============================================================================
# TEST WITH ACTUAL R2 API TOKEN CREATION
# =============================================================================

print_header "🔐 Creating R2 API Token (Wrangler Method)"

print_info "Now testing wrangler's R2 API token creation..."
echo ""

# Check if wrangler has a command for R2 tokens
print_info "Checking wrangler r2 commands..."
WRANGLER_HELP=$(npx wrangler r2 --help 2>&1)

if echo "$WRANGLER_HELP" | grep -q "Create an API token"; then
    print_success "Wrangler supports R2 API token creation"
    echo ""
    print_info "Available commands:"
    echo "$WRANGLER_HELP" | grep -A 2 "token"
else
    print_warning "Wrangler may not support R2 API token creation via CLI"
    print_info "Tokens may need to be created via dashboard"
fi

echo ""
sleep 1

# =============================================================================
# CLEANUP
# =============================================================================

print_header "🧹 Cleanup"

if confirm "Delete test bucket '$BUCKET_NAME'?"; then
    print_info "Deleting test bucket..."
    if npx wrangler r2 bucket delete "$BUCKET_NAME" >/dev/null 2>&1; then
        print_success "Test bucket deleted"
    else
        print_warning "Failed to delete test bucket. You may need to delete it manually:"
        echo "  npx wrangler r2 bucket delete $BUCKET_NAME"
    fi
else
    print_info "Keeping test bucket: $BUCKET_NAME"
    print_warning "Remember to delete it manually later:"
    echo "  npx wrangler r2 bucket delete $BUCKET_NAME"
fi

echo ""

# =============================================================================
# SUMMARY
# =============================================================================

print_header "📋 Test Summary"

echo "Test completed! Here's what we learned:"
echo ""

if [ -n "$TOKEN_ID" ] && [ -n "$TOKEN_VALUE" ]; then
    print_success "✓ Automatic R2 token creation via API works"
    echo ""
    echo "The setup script should be working correctly."
    echo "If you're seeing prompts, check:"
    echo "  1. Your CF_API_TOKEN has 'User API Tokens - Edit' permission"
    echo "  2. The API response is being parsed correctly"
else
    print_warning "✗ Automatic R2 token creation via API failed"
    echo ""
    echo "Possible reasons:"
    echo "  1. Your CF_API_TOKEN lacks 'User API Tokens - Edit' permission"
    echo "  2. The API endpoint or response format changed"
    echo "  3. The bucket resource identifier format is incorrect"
    echo ""
    echo "Recommendation:"
    echo "  • Check the API response above for error messages"
    echo "  • Verify token permissions at: https://dash.cloudflare.com/profile/api-tokens"
    echo "  • Consider creating R2 tokens manually in dashboard"
fi

echo ""
print_success "Test complete! 🎉"
echo ""
