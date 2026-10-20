[CmdletBinding()]
param(
    [switch]$Initialize,
    [switch]$Watch
)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$gitDirectory = (Join-Path $repo '.git')
$statePath = Join-Path $gitDirectory 'auto-git-sync-state.json'
$logPath = Join-Path $gitDirectory 'auto-git-sync.log'
$expectedRemote = 'https://github.com/sarthakbalapure/luminar-securescan.git'

function Write-Log([string]$Message) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $Message"
    Add-Content -LiteralPath $logPath -Value $line
    Write-Output $line
}

function Invoke-Git([string[]]$Arguments, [switch]$AllowFailure) {
    $output = & git -C $repo @Arguments 2>&1
    if (-not $AllowFailure -and $LASTEXITCODE -ne 0) {
        throw "git $($Arguments -join ' ') failed: $($output -join [Environment]::NewLine)"
    }
    return ,$output
}

function Get-State {
    if (-not (Test-Path -LiteralPath $statePath)) { return $null }
    return (Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json)
}

function Save-State([string]$Commit) {
    @{ commit = $Commit; updatedAt = (Get-Date).ToUniversalTime().ToString('o') } |
        ConvertTo-Json |
        Set-Content -LiteralPath $statePath -Encoding UTF8
}

function Test-SyncablePath([string]$FullPath) {
    if ([string]::IsNullOrWhiteSpace($FullPath)) { return $false }
    $relative = [IO.Path]::GetRelativePath($repo, $FullPath).Replace('\', '/')
    if ($relative -eq '.' -or $relative.StartsWith('../')) { return $false }
    if ($relative -match '(^|/)(\.git|node_modules|\.pnpm-store|\.next|dist|coverage|test-results|playwright-report|tmp)(/|$)') { return $false }
    if ($relative -match '(^|/)\.env($|\.)' -and -not $relative.EndsWith('.env.example')) { return $false }
    if ($relative -match '(?i)(\.pem|\.key|id_rsa|credentials)(\.|$)') { return $false }

    # Respect the repository's existing ignore rules for new and generated files.
    & git -C $repo check-ignore -q -- $relative 2>$null
    if ($LASTEXITCODE -eq 0 -and (Test-Path -LiteralPath $FullPath)) { return $false }
    return $true
}

function New-AutoCommit([string[]]$Paths, [string]$Parent, [string]$Message) {
    $indexPath = Join-Path $gitDirectory ("auto-git-sync-index-$PID-$([guid]::NewGuid().ToString('N'))")
    try {
        $env:GIT_INDEX_FILE = $indexPath
        Invoke-Git @('read-tree', $Parent) | Out-Null
        foreach ($path in $Paths) {
            Invoke-Git @('add', '-A', '--', $path) | Out-Null
        }
        Invoke-Git @('diff', '--cached', '--quiet') -AllowFailure | Out-Null
        if ($LASTEXITCODE -eq 0) { return $null }
        $tree = (Invoke-Git @('write-tree') | Select-Object -Last 1).Trim()
        $commit = (Invoke-Git @('-c', 'user.name=Luminar Auto Sync', '-c', 'user.email=auto-sync@local.invalid', 'commit-tree', $tree, '-p', $Parent, '-m', $Message) | Select-Object -Last 1).Trim()
        return $commit
    }
    finally {
        Remove-Item Env:GIT_INDEX_FILE -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $indexPath -Force -ErrorAction SilentlyContinue
    }
}

function Push-Commit([string]$Commit) {
    Invoke-Git @('push', 'origin', "$Commit`:refs/heads/main") | Out-Null
}

function Initialize-Sync {
    $origin = (Invoke-Git @('remote', 'get-url', 'origin') | Select-Object -Last 1).Trim()
    if ($origin -ne $expectedRemote) { throw "origin is '$origin', not '$expectedRemote'." }

    $state = Get-State
    if ($null -ne $state) { Write-Log "Already initialized at $($state.commit)."; return }

    $remoteMain = Invoke-Git @('ls-remote', '--heads', 'origin', 'main')
    if ($remoteMain.Count -gt 0) {
        throw 'Remote main already has commits. Initialization stopped to avoid replacing it.'
    }

    $parent = (Invoke-Git @('rev-parse', 'HEAD') | Select-Object -Last 1).Trim()
    $commit = New-AutoCommit -Paths @('.tools/auto-git-sync.ps1') -Parent $parent -Message 'chore: enable automatic GitHub sync'
    if ($null -eq $commit) { $commit = $parent }
    Push-Commit $commit
    Save-State $commit
    Write-Log "Initialized remote main at $commit. Existing uncommitted changes were intentionally left local."
}

function Sync-Paths([System.Collections.Generic.HashSet[string]]$Paths) {
    $state = Get-State
    if ($null -eq $state) { throw 'Sync is not initialized.' }
    $relativePaths = @($Paths | Sort-Object)
    if ($relativePaths.Count -eq 0) { return }
    $commit = New-AutoCommit -Paths $relativePaths -Parent $state.commit -Message "chore: automatic sync ($($relativePaths.Count) file(s))"
    if ($null -eq $commit) { return }
    Push-Commit $commit
    Save-State $commit
    Write-Log "Pushed $commit ($($relativePaths.Count) changed file(s))."
}

if ($Initialize) { Initialize-Sync }
if (-not $Watch) { return }

if ($null -eq (Get-State)) { Initialize-Sync }
Write-Log 'Watcher started.'
$watcher = [IO.FileSystemWatcher]::new($repo, '*')
$watcher.IncludeSubdirectories = $true
$watcher.NotifyFilter = [IO.NotifyFilters]'FileName, DirectoryName, LastWrite, Size'
$watcher.EnableRaisingEvents = $true
foreach ($eventName in 'Changed', 'Created', 'Deleted', 'Renamed') {
    Register-ObjectEvent -InputObject $watcher -EventName $eventName -SourceIdentifier "auto-git-sync-$eventName" | Out-Null
}

$pending = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$lastChange = [DateTime]::MinValue
while ($true) {
    $event = Wait-Event -Timeout 2
    if ($null -ne $event) {
        $args = $event.SourceEventArgs
        foreach ($candidate in @($args.FullPath, $args.OldFullPath)) {
            if (Test-SyncablePath $candidate) {
                [void]$pending.Add(([IO.Path]::GetRelativePath($repo, $candidate).Replace('\', '/')))
                $lastChange = Get-Date
            }
        }
        Remove-Event -EventIdentifier $event.EventIdentifier
    }
    if ($pending.Count -gt 0 -and ((Get-Date) - $lastChange).TotalSeconds -ge 8) {
        try { Sync-Paths $pending }
        catch { Write-Log "Sync failed: $($_.Exception.Message)" }
        $pending.Clear()
    }
}
