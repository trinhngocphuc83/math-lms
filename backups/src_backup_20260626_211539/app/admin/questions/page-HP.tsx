"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Loader2, Search, Edit2, Trash2 } from "lucide-react";
import QuestionEditorModal from "@/components/admin/QuestionEditorModal";

export default function QuestionsBankPage() {
  const supabase = createClient();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);

  const fetchQuestions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error(error);
    } else {
      setQuestions(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleEdit = (q: any) => {
    setEditingQuestion(q);
    setIsEditorOpen(true);
  };

  const handleSave = async (updatedQ: any) => {
    if (updatedQ.id) {
      const { error } = await supabase.from("questions").update(updatedQ).eq("id", updatedQ.id);
      if (!error) fetchQuestions();
    }
    setIsEditorOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa câu hỏi này?")) {
      await supabase.from("questions").delete().eq("id", id);
      fetchQuestions();
    }
  };

  const filteredQuestions = questions.filter(q => 
    q.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.lesson?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Ngân hàng Câu hỏi</h1>
        <p className="text-gray-500 mt-2">Quản lý và chỉnh sửa tất cả câu hỏi trong hệ thống</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between mb-6">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Tìm kiếm nội dung câu hỏi..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-sm">
                  <th className="pb-3 font-medium">Môn / Lớp</th>
                  <th className="pb-3 font-medium w-1/2">Nội dung</th>
                  <th className="pb-3 font-medium">Loại</th>
                  <th className="pb-3 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredQuestions.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50/50">
                    <td className="py-4">
                      <div className="text-sm font-medium">{q.subject} {q.grade}</div>
                      <div className="text-xs text-gray-500 mt-1">{q.lesson}</div>
                    </td>
                    <td className="py-4">
                      <div className="text-sm text-gray-800 line-clamp-2" dangerouslySetInnerHTML={{ __html: q.content }} />
                    </td>
                    <td className="py-4 text-sm text-gray-600">{q.question_type}</td>
                    <td className="py-4 text-right">
                      <button onClick={() => handleEdit(q)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg mr-2">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(q.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <QuestionEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        question={editingQuestion}
        onSave={handleSave}
      />
    </div>
  );
}
