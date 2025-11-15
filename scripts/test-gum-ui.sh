#!/bin/bash
set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source UI library
source "$SCRIPT_DIR/ui-lib.sh"

# =============================================================================
# TEST DIFFERENT UI ELEMENTS
# =============================================================================

print_header "🎨 Testing Gum UI Components"

if [ "$HAS_GUM" = true ]; then
    print_success "Gum is installed! Using enhanced UI"
else
    print_warning "Gum not installed. Using fallback UI"
    echo ""
    print_info "Install gum for better experience: brew install gum"
fi

echo ""
sleep 1

# Test 1: Input
print_header "📝 Test 1: Text Input"
prompt "Enter your project name" "my-awesome-project" PROJECT_NAME
print_success "You entered: $PROJECT_NAME"
echo ""
sleep 1

# Test 2: Confirm
print_header "❓ Test 2: Confirmation"
if confirm "Do you want to continue?"; then
    print_success "You confirmed!"
else
    print_warning "You declined"
fi
echo ""
sleep 1

# Test 3: Choose
print_header "📋 Test 3: Selection Menu"
SELECTED=$(choose "Select your favorite color:" "Red" "Green" "Blue" "Yellow" "Purple")
print_success "You selected: $SELECTED"
echo ""
sleep 1

# Test 4: Organization Selection (like in setup script)
print_header "🐙 Test 4: GitHub Org Selection"

USERNAME="TestUser"
ORGS="org-one
org-two
org-three"

OPTIONS=("Personal account: $USERNAME")
while IFS= read -r org; do
    if [ -n "$org" ]; then
        OPTIONS+=("Organization: $org")
    fi
done <<< "$ORGS"

SELECTED=$(choose "Select where to create repository:" "${OPTIONS[@]}")

if [[ "$SELECTED" == "Personal account:"* ]]; then
    REPO_OWNER="$USERNAME"
else
    REPO_OWNER=$(echo "$SELECTED" | sed 's/^Organization: //')
fi

print_success "Repository will be created in: $REPO_OWNER"
echo ""

print_header "✅ Test Complete"
echo ""
if [ "$HAS_GUM" = true ]; then
    gum style --foreground 212 --bold "All UI components working with gum!"
else
    echo -e "${GREEN}All UI components working with fallback!${NC}"
fi
echo ""
