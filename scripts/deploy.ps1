# Deployment script for Windows PowerShell
# This script automates: Git push, Vercel deployment, and database migrations

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting deployment workflow..." -ForegroundColor Cyan

# Step 1: Check if we're in a git repository
if (-not (Test-Path ".git")) {
    Write-Host "⚠️  Not a git repository. Initializing..." -ForegroundColor Yellow
    git init
    git branch -M main
}

# Step 2: Check for uncommitted changes
$status = git status --porcelain
if ($status) {
    Write-Host "⚠️  Uncommitted changes detected." -ForegroundColor Yellow
    $response = Read-Host "Do you want to commit all changes? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        git add .
        $commitMsg = Read-Host "Enter commit message"
        if (-not $commitMsg) {
            $commitMsg = "Deploy to production"
        }
        git commit -m $commitMsg
    } else {
        Write-Host "⚠️  Skipping commit. Make sure to commit changes before deploying." -ForegroundColor Yellow
    }
}

# Step 3: Push to GitHub
Write-Host "📤 Pushing to GitHub..." -ForegroundColor Blue
$remotes = git remote
if ($remotes -contains "origin") {
    git push origin main
    if ($LASTEXITCODE -ne 0) {
        git push origin master
    }
    Write-Host "✅ Pushed to GitHub" -ForegroundColor Green
} else {
    Write-Host "⚠️  No 'origin' remote found." -ForegroundColor Yellow
    $repoUrl = Read-Host "Enter GitHub repository URL"
    git remote add origin $repoUrl
    git push -u origin main
    if ($LASTEXITCODE -ne 0) {
        git push -u origin master
    }
    Write-Host "✅ Pushed to GitHub" -ForegroundColor Green
}

# Step 4: Check if Vercel CLI is installed
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  Vercel CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g vercel
}

# Step 5: Link to Vercel project (if not already linked)
if (-not (Test-Path ".vercel/project.json")) {
    Write-Host "🔗 Linking to Vercel project..." -ForegroundColor Blue
    vercel link
}

# Step 6: Pull environment variables
Write-Host "📥 Pulling environment variables from Vercel..." -ForegroundColor Blue
vercel env pull .env.local

# Step 7: Run database migrations
if (Test-Path ".env.local") {
    Write-Host "🗄️  Running database migrations..." -ForegroundColor Blue
    & ".\scripts\migrate-db.ps1"
    Write-Host "✅ Database migrations completed" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env.local not found. Skipping database migrations." -ForegroundColor Yellow
}

# Step 8: Deploy to Vercel
Write-Host "🚀 Deploying to Vercel..." -ForegroundColor Blue
vercel --prod

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "🌐 Your app should be live at: https://your-project.vercel.app" -ForegroundColor Green

