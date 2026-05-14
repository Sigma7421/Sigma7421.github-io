$node = "$env:LOCALAPPDATA\OpenAI\Codex\bin\node.exe"

if (-not (Test-Path $node)) {
  Write-Host "Could not find Codex's bundled Node at:"
  Write-Host $node
  Write-Host ""
  Write-Host "Install Node.js from https://nodejs.org, then run: node server.mjs"
  exit 1
}

Set-Location $PSScriptRoot
& $node server.mjs
