$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$sessionPath = Join-Path $root ".cloudflared\\session.json"

if (-not (Test-Path $sessionPath)) {
  Write-Host "No tracked tunnel session found."
  exit 0
}

$session = Get-Content $sessionPath -Raw | ConvertFrom-Json
$pids = @(
  $session.apiTunnelPid,
  $session.webServerPid,
  $session.webTunnelPid,
  $session.apiServerPid
) | Where-Object { $_ }

foreach ($processId in $pids) {
  $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
  if ($process) {
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped PID $processId"
  }
}

Remove-Item $sessionPath -Force -ErrorAction SilentlyContinue
Write-Host "Tunnel session cleared."
