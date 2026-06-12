param(
  [string]$ProjectRef = "",
  [string]$AccessToken = ""
)

$ErrorActionPreference = "Stop"

function Read-ProjectRefFromEnv {
  if (-not (Test-Path ".env")) {
    return ""
  }

  $line = Get-Content ".env" | Where-Object { $_ -match "^\s*VITE_SUPABASE_URL\s*=" } | Select-Object -First 1
  if (-not $line) {
    return ""
  }

  $url = ($line -split "=", 2)[1].Trim().Trim('"').Trim("'")
  if (-not $url) {
    return ""
  }

  return ([Uri]$url).Host.Split(".")[0]
}

if (-not $ProjectRef) {
  $ProjectRef = Read-ProjectRefFromEnv
}

if (-not $ProjectRef) {
  throw "ProjectRef를 확인하지 못했습니다. -ProjectRef 값을 지정하거나 .env의 VITE_SUPABASE_URL을 확인하세요."
}

if ($AccessToken) {
  $env:SUPABASE_ACCESS_TOKEN = $AccessToken
}

function Resolve-SupabaseCommand {
  $supabase = Get-Command supabase -ErrorAction SilentlyContinue
  if ($supabase) {
    return @{
      Command = $supabase.Source
      Args = @()
    }
  }

  $npx = Get-Command npx.cmd -ErrorAction SilentlyContinue
  if (-not $npx) {
    $npx = Get-Command npx -ErrorAction SilentlyContinue
  }
  if ($npx) {
    return @{
      Command = $npx.Source
      Args = @("--yes", "supabase")
    }
  }

  throw "Supabase CLI is missing. Install it globally with npm install -g supabase, or make sure npx is available."
}

$supabaseCli = Resolve-SupabaseCommand

function Invoke-Supabase {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
  )

  & $supabaseCli.Command @($supabaseCli.Args) @Arguments
}

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Invoke-Supabase projects list --output json *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase CLI is not logged in. Run supabase login --token <sbp_...> first, or pass -AccessToken."
  }
}

$functions = @(
  "admin-users",
  "admin-delete-user",
  "admin-set-password"
)

Write-Host "Deploying admin Edge Functions to project $ProjectRef"
foreach ($functionName in $functions) {
  Write-Host "Deploying $functionName..."
  Invoke-Supabase functions deploy $functionName --project-ref $ProjectRef --use-api
}

Write-Host "Admin Edge Functions deployed successfully."
