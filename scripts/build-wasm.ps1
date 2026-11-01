# PowerShell build script for wasm-drawing-engine using Docker
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$engineDir = Join-Path $repoRoot "wasm-drawing-engine"
$targetDir = Join-Path $repoRoot "frontend/src/features/wire-drawing-calculator/wasm/pkg"

Write-Host "=== TMS: Building wasm-drawing-engine via Docker ===" -ForegroundColor Cyan

# Check if tms-wasm-builder image exists, otherwise build it
$imageCheck = docker images -q tms-wasm-builder:latest
if (-not $imageCheck) {
    Write-Host "Building tms-wasm-builder Docker image..." -ForegroundColor Yellow
    docker build -t tms-wasm-builder $engineDir
}

# Compile wasm inside container
Write-Host "Compiling Rust crate to WebAssembly..." -ForegroundColor Yellow
docker run --rm -v "${engineDir}:/workspace" tms-wasm-builder wasm-pack build --target web --out-dir /workspace/pkg

# Ensure destination directory exists
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
}

# Copy compiled artifacts to frontend
Write-Host "Copying compiled Wasm assets to frontend..." -ForegroundColor Yellow
Copy-Item -Path (Join-Path $engineDir "pkg/*") -Destination $targetDir -Recurse -Force
if (Test-Path (Join-Path $targetDir ".gitignore")) {
    Remove-Item -Force (Join-Path $targetDir ".gitignore")
}

Write-Host "=== Wasm build complete! Output placed in $targetDir ===" -ForegroundColor Green
