import { BookOpen, Clock } from "lucide-react";

export const metadata = {
  title: 'Tài khoản chờ duyệt - LMS TOÁN THẦY PHÚC',
};

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f9f8] p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-teal-50 text-center p-10">
        
        <div className="w-20 h-20 bg-yellow-50 text-yellow-500 rounded-full mx-auto flex items-center justify-center mb-6">
          <Clock className="w-10 h-10" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Tài khoản chưa được kích hoạt</h1>
        
        <p className="text-gray-600 mb-8 leading-relaxed">
          Tài khoản của bạn đã được đăng ký thành công nhưng <strong>đang chờ Giáo viên hoặc Quản trị viên duyệt</strong>. <br/><br/>
          Vui lòng quay lại sau hoặc liên hệ với Giáo viên chủ nhiệm để được hỗ trợ kích hoạt sớm.
        </p>

        <a 
          href="/login"
          className="inline-flex items-center justify-center w-full bg-[#0f6f60] text-white font-semibold py-3.5 rounded-xl hover:bg-[#0c594c] transition-colors shadow-md shadow-[#0f6f60]/20"
        >
          Quay lại trang Đăng nhập
        </a>
      </div>
    </div>
  );
}
