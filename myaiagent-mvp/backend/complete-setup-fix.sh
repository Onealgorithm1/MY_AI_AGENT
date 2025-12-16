#!/bin/bash

set -e

echo "================================"
echo "🔧 Complete Setup and Fix"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Run migrations
echo -e "${YELLOW}Step 1: Running database migrations...${NC}"
node src/scripts/run-migrations.js
echo -e "${GREEN}✅ Migrations completed${NC}"
echo ""

# Step 2: Seed demo user
echo -e "${YELLOW}Step 2: Seeding demo user...${NC}"
node seed-demo-user.js
echo -e "${GREEN}✅ Demo user seeded${NC}"
echo ""

# Step 3: Summary
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✨ Setup completed successfully!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "📝 Next steps:"
echo "  1. The backend server will automatically restart"
echo "  2. Visit: https://werkules.com"
echo "  3. Login with:"
echo "     Email: admin@myaiagent.com"
echo "     Password: admin123"
echo ""
echo "🔍 To check logs: pm2 log myaiagent-backend"
echo "🔄 To restart manually: pm2 restart myaiagent-backend"
