# WAYUP Studio - export installed Windows font family names only.
# Compatible with Windows PowerShell 5.1+. No admin rights, font binaries, or secrets.
$ErrorActionPreference = 'Stop'
try {
    Add-Type -AssemblyName System.Drawing
    $catalogue = New-Object System.Drawing.Text.InstalledFontCollection
    $families = @($catalogue.Families | ForEach-Object { $_.Name } | Where-Object { $_ } | Sort-Object -Unique)
    if ($families.Count -eq 0) { throw 'No font families found.' }
    $output = [ordered]@{
        format = 'wayup-local-fonts-v1'
        generatedBy = 'WAYUP Studio local font exporter'
        families = $families
    }
    $desktop = [Environment]::GetFolderPath('Desktop')
    if ([string]::IsNullOrWhiteSpace($desktop)) {
        $desktop = [Environment]::GetFolderPath('MyDocuments')
    }
    $path = Join-Path $desktop 'wayup-fuentes-windows.json'
    $output | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $path -Encoding UTF8
    Write-Host ('Exported {0} font families to: {1}' -f $families.Count, $path)
    Write-Host 'Only font NAMES were exported. No font binaries or private files.'
} catch {
    Write-Error ('Could not export fonts: ' + $_.Exception.Message)
    exit 1
}
