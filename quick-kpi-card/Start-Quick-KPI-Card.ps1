$ErrorActionPreference = 'Stop'
$port = 8765
$previewUrl = "http://localhost:${port}/configure.html?preview"

# Serve only the files the extension needs, on this computer's loopback interfaces.
$extensionFiles = @{
    '/'                             = 'index.html'
    '/index.html'                   = 'index.html'
    '/configure.html'               = 'configure.html'
    '/styles.css'                   = 'styles.css'
    '/card.js'                      = 'card.js'
    '/configure.js'                 = 'configure.js'
    '/model.js'                     = 'model.js'
    '/vendor/tableau.extensions.js' = 'vendor/tableau.extensions.js'
}
$mimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
}

function Send-ExtensionResponse {
    param([System.Net.Sockets.TcpClient] $Client)
    $stream = $Client.GetStream()
    $reader = New-Object System.IO.StreamReader -ArgumentList $stream
    try {
        $request = $reader.ReadLine()
        if ($request -notmatch '^(GET|HEAD) (/[^\s]*) HTTP/1\.[01]$') { return }

        $sendBody = $Matches[1] -eq 'GET'
        $route = ($Matches[2] -split '\?', 2)[0]
        $requestHost = $null
        do {
            $line = $reader.ReadLine()
            if ($line -match '^Host:\s*(.+)$') { $requestHost = $Matches[1].Trim() }
        } while ($line)

        if ($requestHost -notin @("localhost:$port", "127.0.0.1:$port", "[::1]:$port")) { return }

        if ($extensionFiles.ContainsKey($route)) {
            $path = Join-Path $PSScriptRoot $extensionFiles[$route]
            $body = [System.IO.File]::ReadAllBytes($path)
            $contentType = $mimeTypes[[System.IO.Path]::GetExtension($path)]
            $status = '200 OK'
        } else {
            $body = [System.Text.Encoding]::UTF8.GetBytes('File not found.')
            $contentType = 'text/plain; charset=utf-8'
            $status = '404 Not Found'
        }

        $header = "HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
        $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
        $stream.Write($headerBytes, 0, $headerBytes.Length)
        if ($sendBody) { $stream.Write($body, 0, $body.Length) }
    } finally {
        $reader.Dispose()
    }
}

$listeners = @()
try {
    foreach ($relativePath in $extensionFiles.Values) {
        if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot $relativePath) -PathType Leaf)) {
            throw "Missing $relativePath. Extract the whole ZIP before running this launcher."
        }
    }

    $ipv4 = New-Object System.Net.Sockets.TcpListener -ArgumentList ([System.Net.IPAddress]::Loopback), $port
    $ipv4.Start()
    $listeners += $ipv4
    if ([System.Net.Sockets.Socket]::OSSupportsIPv6) {
        $ipv6 = New-Object System.Net.Sockets.TcpListener -ArgumentList ([System.Net.IPAddress]::IPv6Loopback), $port
        $ipv6.Start()
        $listeners += $ipv6
    }

    Write-Host "Quick KPI Card is running on http://localhost:$port."
    Write-Host 'Keep this window open while using the extension in Tableau Desktop.'
    Write-Host "Preview: $previewUrl"
    try { Start-Process $previewUrl } catch { Write-Host 'Open the preview link in your browser.' }

    while ($true) {
        foreach ($listener in $listeners) {
            if (-not $listener.Pending()) { continue }
            $client = $listener.AcceptTcpClient()
            try {
                $client.ReceiveTimeout = 2500
                $client.SendTimeout = 2500
                Send-ExtensionResponse -Client $client
            } catch {
                Write-Verbose $_.Exception.Message
            } finally {
                $client.Close()
            }
        }
        Start-Sleep -Milliseconds 20
    }
} catch {
    Write-Host "`nQuick KPI Card could not start: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "If port $port is already in use, close the earlier local server and try again."
    exit 1
} finally {
    foreach ($listener in $listeners) { $listener.Stop() }
}
