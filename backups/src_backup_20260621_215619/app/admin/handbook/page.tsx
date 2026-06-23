"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { BookOpen, Sparkles, UploadCloud, Plus, Edit2, Trash2, Library, ChevronRight, X, Save, Loader2 } from "lucide-react";
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

export default function AdminHandbook() {
  const [categories, setCategories] = useState<any[]>([]);
  const [formulas, setFormulas] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);
  const [extractMode, setExtractMode] = useState<'direct' | 'indirect'>('direct');
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedFileContents, setSelectedFileContents] = useState<string[]>([]);
  const [indirectJson, setIndirectJson] = useState("");

  const [extractedFormulasReview, setExtractedFormulasReview] = useState<any[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [apiKeyCount, setApiKeyCount] = useState(5); // Số lượng API key có sẵn

  useEffect(() => {
    fetchCategories();
    // Lấy số lượng API key có sẵn từ server
    fetch('/api/formulas/keys').then(r => r.json()).then(d => setApiKeyCount(d.count)).catch(() => {});
  }, []);

  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedApiKeyIndex, setSelectedApiKeyIndex] = useState<number | 'auto'>('auto');

  // Thêm trạng thái cho Cây Danh Mục
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const toggleCat = (id: string) => {
    setExpandedCats(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Thêm trạng thái cho Modal Thêm/Sửa Danh Mục
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatGrade, setNewCatGrade] = useState("12");
  const [newCatParentId, setNewCatParentId] = useState("");
  const [isAddingCat, setIsAddingCat] = useState(false);

  const openAddCatModal = () => {
    setEditingCatId(null);
    setNewCatName("");
    setNewCatGrade("12");
    setNewCatParentId("");
    setIsAddCatModalOpen(true);
  };

  const openEditCatModal = (cat: any) => {
    setEditingCatId(cat.id);
    setNewCatName(cat.name);
    setNewCatGrade(cat.grade || "12");
    setNewCatParentId(cat.parent_id || "");
    setIsAddCatModalOpen(true);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa danh mục này? Cảnh báo: Các công thức hoặc danh mục con bên trong có thể bị mất!")) return;
    const { error } = await supabase.from('formula_categories').delete().eq('id', id);
    if (error) alert("Lỗi xóa danh mục: " + error.message);
    else {
      if (selectedCategory?.id === id || selectedCategory?.parent_id === id) {
        setSelectedCategory(null);
        setFormulas([]);
      }
      await fetchCategories();
    }
  };

  const fetchCategories = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('formula_categories').select('*').order('created_at');
    setCategories(data || []);
    if (data && data.length > 0) {
      setSelectedCategory(data[0]);
      fetchFormulas(data[0].id);
    } else {
      setIsLoading(false);
    }
  };

  const fetchFormulas = async (categoryId: string) => {
    const { data } = await supabase.from('formulas').select('*').eq('category_id', categoryId).order('created_at');
    setFormulas(data || []);
    setIsLoading(false);
  };

  const handleAIGenerate = async () => {
    if (!selectedCategory) return;
    setIsGenerating(true);
    
    // Tìm parent category để có context tốt hơn cho AI
    const parentCat = categories.find(c => c.id === selectedCategory.parent_id);
    const parentName = parentCat ? parentCat.name : "";

    try {
      const res = await fetch('/api/formulas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryName: selectedCategory.name,
          parentCategoryName: parentName,
          apiKeyIndex: selectedApiKeyIndex === 'auto' ? null : selectedApiKeyIndex
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Nhận được mảng công thức JSON, insert vào supabase
      if (Array.isArray(data) && data.length > 0) {
        // Lọc trùng lặp bằng cách so sánh title hoặc latex_content với các công thức hiện tại
        const existingTitles = formulas.map(f => f.title.toLowerCase());
        const existingLatex = formulas.map(f => f.latex_content.replace(/\\s/g, ''));
        
        const formulasToInsert = data.filter((item: any) => {
          const isTitleDup = existingTitles.includes(item.title.toLowerCase());
          const isLatexDup = existingLatex.includes(item.latex_content.replace(/\\s/g, ''));
          return !isTitleDup && !isLatexDup;
        }).map((item: any) => ({
          category_id: selectedCategory.id,
          title: item.title,
          latex_content: item.latex_content,
          description: item.description
        }));

        if (formulasToInsert.length === 0) {
          alert('Tất cả công thức do AI sinh ra đều đã tồn tại trong danh mục này (Chống trùng lặp).');
          setIsGenerating(false);
          return;
        }

        const { error } = await supabase.from('formulas').insert(formulasToInsert);
        if (error) throw error;
        
        await fetchFormulas(selectedCategory.id);
        alert(`Đã tạo thành công ${formulasToInsert.length} công thức mới! (Đã bỏ qua ${data.length - formulasToInsert.length} công thức trùng)`);
      } else {
        alert('AI không trả về công thức nào hợp lệ.');
      }
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    setIsAddingCat(true);
    
    const catData: any = {
      name: newCatName,
      grade: newCatGrade,
      parent_id: newCatParentId || null
    };

    if (editingCatId) {
      const { error } = await supabase.from('formula_categories').update(catData).eq('id', editingCatId);
      if (error) {
        alert("Lỗi: " + error.message);
      } else {
        setIsAddCatModalOpen(false);
        await fetchCategories();
      }
    } else {
      const { error } = await supabase.from('formula_categories').insert([catData]);
      if (error) {
        alert("Lỗi: " + error.message);
      } else {
        setIsAddCatModalOpen(false);
        await fetchCategories();
      }
    }
    setIsAddingCat(false);
  };

  // Trạng thái & Hàm xử lý cho Modal Thêm/Sửa Công Thức
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);
  const [editingFormulaId, setEditingFormulaId] = useState<string | null>(null);
  const [fTitle, setFTitle] = useState("");
  const [fLatex, setFLatex] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fImageUrl, setFImageUrl] = useState("");
  const [isSavingFormula, setIsSavingFormula] = useState(false);

  const openAddFormulaModal = () => {
    setEditingFormulaId(null);
    setFTitle("");
    setFLatex("");
    setFDesc("");
    setFImageUrl("");
    setIsFormulaModalOpen(true);
  };

  const openEditFormulaModal = (formula: any) => {
    setEditingFormulaId(formula.id);
    setFTitle(formula.title);
    setFLatex(formula.latex_content);
    setFDesc(formula.description || "");
    setFImageUrl(formula.image_url || "");
    setIsFormulaModalOpen(true);
  };

  const handleSaveFormula = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fTitle || !fLatex || !selectedCategory) return;
    setIsSavingFormula(true);

    const formulaData = {
      category_id: selectedCategory.id,
      title: fTitle,
      latex_content: fLatex,
      description: fDesc,
      image_url: fImageUrl || null
    };

    if (editingFormulaId) {
      // Update
      const { error } = await supabase.from('formulas').update(formulaData).eq('id', editingFormulaId);
      if (error) alert("Lỗi: " + error.message);
      else {
        setIsFormulaModalOpen(false);
        fetchFormulas(selectedCategory.id);
      }
    } else {
      // Insert
      const { error } = await supabase.from('formulas').insert([formulaData]);
      if (error) alert("Lỗi: " + error.message);
      else {
        setIsFormulaModalOpen(false);
        fetchFormulas(selectedCategory.id);
      }
    }
    setIsSavingFormula(false);
  };

  const handleDeleteFormula = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa công thức này?")) return;
    const { error } = await supabase.from('formulas').delete().eq('id', id);
    if (error) {
      alert("Lỗi: " + error.message);
    } else {
      fetchFormulas(selectedCategory.id);
    }
  };

  const processExtractedData = async (data: any[]) => {
    if (!Array.isArray(data) || data.length === 0) {
      alert('Không nhận diện được công thức nào hợp lệ.');
      setIsExtracting(false);
      return;
    }

    const { data: allFormulas } = await supabase.from('formulas').select('title, latex_content');
    const existingTitles = (allFormulas || []).map(f => f.title.toLowerCase());
    const existingLatex = (allFormulas || []).map(f => f.latex_content.replace(/\s/g, ''));
    
    const formulasToReview = data.map((item: any) => {
      const isTitleDup = existingTitles.includes(item.title?.toLowerCase());
      const isLatexDup = existingLatex.includes(item.latex_content?.replace(/\s/g, ''));
      return {
        ...item,
        id: `TEMP_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        category_id: item.category_id || selectedCategory?.id,
        isDuplicate: isTitleDup || isLatexDup,
        image_url: item.image_url || null,
        needs_image: item.needs_image || false
      };
    });

    setExtractedFormulasReview(formulasToReview);
    setIsReviewModalOpen(true);
    setIsExtractModalOpen(false);
    setIsExtracting(false);
  };

  const handleSaveReviewedFormulas = async () => {
    const validFormulas = extractedFormulasReview.filter(f => !f.isDuplicate && f.category_id);
    if (validFormulas.length === 0) return alert("Không có công thức hợp lệ nào để lưu!");

    setIsSavingFormula(true);
    try {
      const res = await fetch('/api/formulas/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formulas: validFormulas.map(f => ({
            category_id: f.category_id,
            title: f.title || 'Chưa có tên',
            latex_content: f.latex_content || '',
            description: f.description || '',
            image_url: f.image_url || null
          }))
        })
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || 'Lỗi không xác định');
      }
      
      alert(`✅ Đã lưu thành công ${result.count} công thức!`);
      setIsReviewModalOpen(false);
      setExtractedFormulasReview([]);
      if (selectedCategory) fetchFormulas(selectedCategory.id);
    } catch (err: any) {
      alert("Lỗi lưu dữ liệu: " + err.message);
    } finally {
      setIsSavingFormula(false);
    }
  };

  const uploadImageToSupabase = async (file: File): Promise<string | null> => {
    try {
      setIsUploadingImage(true);
      const filePath = `formulas/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('lesson_images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('lesson_images').getPublicUrl(filePath);
      return publicUrl;
    } catch (e: any) {
      alert("Lỗi tải ảnh: " + e.message);
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleFileSelect = (files: FileList | File[]) => {
    Array.from(files).forEach(file => {
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPreviewUrls(prev => [...prev, base64]);
        setSelectedFileContents(prev => [...prev, base64.split(',')[1]]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const filesToProcess: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) filesToProcess.push(file);
      }
    }
    if (filesToProcess.length > 0) handleFileSelect(filesToProcess);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const [isExtracting, setIsExtracting] = useState(false);

  const handleDirectExtract = async () => {
    if (selectedFileContents.length === 0) return;
    setIsExtracting(true);
    try {
      const categoryList = categories.map(c => ({ id: c.id, name: c.name, parent_id: c.parent_id }));
      const res = await fetch('/api/formulas/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: selectedFileContents,
          categories: categoryList,
          apiKeyIndex: selectedApiKeyIndex === 'auto' ? null : selectedApiKeyIndex
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await processExtractedData(data);
    } catch (err: any) {
      alert("Lỗi bóc tách ảnh: " + err.message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleIndirectExtract = async () => {
    if (!indirectJson) return;
    try {
      let cleanJson = indirectJson.trim();
      if (cleanJson.startsWith('```json')) cleanJson = cleanJson.replace('```json', '');
      if (cleanJson.startsWith('```')) cleanJson = cleanJson.replace('```', '');
      if (cleanJson.endsWith('```')) cleanJson = cleanJson.replace(/```$/, '');
      
      const parsedData = JSON.parse(cleanJson);
      await processExtractedData(parsedData);
    } catch (e) {
      alert("Mã JSON không hợp lệ, vui lòng kiểm tra lại.");
    }
  };

  const copyPrompt = () => {
    const categoryList = categories.map(c => ({ id: c.id, name: c.name, parent_id: c.parent_id }));
    const prompt = `Bóc tách toàn bộ công thức toán học có trong bức ảnh này.\nPhân loại từng công thức vào các danh mục sau (chọn category_id phù hợp nhất, bắt buộc phải có):\n${JSON.stringify(categoryList, null, 2)}\n\nTrả về đúng định dạng JSON Mảng (MỖI ĐỐI TƯỢNG BẮT BUỘC CÓ 5 TRƯỜNG): [{"category_id": "...", "title": "...", "latex_content": "...", "description": "...", "needs_image": true/false (true nếu công thức này bắt buộc phải có hình vẽ minh họa đi kèm mới hiểu được, ngược lại false)}]`;
    navigator.clipboard.writeText(prompt);
    alert("Đã copy lệnh Prompt! Bạn hãy mang sang Google Gemini để lấy mã JSON nhé.");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Library className="w-8 h-8 text-indigo-600" />
            Sổ Tay Công Thức
          </h1>
          <p className="text-gray-500 mt-1">Quản lý bách khoa toàn thư Toán học với sự hỗ trợ của AI</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 mr-2">
            <span className="text-sm font-medium text-gray-600 hidden sm:inline">API Key:</span>
            <select 
              value={selectedApiKeyIndex} 
              onChange={e => setSelectedApiKeyIndex(e.target.value === 'auto' ? 'auto' : Number(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-700 font-semibold"
            >
              <option value="auto">🔄 Tự xoay vòng</option>
              <option value={0}>🔑 Key 1 (Mặc định)</option>
              <option value={1}>🔑 Key 2</option>
              <option value={2}>🔑 Key 3</option>
              <option value={3}>🔑 Key 4</option>
              <option value={4}>🔑 Key 5</option>
            </select>
          </div>
          <button 
            onClick={openAddCatModal}
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-semibold hover:bg-gray-50 flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-5 h-5" /> Thêm Danh mục
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Danh mục */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 h-[calc(100vh-200px)] overflow-y-auto">
          <h2 className="font-bold text-gray-700 mb-4 px-2 uppercase text-sm tracking-wider">Cây Mục Lục</h2>
          <div className="space-y-3">
            {categories.filter(c => !c.parent_id).map(parentCat => (
              <div key={parentCat.id} className="space-y-1">
                {/* Parent Category */}
                <div className="flex items-center gap-1 group/cat w-full">
                  <button
                    onClick={() => toggleCat(parentCat.id)}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform ${expandedCats[parentCat.id] ? 'rotate-90' : ''}`} />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCategory(parentCat);
                      fetchFormulas(parentCat.id);
                    }}
                    className={`flex-1 min-w-0 text-left px-2 py-2.5 rounded-xl transition-colors flex items-center justify-between font-bold ${
                      selectedCategory?.id === parentCat.id 
                        ? 'bg-indigo-50 text-indigo-700' 
                        : 'text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden min-w-0 w-full">
                      <BookOpen className={`w-4 h-4 shrink-0 ${selectedCategory?.id === parentCat.id ? 'text-indigo-600' : 'text-gray-500'}`} />
                      <span className="truncate block" title={parentCat.name}>{parentCat.name}</span>
                    </div>
                  </button>
                  <div className="opacity-0 group-hover/cat:opacity-100 flex items-center transition-opacity shrink-0">
                    <button onClick={() => openEditCatModal(parentCat)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDeleteCategory(parentCat.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                
                {/* Child Categories */}
                {expandedCats[parentCat.id] && (
                  <div className="pl-8 space-y-1 mt-1">
                    {categories.filter(c => c.parent_id === parentCat.id).map(childCat => (
                      <div key={childCat.id} className="flex items-center gap-1 group/child w-full">
                        <button
                          onClick={() => {
                            setSelectedCategory(childCat);
                            fetchFormulas(childCat.id);
                          }}
                          className={`flex-1 min-w-0 text-left px-3 py-2 rounded-xl transition-colors flex items-center justify-between text-sm ${
                            selectedCategory?.id === childCat.id 
                              ? 'bg-indigo-50 text-indigo-700 font-semibold' 
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <span className="truncate block w-full" title={childCat.name}>{childCat.name}</span>
                        </button>
                        <div className="opacity-0 group-hover/child:opacity-100 flex items-center transition-opacity shrink-0">
                          <button onClick={() => openEditCatModal(childCat)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 className="w-3 h-3" /></button>
                          <button onClick={() => handleDeleteCategory(childCat.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {categories.length === 0 && !isLoading && (
              <p className="text-sm text-gray-400 text-center py-4">Chưa có danh mục nào.</p>
            )}
          </div>
        </div>

        {/* Nội dung chính */}
        <div className="lg:col-span-3 space-y-6">
          {selectedCategory ? (
            <>
              {/* Toolbar */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                  Chuyên đề: <span className="text-indigo-600">{selectedCategory.name}</span>
                </h3>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleAIGenerate}
                    disabled={isGenerating}
                    className="bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white px-4 py-2 rounded-xl font-semibold hover:shadow-lg hover:shadow-violet-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} /> 
                    {isGenerating ? 'Đang gọi AI...' : 'AI Tự sinh'}
                  </button>
                  <button 
                    onClick={() => setIsExtractModalOpen(true)}
                    className="bg-teal-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-teal-600 transition-all flex items-center gap-2"
                  >
                    <UploadCloud className="w-4 h-4" /> 
                    Bóc tách Ảnh/File
                  </button>
                  <button 
                    onClick={openAddFormulaModal}
                    className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Soạn thủ công
                  </button>
                </div>
              </div>

              {/* Danh sách Công thức */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {isLoading ? (
                  <div className="p-12 text-center text-gray-400">Đang tải...</div>
                ) : formulas.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {formulas.map(formula => (
                      <div key={formula.id} className="p-5 hover:bg-violet-50/30 transition-colors border-l-4 border-l-violet-300">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-base font-bold text-violet-800 mb-3 flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-6 h-6 bg-violet-100 text-violet-600 rounded-full text-xs font-bold shrink-0">✦</span>
                              {formula.title}
                            </h4>
                            <div className="flex gap-4 items-start">
                              <div className="flex-1 min-w-0">
                                <div className="formula-handwritten bg-slate-50 border border-slate-200 rounded-xl p-4 my-2 overflow-x-auto text-lg text-center">
                                  <BlockMath math={formula.latex_content} />
                                </div>
                              </div>
                              {formula.image_url && (
                                <div className="shrink-0 border-2 border-violet-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                  <img 
                                    src={formula.image_url} 
                                    alt={`Minh họa: ${formula.title}`} 
                                    className="max-h-36 max-w-[200px] object-contain p-2" 
                                  />
                                </div>
                              )}
                            </div>
                            {formula.description && (
                              <p className="text-gray-500 text-sm mt-2 italic pl-1 border-l-2 border-gray-200 ml-1">{formula.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button 
                              onClick={() => openEditFormulaModal(formula)}
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteFormula(formula.id)}
                              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-16 text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Library className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Chưa có công thức nào</h3>
                    <p className="text-gray-500 mt-2 max-w-md mx-auto">
                      Hãy dùng tính năng AI để tự động sinh toàn bộ công thức cho chuyên đề này, hoặc thêm thủ công.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-800">Chọn một danh mục</h3>
              <p className="text-gray-500 mt-2">Vui lòng chọn một danh mục bên trái để xem và quản lý công thức.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Thêm Danh Mục */}
      {isAddCatModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-800">
                {editingCatId ? 'Sửa Danh mục' : 'Thêm Danh mục mới'}
              </h3>
            </div>
            <form onSubmit={handleAddCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên danh mục (Chương / Bài)</label>
                <input required value={newCatName} onChange={e => setNewCatName(e.target.value)} type="text" className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" placeholder="VD: Khảo sát hàm số..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thuộc Cấp/Lớp</label>
                <select value={newCatGrade} onChange={e => setNewCatGrade(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="6">Lớp 6</option>
                  <option value="7">Lớp 7</option>
                  <option value="8">Lớp 8</option>
                  <option value="9">Lớp 9</option>
                  <option value="10">Lớp 10</option>
                  <option value="11">Lớp 11</option>
                  <option value="12">Lớp 12</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục cha (Tùy chọn)</label>
                <select value={newCatParentId} onChange={e => setNewCatParentId(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">-- Không có (Làm danh mục gốc) --</option>
                  {categories.filter(c => !c.parent_id).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddCatModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">Hủy</button>
                <button type="submit" disabled={isAddingCat} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50">{isAddingCat ? 'Đang lưu...' : 'Lưu Danh mục'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm/Sửa Công Thức */}
      {isFormulaModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 shrink-0">
              <h3 className="text-xl font-bold text-gray-800">
                {editingFormulaId ? 'Sửa Công Thức' : 'Thêm Công Thức Mới'}
              </h3>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="formulaForm" onSubmit={handleSaveFormula} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên công thức</label>
                  <input required value={fTitle} onChange={e => setFTitle(e.target.value)} type="text" className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="VD: Cosin góc giữa hai vectơ..." />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Mã LaTeX</label>
                    <button 
                      type="button" 
                      onClick={async () => {
                        if (!fLatex) return;
                        setIsSavingFormula(true); // mượn tạm state để disable nút submit
                        try {
                          const res = await fetch('/api/formulas/fix', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              latexCode: fLatex, 
                              title: fTitle,
                              apiKeyIndex: selectedApiKeyIndex === 'auto' ? null : selectedApiKeyIndex
                            })
                          });
                          const data = await res.json();
                          if (data.error) throw new Error(data.error);
                          if (data.correctedLatex) {
                            setFLatex(data.correctedLatex);
                          }
                        } catch (err: any) {
                          alert("Lỗi sửa KaTeX: " + err.message);
                        } finally {
                          setIsSavingFormula(false);
                        }
                      }}
                      disabled={isSavingFormula || !fLatex}
                      className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 font-semibold"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Sửa lỗi thông minh
                    </button>
                  </div>
                  <textarea required value={fLatex} onChange={e => setFLatex(e.target.value)} rows={4} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm" placeholder="\\cos(\\vec{a}, \\vec{b}) = ..." />
                </div>
                {fLatex && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 overflow-x-auto text-lg text-center">
                    <p className="text-xs text-gray-400 mb-2 uppercase font-bold text-left">Xem trước KaTeX:</p>
                    <BlockMath math={fLatex} errorColor="#ef4444" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú (Tùy chọn)</label>
                  <input value={fDesc} onChange={e => setFDesc(e.target.value)} type="text" className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="VD: Tỉ số giữa tích vô hướng..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ảnh minh họa (Tùy chọn)</label>
                  {fImageUrl ? (
                    <div className="relative inline-block w-full border border-gray-200 rounded-xl p-2 bg-gray-50">
                      <img src={fImageUrl} alt="Minh họa" className="max-h-48 rounded mx-auto" />
                      <button type="button" onClick={() => setFImageUrl("")} className="absolute -top-3 -right-3 bg-rose-500 text-white p-1.5 rounded-full shadow hover:bg-rose-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = await uploadImageToSupabase(file);
                            if (url) setFImageUrl(url);
                          }
                        }}
                        className="hidden" 
                        id="formula-image-upload" 
                      />
                      <label 
                        htmlFor="formula-image-upload" 
                        tabIndex={0}
                        onPaste={async (e) => {
                          const files = e.clipboardData?.files;
                          let imageFile = null;
                          if (files && files.length > 0) {
                            const file = Array.from(files).find(f => f.type.startsWith('image/'));
                            if (file) imageFile = file;
                          }
                          if (!imageFile) {
                            const items = e.clipboardData?.items;
                            if (items) {
                              for (let i = 0; i < items.length; i++) {
                                if (items[i].type.indexOf("image") !== -1) {
                                  imageFile = items[i].getAsFile();
                                  break;
                                }
                              }
                            }
                          }
                          
                          if (imageFile) {
                            e.preventDefault();
                            const url = await uploadImageToSupabase(imageFile);
                            if (url) setFImageUrl(url);
                          }
                        }}
                        className="flex items-center justify-center gap-2 w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-50 hover:border-indigo-400 cursor-pointer transition-colors focus:outline-none focus:border-indigo-500 focus:bg-indigo-50"
                      >
                        {isUploadingImage ? <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /> : <UploadCloud className="w-6 h-6 text-gray-400" />}
                        <span className="text-sm font-medium text-gray-600">{isUploadingImage ? "Đang tải..." : "Click chọn hoặc Paste (Ctrl+V) ảnh"}</span>
                      </label>
                    </div>
                  )}
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-gray-100 shrink-0 flex gap-3">
              <button type="button" onClick={() => setIsFormulaModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200">Hủy</button>
              <button form="formulaForm" type="submit" disabled={isSavingFormula} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50">
                {isSavingFormula ? 'Đang lưu...' : 'Lưu Công thức'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bóc tách Ảnh/File */}
      {isExtractModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                <UploadCloud className="w-6 h-6 text-teal-600" /> Công cụ Bóc tách Ảnh / File
              </h3>
              <div className="flex bg-white rounded-xl p-1 border border-gray-200 shadow-sm">
                <button
                  onClick={() => setExtractMode('direct')}
                  className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${extractMode === 'direct' ? 'bg-teal-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  Trực tiếp (API)
                </button>
                <button
                  onClick={() => setExtractMode('indirect')}
                  className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${extractMode === 'indirect' ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  Gián tiếp (Thủ công)
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto flex-1 bg-white">
              {extractMode === 'direct' ? (
                <div className="space-y-6">
                  <div className="bg-teal-50 border border-teal-100 p-4 rounded-xl text-teal-800 text-sm font-medium">
                    Hệ thống sẽ tự động gửi ảnh qua API. Kéo thả hoặc dán (Ctrl+V) ảnh vào khung dưới đây.
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div>
                      <h4 className="font-bold text-gray-700">Chọn API Key</h4>
                      <p className="text-xs text-gray-500">Mặc định hệ thống sẽ tự động quay vòng các Key nếu gặp lỗi bận (503).</p>
                    </div>
                    <select
                      value={selectedApiKeyIndex}
                      onChange={e => setSelectedApiKeyIndex(e.target.value === 'auto' ? 'auto' : Number(e.target.value))}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-medium shrink-0"
                    >
                      <option value="auto">Tự động (Khuyên dùng)</option>
                      {Array.from({ length: apiKeyCount }, (_, i) => (
                        <option key={i} value={i}>API Key {i + 1}{i === 0 ? ' (Mặc định)' : ''}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onPaste={handlePaste}
                    tabIndex={0}
                    className="border-2 border-dashed border-gray-300 rounded-3xl p-12 flex flex-col items-center justify-center bg-gray-50 hover:bg-teal-50/50 hover:border-teal-400 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/20 group cursor-pointer relative min-h-[300px]"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.multiple = true;
                      input.onchange = (e: any) => {
                        if (e.target.files) handleFileSelect(e.target.files);
                      };
                      input.click();
                    }}
                  >
                    {!previewUrls || previewUrls.length === 0 ? (
                      <>
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                          <UploadCloud className="w-10 h-10 text-teal-500" />
                        </div>
                        <h4 className="text-xl font-bold text-gray-700 mb-2">Kéo thả ảnh vào đây</h4>
                        <p className="text-gray-500 text-sm">hoặc Click để chọn file, hoặc nhấn <kbd className="bg-white px-2 py-1 rounded-md border border-gray-200 font-mono shadow-sm">Ctrl + V</kbd> để dán ảnh</p>
                      </>
                    ) : (
                      <div className="w-full">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
                          {previewUrls.map((url, idx) => (
                            <div key={idx} className="relative w-full flex justify-center group/item cursor-default">
                              <img src={url} alt={`Preview ${idx}`} className="h-32 object-cover rounded-xl shadow-md border border-gray-200 w-full" />
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setPreviewUrls(prev => prev.filter((_, i) => i !== idx));
                                  setSelectedFileContents(prev => prev.filter((_, i) => i !== idx));
                                }}
                                className="absolute -top-3 -right-3 bg-white text-rose-500 p-1.5 rounded-full shadow-lg hover:bg-rose-50 border border-rose-100 opacity-0 group-hover/item:opacity-100 transition-opacity z-10 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="mt-6 flex justify-center">
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               const input = document.createElement('input');
                               input.type = 'file';
                               input.accept = 'image/*';
                               input.multiple = true;
                               input.onchange = (ev: any) => {
                                 if (ev.target.files) handleFileSelect(ev.target.files);
                               };
                               input.click();
                             }}
                             className="text-teal-600 bg-teal-50 px-4 py-2 rounded-lg font-semibold hover:bg-teal-100 flex items-center gap-2 transition-colors cursor-pointer"
                           >
                             <Plus className="w-4 h-4" /> Thêm ảnh khác
                           </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-xl text-indigo-800 text-sm font-medium">
                    <p className="font-bold text-base mb-2 flex items-center gap-2">Cách bóc tách gián tiếp (Tránh lỗi 503 tuyệt đối):</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Bấm nút <strong>Copy Lệnh Prompt</strong> bên dưới.</li>
                      <li>Vào trang web <strong>Gemini (Google)</strong> hoặc ChatGPT. Dán lệnh Prompt đó vào cùng với bức ảnh của bạn và ấn Gửi.</li>
                      <li>AI sẽ trả về một khối mã chứa định dạng JSON. Hãy copy đoạn mã đó và <strong>Dán vào khung bên dưới</strong>.</li>
                    </ol>
                  </div>
                  
                  <button onClick={copyPrompt} className="w-full bg-white border-2 border-indigo-200 text-indigo-700 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors flex justify-center items-center gap-2 shadow-sm">
                    <Sparkles className="w-5 h-5" /> Copy Lệnh Prompt
                  </button>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Dán mã JSON từ Gemini vào đây:</label>
                    <textarea
                      value={indirectJson}
                      onChange={e => setIndirectJson(e.target.value)}
                      placeholder='[ { "category_id": "...", "title": "...", "latex_content": "...", "description": "..." } ]'
                      className="w-full h-64 p-4 font-mono text-sm border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none bg-gray-50"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 shrink-0 flex gap-4 bg-gray-50">
              <button onClick={() => { setIsExtractModalOpen(false); setPreviewUrls([]); setSelectedFileContents([]); setIndirectJson(""); }} className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-100 shadow-sm transition-colors">
                Đóng lại
              </button>
              
              {extractMode === 'direct' ? (
                <button 
                  onClick={handleDirectExtract} 
                  disabled={selectedFileContents.length === 0 || isExtracting} 
                  className="flex-1 px-6 py-3 bg-teal-500 text-white rounded-xl font-bold hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-500/30 flex justify-center items-center gap-2 transition-all"
                >
                  {isExtracting ? <Sparkles className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                  {isExtracting ? 'Đang bóc tách API...' : 'Bắt đầu Bóc tách Trực tiếp'}
                </button>
              ) : (
                <button 
                  onClick={handleIndirectExtract}
                  disabled={!indirectJson}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/30 flex justify-center items-center gap-2 transition-all"
                >
                  Xử lý dữ liệu JSON
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Duyệt Công Thức Bóc Tách */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                <Edit2 className="w-6 h-6 text-indigo-600" /> Duyệt & Chỉnh sửa kết quả bóc tách
              </h3>
              <button onClick={() => setIsReviewModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
              <div className="space-y-6">
                {extractedFormulasReview.map((formula, index) => (
                  <div key={formula.id} className={`bg-white p-5 rounded-2xl border ${formula.isDuplicate ? 'border-rose-200' : 'border-gray-200'} shadow-sm relative group`}>
                    {formula.isDuplicate && (
                      <div className="absolute top-0 right-0 bg-rose-100 text-rose-700 text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                        Trùng lặp (Sẽ bị bỏ qua)
                      </div>
                    )}
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-500 w-8">{index + 1}.</span>
                          <input
                            value={formula.title || ""}
                            onChange={e => setExtractedFormulasReview(prev => prev.map(f => f.id === formula.id ? { ...f, title: e.target.value } : f))}
                            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-gray-800"
                            placeholder="Tiêu đề công thức"
                          />
                          <select
                            value={formula.category_id || ""}
                            onChange={e => setExtractedFormulasReview(prev => prev.map(f => f.id === formula.id ? { ...f, category_id: e.target.value } : f))}
                            className="w-56 px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-600"
                          >
                            <option value="">-- Chọn danh mục --</option>
                            {categories.map(c => (
                              <option key={c.id} value={c.id}>{c.grade ? `Lớp ${c.grade} - ` : ''}{c.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="pl-10">
                          <textarea
                            value={formula.latex_content || ""}
                            onChange={e => setExtractedFormulasReview(prev => prev.map(f => f.id === formula.id ? { ...f, latex_content: e.target.value } : f))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm text-gray-700"
                            rows={3}
                            placeholder="Mã LaTeX"
                          />
                          {/* Khung xem trước công thức */}
                          {formula.latex_content && (
                            <div className="mt-2 p-3 formula-handwritten rounded-xl overflow-x-auto text-center">
                              <div className="text-[10px] text-gray-400 mb-1 font-sans text-left">👁️ Xem trước:</div>
                              <BlockMath math={formula.latex_content} />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="w-56 shrink-0 flex flex-col gap-2">
                        {formula.image_url ? (
                          <div className="relative border border-gray-200 rounded-lg p-1 bg-gray-50 h-28 flex items-center justify-center">
                            <img src={formula.image_url} alt="Minh họa" className="max-h-full max-w-full rounded" />
                            <button 
                              onClick={() => setExtractedFormulasReview(prev => prev.map(f => f.id === formula.id ? { ...f, image_url: null } : f))}
                              className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full shadow hover:bg-rose-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5 h-28">
                            {formula.needs_image && (
                              <div className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold flex justify-center items-center gap-1 shadow-sm border border-amber-200 animate-pulse">
                                ⚠️ Yêu cầu đính kèm ảnh!
                              </div>
                            )}
                            <label 
                              tabIndex={0}
                              onPaste={async (e) => {
                                const files = e.clipboardData?.files;
                                let imageFile = null;
                                if (files && files.length > 0) {
                                  const file = Array.from(files).find(f => f.type.startsWith('image/'));
                                  if (file) imageFile = file;
                                }
                                if (!imageFile) {
                                  const items = e.clipboardData?.items;
                                  if (items) {
                                    for (let i = 0; i < items.length; i++) {
                                      if (items[i].type.indexOf("image") !== -1) {
                                        imageFile = items[i].getAsFile();
                                        break;
                                      }
                                    }
                                  }
                                }
                                
                                if (imageFile) {
                                  e.preventDefault();
                                  const url = await uploadImageToSupabase(imageFile);
                                  if (url) {
                                    setExtractedFormulasReview(prev => prev.map(f => f.id === formula.id ? { ...f, image_url: url } : f));
                                  }
                                }
                              }}
                              className={`flex-1 border-2 border-dashed ${formula.needs_image ? 'border-amber-300 bg-amber-50 hover:bg-amber-100 hover:border-amber-400' : 'border-gray-200 hover:bg-indigo-50 hover:border-indigo-300'} rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-indigo-500 cursor-pointer transition-colors focus:outline-none focus:border-indigo-500 focus:bg-indigo-50`}
                            >
                              {isUploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className={`w-6 h-6 mb-1 ${formula.needs_image ? 'text-amber-500' : ''}`} />}
                              <span className={`text-xs font-medium text-center px-1 ${formula.needs_image ? 'text-amber-600' : ''}`}>{isUploadingImage ? "Đang tải..." : "Click & Paste (Ctrl+V)"}</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const url = await uploadImageToSupabase(file);
                                    if (url) {
                                      setExtractedFormulasReview(prev => prev.map(f => f.id === formula.id ? { ...f, image_url: url } : f));
                                    }
                                  }
                                }}
                              />
                            </label>
                          </div>
                        )}
                        <button 
                          onClick={() => setExtractedFormulasReview(prev => prev.filter(f => f.id !== formula.id))}
                          className="w-full py-1.5 text-sm text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 font-semibold flex items-center justify-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" /> Xóa bỏ
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 shrink-0 flex gap-4 bg-white items-center justify-between">
              <p className="text-sm text-gray-600 font-medium">
                Tổng cộng: <strong className="text-indigo-600">{extractedFormulasReview.length}</strong> công thức 
                (Hợp lệ: {extractedFormulasReview.filter(f => !f.isDuplicate && f.category_id).length})
              </p>
              <div className="flex gap-3">
                <button onClick={() => setIsReviewModalOpen(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                  Hủy bỏ
                </button>
                <button 
                  onClick={handleSaveReviewedFormulas} 
                  disabled={isSavingFormula || extractedFormulasReview.filter(f => !f.isDuplicate && f.category_id).length === 0}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-md shadow-indigo-200"
                >
                  {isSavingFormula ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Lưu vào hệ thống
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
