param(
  [string]$KeycloakBaseUrl = "http://localhost:8081",
  [string]$AdminUsername = "admin",
  [string]$AdminPassword = "admin"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$realmPath = Join-Path $PSScriptRoot "..\infra\keycloak\realm-export.json"
$desiredRealm = Get-Content -Raw -Encoding utf8 $realmPath | ConvertFrom-Json
$tokenUrl = "$KeycloakBaseUrl/realms/master/protocol/openid-connect/token"
$deadline = (Get-Date).AddMinutes(2)
$tokenResponse = $null

while (-not $tokenResponse -and (Get-Date) -lt $deadline) {
  try {
    $tokenResponse = Invoke-RestMethod -Method Post -Uri $tokenUrl -ContentType "application/x-www-form-urlencoded" -Body @{
      grant_type = "password"
      client_id = "admin-cli"
      username = $AdminUsername
      password = $AdminPassword
    }
  } catch {
    Start-Sleep -Seconds 2
  }
}

if (-not $tokenResponse) {
  throw "Keycloak did not become ready before the configuration timeout."
}

$headers = @{
  Authorization = "Bearer $($tokenResponse.access_token)"
  "Content-Type" = "application/json"
}
$realmName = $desiredRealm.realm
$realmAdminUrl = "$KeycloakBaseUrl/admin/realms/$realmName"
$realmUpdate = @{
  realm = $realmName
  enabled = $desiredRealm.enabled
  displayName = $desiredRealm.displayName
  registrationAllowed = $desiredRealm.registrationAllowed
  resetPasswordAllowed = $desiredRealm.resetPasswordAllowed
  rememberMe = $desiredRealm.rememberMe
  loginWithEmailAllowed = $desiredRealm.loginWithEmailAllowed
  duplicateEmailsAllowed = $desiredRealm.duplicateEmailsAllowed
  internationalizationEnabled = $desiredRealm.internationalizationEnabled
  supportedLocales = $desiredRealm.supportedLocales
  defaultLocale = $desiredRealm.defaultLocale
  loginTheme = $desiredRealm.loginTheme
}

Invoke-RestMethod -Method Put -Uri $realmAdminUrl -Headers $headers -Body ($realmUpdate | ConvertTo-Json -Depth 10)

foreach ($client in $desiredRealm.clients) {
  $encodedClientId = [Uri]::EscapeDataString($client.clientId)
  $clientResponse = Invoke-RestMethod -Method Get -Uri "$realmAdminUrl/clients?clientId=$encodedClientId" -Headers $headers
  $matches = @($clientResponse | ForEach-Object { $_ })
  if ($matches.Count -eq 0) {
    $clientBody = $client | ConvertTo-Json -Depth 20
    Invoke-RestMethod -Method Post -Uri "$realmAdminUrl/clients" -Headers $headers -Body $clientBody
    Write-Host "Created Keycloak client: $($client.clientId)"
  } else {
    if (-not $client.publicClient -and $client.PSObject.Properties.Name -contains "secret") {
      $client.PSObject.Properties.Remove("secret")
    }
    $clientBody = $client | ConvertTo-Json -Depth 20
    Invoke-RestMethod -Method Put -Uri "$realmAdminUrl/clients/$($matches[0].id)" -Headers $headers -Body $clientBody
    Write-Host "Updated Keycloak client: $($client.clientId)"
  }
}

Write-Host "Configured Keycloak realm '$realmName' with theme '$($desiredRealm.loginTheme)'."
