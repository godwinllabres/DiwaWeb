param(
  [int]$ApiPort = 8010,
  [int]$WebPort = 5173,
  [string]$BindHost = "127.0.0.1",
  [string]$ApiRoot = ""
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
if (-not $ApiRoot) {
  $ApiRoot = Join-Path (Split-Path -Parent $root) "SeviAI"
}

$runtimeDir = Join-Path $root ".cloudflared"
$sessionPath = Join-Path $runtimeDir "session.json"
$apiTunnelLog = Join-Path $runtimeDir "api-tunnel.log"
$webTunnelLog = Join-Path $runtimeDir "web-tunnel.log"
$apiServerOutLog = Join-Path $runtimeDir "api-server.out.log"
$apiServerErrLog = Join-Path $runtimeDir "api-server.err.log"
$webServerOutLog = Join-Path $runtimeDir "web-server.out.log"
$webServerErrLog = Join-Path $runtimeDir "web-server.err.log"

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

function Stop-TrackedProcesses {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    return
  }

  try {
    $session = Get-Content $Path -Raw | ConvertFrom-Json
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
      }
    }
  } finally {
    Remove-Item $Path -Force -ErrorAction SilentlyContinue
  }
}

function Wait-ForHttp {
  param(
    [string]$Url,
    [System.Diagnostics.Process]$Process = $null,
    [int]$TimeoutSec = 60,
    [int]$RequestTimeoutSec = 15
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    if ($Process) {
      $Process.Refresh()
      if ($Process.HasExited) {
        throw "Process $($Process.Id) exited before $Url became ready."
      }
    }

    try {
      Invoke-WebRequest -UseBasicParsing $Url -TimeoutSec $RequestTimeoutSec | Out-Null
      return
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }

  throw "Timed out waiting for $Url"
}

function Wait-ForPort {
  param(
    [int]$Port,
    [System.Diagnostics.Process]$Process,
    [int]$TimeoutSec = 60
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    if ($Process) {
      $Process.Refresh()
      if ($Process.HasExited) {
        throw "Process $($Process.Id) exited before port $Port became ready."
      }
    }

    $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    if ($listener) {
      return
    }

    Start-Sleep -Milliseconds 500
  }

  throw "Timed out waiting for port $Port"
}

function Wait-ForTunnelUrl {
  param(
    [string]$LogPath,
    [int]$TimeoutSec = 90
  )

  $pattern = "https://[-a-z0-9]+\.trycloudflare\.com"
  $deadline = (Get-Date).AddSeconds($TimeoutSec)

  while ((Get-Date) -lt $deadline) {
    if (Test-Path $LogPath) {
      $content = Get-Content $LogPath -Raw -ErrorAction SilentlyContinue
      if ($content -match $pattern) {
        return $Matches[0]
      }
    }

    Start-Sleep -Milliseconds 500
  }

  throw "Timed out waiting for a trycloudflare URL in $LogPath"
}

function Wait-ForPublicHttp {
  param(
    [string]$Url,
    [System.Diagnostics.Process]$Process,
    [int]$TimeoutSec = 60
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    if ($Process) {
      $Process.Refresh()
      if ($Process.HasExited) {
        throw "Tunnel process $($Process.Id) exited before $Url became reachable."
      }
    }

    try {
      Invoke-WebRequest -UseBasicParsing $Url -TimeoutSec 15 | Out-Null
      return
    } catch {
      Start-Sleep -Milliseconds 1000
    }
  }

  throw "Timed out waiting for $Url to become reachable."
}

function Stop-ProcessesMatching {
  param([string[]]$Needles)

  $processes = Get-CimInstance Win32_Process | Where-Object {
    $commandLine = $_.CommandLine
    if (-not $commandLine) {
      return $false
    }

    foreach ($needle in $Needles) {
      if ($needle -and $commandLine.Contains($needle)) {
        return $true
      }
    }

    return $false
  }

  foreach ($process in $processes) {
    Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
  }
}

function Resolve-PythonLauncher {
  $python = Get-Command python -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($python) {
    return [pscustomobject]@{
      FilePath = $python.Source
      Prefix = @()
    }
  }

  $py = Get-Command py -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($py) {
    return [pscustomobject]@{
      FilePath = $py.Source
      Prefix = @("-3")
    }
  }

  throw "Could not find python or py on PATH. Start the API manually or install Python."
}

function Get-ProcessDescription {
  param([int]$ProcessId)

  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
  if (-not $process) {
    return "PID $ProcessId"
  }

  if ($process.CommandLine) {
    return "$($process.Name) (PID $ProcessId): $($process.CommandLine)"
  }

  return "$($process.Name) (PID $ProcessId)"
}

function Ensure-ApiServer {
  param(
    [string]$HealthUrl,
    [string]$ApiRoot,
    [string]$ListenHost,
    [int]$Port,
    [string]$OutLog,
    [string]$ErrLog
  )

  try {
    Wait-ForHttp -Url $HealthUrl -TimeoutSec 2 -RequestTimeoutSec 2
    return $null
  } catch {
    # Continue and try to start the backend if the port is free.
  }

  $existingApiListener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($existingApiListener) {
    $description = Get-ProcessDescription -ProcessId $existingApiListener.OwningProcess
    throw "Port $Port is already in use, but $HealthUrl is not responding. Existing listener: $description"
  }

  if (-not (Test-Path $ApiRoot)) {
    throw "API is not running and ApiRoot '$ApiRoot' was not found. Start the backend manually or pass -ApiRoot."
  }

  $apiEntryPoint = Join-Path $ApiRoot "api\\app.py"
  if (-not (Test-Path $apiEntryPoint)) {
    throw "API is not running and '$apiEntryPoint' was not found. Pass -ApiRoot to the SeviAI project root."
  }

  Remove-Item $OutLog -Force -ErrorAction SilentlyContinue
  Remove-Item $ErrLog -Force -ErrorAction SilentlyContinue

  $python = Resolve-PythonLauncher
  $arguments = @()
  $arguments += $python.Prefix
  $arguments += @("-m", "uvicorn", "api.app:app", "--host", $ListenHost, "--port", "$Port")

  Write-Host "API not detected on $HealthUrl. Starting backend from $ApiRoot..."
  $process = Start-Process `
    -FilePath $python.FilePath `
    -ArgumentList $arguments `
    -WorkingDirectory $ApiRoot `
    -RedirectStandardOutput $OutLog `
    -RedirectStandardError $ErrLog `
    -WindowStyle Hidden `
    -PassThru

  try {
    Wait-ForHttp -Url $HealthUrl -Process $process -TimeoutSec 90
  } catch {
    $stdout = if (Test-Path $OutLog) { Get-Content $OutLog -Raw } else { "" }
    $stderr = if (Test-Path $ErrLog) { Get-Content $ErrLog -Raw } else { "" }
    throw "Failed to start the API automatically from $ApiRoot.`n$($_.Exception.Message)`nAPI server stdout:`n$stdout`nAPI server stderr:`n$stderr"
  }

  return $process
}

function Start-Tunnel {
  param(
    [string]$Name,
    [string]$TargetUrl,
    [string]$LogPath,
    [string]$HttpHostHeader,
    [string]$VerifyPath = "/"
  )

  for ($attempt = 1; $attempt -le 3; $attempt++) {
    Remove-Item $LogPath -Force -ErrorAction SilentlyContinue

    $arguments = @(
      "tunnel",
      "--url", $TargetUrl,
      "--http-host-header", $HttpHostHeader,
      "--protocol", "http2",
      "--no-autoupdate",
      "--loglevel", "info",
      "--logfile", $LogPath
    )

    $process = Start-Process -FilePath "cloudflared" -ArgumentList $arguments -WindowStyle Hidden -PassThru

    try {
      $url = Wait-ForTunnelUrl -LogPath $LogPath
      $verifyUrl = $url.TrimEnd("/") + $VerifyPath
      Wait-ForPublicHttp -Url $verifyUrl -Process $process

      return [pscustomobject]@{
        Name = $Name
        Process = $process
        Url = $url
        LogPath = $LogPath
        TargetUrl = $TargetUrl
      }
    } catch {
      $process.Refresh()
      if (-not $process.HasExited) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
      }

      if ($attempt -eq 3) {
        throw
      }

      Start-Sleep -Seconds 2
    }
  }
}

Stop-TrackedProcesses -Path $sessionPath
Stop-ProcessesMatching -Needles @($apiTunnelLog, $webTunnelLog)

$apiHealthUrl = "http://${BindHost}:${ApiPort}/health"
$apiServer = Ensure-ApiServer `
  -HealthUrl $apiHealthUrl `
  -ApiRoot $ApiRoot `
  -ListenHost $BindHost `
  -Port $ApiPort `
  -OutLog $apiServerOutLog `
  -ErrLog $apiServerErrLog

$apiTunnel = Start-Tunnel `
  -Name "api" `
  -TargetUrl "http://${BindHost}:${ApiPort}" `
  -LogPath $apiTunnelLog `
  -HttpHostHeader "${BindHost}:${ApiPort}" `
  -VerifyPath "/health"

$existingWebListener = Get-NetTCPConnection -State Listen -LocalPort $WebPort -ErrorAction SilentlyContinue
if ($existingWebListener) {
  $existingWebProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($existingWebListener[0].OwningProcess)"
  $commandLine = $existingWebProcess.CommandLine

  if ($commandLine -and ($commandLine.Contains($root) -or ($commandLine.Contains("vite") -and $commandLine.Contains("--port $WebPort")))) {
    Stop-Process -Id $existingWebListener[0].OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
  } else {
    throw "Port $WebPort is already in use. Stop the existing server or run this script with a different -WebPort."
  }
}

Remove-Item $webServerOutLog -Force -ErrorAction SilentlyContinue
Remove-Item $webServerErrLog -Force -ErrorAction SilentlyContinue

$env:VITE_API_URL = $apiTunnel.Url
$webServer = Start-Process `
  -FilePath "npm.cmd" `
  -ArgumentList @("run", "dev", "--", "--host", $BindHost, "--port", "$WebPort", "--strictPort") `
  -WorkingDirectory $root `
  -RedirectStandardOutput $webServerOutLog `
  -RedirectStandardError $webServerErrLog `
  -WindowStyle Hidden `
  -PassThru
Remove-Item Env:VITE_API_URL -ErrorAction SilentlyContinue

try {
  Wait-ForPort -Port $WebPort -Process $webServer
} catch {
  $stdout = if (Test-Path $webServerOutLog) { Get-Content $webServerOutLog -Raw } else { "" }
  $stderr = if (Test-Path $webServerErrLog) { Get-Content $webServerErrLog -Raw } else { "" }
  throw "$($_.Exception.Message)`nWeb server stdout:`n$stdout`nWeb server stderr:`n$stderr"
}

$webTunnel = Start-Tunnel `
  -Name "web" `
  -TargetUrl "http://${BindHost}:${WebPort}" `
  -LogPath $webTunnelLog `
  -HttpHostHeader "${BindHost}:${WebPort}" `
  -VerifyPath "/"

$session = [pscustomobject]@{
  startedAt = (Get-Date).ToString("s")
  apiUrl = $apiTunnel.Url
  webUrl = $webTunnel.Url
  apiTunnelPid = $apiTunnel.Process.Id
  apiServerPid = if ($apiServer) { $apiServer.Id } else { $null }
  webServerPid = $webServer.Id
  webTunnelPid = $webTunnel.Process.Id
  apiPort = $ApiPort
  webPort = $WebPort
  host = $BindHost
  apiRoot = $ApiRoot
  logs = [pscustomobject]@{
    apiTunnel = $apiTunnelLog
    apiServerOut = $apiServerOutLog
    apiServerErr = $apiServerErrLog
    webServerOut = $webServerOutLog
    webServerErr = $webServerErrLog
    webTunnel = $webTunnelLog
  }
}

$session | ConvertTo-Json -Depth 4 | Set-Content -Path $sessionPath

Write-Host ""
Write-Host "API tunnel: $($apiTunnel.Url)"
Write-Host "Web tunnel: $($webTunnel.Url)"
Write-Host ""
if ($apiServer) {
  Write-Host "API server PID: $($apiServer.Id)"
} else {
  Write-Host "API server: already running on port $ApiPort"
}
Write-Host "API tunnel PID: $($apiTunnel.Process.Id)"
Write-Host "Web server PID: $($webServer.Id)"
Write-Host "Web tunnel PID: $($webTunnel.Process.Id)"
Write-Host ""
Write-Host "Logs:"
Write-Host "  $apiTunnelLog"
Write-Host "  $apiServerOutLog"
Write-Host "  $apiServerErrLog"
Write-Host "  $webServerOutLog"
Write-Host "  $webServerErrLog"
Write-Host "  $webTunnelLog"
Write-Host ""
Write-Host "Stop everything with: npm run tunnel:stop"
