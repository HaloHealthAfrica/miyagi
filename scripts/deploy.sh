#!/bin/bash

# Deployment script for Miyagi Trading Platform
# This script automates: Git push, Vercel deployment, and database migrations

set -e  # Exit on error

echo "🚀 Starting deployment workflow..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if we're in a git repository
if [ ! -d .git ]; then
    echo -e "${YELLOW}⚠️  Not a git repository. Initializing...${NC}"
    git init
    git branch -M main
fi

# Step 2: Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Uncommitted changes detected.${NC}"
    read -p "Do you want to commit all changes? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        read -p "Enter commit message: " commit_msg
        git commit -m "${commit_msg:-Deploy to production}"
    else
        echo -e "${YELLOW}⚠️  Skipping commit. Make sure to commit changes before deploying.${NC}"
    fi
fi

# Step 3: Push to GitHub
echo -e "${BLUE}📤 Pushing to GitHub...${NC}"
if git remote | grep -q "^origin$"; then
    git push origin main || git push origin master
    echo -e "${GREEN}✅ Pushed to GitHub${NC}"
else
    echo -e "${YELLOW}⚠️  No 'origin' remote found.${NC}"
    read -p "Enter GitHub repository URL: " repo_url
    git remote add origin "$repo_url"
    git push -u origin main || git push -u origin master
    echo -e "${GREEN}✅ Pushed to GitHub${NC}"
fi

# Step 4: Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
fi

# Step 5: Link to Vercel project (if not already linked)
if [ ! -f .vercel/project.json ]; then
    echo -e "${BLUE}🔗 Linking to Vercel project...${NC}"
    vercel link
fi

# Step 6: Pull environment variables
echo -e "${BLUE}📥 Pulling environment variables from Vercel...${NC}"
vercel env pull .env.local

# Step 7: Run database migrations
if [ -f .env.local ]; then
    echo -e "${BLUE}🗄️  Running database migrations...${NC}"
    export $(cat .env.local | grep -v '^#' | xargs)
    
    # Generate Prisma client
    npx prisma generate
    
    # Deploy migrations
    npx prisma migrate deploy || npx prisma db push
    
    # Initialize database
    echo -e "${BLUE}🔧 Initializing database...${NC}"
    npx tsx scripts/init-db.ts || echo "Database already initialized or init script failed"
    
    echo -e "${GREEN}✅ Database migrations completed${NC}"
else
    echo -e "${YELLOW}⚠️  .env.local not found. Skipping database migrations.${NC}"
fi

# Step 8: Deploy to Vercel
echo -e "${BLUE}🚀 Deploying to Vercel...${NC}"
vercel --prod

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}🌐 Your app should be live at: https://your-project.vercel.app${NC}"

