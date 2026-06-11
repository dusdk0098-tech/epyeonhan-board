Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
  $PSNativeCommandUseErrorActionPreference = $false
}

function Invoke-RequiredCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
  )

  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $Command $($Arguments -join ' ')"
  }
}

function Get-PackageName {
  $name = (& node -p "require('./package.json').name" 2>$null)
  if ($LASTEXITCODE -eq 0 -and $name) {
    return ($name.Trim() -replace '[^a-zA-Z0-9._-]', '-').ToLowerInvariant()
  }

  $fallback = Split-Path -Leaf (Get-Location)
  return ($fallback -replace '[^a-zA-Z0-9._-]', '-').ToLowerInvariant()
}

Write-Host 'Checking GitHub CLI authentication...'
& gh auth status
if ($LASTEXITCODE -ne 0) {
  Write-Error 'gh 인증이 필요합니다. 먼저 `gh auth login --scopes repo,workflow`를 실행하세요.'
  exit 1
}

$repoName = Get-PackageName
if (-not $repoName) {
  $repoName = 'epyeonhan-board'
}

$gitRepoExitCode = 0
try {
  & git rev-parse --show-toplevel 2>$null | Out-Null
  $gitRepoExitCode = $LASTEXITCODE
} catch {
  $gitRepoExitCode = 1
}
if ($gitRepoExitCode -ne 0) {
  Write-Host 'Git repository not found. Running git init...'
  Invoke-RequiredCommand git init
}

$origin = ''
$originExitCode = 0
try {
  $origin = (& git remote get-url origin 2>$null)
  $originExitCode = $LASTEXITCODE
} catch {
  $origin = ''
  $originExitCode = 1
}
if ($originExitCode -ne 0 -or -not $origin) {
  Write-Host "Creating public GitHub repository: $repoName"
  Invoke-RequiredCommand gh repo create $repoName --public --source . --remote origin --description 'PEDIT Windows updater distribution'
} else {
  Write-Host "Using existing origin: $origin"
}

$repoJson = (& gh repo view --json name,owner,isPrivate,nameWithOwner)
if ($LASTEXITCODE -ne 0 -or -not $repoJson) {
  throw 'GitHub repository metadata could not be loaded.'
}

$repo = $repoJson | ConvertFrom-Json
if ($repo.isPrivate) {
  throw '현재 자동 업데이트 구성은 public GitHub Releases + Pages 기준입니다. 저장소를 public으로 변경하거나 별도 public 업데이트 저장소를 사용하세요.'
}

$owner = $repo.owner.login
$remoteRepoName = $repo.name
$nameWithOwner = $repo.nameWithOwner

Write-Host "Configuring GitHub Pages for $nameWithOwner..."
$pagesExistsExitCode = 0
try {
  & gh api "repos/$nameWithOwner/pages" 2>$null | Out-Null
  $pagesExistsExitCode = $LASTEXITCODE
} catch {
  $pagesExistsExitCode = 1
}
if ($pagesExistsExitCode -eq 0) {
  $pagesUpdateExitCode = 0
  try {
    & gh api -X PUT "repos/$nameWithOwner/pages" -f build_type=workflow 2>$null | Out-Null
    $pagesUpdateExitCode = $LASTEXITCODE
  } catch {
    $pagesUpdateExitCode = 1
  }
  if ($pagesUpdateExitCode -ne 0) {
    Write-Warning 'Pages build_type=workflow 업데이트에 실패했습니다. 저장소 Settings > Pages에서 GitHub Actions 배포를 선택하세요.'
  }
} else {
  $pagesCreateExitCode = 0
  try {
    & gh api -X POST "repos/$nameWithOwner/pages" -f build_type=workflow 2>$null | Out-Null
    $pagesCreateExitCode = $LASTEXITCODE
  } catch {
    $pagesCreateExitCode = 1
  }
  if ($pagesCreateExitCode -ne 0) {
    Write-Warning 'Pages 생성에 실패했습니다. 저장소 Settings > Pages에서 GitHub Actions 배포를 선택하세요.'
  }
}

$configPath = Join-Path (Get-Location) 'src/shared/updateConfig.ts'
$config = @"
export const UPDATE_OWNER = '$owner';
export const UPDATE_REPO = '$remoteRepoName';
export const UPDATE_BASE_URL = 'https://$owner.github.io/$remoteRepoName/updates/win/';

export const UPDATE_ALLOWED_DOWNLOAD_HOSTS = ['github.com'];
"@
Set-Content -LiteralPath $configPath -Value $config -Encoding UTF8

$baseUrl = "https://$owner.github.io/$remoteRepoName/updates/win/"
Write-Host ''
Write-Host 'Update infrastructure is ready.'
Write-Host "Repository: $nameWithOwner"
Write-Host "UPDATE_BASE_URL=$baseUrl"
Write-Host ''
Write-Host 'Next step: commit these files, push to GitHub, then run the Release Windows workflow or push a vX.Y.Z tag.'
