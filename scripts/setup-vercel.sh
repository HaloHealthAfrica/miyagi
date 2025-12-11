#!/bin/bash

# Setup script for Vercel project initialization
# Run this once to set up the Vercel project and configure environment variables

set -e

echo "🔧 Setting up Vercel project..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Login to Vercel (if not already logged in)
echo "Logging in to Vercel..."
vercel login

# Link project
echo "Linking project to Vercel..."
vercel link

# Pull environment variables template
echo "Pulling environment variables..."
vercel env pull .env.local

echo ""
echo "✅ Vercel project setup complete!"
echo ""
echo "Next steps:"
echo "1. Review .env.local and add any missing environment variables"
echo "2. Add environment variables to Vercel dashboard:"
echo "   - Go to your project settings → Environment Variables"
echo "   - Add all required variables (see .env.example)"
echo "3. Run: npm run deploy (or use the deploy script)"
echo ""

