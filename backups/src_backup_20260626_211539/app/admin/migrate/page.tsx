"use client";
import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import * as XLSX from "xlsx";
import { Database, UploadCloud, Loader2 } from "lucide-react";

export default function MigratePage() {
  const supabase = createClient();
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);

  const handleLegacyImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setProgress(0);
    setTotal(0);
    
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, {header: 1});
      
      const extractTextAndImg = (jsonString: any) => {
        if (!jsonString) return "";
        if (typeof jsonString !== 'string') return String(jsonString);
        try {
          const obj = JSON.parse(jsonString);
          let result = obj.text || "";
          if (obj.img) {
            result += `<br/><img src="${obj.img}" style="max-width: 100%; max-height: 200px;" />`;
          }
          return result;
        } catch (e) {
          return jsonString;
        }
      };

      const questionsToInsert = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] as any[];
        if (!row || row.length === 0 || !row[0]) continue;
        
        let qType = row[6] ? String(row[6]).trim() : 'TN';
        
        questionsToInsert.push({
          question_id: row[0],
          grade: row[1] ? String(row[1]) : null,
          subject: row[2] ? String(row[2]) : null,
          topic: row[3] ? String(row[3]) : null,
          lesson: row[4] ? String(row[4]) : null,
          math_form: row[5] ? String(row[5]) : null,
          question_type: qType,
          difficulty: row[7] ? String(row[7]) : null,
          content: extractTextAndImg(row[8]),
          option_a: extractTextAndImg(row[9]),
          option_b: extractTextAndImg(row[10]),
          option_c: extractTextAndImg(row[11]),
          option_d: extractTextAndImg(row[12]),
          correct_answer: row[13] ? String(row[13]) : null,
          explanation: extractTextAndImg(row[14]),
          usage_count: parseInt(row[19]) || 0
        });
      }

      setTotal(questionsToInsert.length);
      const BATCH_SIZE = 50;
      let successCount = 0;
      let firstError = null;

      for (let i = 0; i < questionsToInsert.length; i += BATCH_SIZE) {
        const chunk = questionsToInsert.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('questions').insert(chunk);
        if (error) {
           console.error("Batch error:", error);
           if (!firstError) firstError = error.message;
           continue;
        }
        successCount += chunk.length;
        setProgress(successCount);
      }
      
      if (firstError) {
        alert(`Đồng bộ xong ${successCount}/${questionsToInsert.length} câu. Có lỗi xảy ra: ${firstError}`);
      } else {
        alert(`Đồng bộ hoàn tất ${successCount}/${questionsToInsert.length} câu hỏi!`);
      }
      
    } catch(err: any) {
      alert("Lỗi khi đọc file Excel: " + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full text-center">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Database className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Đồng bộ Dữ liệu Cũ</h1>
        <p className="text-gray-500 mb-8">
          Upload file Excel <code>LMS_Toan_NganHangCauHoi.xlsx</code> của bạn lên đây để đẩy tất cả câu hỏi vào hệ thống mới chỉ trong 1 click.
        </p>

        {isImporting ? (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <h3 className="font-bold text-blue-800 mb-1">Đang xử lý dữ liệu...</h3>
            <p className="text-sm text-blue-600 mb-4">Xin đừng đóng trình duyệt</p>
            <div className="w-full bg-blue-200 rounded-full h-2.5 mb-2">
              <div className="bg-blue-600 h-2.5 rounded-full transition-all" style={{ width: `${(progress / (total || 1)) * 100}%` }}></div>
            </div>
            <p className="text-xs font-bold text-blue-800">{progress} / {total} câu</p>
          </div>
        ) : (
          <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer group">
            <input 
              type="file" 
              accept=".xlsx,.xls" 
              onChange={handleLegacyImport}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <UploadCloud className="w-10 h-10 text-gray-400 group-hover:text-blue-500 mx-auto mb-3 transition-colors" />
            <h3 className="font-bold text-gray-700 group-hover:text-blue-700">Chọn file Excel</h3>
            <p className="text-sm text-gray-500 mt-1">Hỗ trợ định dạng .xlsx, .xls</p>
          </div>
        )}
      </div>
    </div>
  );
}
