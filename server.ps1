[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "=========================================="
Write-Host "  KAMA Investment Local HTTP Proxy Server"
Write-Host "  URL: http://localhost:$port/"
Write-Host "=========================================="

$root = $PSScriptRoot

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $path = $request.Url.LocalPath
        
        # 1. Live Global Search Route: /api/search?q=...
        if ($path -eq "/api/search") {
            $q = $request.QueryString["q"]
            if (-not $q) { $q = "" }
            
            $jsonResult = ""
            $encodedQ = [System.Uri]::EscapeDataString($q)
            $searchUrl = "https://query2.finance.yahoo.com/v1/finance/search?q=" + $encodedQ + "&quotesCount=10&newsCount=0"
            
            try {
                $respObj = Invoke-WebRequest -Uri $searchUrl -Headers @{"User-Agent"="Mozilla/5.0"} -UseBasicParsing -TimeoutSec 4 -ErrorAction Stop
                if ($respObj -and $respObj.Content) {
                    $jsonResult = $respObj.Content
                }
            } catch {
                $jsonResult = '{"quotes":[]}'
            }
            
            $response.ContentType = "application/json; charset=utf-8"
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonResult)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
            continue
        }

        # 2. Stock Daily Candles Route: /api/stock?code=...
        if ($path -eq "/api/stock") {
            $code = $request.QueryString["code"]
            $country = $request.QueryString["country"]
            $market = $request.QueryString["market"]
            
            $jsonResult = ""
            [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

            $symbolsToTry = @()
            if ($market -eq "KOSDAQ") {
                $symbolsToTry += "$code.KQ"
                $symbolsToTry += "$code.KS"
            } elseif ($country -eq "KR" -or ($code -match "^\d{6}$")) {
                $symbolsToTry += "$code.KQ"
                $symbolsToTry += "$code.KS"
            } else {
                $symbolsToTry += "$code"
            }

            foreach ($sym in $symbolsToTry) {
                $u1 = "https://query1.finance.yahoo.com/v8/finance/chart/" + $sym + "?range=5y&interval=1d&includePrePost=true"
                $u2 = "https://query2.finance.yahoo.com/v8/finance/chart/" + $sym + "?range=5y&interval=1d&includePrePost=true"
                $yahooUrls = @($u1, $u2)
                foreach ($yUrl in $yahooUrls) {
                    try {
                        $respObj = Invoke-WebRequest -Uri $yUrl -Headers @{"User-Agent"="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"} -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
                        if ($respObj -and $respObj.Content -and $respObj.Content.Length -gt 200 -and $respObj.Content.Contains('"timestamp"')) {
                            $jsonResult = $respObj.Content
                            break
                        }
                    } catch {
                        $jsonResult = ""
                    }
                }
                if ($jsonResult -and $jsonResult.Length -gt 200) { break }
            }

            if ($jsonResult -and $jsonResult.Length -gt 200) {
                $response.ContentType = "application/json; charset=utf-8"
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonResult)
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 502
            }
            $response.Close()
            continue
        }

        if ($path -eq "/") { $path = "/index.html" }
        
        $filePath = Join-Path $root $path
        
        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            switch ($ext) {
                ".html" { $response.ContentType = "text/html; charset=utf-8" }
                ".css"  { $response.ContentType = "text/css; charset=utf-8" }
                ".js"   { $response.ContentType = "application/javascript; charset=utf-8" }
                ".json" { $response.ContentType = "application/json; charset=utf-8" }
                default { $response.ContentType = "application/octet-stream" }
            }
            
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
        $response.Close()
    } catch {
        # continue listener
    }
}
