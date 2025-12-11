# Setup script for Vercel project initialization (Windows PowerShell)
# Run this once to set up the Vercel project and configure environment variables

$ErrorActionPreference = "Stop"

Write-Host "🔧 Setting up Vercel project..." -ForegroundColor Cyan

# Check if Vercel CLI is installed
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
}

# Login to Vercel (if not already logged in)
Write-Host "Logging in to Vercel..." -ForegroundColor Blue
vercel login

# Link project
Write-Host "Linking project to Vercel..." -ForegroundColor Blue
vercel link

# Pull environment variables template
Write-Host "Pulling environment variables..." -ForegroundColor Blue
vercel env pull .env.local

Write-Host ""
Write-Host "✅ Vercel project setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Review .env.local and add any missing environment variables"
Write-Host "2. Add environment variables to Vercel dashboard:"
Write-Host "   - Go to your project settings → Environment Variables"
Write-Host "   - Add all required variables (see .env.example)"
Write-Host "3. Run: npm run deploy (or use the deploy script)"
Write-Host ""

