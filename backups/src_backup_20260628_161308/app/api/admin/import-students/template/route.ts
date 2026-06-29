import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const XLSX = await import('xlsx');

    // Tạo dữ liệu mẫu cho file Excel
    const sampleData = [
      {
        'Họ tên': 'Nguyễn Văn A',
        'Trường': 'THCS Lê Hồng Phong',
        'Lớp': '9A1',
        'SĐT HS': '0901234567',
        'Tài khoản': 'nva2010',
        'Mật khẩu': '123456',
        'Họ tên PH': 'Nguyễn Văn B',
        'SĐT PH': '0909876543',
      },
      {
        'Họ tên': 'Trần Thị C',
        'Trường': 'THCS Lê Hồng Phong',
        'Lớp': '9A1',
        'SĐT HS': '0912345678',
        'Tài khoản': 'ttc2010',
        'Mật khẩu': '123456',
        'Họ tên PH': 'Trần Văn D',
        'SĐT PH': '0918765432',
      },
    ];

    // Tạo workbook và worksheet
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    
    // Thiết lập độ rộng cột cho dễ đọc
    worksheet['!cols'] = [
      { wch: 20 }, // Họ tên
      { wch: 25 }, // Trường
      { wch: 8 },  // Lớp
      { wch: 14 }, // SĐT HS
      { wch: 14 }, // Tài khoản
      { wch: 10 }, // Mật khẩu
      { wch: 20 }, // Họ tên PH
      { wch: 14 }, // SĐT PH
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách HS');

    // Xuất file dạng buffer
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="mau_danh_sach_hoc_sinh.xlsx"',
      },
    });
  } catch (error: any) {
    console.error('Template Download Error:', error);
    return NextResponse.json({ error: 'Lỗi tạo file mẫu' }, { status: 500 });
  }
}
