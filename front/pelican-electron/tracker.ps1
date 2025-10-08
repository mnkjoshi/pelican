# Pelican App Usage Tracker for Windows
# This script tracks which applications are in focus and logs usage data

param(
    [string]$LogPath = "$env:APPDATA\Pelican\usage.log"
)

# Ensure log directory exists
$logDir = Split-Path $LogPath -Parent
if (!(Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Add Windows API functions
Add-Type -TypeDefinition @"
    using System;
    using System.Runtime.InteropServices;
    using System.Text;
    
    public class WindowAPI {
        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();
        
        [DllImport("user32.dll")]
        public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
        
        [DllImport("user32.dll")]
        public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    }
"@

Write-Host "Pelican App Usage Tracker started. Logging to: $LogPath"
Write-Host "Press Ctrl+C to stop."

# Main tracking loop
try {
    while ($true) {
        try {
            # Get the foreground window
            $hwnd = [WindowAPI]::GetForegroundWindow()
            
            if ($hwnd -ne [IntPtr]::Zero) {
                # Get process ID from window handle
                $processId = 0
                [WindowAPI]::GetWindowThreadProcessId($hwnd, [ref]$processId)
                
                if ($processId -gt 0) {
                    # Get process information
                    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                    
                    if ($process -and $process.MainWindowTitle -and $process.MainWindowTitle.Trim() -ne "") {
                        # Create log entry
                        $entry = @{
                            timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                            processName = $process.ProcessName
                            windowTitle = $process.MainWindowTitle
                            processId = $processId
                        }
                        
                        # Convert to JSON and append to log
                        $jsonEntry = $entry | ConvertTo-Json -Compress
                        Add-Content -Path $LogPath -Value $jsonEntry -Encoding UTF8
                        
                        # Optional: Display current activity
                        Write-Host "$(Get-Date -Format 'HH:mm:ss') - $($process.ProcessName): $($process.MainWindowTitle)"
                    }
                }
            }
        }
        catch {
            # Silently continue on errors
        }
        
        # Wait 5 seconds before next check
        Start-Sleep -Seconds 5
    }
}
catch {
    Write-Host "Tracker stopped: $($_.Exception.Message)"
}
finally {
    Write-Host "App Usage Tracker terminated."
}