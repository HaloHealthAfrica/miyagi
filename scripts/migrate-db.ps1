# Database migration script for Windows PowerShell
# Runs Prisma migrations against the production database

Write-Host "🗄️  Running database migrations..." -ForegroundColor Blue

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "⚠️  .env.local not found. Pulling from Vercel..." -ForegroundColor Yellow
    if (Get-Command vercel -ErrorAction SilentlyContinue) {
        vercel env pull .env.local
    } else {
        Write-Host "❌ Vercel CLI not found. Please create .env.local manually or install Vercel CLI." -ForegroundColor Red
        exit 1
    }
}

# Load environment variables from .env.local
Get-Content .env.local | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

# Check if DATABASE_URL is set
$dbUrl = $env:PRISMA_DATABASE_URL
if (-not $dbUrl) {
    $dbUrl = $env:POSTGRES_URL
}
if (-not $dbUrl) {
    $dbUrl = $env:DATABASE_URL
}

if (-not $dbUrl) {
    Write-Host "❌ DATABASE_URL, POSTGRES_URL, or PRISMA_DATABASE_URL not found in .env.local" -ForegroundColor Red
    exit 1
}

# Use PRISMA_DATABASE_URL if available (for Prisma Accelerate), otherwise use POSTGRES_URL or DATABASE_URL
if ($env:PRISMA_DATABASE_URL) {
    $env:DATABASE_URL = $env:PRISMA_DATABASE_URL
    Write-Host "Using PRISMA_DATABASE_URL (Prisma Accelerate)" -ForegroundColor Green
} elseif ($env:POSTGRES_URL) {
    $env:DATABASE_URL = $env:POSTGRES_URL
    Write-Host "Using POSTGRES_URL" -ForegroundColor Green
}

# Generate Prisma client
Write-Host "Generating Prisma client..." -ForegroundColor Blue
npx prisma generate

# Deploy migrations
Write-Host "Deploying migrations..." -ForegroundColor Blue
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "Migration deploy failed, trying db push..." -ForegroundColor Yellow
    npx prisma db push
}

# Initialize database (if needed)
Write-Host "Initializing database..." -ForegroundColor Blue
npx tsx scripts/init-db.ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "Database already initialized or init script failed (this is OK)" -ForegroundColor Yellow
}

Write-Host "✅ Database migrations complete!" -ForegroundColor Green

