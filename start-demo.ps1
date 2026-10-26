# Launches the FastAPI backend (:8000) and the Next.js dashboard (:3100) in two windows.
$root = $PSScriptRoot
$py = Join-Path $root "backend\.venv\Scripts\python.exe"

if (-not (Test-Path $py)) {
    Write-Host "Backend venv missing. Run once:" -ForegroundColor Yellow
    Write-Host "  cd backend; python -m venv .venv; .\.venv\Scripts\python.exe -m pip install -r requirements.txt"
    exit 1
}
if (-not (Test-Path (Join-Path $root "frontend\node_modules"))) {
    Write-Host "Frontend deps missing. Run once:  cd frontend; npm install" -ForegroundColor Yellow
    exit 1
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; & '$py' -m uvicorn app.main:app --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Write-Host "Dashboard: http://localhost:3100   API docs: http://localhost:8000/docs"
