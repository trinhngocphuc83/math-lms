"use client";
import React, { useState, useEffect } from 'react';
import { Settings, Key, Plus, Trash2, Save, Cpu, Zap, ArrowUp, ArrowDown, Bot, AlertTriangle } from 'lucide-react';

type ModelAI = {
  id: string;
  model_id: string;
  thu_tu: number;
  dang_bat: boolean;
  ghi_chu?: string;
};

export default function AdminAIKeysPage() {
  const [keys, setKeys] = useState<string[]>([]);
  // Khoá lõi (biến môi trường trên Vercel) - chỉ có bản đã che, để thầy thấy chúng đang ở đâu
  const [coreKeys, setCoreKeys] = useState<string[]>([]);
  const [dangChepLoi, setDangChepLoi] = useState(false);
  // Kho chung: app này đang dùng kho khoá ở dự án Supabase của app Toán (hai app dùng chung)
  const [khoChung, setKhoChung] = useState(false);
  const [khoaCucBoChuaGop, setKhoaCucBoChuaGop] = useState(0);
  const [dangGop, setDangGop] = useState(false);
  // Ô dán một lúc nhiều khoá (mỗi dòng một khoá) - thêm từng ô một thì 10 khoá bấm 10 lần
  const [danNhieu, setDanNhieu] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  // Khoá đã cạn hạn mức trong ngày sẽ bị treo 24 giờ - hiện ra để biết vì sao số cổng
  // dùng được ít hơn tổng số đang có.
  const [blockedCount, setBlockedCount] = useState(0);

  // Danh sách model AI và thứ tự gọi. Gặp lỗi ở model đầu thì hệ thống tự tụt xuống
  // model kế tiếp, nên thứ tự ở đây quyết định model nào được ưu tiên dùng.
  const [models, setModels] = useState<ModelAI[]>([]);
  const [chuaTaoBang, setChuaTaoBang] = useState(false);
  const [khoaBiTreo, setKhoaBiTreo] = useState<Record<string, number>>({});
  const [modelMoi, setModelMoi] = useState('');
  const [dangLuuModel, setDangLuuModel] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/settings/ai-keys');
      const data = await res.json();
      setKeys(data.customKeys || []);
      setCoreKeys(data.coreKeys || []);
      setKhoChung(!!data.khoChung);
      setKhoaCucBoChuaGop(data.khoaCucBoChuaGop || 0);

      const resTotal = await fetch('/api/settings/ai-keys?action=totalCount');
      const dataTotal = await resTotal.json();
      setTotalCount(dataTotal.count || 0);

      // Hỏi luôn đường cấp khoá để biết bao nhiêu khoá đang bị treo vì cạn hạn mức
      const resKeys = await fetch('/api/admin/gemini-key');
      const dataKeys = await resKeys.json();
      setBlockedCount(dataKeys.soKhoaBiTreo || 0);

      const resModels = await fetch('/api/admin/ai-models');
      const dataModels = await resModels.json();
      setModels(dataModels.models || []);
      setChuaTaoBang(!!dataModels.chuaTaoBang);
      setKhoaBiTreo(dataModels.khoaBiTreo || {});
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

  const doiChoModel = (i: number, buoc: number) => {
    const j = i + buoc;
    if (j < 0 || j >= models.length) return;
    const ds = [...models];
    [ds[i], ds[j]] = [ds[j], ds[i]];
    setModels(ds);
  };

  const batTatModel = (i: number) => {
    setModels(models.map((m, idx) => idx === i ? { ...m, dang_bat: !m.dang_bat } : m));
  };

  const xoaModel = (i: number) => setModels(models.filter((_, idx) => idx !== i));

  const themModel = () => {
    const ten = modelMoi.trim();
    if (!ten) return;
    if (models.some(m => m.model_id === ten)) return alert('Model này đã có trong danh sách.');
    setModels([...models, { id: ten, model_id: ten, thu_tu: models.length + 1, dang_bat: true, ghi_chu: '' }]);
    setModelMoi('');
  };

  const luuModels = async () => {
    setDangLuuModel(true);
    try {
      const res = await fetch('/api/admin/ai-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ models }),
      });
      const data = await res.json();
      if (res.ok) { alert(data.message); fetchData(); }
      else alert(data.error || 'Lưu thất bại');
    } catch {
      alert('Lỗi kết nối máy chủ');
    } finally {
      setDangLuuModel(false);
    }
  };

  /** Tách đoạn dán thành từng khoá, thêm vào danh sách (bỏ khoá đã có). */
  const themTuDoanDan = () => {
    const moi = danNhieu.split(/[\s,;]+/).map(k => k.trim()).filter(k => k.length >= 20 && !keys.includes(k));
    if (moi.length === 0) { alert('Không thấy khoá nào mới trong đoạn vừa dán.'); return; }
    setKeys([...keys.filter(k => k.trim() !== ''), ...moi]);
    setDanNhieu('');
  };

  /** Chép khoá lõi (biến môi trường của bản đang chạy) vào CSDL để quản lý một chỗ. */
  const chepKhoaLoi = async () => {
    if (!confirm(`Chép ${coreKeys.length} khoá lõi vào cơ sở dữ liệu? Khoá đã có sẽ được bỏ qua.`)) return;
    setDangChepLoi(true);
    try {
      const res = await fetch('/api/settings/ai-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'importEnv' }),
      });
      const data = await res.json();
      alert(res.ok ? data.message : (data.error || 'Chép thất bại'));
      if (res.ok) fetchData();
    } catch {
      alert('Lỗi kết nối máy chủ');
    } finally {
      setDangChepLoi(false);
    }
  };

  /** Gộp khoá còn ở bảng riêng của app này sang kho chung. */
  const gopKhoaCucBo = async () => {
    if (!confirm(`Gộp ${khoaCucBoChuaGop} khoá của app này vào kho chung?`)) return;
    setDangGop(true);
    try {
      const res = await fetch('/api/settings/ai-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'gopCucBo' }),
      });
      const data = await res.json();
      alert(res.ok ? data.message : (data.error || 'Gộp thất bại'));
      if (res.ok) fetchData();
    } catch {
      alert('Lỗi kết nối máy chủ');
    } finally {
      setDangGop(false);
    }
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
            <p className="text-indigo-200/80 font-medium">Trung tâm năng lượng Trí Tuệ Nhân Tạo (tự xoay khoá và model)</p>
          </div>
        </div>

        <div className="bg-black/20 border border-white/10 rounded-2xl p-6 relative z-10 mb-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            <h3 className="text-xl font-bold text-yellow-500">Tổng Năng Lượng Đang Có</h3>
          </div>
          <p className="text-slate-300 mb-2">Hệ thống đang sở hữu tổng cộng <strong className="text-white text-2xl px-2">{totalCount}</strong> Cổng Máy Chủ A.I có sẵn để Chấm Thi.</p>
          {blockedCount > 0 && (
            <p className="text-amber-300 font-bold mb-2">
              ⚠️ Đang tạm khoá {blockedCount}/{totalCount} cổng do hết hạn mức trong ngày — chỉ còn {totalCount - blockedCount} cổng dùng được.
              Các cổng này tự mở lại sau 24 giờ.
            </p>
          )}
          <p className="text-sm text-slate-400 italic">* Lưu ý: Số lượng này = {coreKeys.length} khoá lõi (biến môi trường trên máy chủ) + {keys.filter(k => k.trim()).length} khoá trong cơ sở dữ liệu (bên dưới), đã bỏ khoá trùng nhau.</p>
          <p className="text-sm text-slate-400 italic mt-1">* Gói miễn phí của Google giới hạn <strong className="text-slate-300">20 lượt/ngày cho mỗi khoá</strong>. Cần quét nhiều thì thêm nhiều khoá, hoặc nâng cấp gói trả phí.</p>
        </div>

        {/* ===== Thứ tự model AI ===== */}
        <div className="mb-8 relative z-10">
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-400" /> Thứ tự ưu tiên Model A.I
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            Hệ thống gọi model từ trên xuống. Model đầu tiên thử hết mọi khoá mà vẫn không được
            (Google quá tải hoặc cạn hạn mức) thì tự tụt xuống model kế tiếp. Kéo model ổn định
            lên đầu nếu thấy quét đề chậm.
          </p>

          {chuaTaoBang && (
            <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 mb-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-amber-200 text-sm">
                Chưa tạo bảng <code className="font-mono">ai_models</code> trong cơ sở dữ liệu nên đây chỉ là
                danh sách mặc định, lưu lại sẽ không có tác dụng. Chạy file
                <code className="font-mono"> scratch/tao-bang-model-ai.sql </code>
                trên Supabase rồi tải lại trang.
              </p>
            </div>
          )}

          <div className="space-y-2">
            {models.map((m, i) => (
              <div
                key={m.model_id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors
                  ${m.dang_bat ? 'bg-white/5 border-white/10' : 'bg-black/20 border-white/5 opacity-50'}`}
              >
                <div className="w-8 h-8 bg-emerald-500/20 text-emerald-300 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm text-white truncate">{m.model_id}</div>
                  {m.ghi_chu && <div className="text-xs text-slate-500 truncate">{m.ghi_chu}</div>}
                </div>
                {khoaBiTreo[m.model_id] > 0 && (
                  <span className="text-xs font-bold text-amber-300 bg-amber-500/10 px-2 py-1 rounded-lg shrink-0">
                    {khoaBiTreo[m.model_id]} khoá cạn
                  </span>
                )}
                <button
                  onClick={() => batTatModel(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors
                    ${m.dang_bat ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                                 : 'bg-slate-600/30 text-slate-400 hover:bg-slate-600/50'}`}
                >
                  {m.dang_bat ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                </button>
                <button onClick={() => doiChoModel(i, -1)} disabled={i === 0}
                  className="p-2 text-slate-400 hover:text-white disabled:opacity-20 rounded-lg shrink-0">
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button onClick={() => doiChoModel(i, 1)} disabled={i === models.length - 1}
                  className="p-2 text-slate-400 hover:text-white disabled:opacity-20 rounded-lg shrink-0">
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button onClick={() => xoaModel(i)}
                  className="p-2 text-red-400/50 hover:text-red-400 rounded-lg shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-4">
            <input
              type="text"
              value={modelMoi}
              onChange={(e) => setModelMoi(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') themModel(); }}
              placeholder="Tên model mới, ví dụ: gemini-3.8-flash"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-sm
                         placeholder:text-slate-600 focus:border-emerald-500 outline-none"
            />
            <button onClick={themModel}
              className="flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 px-5 py-2.5 rounded-xl font-bold border border-emerald-500/30">
              <Plus className="w-4 h-4" /> Thêm model
            </button>
            <button onClick={luuModels} disabled={dangLuuModel}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold">
              {dangLuuModel ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              Lưu thứ tự
            </button>
          </div>
        </div>

        {/* ===== Kho khoá chung cho cả hai app ===== */}
        <div className={`mb-8 relative z-10 rounded-2xl border p-5 ${khoChung ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10'}`}>
          {khoChung ? (
            <>
              <p className="text-emerald-200 font-bold mb-1">✅ App này đang dùng KHO KHOÁ CHUNG (kho đặt ở dự án Supabase của app Toán).</p>
              <p className="text-slate-300 text-sm">
                Khoá thêm/xoá ở đây và sổ treo cạn hạn mức đều dùng chung cho cả hai app — nhập một lần, hai bên cùng thấy;
                một khoá cạn hạn mức bên này thì bên kia cũng không thử lại.
              </p>
              {khoaCucBoChuaGop > 0 && (
                <button onClick={gopKhoaCucBo} disabled={dangGop}
                  className="mt-3 flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-200 px-5 py-2.5 rounded-xl font-bold border border-emerald-500/30 disabled:opacity-50">
                  {dangGop ? <div className="w-4 h-4 border-2 border-emerald-200 border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Gộp {khoaCucBoChuaGop} khoá còn ở bảng riêng của app này vào kho chung
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-slate-200 font-bold mb-1">Kho khoá của app này là KHO RIÊNG (dự án Supabase của chính nó).</p>
              <p className="text-slate-400 text-sm">
                Đây là app giữ kho chung thì không cần làm gì. Còn muốn app này dùng chung kho với app kia,
                khai báo hai biến môi trường trên Vercel rồi triển khai lại:
                <code className="font-mono text-xs block mt-2 text-slate-300">KHO_KHOA_SUPABASE_URL = URL dự án Supabase giữ kho (của app Toán)</code>
                <code className="font-mono text-xs block text-slate-300">KHO_KHOA_SERVICE_ROLE_KEY = service role key của dự án ấy</code>
              </p>
            </>
          )}
        </div>

        {/* ===== Khoá lõi: nằm ở biến môi trường, chỉ sửa được bằng cách triển khai lại ===== */}
        <div className="mb-8 relative z-10">
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-400" /> Khoá lõi đang ở biến môi trường ({coreKeys.length})
          </h2>
          <p className="text-slate-400 text-sm mb-3">
            Đây là khoá khai báo lúc triển khai (Vercel → Settings → Environment Variables), chỉ hiện bản đã che.
            Muốn quản lý mọi khoá ở một chỗ thì bấm chép vào cơ sở dữ liệu: từ đó sửa/xoá ngay trên trang này,
            không phải triển khai lại. Chép xong có thể xoá dần biến môi trường trên Vercel.
          </p>
          {coreKeys.length === 0 ? (
            <p className="text-slate-500 text-sm italic">Bản đang chạy không có khoá nào ở biến môi trường — mọi khoá đều nằm trong cơ sở dữ liệu.</p>
          ) : (
            <div className="flex flex-wrap gap-2 mb-3">
              {coreKeys.map((k, i) => (
                <span key={i} className="font-mono text-xs bg-amber-500/10 text-amber-200 border border-amber-500/30 px-3 py-1.5 rounded-lg">
                  {k}{keys.some(x => x.startsWith(k.slice(0, 6)) && x.endsWith(k.slice(-4))) ? ' · đã có trong CSDL' : ''}
                </span>
              ))}
            </div>
          )}
          {coreKeys.length > 0 && (
            <button onClick={chepKhoaLoi} disabled={dangChepLoi}
              className="flex items-center gap-2 bg-amber-500/20 hover:bg-amber-500/40 text-amber-200 px-5 py-2.5 rounded-xl font-bold border border-amber-500/30 disabled:opacity-50">
              {dangChepLoi ? <div className="w-4 h-4 border-2 border-amber-200 border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              Chép {coreKeys.length} khoá lõi vào cơ sở dữ liệu
            </button>
          )}
        </div>

        <div className="mb-6 relative z-10">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-400" /> Khoá trong cơ sở dữ liệu ({keys.filter(k => k.trim()).length}) — sửa xong nhớ bấm Lưu
          </h2>

          {/* Dán một lúc nhiều khoá */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
            <p className="text-slate-400 text-sm mb-2">Dán nhiều khoá một lúc — mỗi khoá một dòng (hoặc cách nhau bằng dấu phẩy), rồi bấm tách:</p>
            <textarea
              value={danNhieu}
              onChange={(e) => setDanNhieu(e.target.value)}
              rows={3}
              placeholder={'AIzaSy...\nAIzaSy...\nAQ.Ab8...'}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm placeholder:text-slate-600 focus:border-indigo-500 outline-none"
            />
            <button onClick={themTuDoanDan}
              className="mt-2 flex items-center gap-2 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 px-4 py-2 rounded-lg font-bold text-sm border border-indigo-500/30">
              <Plus className="w-4 h-4" /> Tách thành từng khoá và thêm vào danh sách
            </button>
          </div>

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
