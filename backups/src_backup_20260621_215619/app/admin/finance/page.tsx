"use client";

import { useState, useEffect } from "react";
import { Loader2, DollarSign, CalendarDays, TrendingUp, TrendingDown, Wallet, Plus, Trash2, X, Zap } from "lucide-react";
import { getFinanceStats, addExpense, deleteExpense } from "./actions";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function FinanceDashboard() {
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalRevenue: 0, totalExpense: 0, netProfit: 0, expenses: [] as any[] });

  // Modal State
  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [expForm, setExpForm] = useState({ title: '', amount: 0, date: new Date().toISOString().split('T')[0], category: 'OTHER' });
  const [savingExp, setSavingExp] = useState(false);

  useEffect(() => {
    fetchData();
  }, [month, year]);

  const fetchData = async () => {
    setLoading(true);
    const res = await getFinanceStats(month, year);
    if (res.success) {
      setStats({
        totalRevenue: res.totalRevenue || 0,
        totalExpense: res.totalExpense || 0,
        netProfit: res.netProfit || 0,
        expenses: res.expenses || []
      });
    }
    setLoading(false);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingExp(true);
    const res = await addExpense(expForm.title, expForm.amount, expForm.date, expForm.category, month, year);
    if (res.success) {
      setIsExpModalOpen(false);
      fetchData();
    } else {
      alert("Lỗi: " + res.error);
    }
    setSavingExp(false);
  };

  const handleDeleteExp = async (id: string, title: string) => {
    if (!confirm(`Xóa khoản chi "${title}"?`)) return;
    const res = await deleteExpense(id);
    if (res.success) fetchData();
    else alert("Lỗi xóa: " + res.error);
  };

  const handleAutoCenterFee = () => {
    const fee = Math.round(stats.totalRevenue * 0.1); // 10%
    setExpForm({
      title: `Trích 10% nộp Trung tâm - Tháng ${month}/${year}`,
      amount: fee,
      date: new Date().toISOString().split('T')[0],
      category: 'CENTER_FEE'
    });
    setIsExpModalOpen(true);
  };

  const chartData = [
    {
      name: `Tháng ${month}`,
      'Thực thu': stats.totalRevenue,
      'Chi phí': stats.totalExpense,
      'Lợi nhuận': stats.netProfit
    }
  ];

  return (
    <div className="p-8 w-full max-w-7xl mx-auto font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-3">
          <Wallet className="text-teal-600 w-8 h-8" />
          Tổng quan Tài chính
        </h1>
        <p className="text-gray-500 mt-2 font-medium">Báo cáo doanh thu, học phí và chi phí trung tâm</p>
      </div>

      {/* Control Panel */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
          <CalendarDays className="text-teal-600 w-5 h-5" />
          <span className="font-bold text-gray-500">Kỳ báo cáo:</span>
          <select value={month} onChange={e=>setMonth(Number(e.target.value))} className="bg-transparent font-bold text-gray-800 outline-none cursor-pointer">
            {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>Tháng {m}</option>)}
          </select>
          <span className="text-gray-300">/</span>
          <input type="number" value={year} onChange={e=>setYear(Number(e.target.value))} className="w-16 bg-transparent font-bold text-gray-800 outline-none" />
        </div>

        <div className="flex gap-3">
          <button onClick={() => {
            setExpForm({ title: '', amount: 0, date: new Date().toISOString().split('T')[0], category: 'OTHER' });
            setIsExpModalOpen(true);
          }} className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl font-bold hover:bg-gray-200 transition-colors">
            <Plus size={18} /> Thêm khoản chi
          </button>
          <button onClick={handleAutoCenterFee} className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-teal-700 transition-colors shadow-sm">
            <Zap size={18} /> Tính phí Trung tâm (10%)
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin text-teal-600 mx-auto" /></div>
      ) : (
        <>
          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-t-4 border-t-green-500 relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-green-50 p-3 rounded-full text-green-600"><TrendingUp size={24} /></div>
              <p className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-1">Tổng Thực Thu</p>
              <h2 className="text-3xl font-black text-gray-800">{stats.totalRevenue.toLocaleString('vi-VN')} đ</h2>
              <p className="text-sm text-green-600 font-bold mt-2 flex items-center gap-1">+ Từ học phí các lớp</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-t-4 border-t-rose-500 relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-rose-50 p-3 rounded-full text-rose-600"><TrendingDown size={24} /></div>
              <p className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-1">Tổng Chi Phí</p>
              <h2 className="text-3xl font-black text-gray-800">{stats.totalExpense.toLocaleString('vi-VN')} đ</h2>
              <p className="text-sm text-rose-600 font-bold mt-2 flex items-center gap-1">- Trích trung tâm & Khác</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-t-4 border-t-indigo-500 relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-indigo-50 p-3 rounded-full text-indigo-600"><DollarSign size={24} /></div>
              <p className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-1">Lợi Nhuận Ròng</p>
              <h2 className="text-3xl font-black text-indigo-700">{stats.netProfit.toLocaleString('vi-VN')} đ</h2>
              <p className="text-sm text-indigo-600 font-bold mt-2">Đã trừ mọi chi phí</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* CHART */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Biểu đồ Tài chính</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 600}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} tickFormatter={(value) => `${value/1000}k`} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} formatter={(value: number) => new Intl.NumberFormat('vi-VN').format(value) + ' đ'} />
                    <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                    <Bar dataKey="Thực thu" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={60} />
                    <Bar dataKey="Chi phí" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={60} />
                    <Bar dataKey="Lợi nhuận" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* EXPENSES LIST */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center justify-between">
                Sổ chi tiêu
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{stats.expenses.length} khoản</span>
              </h3>
              <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {stats.expenses.length === 0 ? (
                  <div className="text-center text-gray-400 py-10 text-sm">Chưa có khoản chi nào trong tháng.</div>
                ) : (
                  stats.expenses.map(exp => (
                    <div key={exp.id} className="flex justify-between items-start p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                      <div>
                        <div className="font-bold text-gray-800 text-sm">{exp.title}</div>
                        <div className="text-xs text-gray-500 mt-1">{new Date(exp.expense_date).toLocaleDateString('vi-VN')}</div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="font-bold text-rose-600 text-sm">-{exp.amount.toLocaleString('vi-VN')} đ</div>
                        <button onClick={() => handleDeleteExp(exp.id, exp.title)} className="text-gray-400 hover:text-red-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Expense Modal */}
      {isExpModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Thêm / Chỉnh sửa Chi phí</h3>
              <button onClick={() => setIsExpModalOpen(false)} className="text-gray-400 hover:text-red-500"><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tên khoản chi</label>
                <input required type="text" value={expForm.title} onChange={e=>setExpForm({...expForm, title: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:border-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Số tiền (VNĐ)</label>
                <input required type="number" value={expForm.amount} onChange={e=>setExpForm({...expForm, amount: Number(e.target.value)})} className="w-full px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl font-bold text-lg outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Ngày chi</label>
                  <input required type="date" value={expForm.date} onChange={e=>setExpForm({...expForm, date: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-teal-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Phân loại</label>
                  <select value={expForm.category} onChange={e=>setExpForm({...expForm, category: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-teal-500 text-sm">
                    <option value="CENTER_FEE">Nộp Trung tâm</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                <button type="button" onClick={()=>setIsExpModalOpen(false)} className="px-5 py-2 font-bold text-gray-600 hover:bg-gray-100 rounded-xl">Hủy</button>
                <button type="submit" disabled={savingExp} className="px-6 py-2 bg-teal-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-teal-700">
                  {savingExp ? <Loader2 size={16} className="animate-spin" /> : 'Lưu khoản chi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
