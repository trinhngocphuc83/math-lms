# Gõ một chuỗi phím lên giả lập Casio rồi chụp màn hình.
#
#   .\go.ps1 -Phim "MENU,6" -Ra "b01.png"
#
# Toạ độ đo trên cửa sổ 338x714 của giả lập fx-580VN X.
param([string]$Phim = "", [string]$Ra = "", [int]$Cho = 320)

Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class W2 {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out R r);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint x, uint y, uint d, int e);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [StructLayout(LayoutKind.Sequential)] public struct R { public int L, T, Rr, B; }
}
"@

$K = @{
  "SHIFT"=@(69,333); "ALPHA"=@(105,333); "MENU"=@(233,333); "ON"=@(268,333)
  "LEN"=@(170,327); "XUONG"=@(170,363); "TRAI"=@(138,345); "PHAI"=@(202,345)
  "OPTN"=@(72,378); "CALC"=@(110,378); "TICHPHAN"=@(227,378); "X"=@(267,378)
  "PHANSO"=@(72,411); "CAN"=@(110,411); "BINHPHUONG"=@(150,411); "LUYTHUA"=@(190,411)
  "LOG"=@(227,411); "LN"=@(267,411)
  "AM"=@(72,443); "DOPHUT"=@(110,443); "NGHICHDAO"=@(150,443); "SIN"=@(190,443)
  "COS"=@(227,443); "TAN"=@(267,443)
  "STO"=@(72,476); "ENG"=@(110,476); "MONGOAC"=@(150,476); "DONGNGOAC"=@(190,476)
  "SD"=@(227,476); "MCONG"=@(267,476)
  "7"=@(76,516); "8"=@(122,516); "9"=@(169,516); "DEL"=@(215,516); "AC"=@(262,516)
  "4"=@(76,555); "5"=@(122,555); "6"=@(169,555); "NHAN"=@(215,555); "CHIA"=@(262,555)
  "1"=@(76,595); "2"=@(122,595); "3"=@(169,595); "CONG"=@(215,595); "TRU"=@(262,595)
  "0"=@(76,635); "CHAM"=@(122,635); "MU10"=@(169,635); "ANS"=@(215,635); "BANG"=@(262,635)
}

$p = Get-Process | Where-Object { $_.ProcessName -like "*fx-580*" } | Select-Object -First 1
if (-not $p) { Write-Output "KHONG THAY GIA LAP"; exit 1 }
$h = $p.MainWindowHandle
[W2]::ShowWindow($h, 9) | Out-Null
[W2]::SetForegroundWindow($h) | Out-Null
Start-Sleep -Milliseconds 300

$r = New-Object W2+R
[W2]::GetWindowRect($h, [ref]$r) | Out-Null

if ($Phim -ne "") {
  foreach ($ten in $Phim.Split(",")) {
    $t = $ten.Trim()
    if ($t -eq "") { continue }
    if (-not $K.ContainsKey($t)) { Write-Output "KHONG BIET PHIM: $t"; exit 1 }
    $c = $K[$t]
    [W2]::SetCursorPos($r.L + $c[0], $r.T + $c[1]) | Out-Null
    Start-Sleep -Milliseconds 70
    [W2]::mouse_event(0x0002, 0, 0, 0, 0)
    Start-Sleep -Milliseconds 50
    [W2]::mouse_event(0x0004, 0, 0, 0, 0)
    Start-Sleep -Milliseconds $Cho
  }
}

if ($Ra -ne "") {
  Start-Sleep -Milliseconds 200
  $w = $r.Rr - $r.L; $ht = $r.B - $r.T
  $bmp = New-Object System.Drawing.Bitmap $w, $ht
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($r.L, $r.T, 0, 0, $bmp.Size)
  $bmp.Save($Ra, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Output "da chup $Ra"
}
