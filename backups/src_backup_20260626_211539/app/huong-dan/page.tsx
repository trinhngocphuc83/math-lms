import React from 'react';
import Link from 'next/link';
import { BookOpen, LogIn, PenTool, CheckCircle, ArrowLeft, Lightbulb } from 'lucide-react';

export default function GuidePage() {
  return (
    <div className="h-screen overflow-y-auto bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="bg-[#0f6f60] rounded-t-2xl p-8 text-white relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Hướng dẫn sử dụng Hệ thống</h1>
              <p className="text-teal-100">LMS TOÁN THẦY PHÚC - Dành cho Học sinh</p>
            </div>
            <Link 
              href="/"
              className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại Đăng nhập
            </Link>
          </div>
          <div className="absolute -bottom-10 -right-10 opacity-10">
            <BookOpen className="w-64 h-64" />
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-b-2xl shadow-sm border border-gray-100 p-6 sm:p-10 space-y-12">
          
          {/* Section 1 */}
          <section className="flex gap-4 sm:gap-6">
            <div className="shrink-0 mt-1">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                <LogIn className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">1. Đăng nhập hệ thống</h2>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold mt-0.5">•</span>
                  <span><strong>Tài khoản & Mật khẩu:</strong> Thông tin đăng nhập sẽ được Thầy Phúc cung cấp trực tiếp cho bạn hoặc phụ huynh.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold mt-0.5">•</span>
                  <span>Truy cập vào trang chủ của hệ thống.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold mt-0.5">•</span>
                  <span>Nhập <strong>Tài khoản (Username)</strong> và <strong>Mật khẩu</strong>, sau đó nhấn "Đăng nhập".</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Section 2 */}
          <section className="flex gap-4 sm:gap-6">
            <div className="shrink-0 mt-1">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">2. Tham gia khóa học & Xem tài liệu</h2>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 font-bold mt-0.5">•</span>
                  <span>Tại màn hình <strong>Bảng điều khiển (Dashboard)</strong>, bạn sẽ thấy danh sách các Khóa học mình đang tham gia.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 font-bold mt-0.5">•</span>
                  <span>Bấm vào một khóa học bất kỳ để xem danh sách các Bài học, Tài liệu và Đề kiểm tra.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="flex gap-4 sm:gap-6">
            <div className="shrink-0 mt-1">
              <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                <PenTool className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">3. Hướng dẫn làm bài Luyện tập / Bài kiểm tra</h2>
              <div className="bg-orange-50/50 rounded-xl p-4 border border-orange-100 mb-4">
                <p className="text-sm text-orange-800 font-medium flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" /> 
                  Lưu ý: Bạn cần có kết nối mạng ổn định trước khi bắt đầu làm bài.
                </p>
              </div>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold mt-0.5">1.</span>
                  <span><strong>Bắt đầu:</strong> Chọn bài kiểm tra và nhấn nút "Bắt đầu làm bài". Thời gian làm bài sẽ bắt đầu đếm ngược.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold mt-0.5">2.</span>
                  <span><strong>Chọn đáp án:</strong> Đọc kỹ đề bài và click chọn phương án đúng nhất (A, B, C, D) đối với câu hỏi trắc nghiệm.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold mt-0.5">3.</span>
                  <span><strong>Điều hướng:</strong> Sử dụng danh sách ô số thứ tự ở góc màn hình để chuyển nhanh đến câu hỏi cần xem lại. Ô đã làm sẽ được đổi màu.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold mt-0.5">4.</span>
                  <span><strong>Nộp bài:</strong> Sau khi hoàn tất, nhấn nút <strong>Nộp bài</strong>. Hệ thống sẽ tự động chấm điểm ngay lập tức.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section className="flex gap-4 sm:gap-6">
            <div className="shrink-0 mt-1">
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">4. Xem Điểm và Lời giải chi tiết</h2>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold mt-0.5">•</span>
                  <span>Ngay sau khi nộp bài, bạn sẽ biết được tổng điểm, số câu đúng và số câu sai.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold mt-0.5">•</span>
                  <span>Bạn có thể click vào nút <strong>Xem chi tiết bài làm</strong> để đối chiếu.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 font-bold mt-0.5">•</span>
                  <span>Tại đây, các câu hỏi sẽ đi kèm phần <strong>Phương pháp giải</strong> và <strong>Lời giải chi tiết</strong> được trình bày trực quan, giúp bạn tự học và rút kinh nghiệm dễ dàng.</span>
                </li>
              </ul>
            </div>
          </section>

        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 pb-10">
          Cần hỗ trợ thêm? Vui lòng liên hệ Thầy Phúc hoặc trợ giảng để được giải đáp.
        </div>
      </div>
    </div>
  );
}
