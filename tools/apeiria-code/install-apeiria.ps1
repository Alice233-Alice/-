param(
    [string]$CodeCommand,
    [string]$CodeExecutable,
    [string]$ArgvPath = (Join-Path $env:USERPROFILE '.vscode/argv.json')
)
$ErrorActionPreference = 'Stop'
$extensionId = 'ayanami-local.apeiria-code'
$vsix = Join-Path $PSScriptRoot 'apeiria-code-0.2.0-win32-x64.vsix'
if (!(Test-Path -LiteralPath $vsix -PathType Leaf)) { throw "Missing package: $vsix" }
if (!$CodeCommand) { $CodeCommand = (Get-Command code.cmd -ErrorAction Stop).Source }
if (!$CodeExecutable) {
    $CodeExecutable = Join-Path (Split-Path (Split-Path $CodeCommand -Parent) -Parent) 'Code.exe'
}
if (!(Test-Path -LiteralPath $CodeExecutable -PathType Leaf)) { throw 'Provide -CodeExecutable with the full path to Code.exe.' }
$priorElectron = $env:ELECTRON_RUN_AS_NODE
try {
    Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
    & $CodeCommand '--install-extension' $vsix '--force'
    if ($LASTEXITCODE -ne 0) { throw 'VSIX installation failed. Startup settings were not changed.' }
    $locations = @(& $CodeCommand '--locate-extension' $extensionId)
    if ($LASTEXITCODE -ne 0) { throw 'Cannot locate installed Apeiria Code. Startup settings were not changed.' }
    $extensionPath = $locations | Where-Object { Test-Path -LiteralPath $_ -PathType Container } | Select-Object -Last 1
    if (!$extensionPath) { throw 'Installed extension path is missing. Startup settings were not changed.' }
    $configurationHelper = Join-Path $extensionPath 'dist/configure-native-apis.cjs'
    if (!(Test-Path -LiteralPath $configurationHelper -PathType Leaf)) { throw 'Installed configuration helper is missing.' }
    $env:ELECTRON_RUN_AS_NODE = '1'
    & $CodeExecutable $configurationHelper $ArgvPath
    if ($LASTEXITCODE -ne 0) { throw 'Native API setup failed. See the diagnostic above.' }
    Write-Output 'Apeiria Code is installed. Completely exit and reopen VS Code to load its native APIs.'
}
finally {
    if ($null -eq $priorElectron) { Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue }
    else { $env:ELECTRON_RUN_AS_NODE = $priorElectron }
}
