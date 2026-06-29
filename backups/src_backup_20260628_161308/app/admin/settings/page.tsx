"use client";

import { Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="p-8 w-full max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-teal-600" />
          Cài đặt Hệ thống
        </h1>
        <p className="text-gray-500 mt-2 font-medium">Cấu hình giao diện và các tài nguyên chung cho toàn hệ thống.</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
        <h2 className="text-xl font-bold text-gray-700 mb-2">Chưa có cài đặt nào ở đây</h2>
        <p className="text-gray-500">Các tính năng cấu hình hệ thống đang được cập nhật.</p>
      </div>
    </div>
  );
}
