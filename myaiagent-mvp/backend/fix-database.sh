#!/bin/bash

# Database Migration Fix Script
# This script runs all pending database migrations to fix table creation errors
# Run this on the production server where PostgreSQL is installed

set -e  # Exit on any error

echo "============================================================"
echo "🔧 Database Migration Fix Script"
echo "============================================================"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo "   Set it with: export DATABASE_URL=postgresql://user:password@host/database"
    exit 1
fi

echo "📍 Target Database: $DATABASE_URL"
echo ""

# Check if PostgreSQL client is installed
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql (PostgreSQL client) is not installed"
    echo "   Install it with: apt-get install postgresql-client"
    exit 1
fi

# Verify database connection
echo "🔍 Testing database connection..."
if ! psql "$DATABASE_URL" -c "\q" 2>/dev/null; then
    echo "❌ Error: Cannot connect to database"
    echo "   Check your DATABASE_URL and ensure PostgreSQL is running"
    exit 1
fi
echo "✅ Database connection successful"
echo ""

# Create migrations directory if it doesn't exist
MIGRATIONS_DIR="./migrations"
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo "❌ Error: migrations directory not found at $MIGRATIONS_DIR"
    echo "   Please run this script from the backend directory"
    exit 1
fi

echo "📋 Found migration files:"
ls -1 "$MIGRATIONS_DIR"/*.sql | sort | while read file; do
    echo "   - $(basename "$file")"
done
echo ""

# Count migration files
MIGRATION_COUNT=$(find "$MIGRATIONS_DIR" -name "*.sql" -type f | wc -l)
echo "📊 Total migrations to run: $MIGRATION_COUNT"
echo ""

echo "⏳ Running migrations..."
echo ""

SUCCESSFUL=0
FAILED=0

# Execute each migration file
for file in $(find "$MIGRATIONS_DIR" -name "*.sql" -type f | sort); do
    filename=$(basename "$file")
    echo -n "⏳ Running: $filename ... "
    
    if psql "$DATABASE_URL" -f "$file" > /dev/null 2>&1; then
        echo "✅"
        ((SUCCESSFUL++))
    else
        # Some errors are expected (like "relation already exists")
        # Only consider critical errors as failures
        if psql "$DATABASE_URL" -f "$file" 2>&1 | grep -q "ERROR.*does not exist"; then
            echo "❌"
            ((FAILED++))
        else
            echo "⏭️  (skipped - already exists)"
        fi
    fi
done

echo ""
echo "============================================================"
echo "📊 Migration Summary:"
echo "   ✅ Successful: $SUCCESSFUL"
echo "   ❌ Failed: $FAILED"
echo "   📋 Total: $MIGRATION_COUNT"
echo "============================================================"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 All migrations completed successfully!"
    echo ""
    echo "✅ Database is now ready. Restart your backend with:"
    echo "   pm2 restart myaiagent-backend"
    echo ""
    exit 0
else
    echo "⚠️  Some migrations failed. Check the errors above."
    echo ""
    echo "💡 Common issues:"
    echo "   - Foreign key constraint errors: Tables may not exist in correct order"
    echo "   - Type mismatch errors: Run migrations in numerical order"
    echo "   - Connection errors: Check DATABASE_URL and PostgreSQL availability"
    echo ""
    exit 1
fi
