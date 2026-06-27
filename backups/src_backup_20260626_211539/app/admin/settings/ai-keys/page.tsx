"use client";
import React, { useState, useEffect } from 'react';
import { Settings, Key, Plus, Trash2, Save, Cpu, Zap } from 'lucide-react';

export default function AdminAIKeysPage() {
  const [keys, setKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/settings/ai-keys');
      const data = await res.json();
      setKeys(data.customKeys || []);
      
      const resTotal = await fetch('/api/settings/ai-keys?action=totalCount');
      const dataTotal = await resTotal.json();
      setTotalCount(dataTotal.count || 0);
    } catch (err) {
      alert('Không thể tải dữ liệu Cổng AI');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => setKeys([...keys, '']);
  const handleRemove = (index: number) => setKeys(keys.filter((_, i) => i !== index));
  const handleChange = (index: number, val: string) => {
    const newKeys = [...keys];
    newKeys[index] = val;
    setKeys(newKeys);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/ai-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: keys.filter(k => k.trim() !== '') })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchData();
      } else {
        alert(data.error || 'Lưu thất bại');
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-indigo-500 font-bold">Đang tải Cấu Hình Không Gian Mạng...</div>;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-8 rounded-3xl shadow-2xl text-white relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse"></div>

        <div className="flex items-center gap-4 mb-6 relative z-10">
          <div className="w-14 h-14 bg-indigo-500/30 rounded-2xl flex items-center justify-center border border-indigo-400/50 backdrop-blur-md">
            <Cpu className="w-8 h-8 text-indigo-300" />
          </div>
          <div>
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-white">
              TRẠM KIỂM SOÁT CỔNG A.I
            </h1>
            <p className="text-indigo-200/80 font-medium">Trung tâm năng lượng Trí Tuệ Nhân Tạo (Gemini 3.5 Flash)</p>
          </div>
        </div>

        <div className="bg-black/20 border border-white/10 rounded-2xl p-6 relative z-10 mb-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            <h3 className="text-xl font-bold text-yellow-500">Tổng Năng Lượng Đang Có</h3>
          </div>
          <p className="text-slate-300 mb-2">Hệ thống đang sở hữu tổng cộng <strong className="text-white text-2xl px-2">{totalCount}</strong> Cổng Máy Chủ A.I có sẵn để Chấm Thi.</p>
          <p className="text-sm text-slate-400 italic">* Lưu ý: Số lượng này đã bao gồm các Mã Khóa cài sẵn ở Lõi hệ thống (.env.local) và các Mã Khóa cộng dồn được thêm ở bên dưới.</p>
        </div>

        <div className="mb-6 relative z-10">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-400" /> Danh sách Cổng A.I Mở Rộng (Cộng dồn)
          </h2>
          <div className="space-y-4">
            {keys.length === 0 && (
              <div className="text-center py-8 bg-white/5 rounded-xl border border-white/10 border-dashed">
                <p className="text-slate-400">Chưa có Cổng A.I phụ trợ nào được thêm. Học sinh chỉ đang dùng các Cổng ở Lõi Hệ thống.</p>
              </div>
            )}
            
            {keys.map((key, index) => (
              <div key={index} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 group hover:bg-white/10 transition-colors">
                <div className="w-8 h-8 bg-indigo-500/20 text-indigo-300 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                  {index + 1}
                </div>
                <input 
                  type="text" 
                  value={key}
                  onChange={(e) => handleChange(index, e.target.value)}
                  placeholder="Nhập mã API Key (AIzaSy...)"
                  className="flex-1 bg-transparent border-none text-white focus:ring-0 placeholder:text-slate-600 font-mono text-sm"
                />
                <button 
                  onClick={() => handleRemove(index)}
                  className="w-10 h-10 flex items-center justify-center text-red-400/50 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          <button 
            onClick={handleAdd}
            className="mt-6 flex items-center gap-2 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 px-6 py-3 rounded-xl font-bold transition-all border border-indigo-500/30"
          >
            <Plus className="w-5 h-5" />
            MỞ THÊM CỔNG A.I MỚI
          </button>
        </div>

        <div className="border-t border-white/10 pt-6 mt-6 flex justify-end relative z-10">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-1"
          >
            {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-5 h-5" />}
            LƯU VÀO TRẠM NĂNG LƯỢNG
          </button>
        </div>
      </div>
    </div>
  );
}
