'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, UserPlus, GraduationCap, Users } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  grade_level: number;
}

const InputField = ({ label, name, type = 'text', required = false, placeholder, icon, value, onChange }: { label: string; name: string; type?: string; required?: boolean; placeholder: string; icon?: React.ReactNode, value: string, onChange: React.ChangeEventHandler<HTMLInputElement> }) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-semibold text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative">
      <input
        type={type}
        name={name}
        required={required}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm"
      />
    </div>
  </div>
);

export default function RegisterForm({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState({
    student_name: '',
    school: '',
    class_name: '',
    student_phone: '',
    parent_name: '',
    parent_phone: '',
    username: '',
    password: '',
    confirm_password: '',
    course_id: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate các trường bắt buộc
    if (!formData.student_name.trim()) {
      setError('Vui lòng nhập họ tên học sinh');
      return;
    }
    if (!formData.parent_name.trim()) {
      setError('Vui lòng nhập họ tên phụ huynh');
      return;
    }
    if (!formData.parent_phone.trim()) {
      setError('Vui lòng nhập số điện thoại phụ huynh');
      return;
    }
    if (!formData.username.trim()) {
      setError('Vui lòng nhập tên tài khoản');
      return;
    }
    if (!formData.password) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }
    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (formData.password !== formData.confirm_password) {
      setError('Mật khẩu nhập lại không khớp!');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi đăng ký');
      }

      setSuccess(data.message || 'Đăng ký thành công! Vui lòng chờ Giáo viên / Quản trị viên kích hoạt tài khoản.');
      setFormData({
        student_name: '',
        school: '',
        class_name: '',
        student_phone: '',
        parent_name: '',
        parent_phone: '',
        username: '',
        password: '',
        confirm_password: '',
        course_id: '',
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Thông báo lỗi */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Thông báo thành công */}
      {success && (
        <div className="flex items-start gap-3 p-4 bg-green-50 text-green-700 rounded-xl border border-green-100 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">{success}</p>
            <p className="text-green-600 text-xs mt-1">Tài khoản phụ huynh đã được tạo tự động theo SĐT phụ huynh (mật khẩu mặc định: 123456).</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* ===== CỘT TRÁI: THÔNG TIN HỌC SINH ===== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
            <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-teal-600" />
            </div>
            <h3 className="font-bold text-gray-800">Thông tin Học sinh</h3>
          </div>
          
          <InputField label="Họ và tên Học sinh" name="student_name" required placeholder="Nguyễn Văn A" value={formData.student_name} onChange={handleChange} />
          <InputField label="Trường" name="school" placeholder="THCS Lê Hồng Phong" value={formData.school} onChange={handleChange} />
          <InputField label="Lớp đang học ở trường phổ thông" name="class_name" placeholder="VD: 12A1, 9A" value={formData.class_name} onChange={handleChange} />
          <InputField label="SĐT Học sinh" name="student_phone" type="tel" placeholder="0901234567" value={formData.student_phone} onChange={handleChange} />
        </div>

        {/* ===== CỘT PHẢI: PHỤ HUYNH & TÀI KHOẢN ===== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-800">Phụ huynh & Tài khoản</h3>
          </div>

          <InputField label="Họ và tên Phụ huynh" name="parent_name" required placeholder="Nguyễn Văn B" value={formData.parent_name} onChange={handleChange} />
          <InputField label="SĐT Phụ huynh" name="parent_phone" type="tel" required placeholder="0909876543" value={formData.parent_phone} onChange={handleChange} />

          {/* Tài khoản */}
          <InputField label="Tên tài khoản" name="username" required placeholder="nva2010 hoặc SĐT" value={formData.username} onChange={handleChange} />
          
          {/* Mật khẩu */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700">
              Mật khẩu <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="Ít nhất 6 ký tự"
                className="w-full px-4 py-2.5 pr-10 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Nhập lại mật khẩu */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700">
              Nhập lại mật khẩu <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                name="confirm_password"
                required
                value={formData.confirm_password}
                onChange={handleChange}
                placeholder="Nhập lại mật khẩu"
                className={`w-full px-4 py-2.5 pr-10 bg-gray-50 border rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm
                  ${formData.confirm_password && formData.password !== formData.confirm_password 
                    ? 'border-red-300 bg-red-50' 
                    : formData.confirm_password && formData.password === formData.confirm_password 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-gray-200'
                  }`}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {formData.confirm_password && formData.password !== formData.confirm_password && (
              <p className="text-xs text-red-500 font-medium">Mật khẩu không khớp!</p>
            )}
            {formData.confirm_password && formData.password === formData.confirm_password && (
              <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Mật khẩu khớp
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Chọn khóa học */}
      <div className="pt-4 border-t border-gray-100">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Chọn khóa học muốn đăng ký</label>
        <select 
          name="course_id" 
          value={formData.course_id} 
          onChange={handleChange}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm"
        >
          <option value="">-- Chọn một khóa học --</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title} {course.grade_level ? `(Lớp ${course.grade_level})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Nút đăng ký */}
      <div className="pt-4">
        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold py-3.5 rounded-xl hover:from-teal-700 hover:to-emerald-700 transition-all shadow-lg shadow-teal-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Đang xử lý...
            </>
          ) : (
            <>
              <UserPlus className="w-5 h-5" />
              ĐĂNG KÝ TÀI KHOẢN
            </>
          )}
        </button>
      </div>
      
      {/* Lưu ý */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700 space-y-1">
        <p className="font-bold">📌 Lưu ý quan trọng:</p>
        <ul className="list-disc list-inside text-xs space-y-0.5 text-amber-600">
          <li>Sau khi đăng ký, tài khoản cần được <strong>Giáo viên kích hoạt</strong> mới sử dụng được.</li>
          <li>Tài khoản <strong>Phụ huynh</strong> sẽ được tạo tự động theo SĐT PH (mật khẩu mặc định: <strong>123456</strong>).</li>
          <li>Tên tài khoản không được trùng với tài khoản đã tồn tại trong hệ thống.</li>
        </ul>
      </div>

      <div className="text-center">
        <a href="/login" className="text-sm text-teal-600 hover:text-teal-700 hover:underline font-semibold transition-colors">
          Đã có tài khoản? Đăng nhập ngay →
        </a>
      </div>
    </form>
  );
}
