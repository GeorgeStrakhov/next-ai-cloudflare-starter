#!/bin/bash
set -e

# Database studio launcher script
# Usage: ./scripts/db-studio.sh [staging|production]

ENV=$1

if [ -z "$ENV" ]; then
  echo "Error: Environment not specified"
  echo "Usage: ./scripts/db-studio.sh [staging|production]"
  exit 1
fi

# Create snapshots directory if it doesn't exist
mkdir -p .db-snapshots

if [ "$ENV" = "staging" ]; then
  DB_NAME="my-app-db-staging"
  CONFIG="drizzle.config.staging.ts"
  SNAPSHOT_FILE=".db-snapshots/staging.db"
elif [ "$ENV" = "production" ]; then
  DB_NAME="my-app-db-prod"
  CONFIG="drizzle.config.production.ts"
  SNAPSHOT_FILE=".db-snapshots/production.db"
else
  echo "Error: Invalid environment '$ENV'"
  echo "Valid options: staging, production"
  exit 1
fi

echo "📥 Fetching $ENV database snapshot from Cloudflare..."
echo ""

# Export the database to SQL
npx wrangler d1 export "$DB_NAME" --remote --output=".db-snapshots/$ENV.sql"

# Convert SQL to SQLite database
echo ""
echo "💾 Creating local SQLite file..."
rm -f "$SNAPSHOT_FILE"
sqlite3 "$SNAPSHOT_FILE" < ".db-snapshots/$ENV.sql"

echo ""
echo "✅ Database snapshot ready!"
echo "🚀 Opening Drizzle Studio..."
echo ""

# Open Drizzle Studio
npx drizzle-kit studio --config="$CONFIG"
