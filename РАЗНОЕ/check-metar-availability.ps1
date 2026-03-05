# METAR/TAF availability checker for metartaf.ru
# PowerShell script

$ErrorActionPreference = 'Continue'

$airportsFile = ".\airports.json"
$backupSuffix = (Get-Date -Format "yyyy-MM-dd_HH-mm-ss")

Write-Host "Loading airports list..." -ForegroundColor Cyan

try {
    $airportsData = Get-Content $airportsFile -Raw | ConvertFrom-Json
} catch {
    Write-Host "Error reading file: $_" -ForegroundColor Red
    exit 1
}

$airports = $airportsData.airports
Write-Host "Total airports: $($airports.Count)" -ForegroundColor Cyan
Write-Host "Source: metartaf.ru`n" -ForegroundColor Cyan

$validAirports = @()
$removedAirports = @()

# Create HTTP client
$client = New-Object System.Net.Http.HttpClient
$client.Timeout = New-Object System.TimeSpan(0, 0, 15)
$client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
$client.DefaultRequestHeaders.Add("Accept", "application/json")

for ($i = 0; $i -lt $airports.Count; $i++) {
    $airport = $airports[$i]
    $icao = $airport.icao
    $name = if ($airport.name) { $airport.name } else { $airport.city }
    
    Write-Host -NoNewline "[$($i + 1)/$($airports.Count)] $icao ($name)... "
    
    $hasMetar = $false
    try {
        $url = "http://metartaf.ru/$icao.json"
        $response = $client.GetAsync($url).Result
        
        if ($response.IsSuccessStatusCode) {
            $content = $response.Content.ReadAsStringAsync().Result
            $jsonData = $content | ConvertFrom-Json
            
            if ($jsonData.metar -and $jsonData.metar.Length -gt 0) {
                $hasMetar = $true
            }
            if ($jsonData.taf -and $jsonData.taf.Length -gt 0) {
                $hasMetar = $true
            }
        }
    } catch {
        # Request error - ignore
    }
    
    if ($hasMetar) {
        Write-Host "OK" -ForegroundColor Green
        $validAirports += $airport
    } else {
        Write-Host "NO" -ForegroundColor Red
        $removedAirports += $airport
    }
    
    # Small delay
    Start-Sleep -Milliseconds 300
}

$client.Dispose()

Write-Host "`n" + ("=" * 50) -ForegroundColor Cyan
Write-Host "Checked: $($airports.Count)" -ForegroundColor White
Write-Host "Has METAR/TAF: $($validAirports.Count)" -ForegroundColor Green
Write-Host "No METAR/TAF: $($removedAirports.Count)" -ForegroundColor Red

if ($removedAirports.Count -gt 0) {
    Write-Host "`nAirports without METAR/TAF (will be removed):" -ForegroundColor Yellow
    $removedAirports | ForEach-Object {
        $n = if ($_.name) { $_.name } else { $_.city }
        Write-Host "  - $($_.icao) ($n)" -ForegroundColor Gray
    }
    
    # Save backup
    $backupFile = $airportsFile -replace '\.json$', ".backup.$backupSuffix.json"
    $airportsData | ConvertTo-Json -Depth 10 | Out-File -FilePath $backupFile -Encoding utf8
    Write-Host "`nBackup saved: $backupFile" -ForegroundColor Cyan
    
    # Update file
    $airportsData.airports = $validAirports
    $airportsData | ConvertTo-Json -Depth 10 | Out-File -FilePath $airportsFile -Encoding utf8
    Write-Host "Updated file: $airportsFile" -ForegroundColor Green
} else {
    Write-Host "`nAll airports have METAR/TAF!" -ForegroundColor Green
}
