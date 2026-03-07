#!/bin/bash

# Migration Runner Script for BuildBarguna Cloudflare
# This script helps you run the missing tables migration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}BuildBarguna Migration Runner${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "wrangler.toml" ]; then
    echo -e "${RED}Error: wrangler.toml not found${NC}"
    echo "Please run this script from the buildbarguna-cloudflare directory"
    exit 1
fi

# Function to get D1 database ID
get_database_id() {
    echo -e "${YELLOW}Fetching D1 database information...${NC}"
    wrangler d1 list --format json 2>/dev/null | jq -r '.[] | select(.name | contains("buildbarguna")) | .uuid' | head -1
}

# Function to check current migrations
check_migrations() {
    echo -e "${YELLOW}Checking current migration status...${NC}"
    local DB_ID=$1
    
    if [ -z "$DB_ID" ]; then
        echo -e "${RED}Database ID not found${NC}"
        return 1
    fi
    
    wrangler d1 execute "$DB_ID" --command="SELECT id, name, applied_at FROM _migrations ORDER BY id;" 2>/dev/null || echo "No migrations table found"
}

# Function to run migration
run_migration() {
    local DB_ID=$1
    local MIGRATION_FILE=$2
    
    echo -e "${YELLOW}Running migration: $MIGRATION_FILE${NC}"
    
    if [ ! -f "$MIGRATION_FILE" ]; then
        echo -e "${RED}Migration file not found: $MIGRATION_FILE${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Executing SQL on D1 database...${NC}"
    wrangler d1 execute "$DB_ID" --file="$MIGRATION_FILE"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Migration completed successfully!${NC}"
    else
        echo -e "${RED}✗ Migration failed${NC}"
        exit 1
    fi
}

# Function to verify tables
verify_tables() {
    local DB_ID=$1
    
    echo -e "${YELLOW}Verifying tables...${NC}"
    
    # Check member_registrations
    local MEMBER_COUNT=$(wrangler d1 execute "$DB_ID" --command="SELECT COUNT(*) as count FROM member_registrations;" --json 2>/dev/null | jq -r '.[0].count')
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ member_registrations table exists ($MEMBER_COUNT rows)${NC}"
    else
        echo -e "${RED}✗ member_registrations table not found${NC}"
    fi
    
    # Check user_points
    local POINTS_COUNT=$(wrangler d1 execute "$DB_ID" --command="SELECT COUNT(*) as count FROM user_points;" --json 2>/dev/null | jq -r '.[0].count')
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ user_points table exists ($POINTS_COUNT rows)${NC}"
    else
        echo -e "${RED}✗ user_points table not found${NC}"
    fi
    
    # Check task_completions has points_earned column
    local HAS_POINTS=$(wrangler d1 execute "$DB_ID" --command="PRAGMA table_info(task_completions);" --json 2>/dev/null | jq -r '.[] | select(.name=="points_earned") | .name')
    if [ -n "$HAS_POINTS" ]; then
        echo -e "${GREEN}✓ task_completions.points_earned column exists${NC}"
    else
        echo -e "${RED}✗ task_completions.points_earned column not found${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}Verification complete!${NC}"
}

# Main menu
echo "Select an option:"
echo "1. Check current migration status"
echo "2. Run migration 009 (missing tables fix)"
echo "3. Verify tables after migration"
echo "4. Exit"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        DB_ID=$(get_database_id)
        if [ -n "$DB_ID" ]; then
            echo -e "${GREEN}Database ID: $DB_ID${NC}"
            check_migrations "$DB_ID"
        else
            echo -e "${RED}Could not find database ID${NC}"
        fi
        ;;
    2)
        DB_ID=$(get_database_id)
        if [ -n "$DB_ID" ]; then
            echo -e "${GREEN}Database ID: $DB_ID${NC}"
            echo ""
            echo -e "${YELLOW}This will run migration 009_missing_tables_fix.sql${NC}"
            read -p "Are you sure? (y/N): " confirm
            if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                run_migration "$DB_ID" "src/db/migrations/009_missing_tables_fix.sql"
            else
                echo "Cancelled"
            fi
        else
            echo -e "${RED}Could not find database ID${NC}"
        fi
        ;;
    3)
        DB_ID=$(get_database_id)
        if [ -n "$DB_ID" ]; then
            verify_tables "$DB_ID"
        else
            echo -e "${RED}Could not find database ID${NC}"
        fi
        ;;
    4)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Done!${NC}"
