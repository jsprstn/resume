# Enhanced link checker with site-specific handling
# Requires -Version 5.1

$ProgressPreference = 'SilentlyContinue'

# Configure TLS
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}  # Accept all certificates

function Get-WebContent {
    param (
        [string]$Url
    )
    
    $webClient = New-Object System.Net.WebClient
    
    # Different User-Agent strings for different sites
    $browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    $mobileUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1"
    
    # Site-specific configurations
    switch -Wildcard ($Url) {
        "*canada.ca*" {
            $webClient.Headers.Add("User-Agent", $mobileUA)
            $webClient.Headers.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
            $webClient.Headers.Add("Accept-Language", "en-US,en;q=0.9")
            $webClient.Headers.Add("Accept-Encoding", "gzip, deflate, br")
        }
        "*nahannisteel.com*" {
            $webClient.Headers.Add("User-Agent", $browserUA)
            $webClient.Headers.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
            $webClient.Headers.Add("Accept-Language", "en-US,en;q=0.9")
            $webClient.Headers.Add("Cache-Control", "no-cache")
            $webClient.Headers.Add("Pragma", "no-cache")
        }
        default {
            $webClient.Headers.Add("User-Agent", $browserUA)
            $webClient.Headers.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
        }
    }
    
    try {
        $content = $webClient.DownloadString($Url)
        return @{
            Success = $true
            Content = $content
            Length = $content.Length
            StatusCode = 200
        }
    }
    catch [System.Net.WebException] {
        $statusCode = [int]$_.Exception.Response.StatusCode
        return @{
            Success = $false
            Content = $null
            Length = 0
            StatusCode = $statusCode
            Error = $_.Exception.Message
        }
    }
    catch {
        return @{
            Success = $false
            Content = $null
            Length = 0
            StatusCode = 0
            Error = $_.Exception.Message
        }
    }
    finally {
        $webClient.Dispose()
    }
}

# URLs to check
$urls = @(
    "https://magellan.aero/press-release/magellan-aerospace-signs-agreement-with-bae-systems-for-f-35-aircraft-assemblies-2/",
    "https://magellan.aero/press-release/magellan-aerospace-and-general-electric-aviation-canada-sign-memorandum-of-understanding-for-f414-engine-sustainment-in-support-of-boeing-super-hornet-bid-for-canada-future-fighter-competition/",
    "https://www.asc-csa.gc.ca/eng/satellites/radarsat2/what-is-radarsat2.asp",
    "https://en.wikipedia.org/wiki/Black_Brant_(rocket)",
    "https://en.wikipedia.org/wiki/Wire_strike_protection_system",
    "https://www.canada.ca/en/department-national-defence/maple-leaf/rcaf/migration/2018/new-training-system-at-402-squadron-re-vamps-airborne-electronic-sensor-operator-courses.html",
    "https://appliedtechnology.humber.ca/programs/electromechanical-engineering-technology-automation-and-robotics-profile.html",
    "https://catalog.umanitoba.ca/undergraduate-studies/arts/economics/economics-ba-double-honours/",
    "https://www.nahannisteel.com/"
)

foreach ($url in $urls) {
    Write-Host "`nChecking $url" -ForegroundColor Cyan
    
    $result = Get-WebContent -Url $url
    
    if ($result.Success) {
        Write-Host "Status: OK (HTTP 200)" -ForegroundColor Green
        Write-Host "Content Length: $($result.Length) bytes" -ForegroundColor Yellow
    }
    else {
        Write-Host "Status: Failed - $($result.StatusCode)" -ForegroundColor Red
        Write-Host "Error: $($result.Error)" -ForegroundColor Red
    }
    
    # Small delay between requests
    Start-Sleep -Milliseconds 300
}