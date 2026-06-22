"use client";

import { useState } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError("Vui lòng nhập tài khoản và mật khẩu");
      return;
    }
    
    setIsLoading(true);
    setError("");

    try {
      // Nếu không có '@', mặc định là username -> thêm @edu.local
      let email = identifier.trim();
      if (!email.includes("@")) {
        email = `${email}@edu.local`;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw new Error("Tài khoản hoặc mật khẩu không chính xác");
      }

      // Xác định Role của User để chuyển hướng
      const userId = data?.user?.id;
      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        if (profile?.role === 'admin') {
          router.push("/admin/dashboard");
        } else {
          router.push("/student/dashboard");
        }
      } else {
        router.push("/student/dashboard"); // Fallback
      }
      
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f9f8] p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-teal-50">
        
        {/* Header Section */}
        <div className="bg-[#0f6f60] p-8 text-center text-white">
          <div className="w-16 h-16 bg-white/10 rounded-2xl mx-auto flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-1">Math LMS</h1>
          <p className="text-teal-100 text-sm">Nền tảng Quản lý Học tập môn Toán</p>
        </div>

        {/* Form Section */}
        <div className="p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Đăng nhập tài khoản</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 text-center">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email / Tài khoản</label>
              <input 
                type="text" 
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Ví dụ: hocsinh01 hoặc hocsinh@gmail.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0f6f60]/20 focus:border-[#0f6f60] transition-colors"
                disabled={isLoading}
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
                <a href="#" className="text-xs text-[#0f6f60] hover:underline font-medium">Quên mật khẩu?</a>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0f6f60]/20 focus:border-[#0f6f60] transition-colors"
                disabled={isLoading}
              />
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0f6f60] text-white font-semibold py-3.5 rounded-xl hover:bg-[#0c594c] transition-colors shadow-md shadow-[#0f6f60]/20 mt-2 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
              {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center space-y-3">
            <p className="text-sm text-gray-500">
              Học sinh mới? {" "}
              <Link href="/register" className="text-[#0f6f60] font-bold hover:underline">
                Đăng ký tài khoản
              </Link>
            </p>
            <p className="text-xs text-gray-400">
              hoặc <a href="#" className="hover:text-gray-600 underline">Liên hệ giáo viên để nhận mã lớp</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
