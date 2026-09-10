/* Cắt màn hình LCD của giả lập rồi tải lên kho ảnh bài giảng, in ra địa chỉ để nhúng. */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import sharp from 'sharp';

const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/* Vùng màn hình LCD trên cửa sổ giả lập 338x714. */
const LCD = { left: 34, top: 186, width: 270, height: 88 };

const ANH = [
  ['s1',  'casio-c3-01-chon-thong-ke',  'Màn hình chọn kiểu tính thống kê'],
  ['s5',  'casio-c3-02-bat-tan-so',     'Hỏi BẬT tần số'],
  ['s6',  'casio-c3-03-hai-cot',        'Bảng nhập đã có hai cột x và n'],
  ['s9',  'casio-c3-04-da-nhap',        'Số liệu đã nhập xong'],
  ['s11', 'casio-c3-05-ket-qua',        'Kết quả: trung bình, phương sai, độ lệch chuẩn'],
  ['s14', 'casio-c3-06-tu-phan-vi',     'Kết quả: n, min, Q1, Med, Q3'],
];

const ra = {};
for (const [tep, ten, moTa] of ANH) {
  const png = await sharp(`scratch/casio/${tep}.png`)
    .extract(LCD).resize({ width: 810, kernel: 'nearest' }).png().toBuffer();
  const duongDan = `editor_images/${ten}.png`;
  const { error } = await sb.storage.from('lesson_images')
    .upload(duongDan, png, { contentType: 'image/png', upsert: true });
  if (error) { console.log(`✗ ${ten}: ${error.message}`); continue; }
  const { data } = sb.storage.from('lesson_images').getPublicUrl(duongDan);
  ra[tep] = data.publicUrl;
  console.log(`✓ ${ten}  (${Math.round(png.length / 1024)} KB)  ${moTa}`);
  console.log(`   ${data.publicUrl}`);
}
writeFileSync('scratch/casio/dia-chi-anh.json', JSON.stringify(ra, null, 2));
