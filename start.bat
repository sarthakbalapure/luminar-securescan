@echo off
setlocal
set "PROJECT_ROOT=%~dp0"

cd /d "%PROJECT_ROOT%"

where corepack >nul 2>nul
if errorlevel 1 (
  echo Node.js Corepack was not found. Install Node.js 20 or later, then try again.
  exit /b 1
)

echo Starting PostgreSQL, Redis, and ZAP...
docker compose up -d
if errorlevel 1 (
  echo Docker services could not start. Open Docker Desktop and try again.
  exit /b 1
)

echo Applying database migrations...
call corepack pnpm --filter @luminar-iq/api exec prisma migrate deploy
if errorlevel 1 (
  echo Database migration failed. Check apps\api\.env and Docker service status.
  exit /b 1
)

if /I "%~1"=="--seed" (
  echo Seeding demo data...
  call corepack pnpm --filter @luminar-iq/api prisma:seed
  if errorlevel 1 (
    echo Demo data seed failed. Check the database configuration.
    exit /b 1
  )
)

netstat -ano | findstr ":4010" | findstr "LISTENING" >nul
if errorlevel 1 (
  start "LuminarIQ API" cmd /k "cd /d ""%PROJECT_ROOT%"" && corepack pnpm dev:api"
) else (
  echo API is already running on http://127.0.0.1:4010
)

netstat -ano | findstr ":3700" | findstr "LISTENING" >nul
if errorlevel 1 (
  start "LuminarIQ Web" cmd /k "cd /d ""%PROJECT_ROOT%"" && corepack pnpm dev:web"
) else (
  echo Website is already running on http://127.0.0.1:3700
)

start "LuminarIQ Scanner Worker" cmd /k "cd /d ""%PROJECT_ROOT%"" && corepack pnpm dev:worker"

echo.
echo LuminarIQ SecureScan is starting.
echo Open http://127.0.0.1:3700 in your browser.
echo.
echo Demo user:  vishal@example.com / User@123
echo Demo admin: admin@luminarsecure.com / Admin@123
echo.
echo Close the API, Web, and Worker windows to stop the application.
endlocal
