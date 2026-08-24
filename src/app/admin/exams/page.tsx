"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Sliders, Download, UploadCloud, Trash2, Settings, Database, Shuffle, X, ChevronDown, ChevronRight,
  Folder, File, List, Save, Layers, AlertTriangle, Loader2, FileText, Wand2, Sparkles
} from "lucide-react";
import * as XLSX from "xlsx";
import NapMaTranModal, { type DongNapMaTran } from "@/components/admin/NapMaTranModal";
import SinhBuModal from "@/components/admin/SinhBuModal";
import { toBankType, bankTypeLabel, type BankType } from "@/utils/questionTypes";
import {
  type DauDe, type DongMaTran, dauDeMacDinh, diemMacDinh, tinhTongDiem, tinhTongCau,
  gomTheoLoai, lamTron, soDiemVN, KHUON_DE, MA_KHUON_DE,
} from "@/utils/deThi";

interface CategoryData {
  id: string;
  grade: string;
  subject: string;
  topic: string;
  lesson: string;
  math_form: string;
}

interface InventoryData {
  math_form: string;
  question_type: string;
  difficulty: string;
  count: number;
}

interface MatrixItem {
  id: string; // unique id in matrix
  category_id: string;
  math_form: string;
  topic: string;
  question_type: string; // TN, DS, TLN, TL
  difficulty: string; // 1, 2, 3, 4
  count: number;
  max_count: number;
  diemMoiCau: number;   // điểm mỗi câu của dòng này, mặc định theo loại câu
}

export default function ExamsManagerPage() {
  const supabase = createClient();

  // Filters
  const [examType, setExamType] = useState("Kiểm tra Giữa kỳ I");
  const [grade, setGrade] = useState("12");
  const [subject, setSubject] = useState("Đại số");
  const [topicFilter, setTopicFilter] = useState("");
  const [topicList, setTopicList] = useState<string[]>([]);
  const [lessonFilter, setLessonFilter] = useState("");
  const [lessonList, setLessonList] = useState<string[]>([]);
  const [formFilter, setFormFilter] = useState("");
  const [formList, setFormList] = useState<string[]>([]);
  const [qTypeFilter, setQTypeFilter] = useState("");
  const [uniqueGrades, setUniqueGrades] = useState<string[]>([]);
  const [uniqueSubjects, setUniqueSubjects] = useState<string[]>([]);
  
  // Data State
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [inventory, setInventory] = useState<InventoryData[]>([]);
  const [matrixItems, setMatrixItems] = useState<MatrixItem[]>([]);
  
  // Loading & Generating
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  
  // UI States
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [expandedLessons, setExpandedLessons] = useState<Record<string, boolean>>({});
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);
  const [isDauDeExpanded, setIsDauDeExpanded] = useState(false);

  // Khuôn cấu trúc đề (3-2-2-3, 4-6, 7-3, 100% trắc nghiệm...) và đầu đề in trên giấy
  const [khuonDe, setKhuonDe] = useState("3-2-2-3");
  const [dauDe, setDauDe] = useState<DauDe>(() => dauDeMacDinh("Kiểm tra Giữa kỳ I", "12", "Đại số"));

  // Ma trận mẫu đã lưu, để năm sau khỏi tick lại từ đầu
  const [mauList, setMauList] = useState<any[]>([]);
  const [dangLuuMau, setDangLuuMau] = useState(false);
  const [chuaTaoBang, setChuaTaoBang] = useState(false);

  // Danh sách bộ đề đã lưu, để mở lại in lại đúng đề đã phát cho học sinh
  const [boDeList, setBoDeList] = useState<any[]>([]);

  // Bản nháp phiên ra đề: dùng chung bảng ban_nhap_soan với loai='ra_de'
  const [nhapCu, setNhapCu] = useState<any>(null);
  const [dangLuuNhap, setDangLuuNhap] = useState(false);

  // Hộp thoại nạp ma trận từ ảnh/PDF/Word bằng AI.
  const [moNapMaTran, setMoNapMaTran] = useState(false);

  // Ô ma trận đang nhờ AI soạn bù cho đủ số câu.
  const [oSinhBu, setOSinhBu] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchBaseCategories = async () => {
      const { data } = await supabase.from('question_categories').select('grade, subject');
      if (data) {
        setUniqueGrades(Array.from(new Set(data.map(d => d.grade))).filter(Boolean).sort() as string[]);
        setUniqueSubjects(Array.from(new Set(data.map(d => d.subject))).filter(Boolean) as string[]);
      }
    };
    fetchBaseCategories();
  }, []);

  useEffect(() => {
    const fetchTreeFilters = async () => {
      if (!grade || !subject) {
        setTopicList([]); setLessonList([]); setFormList([]);
        return;
      }
      let query = supabase.from('question_categories').select('topic, lesson, math_form').eq('grade', grade).eq('subject', subject);
      const { data } = await query;
      if (data) {
        setTopicList(Array.from(new Set(data.map(d => d.topic))).filter(Boolean) as string[]);
        
        let lessonData = data;
        if (topicFilter) lessonData = data.filter(d => d.topic === topicFilter);
        setLessonList(Array.from(new Set(lessonData.map(d => d.lesson))).filter(Boolean) as string[]);

        let formData = lessonData;
        if (lessonFilter) formData = lessonData.filter(d => d.lesson === lessonFilter);
        setFormList(Array.from(new Set(formData.map(d => d.math_form))).filter(Boolean) as string[]);
      }
    };
    fetchTreeFilters();
  }, [grade, subject, topicFilter, lessonFilter]);

  const fetchTreeAndInventory = async () => {
    setIsLoadingTree(true);
    try {
      // 1. Lấy danh mục
      let query = supabase.from('question_categories').select('*').order('topic').order('lesson');
      if (grade) query = query.eq('grade', grade);
      if (subject) query = query.eq('subject', subject);
      if (topicFilter) query = query.eq('topic', topicFilter);
      if (lessonFilter) query = query.eq('lesson', lessonFilter);
      if (formFilter) query = query.eq('math_form', formFilter);
      
      const { data: cats, error: err1 } = await query;
      if (err1) throw err1;
      
      // 2. Quét kho
      // Supabase/PostgREST mặc định chỉ trả tối đa 1000 dòng cho 1 lần truy vấn.
      // Với bộ lọc rộng (VD chỉ chọn Lớp/Phân môn), số câu trong kho dễ vượt 1000
      // nên phải phân trang lấy hết, nếu không số "(Kho: N)" sẽ đếm thiếu.
      const qSelect = 'topic, lesson, math_form, grade, subject, question_type, difficulty';
      const qData: any[] = [];
      const PAGE_SIZE = 1000;
      for (let from = 0; ; from += PAGE_SIZE) {
        let qQuery = supabase.from('questions').select(qSelect).range(from, from + PAGE_SIZE - 1);
        if (grade) qQuery = qQuery.eq('grade', grade);
        if (subject) qQuery = qQuery.eq('subject', subject);
        if (topicFilter) qQuery = qQuery.eq('topic', topicFilter);
        if (lessonFilter) qQuery = qQuery.eq('lesson', lessonFilter);
        if (formFilter) qQuery = qQuery.eq('math_form', formFilter);
        if (qTypeFilter) qQuery = qQuery.eq('question_type', qTypeFilter);

        const { data: page, error: err2 } = await qQuery;
        if (err2) throw err2;
        qData.push(...(page || []));
        if (!page || page.length < PAGE_SIZE) break;
      }

      const counts: Record<string, number> = {};
      const extraCatsMap = new Map<string, CategoryData>();

      qData.forEach(q => {
        const form = q.math_form;
        // Quy về mã chuẩn NLC/DS/TLN/TL; dữ liệu cũ còn ghi 'TN' nên phải đi qua toBankType
        const qType = toBankType(q.question_type) || 'NLC';
        const qDiff = q.difficulty || '1';
        
        if (form) {
          const key = `${form}||${qType}||${qDiff}`;
          counts[key] = (counts[key] || 0) + 1;
          
          if (!extraCatsMap.has(form)) {
            extraCatsMap.set(form, {
              id: `auto_${form}`,
              grade: q.grade || grade,
              subject: q.subject || subject,
              topic: q.topic || 'Chưa phân loại',
              lesson: q.lesson || 'Chưa phân loại',
              math_form: form
            });
          }
        }
      });

      const inv: InventoryData[] = Object.keys(counts).map(k => {
        const [math_form, question_type, difficulty] = k.split('||');
        return { math_form, question_type, difficulty, count: counts[k] };
      });
      
      let finalCats = [...(cats || [])];
      extraCatsMap.forEach((val, key) => {
        if (!finalCats.find(c => c.math_form === key)) {
          finalCats.push(val);
        }
      });
      
      setCategories(finalCats);
      setInventory(inv);
    } catch (e: any) {
      alert("Lỗi tải cây thư mục: " + e.message);
    } finally {
      setIsLoadingTree(false);
    }
  };

  const toggleTopic = (topic: string) => setExpandedTopics(prev => ({ ...prev, [topic]: !prev[topic] }));
  const toggleLesson = (lesson: string) => setExpandedLessons(prev => ({ ...prev, [lesson]: !prev[lesson] }));
  const toggleType = (key: string) => setExpandedTypes(prev => ({ ...prev, [key]: !prev[key] }));

  const toggleMatrixItem = (cat: CategoryData, inv: InventoryData) => {
    const key = `${cat.math_form}_${inv.question_type}_${inv.difficulty}`;
    const existing = matrixItems.find(m => m.id === key);
    if (existing) {
      setMatrixItems(matrixItems.filter(item => item.id !== key));
    } else {
      setMatrixItems([...matrixItems, {
        id: key,
        category_id: cat.id,
        math_form: cat.math_form,
        topic: cat.topic,
        question_type: inv.question_type,
        difficulty: inv.difficulty,
        count: 1,
        max_count: inv.count,
        diemMoiCau: diemMacDinh(inv.question_type),
      }]);
    }
  };

  const removeMatrixItem = (id: string) => {
    setMatrixItems(matrixItems.filter(item => item.id !== id));
  };

  /**
   * Sửa một trường của một dòng ma trận.
   *
   * Số câu bị KẸP trong khoảng 1..max_count: bản cũ chỉ đặt max trên thẻ input nên gõ
   * tay vẫn vượt được số câu kho đang có, rồi sang trang chọn câu mới phát hiện thiếu.
   */
  const updateMatrixItem = (id: string, field: keyof MatrixItem, value: any) => {
    setMatrixItems(matrixItems.map(item => {
      if (item.id !== id) return item;
      if (field === 'count') {
        // CỐ Ý không kẹp theo số câu kho đang có. Kẹp là đúng hồi lối thoát duy nhất
        // là hạ số câu xuống cho khớp kho - tức là để cái kho quyết định đề thi. Giờ
        // đã có nút nhờ AI soạn bù, thầy cô phải nói được "tôi cần 5 câu" rồi mới thấy
        // cảnh báo đỏ và nút soạn bù; kẹp lại thì cảnh báo không bao giờ hiện.
        return { ...item, count: Math.max(1, Number(value) || 1) };
      }
      if (field === 'diemMoiCau') {
        return { ...item, diemMoiCau: Math.max(0, Number(value) || 0) };
      }
      return { ...item, [field]: value };
    }));
  };

  const clearMatrix = () => {
    if(confirm("Bạn có chắc chắn muốn xoá toàn bộ ma trận?")) setMatrixItems([]);
  };

  // Trước đây bấm nút này là hệ thống tự chọn ngẫu nhiên câu hỏi rồi hiện luôn
  // kết quả để xem/xuất - không có cơ hội xem/đổi từng câu cụ thể trước khi chốt.
  // Giờ chuyển sang mở một TAB RIÊNG, rộng rãi, liệt kê toàn bộ câu hỏi ứng viên
  // của từng dòng ma trận (không chỉ số lượng đã chọn ngẫu nhiên) để thầy/cô tự
  // tick chọn đúng câu muốn đưa vào đề, sửa trực tiếp và lưu lại vào ngân hàng
  // ngay tại đó. Chỉ khi nào ok thì mới sang bước xem đề hoàn chỉnh/xuất/chốt đề.
  const generateExam = () => {
    if (matrixItems.length === 0) {
      alert("Vui lòng thêm ít nhất 1 dạng toán vào ma trận!");
      return;
    }
    const draftKey = `examDraft_${Date.now()}`;
    localStorage.setItem(draftKey, JSON.stringify({
      examType, grade, subject, khuonDe, dauDe,
      matrixItems: matrixItems.map(({ id, math_form, topic, question_type, difficulty, count, diemMoiCau }) =>
        ({ id, math_form, topic, question_type, difficulty, count, diemMoiCau })),
    }));
    window.open(`/admin/exams/select?draft=${draftKey}`, '_blank');
  };

  const handleExportMatrix = () => {
    // Có cột Điểm mỗi câu để xuất ra rồi nhập lại vẫn khớp
    const wsData = [
      ["STT", "Dạng Toán", "Loại Câu", "Mức độ", "Số Câu", "Điểm mỗi câu"],
      ...matrixItems.map((item, i) => [
        i + 1,
        item.math_form,
        item.question_type,
        item.difficulty,
        item.count,
        item.diemMoiCau
      ])
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ma Tran");
    XLSX.writeFile(wb, "Ma_Tran_De_Thi.xlsx");
  };

  /* ===================== KHUÔN CẤU TRÚC ĐỀ ===================== */

  /**
   * Áp một khuôn đề: đặt lại điểm mỗi câu theo loại câu của khuôn đó.
   *
   * Khuôn KHÔNG tự thêm dòng vào ma trận vì máy không biết thầy cô muốn lấy dạng toán
   * nào - nó chỉ đặt điểm và đặt chỉ tiêu số câu để thanh tiến độ đối chiếu.
   */
  const apKhuonDe = (ma: string) => {
    setKhuonDe(ma);
    const chiTieu = KHUON_DE[ma]?.chiTieu || {};
    setMatrixItems(prev => prev.map(item => {
      const loai = toBankType(item.question_type);
      const ct = loai ? (chiTieu as any)[loai] : null;
      return { ...item, diemMoiCau: ct ? ct.diemMoiCau : diemMacDinh(item.question_type) };
    }));
  };

  /* ===================== NHẬP MA TRẬN TỪ EXCEL ===================== */

  /**
   * Nạp ma trận từ tệp Excel đã xuất ra trước đó.
   *
   * Dòng nào không khớp được với kho (tên dạng toán sai, hoặc kho không có loại câu /
   * mức độ đó) thì LIỆT KÊ RA cho thầy cô biết, không bỏ qua im lặng - bỏ qua im lặng
   * là kiểu lỗi khó phát hiện nhất: ma trận nạp vào thiếu dòng mà không ai hay.
   */
  const handleImportMatrix = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';   // cho phép chọn lại đúng tệp đó lần sau
    if (!file) return;

    if (inventory.length === 0) {
      alert('Hãy bấm "Tải & Quét Kho" trước để máy biết kho đang có những dạng nào.');
      return;
    }

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

      const nhan = (r: any, ...ten: string[]) => {
        for (const t of ten) if (r[t] !== undefined && r[t] !== '') return r[t];
        return '';
      };

      const themVao: MatrixItem[] = [];
      const khongKhop: string[] = [];

      for (const r of rows) {
        const dang = String(nhan(r, 'Dạng Toán', 'Dang Toan', 'math_form')).trim();
        const loaiTho = String(nhan(r, 'Loại Câu', 'Loai Cau', 'question_type')).trim();
        const mucTho = String(nhan(r, 'Mức độ', 'Muc do', 'difficulty')).trim();
        const soCau = Number(nhan(r, 'Số Câu', 'So Cau', 'count')) || 1;
        const diemO = nhan(r, 'Điểm mỗi câu', 'Diem moi cau', 'diemMoiCau');
        if (!dang) continue;

        const loai = toBankType(loaiTho) || 'NLC';
        const inv = inventory.find(i =>
          i.math_form === dang && i.question_type === loai && String(i.difficulty) === mucTho);

        if (!inv) {
          khongKhop.push(`${dang} · ${bankTypeLabel(loai)} · mức ${mucTho || '?'}`);
          continue;
        }

        const cat = categories.find(c => c.math_form === dang);
        const key = `${dang}_${loai}_${inv.difficulty}`;
        if (themVao.some(x => x.id === key)) continue;

        themVao.push({
          id: key,
          category_id: cat?.id || `auto_${dang}`,
          math_form: dang,
          topic: cat?.topic || '',
          question_type: loai,
          difficulty: String(inv.difficulty),
          count: Math.max(1, soCau),   // giữ đúng số trong tệp, thiếu thì cảnh báo và mời AI soạn bù
          max_count: inv.count,
          diemMoiCau: diemO !== '' ? Number(diemO) || diemMacDinh(loai) : diemMacDinh(loai),
        });
      }

      if (themVao.length === 0) {
        alert('Không nạp được dòng nào.\n\n' +
          (khongKhop.length ? 'Các dòng không khớp với kho:\n- ' + khongKhop.join('\n- ') : 'Tệp không có dòng dữ liệu nào.'));
        return;
      }

      setMatrixItems(themVao);
      let tb = `Đã nạp ${themVao.length} dòng vào ma trận.`;
      if (khongKhop.length) {
        tb += `\n\nCÓ ${khongKhop.length} DÒNG KHÔNG NẠP ĐƯỢC (kho không có dạng/loại/mức này):\n- ` + khongKhop.join('\n- ');
      }
      alert(tb);
    } catch (err: any) {
      alert('Không đọc được tệp Excel: ' + (err?.message || 'lỗi không rõ'));
    }
  };

  /* ===================== NẠP MA TRẬN TỪ ẢNH / TỆP ===================== */

  /** Tên các dạng toán kho đang có, để hộp thoại đối chiếu tên máy đọc được. */
  const danhSachDangTrongKho = Array.from(new Set(inventory.map(i => i.math_form))).sort();

  /**
   * Tên các BÀI HỌC kho đang có. Bảng ma trận theo Công văn 7991 ghi tên bài ở cột
   * "Nội dung / đơn vị kiến thức", nên đây mới là thứ cần đem ra khớp trước tiên.
   */
  const danhSachBaiTrongKho = Array.from(new Set(
    categories.filter(c => c.lesson && danhSachDangTrongKho.includes(c.math_form)).map(c => c.lesson)
  )).sort();

  /** Các dạng toán thuộc một bài, và kho phải đang có câu cho dạng đó. */
  const dangCuaBai = (bai: string): string[] => Array.from(new Set(
    categories.filter(c => c.lesson === bai && danhSachDangTrongKho.includes(c.math_form)).map(c => c.math_form)
  )).sort();

  /** Kho có bao nhiêu câu cho đúng bộ ba này. Hộp thoại gọi để báo đủ/thiếu ngay tại dòng. */
  const demKho = (dang: string, loai: BankType, mucDo: string): number =>
    inventory.find(i => i.math_form === dang && i.question_type === loai && String(i.difficulty) === String(mucDo))?.count || 0;

  /** Dựng yêu cầu soạn bù từ một dòng ma trận đang thiếu câu. */
  const moSinhBu = (item: MatrixItem) => {
    const cat = categories.find(c => c.math_form === item.math_form);
    setOSinhBu({
      grade, subject,
      topic: cat?.topic || item.topic || '',
      lesson: cat?.lesson || '',
      math_form: item.math_form,
      question_type: item.question_type as BankType,
      difficulty: String(item.difficulty),
      soCanThem: Math.max(1, item.count - item.max_count),
    });
  };

  const moHopNapMaTran = () => {
    if (inventory.length === 0) {
      alert('Hãy bấm "Tải & Quét Kho" trước để máy biết kho đang có những dạng nào mà đối chiếu.');
      return;
    }
    setMoNapMaTran(true);
  };

  /**
   * Đưa các dòng thầy cô đã soát trong hộp thoại vào bảng ma trận.
   *
   * Gộp vào ma trận đang có chứ không thay sạch: thầy cô hay tick tay vài dạng rồi
   * mới nạp thêm từ ảnh. Trùng bộ ba (dạng, loại, mức) thì CỘNG DỒN số câu, vì khoá
   * dòng ma trận là bộ ba đó nên không thể có hai dòng giống nhau.
   */
  const napTuAI = (dsNap: DongNapMaTran[]) => {
    setMatrixItems(prev => {
      const ra = [...prev];
      for (const d of dsNap) {
        const soKho = demKho(d.dangTrongKho, d.loaiCau, d.mucDo);
        const key = `${d.dangTrongKho}_${d.loaiCau}_${d.mucDo}`;
        const cu = ra.findIndex(x => x.id === key);
        if (cu >= 0) {
          ra[cu] = { ...ra[cu], count: ra[cu].count + d.soCau };
          continue;
        }
        const cat = categories.find(c => c.math_form === d.dangTrongKho);
        ra.push({
          id: key,
          category_id: cat?.id || `auto_${d.dangTrongKho}`,
          math_form: d.dangTrongKho,
          topic: cat?.topic || '',
          question_type: d.loaiCau,
          difficulty: d.mucDo,
          count: Math.max(1, d.soCau),
          max_count: soKho,
          diemMoiCau: d.diemMoiCau > 0 ? d.diemMoiCau : diemMacDinh(d.loaiCau),
        });
      }
      return ra;
    });
  };
  /* ===================== MA TRẬN MẪU ===================== */

  /** Nạp danh sách ma trận mẫu của chính mình, lọc theo lớp/phân môn đang chọn. */
  const taiDanhSachMau = async () => {
    try {
      const p = new URLSearchParams();
      if (grade) p.set('grade', grade);
      if (subject) p.set('subject', subject);
      const res = await fetch('/api/admin/ma-tran-mau?' + p.toString());
      const d = await res.json();
      setChuaTaoBang(!!d.chuaTaoBang);
      setMauList(d.danhSach || []);
    } catch {
      /* không lấy được danh sách mẫu cũng không chặn việc chính */
    }
  };

  useEffect(() => { taiDanhSachMau(); }, [grade, subject]);

  /** Lưu ma trận đang dựng thành mẫu dùng lại. Cùng tên là ghi đè. */
  const luuMau = async () => {
    if (matrixItems.length === 0) return alert('Chưa có dòng nào trong ma trận để lưu mẫu!');
    const goiY = `${examType} - ${subject || ''} ${grade || ''}`.replace(/\s+/g, ' ').trim();
    const ten = prompt('Đặt tên cho ma trận mẫu này:', goiY);
    if (!ten) return;

    setDangLuuMau(true);
    try {
      const res = await fetch('/api/admin/ma-tran-mau', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ten, loaiDe: examType, grade, subject, khuonDe,
          duLieu: { dongMaTran: matrixItems, dauDe },
          soCau: tinhTongCau(matrixItems as DongMaTran[]),
          tongDiem: tinhTongDiem(matrixItems as DongMaTran[]),
        }),
      });
      const d = await res.json();
      if (res.ok) {
        alert(d.ghiDe ? `Đã ghi đè mẫu "${ten}".` : `Đã lưu mẫu "${ten}". Lần sau chỉ cần chọn lại là ra nguyên bảng.`);
        taiDanhSachMau();
      } else {
        alert('Không lưu được mẫu: ' + (d.error || 'lỗi không rõ'));
      }
    } catch {
      alert('Lỗi kết nối khi lưu mẫu.');
    } finally {
      setDangLuuMau(false);
    }
  };

  /** Chọn một mẫu: nạp lại cả dòng ma trận, đầu đề và khuôn đề. */
  const chonMau = (id: string) => {
    const m = mauList.find(x => x.id === id);
    if (!m) return;
    const dong = m.du_lieu?.dongMaTran || [];
    setMatrixItems(lamMoiSoKho(dong.map((d: any) => ({
      ...d,
      diemMoiCau: d.diemMoiCau ?? diemMacDinh(d.question_type),
    }))));
    if (m.du_lieu?.dauDe) setDauDe(m.du_lieu.dauDe);
    if (m.khuon_de) setKhuonDe(m.khuon_de);
    if (m.loai_de) setExamType(m.loai_de);
  };

  const xoaMau = async (id: string) => {
    const m = mauList.find(x => x.id === id);
    if (!m) return;
    if (!confirm(`Xoá mẫu "${m.ten}"?`)) return;
    try {
      const res = await fetch('/api/admin/ma-tran-mau?id=' + id, { method: 'DELETE' });
      const d = await res.json();
      if (res.ok) { alert('Đã xoá mẫu.'); taiDanhSachMau(); }
      else alert('Không xoá được: ' + (d.error || 'lỗi không rõ'));
    } catch {
      alert('Lỗi kết nối khi xoá mẫu.');
    }
  };

  /**
   * Làm mới số câu kho (max_count) cho các dòng nạp từ mẫu hoặc bản nháp.
   *
   * Dữ liệu đã lưu mang theo max_count của LÚC LƯU. Không làm mới thì cảnh báo
   * "kho thiếu" đối chiếu với số cũ - vô nghĩa, mà lại làm thầy cô tin là đủ.
   * Kho chưa quét (inventory rỗng) thì giữ nguyên, chờ bấm Tải & Quét Kho.
   */
  const lamMoiSoKho = (dong: MatrixItem[]): MatrixItem[] => {
    if (inventory.length === 0) return dong;
    return dong.map(d => {
      const inv = inventory.find(i =>
        i.math_form === d.math_form &&
        i.question_type === d.question_type &&
        String(i.difficulty) === String(d.difficulty));
      return inv ? { ...d, max_count: inv.count } : { ...d, max_count: 0 };
    });
  };

  /* ===================== BỘ ĐỀ ĐÃ LƯU ===================== */

  const taiDanhSachBoDe = async () => {
    try {
      const p = new URLSearchParams();
      if (grade) p.set('grade', grade);
      if (subject) p.set('subject', subject);
      const res = await fetch('/api/admin/bo-de?' + p.toString());
      const d = await res.json();
      setBoDeList(d.danhSach || []);
    } catch {
      /* không lấy được danh sách cũng không chặn việc chính */
    }
  };

  useEffect(() => { taiDanhSachBoDe(); }, [grade, subject]);

  /** Mở lại một bộ đề đã lưu ở tab mới, giữ nguyên ma trận đang dựng ở tab này. */
  const moBoDe = (id: string) => {
    window.open(`/admin/exams/select?boDe=${id}`, '_blank');
  };

  const xoaBoDe = async (id: string) => {
    const b = boDeList.find(x => x.id === id);
    if (!b) return;
    if (!confirm(`Xoá bộ đề "${b.ten}"?\n\nViệc này không hoàn tác được.`)) return;
    try {
      const res = await fetch('/api/admin/bo-de?id=' + id, { method: 'DELETE' });
      const d = await res.json();
      if (res.ok) { alert('Đã xoá bộ đề.'); taiDanhSachBoDe(); }
      else alert('Không xoá được: ' + (d.error || 'lỗi không rõ'));
    } catch {
      alert('Lỗi kết nối khi xoá bộ đề.');
    }
  };

  /* ===================== LƯU TẠM PHIÊN RA ĐỀ ===================== */

  /** Lưu bài đang làm dở. Chỉ chạy khi thầy cô bấm nút. */
  const luuNhap = async () => {
    if (matrixItems.length === 0) return alert('Chưa có dòng nào trong ma trận để lưu tạm!');
    setDangLuuNhap(true);
    try {
      const res = await fetch('/api/admin/ban-nhap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loai: 'ra_de',
          ten: `${examType} · ${subject || '?'} ${grade || ''} · ${tinhTongCau(matrixItems as DongMaTran[])} câu`,
          soCau: tinhTongCau(matrixItems as DongMaTran[]),
          duLieu: { matrixItems, examType, grade, subject, khuonDe, dauDe },
        }),
      });
      const d = await res.json();
      if (res.ok) alert('Đã lưu tạm. Lần sau mở trang này sẽ có nút mở lại làm tiếp.');
      else alert('Không lưu tạm được: ' + (d.error || 'lỗi không rõ'));
    } catch {
      alert('Lỗi kết nối khi lưu tạm.');
    } finally {
      setDangLuuNhap(false);
    }
  };

  // Hỏi hệ thống xem có bản nháp ra đề lần trước không, để mời thầy cô mở lại
  useEffect(() => {
    fetch('/api/admin/ban-nhap?loai=ra_de')
      .then(r => r.json())
      .then(d => {
        const b = (d.danhSach || [])[0];
        if (b && b.du_lieu?.matrixItems?.length) setNhapCu(b);
      })
      .catch(() => { /* không có nháp cũng không sao */ });
  }, []);

  const moLaiNhap = () => {
    const d = nhapCu?.du_lieu;
    if (!d) return;
    setMatrixItems(lamMoiSoKho((d.matrixItems || []).map((x: any) => ({
      ...x, diemMoiCau: x.diemMoiCau ?? diemMacDinh(x.question_type),
    }))));
    if (d.examType) setExamType(d.examType);
    if (d.grade) setGrade(d.grade);
    if (d.subject) setSubject(d.subject);
    if (d.khuonDe) setKhuonDe(d.khuonDe);
    if (d.dauDe) setDauDe(d.dauDe);
    setNhapCu(null);
  };

  const boNhap = async (hoi = true) => {
    if (hoi && !confirm('Bỏ bản nháp ra đề lần trước?')) return;
    try {
      if (nhapCu?.id) await fetch('/api/admin/ban-nhap?id=' + nhapCu.id, { method: 'DELETE' });
    } catch { /* bỏ không được cũng không chặn việc chính */ }
    setNhapCu(null);
  };

  /* ===================== SỐ TỔNG ===================== */

  const dongMaTran = matrixItems as DongMaTran[];
  const tongCau = tinhTongCau(dongMaTran);
  const tongDiem = tinhTongDiem(dongMaTran);
  const theoLoai = gomTheoLoai(dongMaTran);
  const chiTieuKhuon = (KHUON_DE[khuonDe]?.chiTieu || {}) as Record<string, { soCau: number; diemMoiCau: number }>;
  const soDongThieuKho = matrixItems.filter(i => i.count > i.max_count).length;

  // Đầu đề bám theo kỳ kiểm tra / lớp / phân môn đang chọn, giữ nguyên các ô thầy đã sửa
  useEffect(() => {
    setDauDe(prev => ({
      ...prev,
      tenKyThi: (examType || 'Đề kiểm tra').toUpperCase(),
      monLop: [subject, grade && `Lớp ${grade}`].filter(Boolean).join(' - '),
    }));
  }, [examType, grade, subject]);

  const getTypeName = (type: string) => {
    const t = type?.toLowerCase() || '';
    if (['tn', 'nlc', 'multiple_choice'].includes(t)) return 'Trắc nghiệm nhiều lựa chọn';
    if (['ds', 'true_false', 'true_false_cluster'].includes(t)) return 'Trắc nghiệm Đúng/Sai';
    if (['tln', 'short_answer'].includes(t)) return 'Trả lời ngắn';
    if (['tl', 'essay'].includes(t)) return 'Tự luận';
    return type || 'Khác';
  };
  
  const getDiffName = (level: string) => {
    const l = level?.toLowerCase() || '';
    if (['1', 'nb', 'nhận biết'].includes(l)) return 'Mức 1 (Nhận biết)';
    if (['2', 'th', 'thông hiểu'].includes(l)) return 'Mức 2 (Thông hiểu)';
    if (['3', 'vd', 'vận dụng'].includes(l)) return 'Mức 3 (Vận dụng)';
    if (['4', 'vdc', 'vận dụng cao'].includes(l)) return 'Mức 4 (Vận dụng cao)';
    return `Mức ${level}`;
  };

  // Group Categories & Inventory for UI Tree
  const groupedCategories: Record<string, Record<string, Record<string, any[]>>> = {};
  
  categories.forEach(cat => {
    const invItems = inventory.filter(i => i.math_form === cat.math_form);
    if (invItems.length === 0) return; // Chỉ hiển thị dạng toán có trong kho

    if (!groupedCategories[cat.topic]) groupedCategories[cat.topic] = {};
    if (!groupedCategories[cat.topic][cat.lesson]) groupedCategories[cat.topic][cat.lesson] = {};
    
    invItems.forEach(inv => {
      const typeName = getTypeName(inv.question_type);
      if (!groupedCategories[cat.topic][cat.lesson][typeName]) {
        groupedCategories[cat.topic][cat.lesson][typeName] = [];
      }
      groupedCategories[cat.topic][cat.lesson][typeName].push({ cat, inv });
    });
  });

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden text-gray-800">
      <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-4">

        {/* Bản nháp lần trước: mời mở lại thay vì tick lại từ đầu */}
        {nhapCu && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3 shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="text-sm font-bold text-amber-900 flex-1 min-w-0">
              Có bản nháp ra đề lần trước: {nhapCu.ten || 'chưa đặt tên'}
              {nhapCu.updated_at && ` · ${new Date(nhapCu.updated_at).toLocaleString('vi-VN')}`}
            </span>
            <button onClick={moLaiNhap} className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-700">
              Mở lại làm tiếp
            </button>
            <button onClick={() => boNhap(true)} className="text-sm font-bold text-amber-700 hover:underline px-2">
              Bỏ nháp
            </button>
          </div>
        )}

        {/* Header & Filter */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4 flex-shrink-0">
          <div className="flex justify-between items-center cursor-pointer select-none" onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}>
            <h2 className="text-xl font-bold text-teal-800 flex items-center gap-2">
              <Sliders className="w-6 h-6" /> Thiết lập Ma trận Đề thi chuẩn 2025
            </h2>
            <button className="text-gray-400 hover:text-teal-600 transition-colors p-1 bg-gray-50 rounded-lg hover:bg-teal-50">
              {isHeaderExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
          
          {isHeaderExpanded && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex flex-wrap items-center gap-3">
              <select value={examType} onChange={e=>setExamType(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 font-bold text-indigo-700 bg-indigo-50 outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                <option>Kiểm tra Giữa kỳ I</option>
                <option>Kiểm tra Cuối kỳ I</option>
                <option>Kiểm tra Giữa kỳ II</option>
                <option>Kiểm tra Cuối kỳ II</option>
                <option>Sinh bài giảng (Ôn tập)</option>
                <option>Đề thi thử THPT QG</option>
                <option>Đề thi thử lớp 10</option>
              </select>
              <select
                value={khuonDe}
                onChange={e => apKhuonDe(e.target.value)}
                title={KHUON_DE[khuonDe]?.moTa}
                className="border border-gray-200 rounded-xl px-4 py-2.5 font-bold text-purple-700 bg-purple-50 outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              >
                {MA_KHUON_DE.map(ma => <option key={ma} value={ma}>{KHUON_DE[ma].ten}</option>)}
              </select>
              <div className="w-px h-6 bg-gray-200 mx-1"></div>
              <select value={grade} onChange={e=>setGrade(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium bg-white">
                <option value="">-- Khối Lớp --</option>
                {uniqueGrades.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <select value={subject} onChange={e=>setSubject(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium bg-white">
                <option value="">-- Phân môn --</option>
                {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={topicFilter} onChange={e=>setTopicFilter(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium bg-white max-w-[200px]">
                <option value="">-- Chuyên đề (Tất cả) --</option>
                {topicList.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={lessonFilter} onChange={e=>setLessonFilter(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium bg-white max-w-[200px]">
                <option value="">-- Bài học (Tất cả) --</option>
                {lessonList.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <select value={formFilter} onChange={e=>setFormFilter(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium bg-white max-w-[200px]">
                <option value="">-- Dạng toán (Tất cả) --</option>
                {formList.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select value={qTypeFilter} onChange={e=>setQTypeFilter(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium bg-white max-w-[200px]">
                <option value="">-- Dạng thức (Tất cả) --</option>
                <option value="NLC">Trắc nghiệm</option>
                <option value="DS">Đúng/Sai</option>
                <option value="TLN">Trả lời ngắn</option>
                <option value="TL">Tự luận</option>
              </select>
              <button onClick={fetchTreeAndInventory} disabled={isLoadingTree} className="bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-teal-700 transition-colors text-sm shadow-sm disabled:opacity-50 flex items-center gap-2">
                {isLoadingTree ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Database className="w-4 h-4" />}
                Tải & Quét Kho
              </button>
            </div>

            {/* Đầu đề in trên giấy: gập lại cho gọn, mở ra khi cần sửa */}
            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => setIsDauDeExpanded(!isDauDeExpanded)}>
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" /> Đầu đề in trên giấy
                  <span className="font-medium text-gray-400 text-[12px]">
                    {dauDe.tenLopHoc} · {dauDe.monLop || '(chưa chọn lớp)'} · mã {dauDe.maDe || '?'}
                  </span>
                </h3>
                <button className="text-gray-400 hover:text-indigo-600 p-1">
                  {isDauDeExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
              {isDauDeExpanded && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3 animate-in fade-in slide-in-from-top-1">
                  {([
                    ['tenLopHoc', 'Tên lớp học'],
                    ['tenKyThi', 'Tên kỳ kiểm tra'],
                    ['monLop', 'Môn - Lớp'],
                    ['namHoc', 'Năm học'],
                    ['thoiGian', 'Thời gian làm bài'],
                    ['maDe', 'Mã đề'],
                  ] as [keyof DauDe, string][]).map(([khoa, nhan]) => (
                    <label key={khoa} className="flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-gray-500 uppercase">{nhan}</span>
                      <input
                        value={dauDe[khoa]}
                        onChange={e => setDauDe(prev => ({ ...prev, [khoa]: e.target.value }))}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3 mt-1">
              {/* Ma trận mẫu: dựng một lần, năm sau chọn lại là ra nguyên bảng */}
              <Layers className="w-4 h-4 text-gray-400" />
              <select
                onChange={e => { if (e.target.value) chonMau(e.target.value); e.target.value = ''; }}
                defaultValue=""
                className="border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium bg-white max-w-[240px]"
              >
                <option value="">
                  {chuaTaoBang ? '-- Chưa tạo bảng ma trận mẫu --'
                    : mauList.length ? `-- Chọn ma trận mẫu (${mauList.length}) --`
                    : '-- Chưa có mẫu nào --'}
                </option>
                {mauList.map(m => (
                  <option key={m.id} value={m.id}>{m.ten} ({m.so_cau} câu · {soDiemVN(Number(m.tong_diem) || 0)}đ)</option>
                ))}
              </select>
              <button onClick={luuMau} disabled={dangLuuMau} className="flex items-center gap-2 border border-purple-600 text-purple-700 hover:bg-purple-50 px-3 py-2.5 rounded-xl font-bold transition-colors text-sm bg-white disabled:opacity-50">
                {dangLuuMau ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu mẫu này
              </button>
              {mauList.length > 0 && (
                <select
                  onChange={e => { if (e.target.value) xoaMau(e.target.value); e.target.value = ''; }}
                  defaultValue=""
                  className="border border-red-200 text-red-600 rounded-xl px-3 py-2.5 outline-none text-sm font-medium bg-white max-w-[160px]"
                >
                  <option value="">-- Xoá mẫu --</option>
                  {mauList.map(m => <option key={m.id} value={m.id}>{m.ten}</option>)}
                </select>
              )}

              {/* Bộ đề đã lưu: mở lại để in lại đúng đề đã phát cho học sinh */}
              {boDeList.length > 0 && (
                <>
                  <select
                    onChange={e => { if (e.target.value) moBoDe(e.target.value); e.target.value = ''; }}
                    defaultValue=""
                    className="border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium bg-white max-w-[260px]"
                  >
                    <option value="">-- Mở bộ đề đã lưu ({boDeList.length}) --</option>
                    {boDeList.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.ten} · {b.so_cau} câu{b.da_chot ? ' · đã chốt' : ''}
                      </option>
                    ))}
                  </select>
                  <select
                    onChange={e => { if (e.target.value) xoaBoDe(e.target.value); e.target.value = ''; }}
                    defaultValue=""
                    className="border border-red-200 text-red-600 rounded-xl px-3 py-2.5 outline-none text-sm font-medium bg-white max-w-[150px]"
                  >
                    <option value="">-- Xoá bộ đề --</option>
                    {boDeList.map(b => <option key={b.id} value={b.id}>{b.ten}</option>)}
                  </select>
                </>
              )}

              <div className="flex-1" />

              <button onClick={luuNhap} disabled={dangLuuNhap} className="flex items-center gap-2 border border-amber-500 text-amber-700 hover:bg-amber-50 px-4 py-2.5 rounded-xl font-bold transition-colors text-sm bg-white disabled:opacity-50" title="Giữ bài đang làm dở để lần sau mở lại làm tiếp">
                {dangLuuNhap ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu tạm
              </button>
              <button onClick={handleExportMatrix} className="flex items-center gap-2 border border-teal-600 text-teal-700 hover:bg-teal-50 px-4 py-2.5 rounded-xl font-bold transition-colors text-sm bg-white">
                <Download className="w-4 h-4" /> Xuất Excel mẫu
              </button>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImportMatrix} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 px-4 py-2.5 rounded-xl font-bold transition-colors text-sm bg-white" title="Nạp ma trận từ tệp Excel đã xuất ra trước đó">
                <UploadCloud className="w-4 h-4" /> Import Excel
              </button>
              <button onClick={moHopNapMaTran} className="flex items-center gap-2 border border-teal-600 text-teal-700 hover:bg-teal-50 px-4 py-2.5 rounded-xl font-bold transition-colors text-sm bg-white" title="Đọc bảng ma trận từ ảnh chụp, tệp PDF hoặc tệp Word">
                <Wand2 className="w-4 h-4" /> Nạp từ ảnh/tệp (AI)
              </button>
            </div>
          </div>
          )}
        </div>

        {/* 2 Columns Layout */}
        <div className="flex flex-1 gap-4 overflow-hidden min-h-0">
          
          {/* Cột trái: Cây thư mục */}
          <div className="w-[45%] bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden flex-shrink-0">
            <div className="p-3 bg-blue-50 border-b border-blue-100 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-blue-800 text-[15px] flex items-center gap-2">1. Chọn Dạng Toán</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
              {Object.keys(groupedCategories).length === 0 ? (
                <div className="text-center text-gray-400 mt-10 text-sm">Vui lòng chọn Lớp/Môn và bấm "Tải & Quét Kho"</div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedCategories).map(([topic, lessons]) => {
                    const isTopicExpanded = expandedTopics[topic] !== false;
                    return (
                    <div key={topic} className="border-b border-gray-100 pb-3">
                      <div 
                        className="font-bold text-indigo-900 text-[14px] mb-2 flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors"
                        onClick={() => toggleTopic(topic)}
                      >
                        <Folder className="w-5 h-5 text-indigo-600" />
                        <span className="uppercase" title={topic}>{topic}</span>
                      </div>
                      
                      {isTopicExpanded && (
                        <div className="space-y-3 pl-3 border-l-2 border-indigo-50 ml-3 mt-2">
                          {Object.entries(lessons).map(([lesson, types]) => {
                            const isLessonExpanded = expandedLessons[lesson] !== false;
                            return (
                            <div key={lesson} className="bg-gray-100/50 rounded-lg overflow-hidden border border-gray-200/50">
                              <div 
                                className="font-semibold text-gray-700 text-[13px] flex items-center gap-2 cursor-pointer bg-gray-200/50 hover:bg-gray-200 p-2.5 transition-colors"
                                onClick={() => toggleLesson(lesson)}
                              >
                                <File className="w-4 h-4 text-blue-500 shrink-0" />
                                <span title={lesson}>Bài: {lesson}</span>
                              </div>
                              
                              {isLessonExpanded && (
                                <div className="space-y-3 p-3 bg-white">
                                  {Object.entries(types).map(([typeName, forms]) => {
                                    const typeKey = `${lesson}_${typeName}`;
                                    const isTypeExpanded = expandedTypes[typeKey] !== false;
                                    return (
                                      <div key={typeName} className="mb-2 last:mb-0">
                                        <div 
                                          className="text-[13px] text-teal-800 font-bold flex items-center gap-2 cursor-pointer hover:text-teal-600 mb-1.5"
                                          onClick={() => toggleType(typeKey)}
                                        >
                                          <List className="w-4 h-4 text-teal-500 shrink-0" />
                                          {typeName}
                                        </div>
                                        {isTypeExpanded && (
                                          <div className="space-y-2 pl-6">
                                            {(() => {
                                              const formsGrouped = forms.reduce((acc, {cat, inv}) => {
                                                if (!acc[cat.math_form]) acc[cat.math_form] = [];
                                                // Lọc trùng lặp do mảng categories có thể bị duplicate math_form
                                                const exists = acc[cat.math_form].some((item: any) => 
                                                  item.inv.question_type === inv.question_type && 
                                                  item.inv.difficulty === inv.difficulty
                                                );
                                                if (!exists) {
                                                  acc[cat.math_form].push({cat, inv});
                                                }
                                                return acc;
                                              }, {} as Record<string, any[]>);

                                              return Object.entries(formsGrouped).map(([mathFormName, items], idx) => (
                                                <div key={idx} className="bg-white border border-gray-200/60 rounded-xl overflow-hidden hover:border-indigo-200 transition-colors">
                                                  <div className="px-3 py-2 bg-gray-50/50 border-b border-gray-100 text-[13px] text-gray-800 font-semibold leading-snug">
                                                    {mathFormName}
                                                  </div>
                                                  <div className="p-2.5 flex flex-wrap gap-2">
                                                    {(items as any[]).map(({cat, inv}: any, subIdx: number) => {
                                                      const formKey = `${cat.math_form}_${inv.question_type}_${inv.difficulty}`;
                                                      const isChecked = matrixItems.some(m => m.id === formKey);
                                                      return (
                                                        <label 
                                                          key={subIdx} 
                                                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer border transition-colors ${isChecked ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'}`}
                                                        >
                                                          <input 
                                                            type="checkbox" 
                                                            className="flex-shrink-0 cursor-pointer w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                            checked={isChecked}
                                                            onChange={() => toggleMatrixItem(cat, inv)}
                                                          />
                                                          <span className="text-[12px] text-gray-700 font-medium">
                                                            {getDiffName(inv.difficulty)} <span className="text-gray-400 font-normal">({inv.count})</span>
                                                          </span>
                                                        </label>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              ));
                                            })()}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )})}
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              )}
            </div>
          </div>

          {/* Cột phải: Bảng Ma trận */}
          <div className="w-[55%] bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
            <div className="p-3 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-emerald-800 text-[15px]">2. Cấu hình Ma Trận</h3>
              <button onClick={clearMatrix} className="text-xs text-red-600 font-bold hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Xóa bảng
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto relative scrollbar-thin">
              {matrixItems.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 opacity-60">
                  <Settings className="w-16 h-16 mb-4" />
                  <p>Chưa chọn dạng toán nào từ cây thư mục bên trái.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-blue-50/50 sticky top-0 shadow-sm z-10">
                    <tr className="text-[11px] uppercase text-gray-500 font-bold border-b border-gray-100">
                      <th className="p-3">STT</th>
                      <th className="p-3">Dạng Toán</th>
                      <th className="p-3 text-center">Loại Câu</th>
                      <th className="p-3 text-center">Mức độ</th>
                      <th className="p-3 text-center w-20">Số câu</th>
                      <th className="p-3 text-center w-24">Điểm/câu</th>
                      <th className="p-3 text-center w-12">HĐ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {matrixItems.map((item, idx) => {
                      const thieuKho = item.count > item.max_count;
                      return (
                      <tr key={item.id} className={thieuKho ? "bg-red-50" : "hover:bg-gray-50/50"}>
                        <td className="p-3 text-center font-bold text-gray-600">{idx + 1}</td>
                        <td className="p-3">
                          <div className="font-medium text-gray-800 line-clamp-2" title={item.math_form}>{item.math_form}</div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-medium text-indigo-600 text-[12px]">{item.question_type}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-medium text-teal-600 text-[12px]">{getDiffName(item.difficulty)}</span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col items-center">
                            <input 
                              type="number" 
                              min="1" 
                              max={item.max_count}
                              value={item.count} 
                              onChange={(e) => updateMatrixItem(item.id, 'count', parseInt(e.target.value) || 1)}
                              className="w-full border border-gray-200 rounded p-1.5 text-[13px] outline-none focus:border-emerald-500 text-center font-bold"
                            />
                            <span className={thieuKho ? "text-[10px] font-bold text-red-600 mt-1" : "text-[10px] text-gray-400 mt-1"}>
                              {thieuKho ? `Kho chỉ có ${item.max_count} câu` : `(Kho: ${item.max_count})`}
                            </span>
                            {/* Kho thiếu thì cho nhờ AI soạn bù, thay vì bắt hạ số câu
                                xuống cho khớp kho - tức là để kho quyết định đề thi. */}
                            {thieuKho && (
                              <button
                                onClick={() => moSinhBu(item)}
                                title="Nhờ AI soạn thêm câu cùng dạng, cùng mức độ; thầy cô duyệt rồi mới vào kho"
                                className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-50 border border-violet-300 text-violet-700 text-[10px] font-bold hover:bg-violet-100 transition-colors"
                              >
                                <Sparkles className="w-3 h-3" /> Nhờ AI soạn {item.count - item.max_count} câu
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="0"
                            step="0.25"
                            value={item.diemMoiCau}
                            onChange={(e) => updateMatrixItem(item.id, 'diemMoiCau', e.target.value)}
                            className="w-full border border-gray-200 rounded p-1.5 text-[13px] outline-none focus:border-purple-500 text-center font-bold"
                          />
                          <div className="text-[10px] text-gray-400 mt-1 text-center">
                            = {soDiemVN(item.count * item.diemMoiCau)}đ
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <button onClick={() => removeMatrixItem(item.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors border border-red-100">
                            <X className="w-3.5 h-3.5" /> Xóa
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bottom Panel */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0 space-y-3">

              {/* Đối chiếu với chỉ tiêu của khuôn đề đang chọn */}
              {Object.keys(chiTieuKhuon).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(['NLC', 'DS', 'TLN', 'TL'] as const).map(loai => {
                    const ct = chiTieuKhuon[loai];
                    if (!ct) return null;
                    const co = theoLoai[loai];
                    const khop = co.soCau === ct.soCau;
                    return (
                      <span key={loai} className={khop
                        ? "px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200"
                        : "px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200"}>
                        {bankTypeLabel(loai)}: {co.soCau}/{ct.soCau} câu · {soDiemVN(co.diem)}/{soDiemVN(ct.soCau * ct.diemMoiCau)}đ
                      </span>
                    );
                  })}
                </div>
              )}

              {soDongThieuKho > 0 && (
                <div className="flex items-center gap-2 text-[12px] font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {soDongThieuKho} dòng đang cần nhiều câu hơn số kho đang có. Hãy giảm số câu, hoặc bổ sung câu vào ngân hàng.
                </div>
              )}

              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="text-sm flex items-center gap-4 flex-wrap">
                  <span>
                    <span className="text-gray-500">Tổng số câu:</span>{' '}
                    <span className="font-black text-lg text-emerald-600">{tongCau}</span>
                  </span>
                  <span>
                    <span className="text-gray-500">Tổng điểm:</span>{' '}
                    <span className={tongDiem === 10 ? "font-black text-lg text-emerald-600" : "font-black text-lg text-red-600"}>
                      {soDiemVN(tongDiem)}
                    </span>
                    {tongDiem !== 10 && <span className="text-[11px] font-bold text-red-500 ml-1">(khác thang 10)</span>}
                  </span>
                  {tongDiem > 0 && (
                    <span className="text-[11px] text-gray-500">
                      Tỉ lệ:{' '}
                      {(['NLC', 'DS', 'TLN', 'TL'] as const)
                        .filter(l => theoLoai[l].diem > 0)
                        .map(l => `${bankTypeLabel(l)} ${Math.round(theoLoai[l].diem / tongDiem * 100)}%`)
                        .join(' · ')}
                    </span>
                  )}
                </div>
                <button
                  onClick={generateExam}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl font-black shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                  <Shuffle className="w-5 h-5" />
                  XEM TRƯỚC & CHỌN CÂU HỎI
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Đọc bảng ma trận có sẵn từ ảnh/PDF/Word, có bảng soát lại trước khi nạp. */}
      {/* Nhờ AI soạn bù khi kho không đủ; lưu xong thì quét lại kho cho số câu cập nhật. */}
      <SinhBuModal
        isOpen={!!oSinhBu}
        onClose={() => setOSinhBu(null)}
        yeuCau={oSinhBu}
        onDaLuu={() => fetchTreeAndInventory()}
      />

      <NapMaTranModal
        isOpen={moNapMaTran}
        onClose={() => setMoNapMaTran(false)}
        kho={{ danhSachBai: danhSachBaiTrongKho, danhSachDang: danhSachDangTrongKho, dangCuaBai, demKho }}
        onNap={napTuAI}
      />

    </div>
  );
}
