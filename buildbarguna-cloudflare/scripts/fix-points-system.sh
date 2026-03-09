#!/bin/bash

# Quick Fix Script for Points System
# This script creates the missing triggers that award points when tasks are completed

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================${NC}"
echo -e "${BLUE}BuildBarguna Points System Fix${NC}"
echo -e "${BLUE}==================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "wrangler.toml" ]; then
    echo -e "${RED}Error: wrangler.toml not found${NC}"
    echo "Please run this script from the buildbarguna-cloudflare directory"
    exit 1
fi

echo -e "${YELLOW}This script will fix the points system by creating missing database triggers.${NC}"
echo -e "${YELLOW}The issue: Migration 010 recreated all tables but didn't include the triggers.${NC}"
echo ""

# Function to get D1 database ID
get_database_id() {
    wrangler d1 list --format json 2>/dev/null | jq -r '.[] | select(.name | contains("buildbarguna")) | .uuid' | head -1
}

# Function to check if trigger exists
check_trigger() {
    local DB_ID=$1
    local TRIGGER_NAME=$2
    
    local RESULT=$(wrangler d1 execute "$DB_ID" --command "SELECT name FROM sqlite_master WHERE type='trigger' AND name='$TRIGGER_NAME';" --json 2>/dev/null)
    local COUNT=$(echo "$RESULT" | jq -r '.[].name' | wc -l)
    
    if [ "$COUNT" -gt 0 ]; then
        return 0  # exists
    else
        return 1  # doesn't exist
    fi
}

# Get database ID
echo -e "${YELLOW}Fetching D1 database information...${NC}"
DB_ID=$(get_database_id)

if [ -z "$DB_ID" ]; then
    echo -e "${RED}Error: Could not find D1 database${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Found database: $DB_ID${NC}"
echo ""

# Check current trigger status
echo -e "${YELLOW}Checking current trigger status...${NC}"

TRIGGER_EXISTS=false
if check_trigger "$DB_ID" "update_user_points_on_transaction"; then
    echo -e "${GREEN}✓ Trigger 'update_user_points_on_transaction' exists${NC}"
    TRIGGER_EXISTS=true
else
    echo -e "${RED}✗ Trigger 'update_user_points_on_transaction' is MISSING${NC}"
fi

RESET_TRIGGER_EXISTS=false
if check_trigger "$DB_ID" "reset_monthly_points"; then
    echo -e "${GREEN}✓ Trigger 'reset_monthly_points' exists${NC}"
    RESET_TRIGGER_EXISTS=true
else
    echo -e "${RED}✗ Trigger 'reset_monthly_points' is MISSING${NC}"
fi

echo ""

# If both triggers exist, ask if user wants to recreate them
if [ "$TRIGGER_EXISTS" = true ] && [ "$RESET_TRIGGER_EXISTS" = true ]; then
    echo -e "${YELLOW}Both triggers already exist. They may be outdated or incorrect.${NC}"
    read -p "Do you want to recreate them? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "Exiting..."
        exit 0
    fi
fi

# Run the migration
echo ""
echo -e "${YELLOW}Running migration 015_add_missing_triggers.sql...${NC}"
echo ""

if [ -f "src/db/migrations/015_add_missing_triggers.sql" ]; then
    wrangler d1 execute "$DB_ID" --remote --file="src/db/migrations/015_add_missing_triggers.sql"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}==================================${NC}"
        echo -e "${GREEN}✓ Migration completed successfully!${NC}"
        echo -e "${GREEN}==================================${NC}"
    else
        echo ""
        echo -e "${RED}✗ Migration failed${NC}"
        exit 1
    fi
else
    echo -e "${RED}Error: Migration file not found: src/db/migrations/015_add_missing_triggers.sql${NC}"
    exit 1
fi

# Verify triggers were created
echo ""
echo -e "${YELLOW}Verifying triggers...${NC}"
sleep 2  # Give it a moment to propagate

if check_trigger "$DB_ID" "update_user_points_on_transaction"; then
    echo -e "${GREEN}✓ Trigger 'update_user_points_on_transaction' created successfully${NC}"
else
    echo -e "${RED}✗ Trigger 'update_user_points_on_transaction' verification failed${NC}"
fi

if check_trigger "$DB_ID" "reset_monthly_points"; then
    echo -e "${GREEN}✓ Trigger 'reset_monthly_points' created successfully${NC}"
else
    echo -e "${RED}✗ Trigger 'reset_monthly_points' verification failed${NC}"
fi

echo ""
echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}Points system fix complete!${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Test task completion from the frontend"
echo "2. Check that points are awarded correctly"
echo "3. Monitor the Worker logs for any errors"
echo ""
echo -e "${YELLOW}To test manually:${NC}"
echo "  wrangler d1 execute \"$DB_ID\" --remote --command \"SELECT name FROM sqlite_master WHERE type='trigger';\""
echo ""
