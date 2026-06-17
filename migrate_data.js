require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function extractTextAndImg(jsonString) {
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
}

async function run() {
  console.log("-----------------------------------------");
  console.log("BẮT ĐẦU ĐỌC FILE LMS_Toan_NganHangCauHoi.xlsx...");
  const wb = XLSX.readFile('LMS_Toan_NganHangCauHoi.xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, {header: 1});
  
  console.log(`Đã đọc ${data.length - 1} dòng dữ liệu (bỏ header).`);
  const questionsToInsert = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0 || !row[0]) continue;
    
    // row[6] có thể là 'TN', 'NLC', 'DS'. 
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

  // Chia nhỏ mảng thành từng batch 50
  const BATCH_SIZE = 50;
  let successCount = 0;
  console.log("BẮT ĐẦU INSERT VÀO DATABASE MỚI (SUPABASE)...");
  for (let i = 0; i < questionsToInsert.length; i += BATCH_SIZE) {
    const chunk = questionsToInsert.slice(i, i + BATCH_SIZE);
    const { data: res, error } = await supabase.from('questions').upsert(chunk, { onConflict: 'question_id' }).select();
    if (error) {
      console.error(`[!] Lỗi ở batch ${Math.floor(i/BATCH_SIZE) + 1}:`, error.message);
    } else {
      successCount += chunk.length;
      console.log(`[+] Đã insert thành công ${successCount}/${questionsToInsert.length} câu.`);
    }
  }
  
  console.log("-----------------------------------------");
  console.log("HOÀN TẤT CHUYỂN ĐỔI DỮ LIỆU!");
  process.exit(0);
}

run();
