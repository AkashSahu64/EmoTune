param(
    [switch]$SkipDeps
)

$ErrorActionPreference = 'Continue'
$root = $PSScriptRoot

function Test-PortOpen([int]$port) {
    try {
        $client = New-Object Net.Sockets.TcpClient
        $client.Connect('127.0.0.1', $port)
        $client.Close()
        return $true
    } catch {
        return $false
    }
}

function Test-DockerEngine {
    $ErrorActionPreference = 'SilentlyContinue'
    docker info 2>&1 | Out-Null
    $ErrorActionPreference = 'Continue'
    return ($LASTEXITCODE -eq 0)
}

function Wait-ForDockerEngine([int]$timeoutSec = 120) {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    while ($sw.Elapsed.TotalSeconds -lt $timeoutSec) {
        if (Test-DockerEngine) { return $true }
        Start-Sleep -Seconds 3
    }
    return $false
}

function Wait-ForPort([int]$port, [int]$timeoutSec = 60) {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    while ($sw.Elapsed.TotalSeconds -lt $timeoutSec) {
        if (Test-PortOpen $port) { return $true }
        Start-Sleep -Seconds 2
    }
    return $false
}

function Wait-ForDockerHealth([int]$timeoutSec = 60) {
    # Wait until Redis container reports healthy
    $sw = [Diagnostics.Stopwatch]::StartNew()
    while ($sw.Elapsed.TotalSeconds -lt $timeoutSec) {
        $status = docker inspect --format '{{.State.Health.Status}}' emotune-redis-1 2>$null
        if ($status -eq 'healthy') { return $true }
        Start-Sleep -Seconds 3
    }
    return $false
}

if ($SkipDeps) {
    Write-Host '[deps] Skipped (--SkipDeps passed).' -ForegroundColor Yellow
    exit 0
}

$redisUp = Test-PortOpen 6379
$mongoUp = Test-PortOpen 27017

if ($redisUp -and $mongoUp) {
    Write-Host '[deps] Redis & MongoDB already running.' -ForegroundColor Green
    exit 0
}

$needsDocker = (-not $redisUp) -or (-not $mongoUp)

if ($needsDocker) {
    $dockerRunning = Test-DockerEngine
    if (-not $dockerRunning) {
        $dockerName = Get-Process 'Docker Desktop' -ErrorAction SilentlyContinue
        if (-not $dockerName) {
            Write-Host '[deps] Starting Docker Desktop...' -ForegroundColor Yellow
            $dd = "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe"
            if (Test-Path $dd) {
                Start-Process $dd
            } else {
                Write-Warning "Docker Desktop not found at $dd"
            }
        }
        Write-Host '[deps] Waiting for Docker engine...' -ForegroundColor Yellow
        if (-not (Wait-ForDockerEngine 120)) {
            Write-Warning '[deps] Docker engine did not become ready in 120s.'
        }
    }

    if (Test-DockerEngine) {
        if (-not $redisUp) {
            Write-Host '[deps] Starting Redis container...' -ForegroundColor Yellow
            docker compose up -d redis
            if ($LASTEXITCODE -ne 0) { Write-Warning '[deps] Failed to start Redis container.' }
        }
        if (-not $mongoUp) {
            Write-Host '[deps] Starting MongoDB container...' -ForegroundColor Yellow
            docker compose up -d mongodb
            if ($LASTEXITCODE -ne 0) { Write-Warning '[deps] Failed to start MongoDB container.' }
        }
    } else {
        Write-Warning '[deps] Docker unavailable. Trying native binaries...'
        if (-not $redisUp) {
            $redisServer = Get-Command redis-server -ErrorAction SilentlyContinue
            if ($redisServer) {
                Write-Host '[deps] Starting native redis-server...' -ForegroundColor Yellow
                Start-Process $redisServer.Source -ArgumentList '--daemonize yes'
            } else {
                Write-Error '[deps] Neither Docker nor redis-server available. Install Redis or start Docker Desktop.'
            }
        }
        if (-not $mongoUp) {
            $mongod = Get-Command mongod -ErrorAction SilentlyContinue
            if ($mongod) {
                Write-Host '[deps] Starting native mongod...' -ForegroundColor Yellow
                Start-Process $mongod.Source --ArgumentList '--dbpath', (Join-Path $env:LOCALAPPDATA 'EmotuneMongo')
            } else {
                Write-Error '[deps] Neither Docker nor mongod available. Install MongoDB or start Docker Desktop.'
            }
        }
    }
}

$redisReady = Wait-ForPort 6379 60
$mongoReady = Wait-ForPort 27017 60
$redisHealthy = $redisReady -or (Test-DockerEngine -and (Wait-ForDockerHealth 60))

if ($redisReady -or $redisHealthy) {
    Write-Host '[deps] Redis is up (localhost:6379).' -ForegroundColor Green
} else {
    Write-Error '[deps] Redis did not come up on 6379. Check Docker logs: docker compose logs redis'
    exit 1
}

if ($mongoReady) {
    Write-Host '[deps] MongoDB is up (localhost:27017).' -ForegroundColor Green
} else {
    Write-Error '[deps] MongoDB did not come up on 27017. Check Docker logs: docker compose logs mongodb'
    exit 1
}

Write-Host '[deps] Dependencies ready.' -ForegroundColor Green