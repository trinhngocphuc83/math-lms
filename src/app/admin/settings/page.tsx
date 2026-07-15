"use client";

import { useState } from "react";
import { Settings as SettingsIcon, ShieldCheck, KeyRound, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function SettingsPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const supabase = createClient();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;
      
      setSuccess("Cập nhật mật khẩu thành công!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi cập nhật mật khẩu.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 w-full max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-teal-600" />
          Cài đặt Hệ thống
        </h1>
        <p className="text-gray-500 mt-2 font-medium">Cấu hình giao diện và bảo mật tài khoản.</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
          <div className="bg-teal-100 p-2 rounded-xl text-teal-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-gray-800">Bảo mật tài khoản</h2>
        </div>
        
        <div className="p-6 sm:p-8">
          <form onSubmit={handleUpdatePassword} className="max-w-md space-y-5">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                {error}
              </div>
            )}
            {success && (
              <div className="p-4 bg-green-50 text-green-700 rounded-xl text-sm font-medium border border-green-100 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                {success}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="w-4 h-4 text-gray-400" />
                </div>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-colors"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="w-4 h-4 text-gray-400" />
                </div>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-colors"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading || !newPassword || !confirmPassword}
              className="px-6 py-2.5 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
