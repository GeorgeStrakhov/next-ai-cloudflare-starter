#!/bin/bash
# UI Library for Setup Scripts
# Provides consistent UI components with optional gum enhancement
# Usage: source scripts/ui-lib.sh

# Colors for fallback output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Detect if gum is available
HAS_GUM=false
if command -v gum &> /dev/null; then
    HAS_GUM=true
fi

# =============================================================================
# UI COMPONENT FUNCTIONS
# =============================================================================

print_header() {
    if [ "$HAS_GUM" = true ]; then
        echo ""
        gum style --border double --border-foreground 212 --padding "0 2" --width 70 "$1"
        echo ""
    else
        echo ""
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}  $1${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
    fi
}

print_success() {
    if [ "$HAS_GUM" = true ]; then
        gum style --foreground 212 "✓ $1"
    else
        echo -e "${GREEN}✓${NC} $1"
    fi
}

print_error() {
    if [ "$HAS_GUM" = true ]; then
        gum style --foreground 196 "✗ $1"
    else
        echo -e "${RED}✗${NC} $1"
    fi
}

print_warning() {
    if [ "$HAS_GUM" = true ]; then
        gum style --foreground 214 "⚠  $1"
    else
        echo -e "${YELLOW}⚠${NC}  $1"
    fi
}

print_info() {
    if [ "$HAS_GUM" = true ]; then
        gum style --foreground 117 "ℹ  $1"
    else
        echo -e "${BLUE}ℹ${NC}  $1"
    fi
}

prompt() {
    local prompt_text="$1"
    local default_value="$2"
    local result_var="$3"

    if [ "$HAS_GUM" = true ]; then
        local result
        if [ -n "$default_value" ]; then
            result=$(gum input --placeholder "$prompt_text" --value "$default_value" --width 60)
        else
            result=$(gum input --placeholder "$prompt_text" --width 60)
        fi
        printf -v "$result_var" '%s' "$result"
    else
        if [ -n "$default_value" ]; then
            echo -en "${YELLOW}?${NC} $prompt_text ${BLUE}[$default_value]${NC}: "
        else
            echo -en "${YELLOW}?${NC} $prompt_text: "
        fi

        read user_input

        if [ -z "$user_input" ] && [ -n "$default_value" ]; then
            printf -v "$result_var" '%s' "$default_value"
        else
            printf -v "$result_var" '%s' "$user_input"
        fi
    fi
}

confirm() {
    local prompt_text="$1"

    if [ "$HAS_GUM" = true ]; then
        gum confirm "$prompt_text"
    else
        echo -en "${YELLOW}?${NC} $prompt_text ${BLUE}[y/N]${NC}: "
        read -r response
        [[ "$response" =~ ^[Yy]$ ]]
    fi
}

choose() {
    local prompt_text="$1"
    shift
    local options=("$@")

    if [ "$HAS_GUM" = true ]; then
        gum choose --header "$prompt_text" --header.foreground 117 "${options[@]}"
    else
        echo ""
        echo -e "${BLUE}ℹ${NC}  $prompt_text"
        echo ""

        PS3="${YELLOW}?${NC} Enter selection number: "
        select opt in "${options[@]}"; do
            if [ -n "$opt" ]; then
                echo "$opt"
                break
            else
                print_error "Invalid selection. Please try again."
            fi
        done
    fi
}

# Spinner for long operations (gum only, silent fallback)
spin() {
    local title="$1"
    shift
    local command="$@"

    if [ "$HAS_GUM" = true ]; then
        gum spin --spinner dot --title "$title" -- bash -c "$command"
    else
        # Fallback: just run the command without spinner
        eval "$command"
    fi
}
