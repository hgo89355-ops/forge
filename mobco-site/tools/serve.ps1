# Tiny static web server for Windows (no installs needed): used by "Start Website (Windows).bat".
param([int]$Port = 8080)
$root = Split-Path -Parent $PSScriptRoot
$types = @{ '.html'='text/html; charset=utf-8'; '.css'='text/css'; '.js'='text/javascript'; '.mjs'='text/javascript';
  '.json'='application/json'; '.svg'='image/svg+xml'; '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg';
  '.webp'='image/webp'; '.woff2'='font/woff2'; '.ico'='image/x-icon'; '.txt'='text/plain'; '.xml'='application/xml';
  '.webmanifest'='application/manifest+json' }
$listener = New-Object System.Net.HttpListener
while ($true) { try { $listener.Prefixes.Clear(); $listener.Prefixes.Add("http://localhost:$Port/"); $listener.Start(); break } catch { $Port++ ; $listener = New-Object System.Net.HttpListener } }
$url = "http://localhost:$Port/index.html"
Write-Host "MOBCO website -> $url"
Write-Host "Keep this window open while browsing. Close it to stop."
Start-Process $url
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
  if ($path -eq '' -or $path.EndsWith('/')) { $path += 'index.html' }
  $file = Join-Path $root $path
  $full = [System.IO.Path]::GetFullPath($file)
  if ($full.StartsWith($root) -and (Test-Path $full -PathType Leaf)) {
    $ext = [System.IO.Path]::GetExtension($full).ToLower()
    $ctx.Response.ContentType = $(if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' })
    $bytes = [System.IO.File]::ReadAllBytes($full)
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $ctx.Response.StatusCode = 404
    $nf = Join-Path $root '404.html'
    if (Test-Path $nf) { $b = [System.IO.File]::ReadAllBytes($nf); $ctx.Response.ContentType = 'text/html; charset=utf-8'; $ctx.Response.OutputStream.Write($b, 0, $b.Length) }
  }
  $ctx.Response.Close()
}
