$basePath = 'c:\Users\abdul\OneDrive\Desktop\movie-streaming-platform'
$files = @(
  'app\movies\page.tsx',
  'app\provider\[id]\page.tsx',
  'app\watch\[id]\page.tsx',
  'app\verify-email\page.tsx',
  'app\tv\page.tsx',
  'app\movie\[id]\page.tsx',
  'app\tv\[id]\page.tsx',
  'app\watch\tv\[id]\[season]\[episode]\page.tsx',
  'app\search\page.tsx'
)
foreach ($file in $files) {
  $path = Join-Path $basePath $file
  if (Test-Path -LiteralPath $path) {
    $content = Get-Content -LiteralPath $path -Raw
    # Remove import line
    $content = $content -replace '(?m)^import Navbar from [^\r\n]+[\r\n]+', ''
    # Remove <Navbar /> lines (with any leading whitespace)
    $content = $content -replace '(?m)^[ \t]*<Navbar\s*/>\s*[\r\n]+', ''
    Set-Content -LiteralPath $path -Value $content -NoNewline
    Write-Host "Fixed: $file"
  } else {
    Write-Host "NOT FOUND: $file"
  }
}
