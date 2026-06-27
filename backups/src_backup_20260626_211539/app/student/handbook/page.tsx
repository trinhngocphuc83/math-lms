"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import { Library, ChevronRight, ChevronLeft, Search, BookOpen, Bookmark, ArrowLeft, ArrowRight, Home } from "lucide-react";
import Link from "next/link";

export default function StudentHandbook() {
  const supabase = createClient();
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [formulas, setFormulas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCats, setExpandedCats] = useState<string[]>([]);

  // Global search states
  const [allFormulas, setAllFormulas] = useState<any[]>([]);
  const [hasLoadedAll, setHasLoadedAll] = useState(false);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

  // Flip Book state
  const [currentPage, setCurrentPage] = useState(0); // 0 = bìa sách
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const bookRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchCategories(); }, []);

  // Tự động load toàn bộ công thức khi bắt đầu gõ tìm kiếm
  useEffect(() => {
    if (searchQuery.trim().length > 0 && !hasLoadedAll) {
      loadAllFormulas();
    }
  }, [searchQuery, hasLoadedAll]);

  const loadAllFormulas = async () => {
    setIsSearchingGlobal(true);
    const { data } = await supabase.from('formulas').select('*, category:category_id(name)');
    setAllFormulas(data || []);
    setHasLoadedAll(true);
    setIsSearchingGlobal(false);
  };

  // Hỗ trợ phím mũi tên để lật trang
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goPrevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, formulas, isFlipping]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('formula_categories').select('*').order('created_at');
    setCategories(data || []);
    if (data && data.length > 0) {
      const firstParent = data.find((c: any) => !c.parent_id);
      if (firstParent) {
        setExpandedCats([firstParent.id]);
        setSelectedCategory(firstParent);
        setFormulas([]);
        setCurrentPage(0);
      }
    }
    setIsLoading(false);
  };

  const fetchFormulas = async (categoryId: string) => {
    setIsLoading(true);
    const { data } = await supabase.from('formulas').select('*').eq('category_id', categoryId).order('created_at');
    setFormulas(data || []);
    setCurrentPage(1); // Mặc định vào luôn công thức, không qua bìa
    setIsLoading(false);
  };

  const toggleExpand = (catId: string) => {
    setExpandedCats(prev => 
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  // Điều hướng lật trang
  const totalPages = formulas.length; // page 0 = bìa, page 1..N = công thức
  
  const goNextPage = useCallback(() => {
    if (isFlipping || currentPage >= totalPages) return;
    setFlipDirection('next');
    setIsFlipping(true);
    setTimeout(() => {
      setCurrentPage(prev => prev + 1);
      setIsFlipping(false);
      setFlipDirection(null);
    }, 450);
  }, [currentPage, totalPages, isFlipping]);

  const goPrevPage = useCallback(() => {
    const minPage = (!selectedCategory || !selectedCategory.parent_id) ? 0 : 1;
    if (isFlipping || currentPage <= minPage) return;
    setFlipDirection('prev');
    setIsFlipping(true);
    setTimeout(() => {
      setCurrentPage(prev => prev - 1);
      setIsFlipping(false);
      setFlipDirection(null);
    }, 450);
  }, [currentPage, isFlipping, selectedCategory]);

  const goToPage = (page: number) => {
    if (isFlipping || page === currentPage) return;
    setFlipDirection(page > currentPage ? 'next' : 'prev');
    setIsFlipping(true);
    setTimeout(() => {
      setCurrentPage(page);
      setIsFlipping(false);
      setFlipDirection(null);
    }, 450);
  };

  // Hàm bỏ dấu tiếng Việt để tìm kiếm mềm mại (mờ)
  const removeAccents = (str: string) => {
    return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
  };

  // Lọc công thức TOÀN CỤC theo từ khóa mờ
  const filteredGlobalFormulas = searchQuery 
    ? allFormulas.filter(f => {
        const queryClean = removeAccents(searchQuery);
        const titleClean = removeAccents(f.title);
        const descClean = removeAccents(f.description || "");
        
        // Chia từ khóa thành các từ đơn và đảm bảo mọi từ đều khớp
        const keywords = queryClean.split(/\s+/).filter(k => k.length > 0);
        return keywords.every(kw => titleClean.includes(kw) || descClean.includes(kw));
      })
    : [];

  // Render trang bìa sách
  const renderCover = () => (
    <div className={`flipbook-cover relative w-full min-h-[500px] flex flex-col items-center justify-center p-10 ${
      flipDirection === 'next' && currentPage === 0 ? 'page-exit-next' : ''
    } ${flipDirection === 'prev' && currentPage === 0 ? 'page-enter-prev' : ''}`}>
      <div className="flipbook-spine opacity-30"></div>
      
      {/* Hoa văn trang trí góc */}
      <div className="absolute top-4 left-4 text-amber-400/30 text-4xl">✦</div>
      <div className="absolute top-4 right-4 text-amber-400/30 text-4xl">✦</div>
      <div className="absolute bottom-4 left-4 text-amber-400/30 text-4xl">✦</div>
      <div className="absolute bottom-4 right-4 text-amber-400/30 text-4xl">✦</div>

      <BookOpen className="w-16 h-16 text-amber-400/60 mb-6" />
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-3 bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 bg-clip-text text-transparent">
        Sổ Tay Công Thức
      </h2>
      <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent my-4"></div>
      <h3 className="text-xl md:text-2xl text-violet-200 font-semibold text-center mb-2">
        {selectedCategory?.name || "Chọn chuyên đề"}
      </h3>
      {selectedCategory && selectedCategory.parent_id && (
        <p className="text-violet-300/60 text-sm mt-1">
          {categories.find(c => c.id === selectedCategory.parent_id)?.name}
        </p>
      )}
      
      {!selectedCategory?.parent_id ? (
        <p className="text-violet-300/40 text-xs mt-8 italic">Chọn chuyên đề bên trái hoặc mở sách để bắt đầu</p>
      ) : (
        <p className="text-violet-300/40 text-xs mt-8 italic">
          {totalPages} công thức • Dùng phím ← → để lật trang
        </p>
      )}
      
      {!selectedCategory?.parent_id && (
        <button 
          onClick={() => {
            const firstChild = categories.find(c => c.parent_id === selectedCategory?.id);
            if (firstChild) {
              setSelectedCategory(firstChild);
              fetchFormulas(firstChild.id);
              setSearchQuery("");
              if (!expandedCats.includes(selectedCategory!.id)) {
                setExpandedCats(prev => [...prev, selectedCategory!.id]);
              }
            }
          }}
          className="mt-6 px-6 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-full text-sm font-semibold transition-all flex items-center gap-2 border border-amber-400/20"
        >
          Mở sách <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  // Render 1 trang công thức
  const renderFormulaPage = (formula: any, index: number) => {
    const pageNum = index + 1;
    const isCurrentVisible = pageNum === currentPage;
    
    let animClass = '';
    if (flipDirection === 'next' && isCurrentVisible) animClass = 'page-enter-next';
    if (flipDirection === 'next' && pageNum === currentPage - 1) animClass = 'page-exit-next';
    if (flipDirection === 'prev' && isCurrentVisible) animClass = 'page-enter-prev';
    if (flipDirection === 'prev' && pageNum === currentPage + 1) animClass = 'page-exit-prev';

    if (!isCurrentVisible && !animClass) return null;

    return (
      <div 
        key={formula.id} 
        className={`flipbook-page absolute inset-0 p-4 md:p-10 flex flex-col ${animClass}`}
      >
        <div className="flipbook-spine"></div>
        
        {/* Header trang */}
        <div className="flex justify-between items-start mb-3 md:mb-6 pl-6 md:pl-8">
          <div className="flex items-center gap-1 md:gap-2">
            <Bookmark className="w-3 h-3 md:w-4 md:h-4 text-violet-400" />
            <span className="text-[10px] md:text-xs font-semibold text-violet-400 uppercase tracking-wider line-clamp-1">
              {selectedCategory?.name}
            </span>
          </div>
          <span className="page-number text-[10px] md:text-sm shrink-0 ml-2">Trang {pageNum}/{totalPages}</span>
        </div>

        {/* Tiêu đề công thức */}
        <h3 className="text-sm md:text-2xl font-bold text-gray-800 mb-3 md:mb-5 pl-6 md:pl-8 flex items-center gap-2 md:gap-3 leading-tight">
          <span className="inline-flex items-center justify-center w-6 h-6 md:w-8 h-8 bg-violet-100 text-violet-600 rounded-md md:rounded-lg text-xs md:text-sm font-bold shrink-0">
            {pageNum}
          </span>
          {formula.title}
        </h3>

        {/* Nội dung công thức */}
        <div className="flex-1 pl-6 md:pl-8 flex flex-col min-h-0">
          <div className="flex flex-col sm:flex-row gap-3 md:gap-5 items-center sm:items-start flex-1 min-h-0">
            <div className="flex-1 min-w-0 w-full">
              <div className="formula-handwritten p-5 overflow-x-auto text-center">
                <BlockMath math={formula.latex_content} />
              </div>
            </div>
            {formula.image_url && (
              <div className="shrink-0 border-2 border-amber-200/60 rounded-xl overflow-hidden bg-white shadow-md w-full sm:w-auto sm:max-w-[220px] max-h-[150px] sm:max-h-none">
                <img 
                  src={formula.image_url} 
                  alt={`Minh họa: ${formula.title}`}
                  className="max-h-[140px] sm:max-h-44 w-full object-contain p-1 md:p-2"
                />
              </div>
            )}
          </div>

          {/* Ghi chú */}
          {formula.description && (
            <div className="mt-5 bg-violet-50/50 border border-violet-100 rounded-xl px-5 py-3">
              <p className="text-gray-600 text-sm leading-relaxed">
                <span className="font-semibold text-violet-600 mr-1.5">📝 Ghi chú:</span>
                {formula.description}
              </p>
            </div>
          )}
        </div>

        {/* Footer trang */}
        <div className="flex justify-center mt-4 pt-3 border-t border-dashed border-amber-200/40">
          <span className="page-number text-xs">— {pageNum} —</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-amber-50/20">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-3 md:px-4 pt-3 md:pt-6 pb-2 md:pb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-600/20 shrink-0">
              <BookOpen className="w-4 h-4 md:w-6 md:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-violet-700 to-indigo-600 bg-clip-text text-transparent truncate">
                Sổ Tay Công Thức
              </h1>
              <p className="text-[10px] md:text-xs text-gray-400 mt-0 md:mt-0.5 truncate hidden sm:block">Bách khoa toàn thư Toán học</p>
            </div>
          </div>
          <Link 
            href="/student/dashboard" 
            className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white rounded-lg md:rounded-xl text-[11px] md:text-sm text-gray-600 hover:text-violet-600 hover:shadow-md transition-all border border-gray-200 shrink-0 ml-2"
          >
            <Home className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden sm:inline">Quay lại Trang chủ</span><span className="sm:hidden">Trang chủ</span>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* ===== SIDEBAR ===== */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-sm p-3 md:p-4 sticky top-2 md:top-6 max-h-[25vh] lg:max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar flex flex-col">
              <h2 className="font-bold text-violet-700 mb-2 md:mb-4 px-2 uppercase text-[11px] tracking-widest flex items-center gap-2 shrink-0">
                <Library className="w-3.5 h-3.5" /> <span className="hidden lg:inline">Mục Lục</span><span className="lg:inline">Mục Lục (Cuộn để xem thêm)</span>
              </h2>
              
              {/* Ô tìm kiếm */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm công thức..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none bg-gray-50/50"
                />
              </div>

              <div className="space-y-1">
                {categories.filter(c => !c.parent_id).map(parentCat => (
                  <div key={parentCat.id}>
                    <button
                      onClick={() => {
                        toggleExpand(parentCat.id);
                        setSelectedCategory(parentCat);
                        setFormulas([]);
                        setCurrentPage(0);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-bold text-gray-700 hover:bg-violet-50 rounded-lg transition-colors"
                    >
                      <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedCats.includes(parentCat.id) ? 'rotate-90' : ''}`} />
                      <Library className="w-3.5 h-3.5 text-violet-400" />
                      <span className="truncate">{parentCat.name}</span>
                    </button>
                    
                    {expandedCats.includes(parentCat.id) && (
                      <div className="ml-3 pl-3 border-l-2 border-violet-100 space-y-0.5 mt-0.5 mb-1">
                        {categories.filter(c => c.parent_id === parentCat.id).map(childCat => (
                          <button
                            key={childCat.id}
                            onClick={() => { 
                              setSelectedCategory(childCat); 
                              fetchFormulas(childCat.id); 
                              setSearchQuery(""); 
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-all truncate ${
                              selectedCategory?.id === childCat.id 
                                ? 'bg-violet-600 text-white font-semibold shadow-sm shadow-violet-600/20' 
                                : 'text-gray-600 hover:bg-gray-100 hover:text-violet-700'
                            }`}
                          >
                            {childCat.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===== SÁCH LẬT ===== */}
          <div className="lg:col-span-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-[500px]">
                <div className="text-center">
                  <div className="w-12 h-12 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-400 text-sm">Đang mở sách...</p>
                </div>
              </div>
            ) : searchQuery ? (
              /* Chế độ tìm kiếm — hiển thị dạng danh sách */
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-violet-50/50 flex justify-between items-center">
                  <p className="text-sm text-violet-700 font-semibold">
                    🔍 Kết quả tìm kiếm: "{searchQuery}" ({filteredGlobalFormulas.length} công thức)
                  </p>
                  {isSearchingGlobal && <span className="text-xs text-violet-500 animate-pulse">Đang nạp dữ liệu...</span>}
                </div>
                <div className="divide-y divide-gray-100 lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto custom-scrollbar">
                  {filteredGlobalFormulas.length > 0 ? filteredGlobalFormulas.map(formula => (
                    <div key={formula.id} className="p-5 hover:bg-violet-50/30 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-base font-bold text-gray-800">{formula.title}</h4>
                        {formula.category?.name && (
                          <span className="text-[10px] px-2 py-0.5 bg-violet-100 text-violet-600 rounded-full font-semibold uppercase tracking-wider shrink-0 ml-3">
                            {formula.category.name}
                          </span>
                        )}
                      </div>
                      <div className="formula-handwritten p-4 overflow-x-auto text-center">
                        <BlockMath math={formula.latex_content} />
                      </div>
                      {formula.description && (
                        <p className="text-gray-500 text-sm mt-2 italic">{formula.description}</p>
                      )}
                    </div>
                  )) : (
                    <div className="p-12 text-center text-gray-400">Không tìm thấy công thức nào.</div>
                  )}
                </div>
              </div>
            ) : (
              /* Chế độ Sách Lật */
              <div className="flex flex-col items-center gap-5">
                {/* Cuốn sách */}
                <div 
                  ref={bookRef}
                  className="flipbook-container w-full max-w-3xl"
                >
                  <div className="relative min-h-[400px] sm:min-h-[450px] md:min-h-[560px]">
                    {/* Trang bìa */}
                    {currentPage === 0 && (!selectedCategory || !selectedCategory.parent_id) && renderCover()}

                    {/* Các trang công thức */}
                    {formulas.map((formula, index) => renderFormulaPage(formula, index))}

                    {/* Trang cuối - hết sách */}
                    {currentPage > totalPages && totalPages > 0 && (
                      <div className="flipbook-page absolute inset-0 p-10 flex flex-col items-center justify-center text-center page-enter-next">
                        <div className="flipbook-spine"></div>
                        <BookOpen className="w-14 h-14 text-amber-400/40 mb-4" />
                        <h3 className="text-xl font-bold text-gray-700 mb-2">Hết chuyên đề</h3>
                        <p className="text-gray-400 text-sm mb-6">Bạn đã xem hết {totalPages} công thức.</p>
                        <button onClick={() => goToPage(0)} className="px-5 py-2 bg-violet-100 text-violet-700 rounded-xl text-sm font-semibold hover:bg-violet-200 transition-colors">
                          ← Quay về bìa
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Điều hướng trang */}
                {totalPages > 0 && (
                  <div className="flex items-center gap-4 w-full max-w-3xl">
                    <button 
                      onClick={goPrevPage} 
                      disabled={currentPage <= (!selectedCategory || !selectedCategory.parent_id ? 0 : 1) || isFlipping}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-white rounded-xl text-sm font-semibold text-gray-600 hover:text-violet-600 hover:shadow-md disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-gray-200 shadow-sm"
                    >
                      <ChevronLeft className="w-4 h-4" /> Trang trước
                    </button>
                    
                    {/* Progress bar */}
                    <div className="flex-1 flex items-center gap-1 justify-center flex-wrap">
                      {/* Bìa */}
                      {(!selectedCategory || !selectedCategory.parent_id) && (
                        <button 
                          onClick={() => goToPage(0)}
                          className={`w-2.5 h-2.5 rounded-full progress-dot cursor-pointer ${currentPage === 0 ? 'active' : ''}`}
                          title="Trang bìa"
                        />
                      )}
                      {/* Các trang */}
                      {formulas.map((_, i) => {
                        const pageNum = i + 1;
                        // Hiển thị tối đa 20 dots, nếu nhiều hơn thì rút gọn
                        if (totalPages > 20 && pageNum > 3 && pageNum < totalPages - 2 && Math.abs(pageNum - currentPage) > 2) {
                          if (pageNum === 4 || pageNum === totalPages - 3) {
                            return <span key={i} className="text-gray-300 text-xs mx-0.5">···</span>;
                          }
                          return null;
                        }
                        return (
                          <button 
                            key={i}
                            onClick={() => goToPage(pageNum)}
                            className={`w-2.5 h-2.5 rounded-full progress-dot cursor-pointer ${currentPage === pageNum ? 'active' : ''}`}
                            title={`Trang ${pageNum}`}
                          />
                        );
                      })}
                    </div>

                    <button 
                      onClick={goNextPage} 
                      disabled={currentPage >= totalPages || isFlipping}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-white rounded-xl text-sm font-semibold text-gray-600 hover:text-violet-600 hover:shadow-md disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-gray-200 shadow-sm"
                    >
                      Trang sau <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Hướng dẫn phím tắt */}
                <p className="text-xs text-gray-400 flex items-center gap-3">
                  <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">←</span>
                  <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">→</span>
                  <span>Lật trang bằng phím mũi tên</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
