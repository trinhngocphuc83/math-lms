# Chụp cửa sổ giả lập Casio và bấm phím trên đó.
#   .\chup.ps1 -Ra duong-dan.png            -> chụp
#   .\chup.ps1 -X 120 -Y 300                -> bấm chuột tại toạ độ TRONG cửa sổ
param([string]$Ra = "", [int]$X = -1, [int]$Y = -1, [int]$Cho = 350)

Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class W {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out R r);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint x, uint y, uint d, int e);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [StructLayout(LayoutKind.Sequential)] public struct R { public int L, T, Rr, B; }
}
"@

$p = Get-Process | Where-Object { $_.ProcessName -like "*fx-580*" } | Select-Object -First 1
if (-not $p) { Write-Output "KHONG THAY GIA LAP"; exit 1 }
$h = $p.MainWindowHandle
[W]::ShowWindow($h, 9) | Out-Null      # 9 = SW_RESTORE
[W]::SetForegroundWindow($h) | Out-Null
Start-Sleep -Milliseconds 250

$r = New-Object W+R
[W]::GetWindowRect($h, [ref]$r) | Out-Null
$w = $r.Rr - $r.L; $ht = $r.B - $r.T

if ($X -ge 0 -and $Y -ge 0) {
  [W]::SetCursorPos($r.L + $X, $r.T + $Y) | Out-Null
  Start-Sleep -Milliseconds 60
  [W]::mouse_event(0x0002, 0, 0, 0, 0)   # trai xuong
  Start-Sleep -Milliseconds 40
  [W]::mouse_event(0x0004, 0, 0, 0, 0)   # trai len
  Start-Sleep -Milliseconds $Cho
}

if ($Ra -ne "") {
  $bmp = New-Object System.Drawing.Bitmap $w, $ht
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($r.L, $r.T, 0, 0, $bmp.Size)
  $bmp.Save($Ra, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Output "da chup $Ra  ($w x $ht)"
} else {
  Write-Output "cua so $w x $ht tai ($($r.L),$($r.T))"
}
