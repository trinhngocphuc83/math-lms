/**
 * Thay 21 ảnh bảng tần số (ảnh cắt từ sách, 250–560 px, chiếu lên bảng nhìn như con kiến)
 * bằng bảng LaTeX \begin{array} trong nội dung câu hỏi của KHO. Bảng LaTeX dựng sắc nét ở
 * mọi cỡ trên app (KaTeX) và bộ xuất Word đã biết dựng thành bảng Word thật (latexToDocxTable).
 *
 *   node scratch/bang-12c3.mjs        # thử, in ra câu sẽ đổi
 *   node scratch/bang-12c3.mjs ghi    # sao lưu backups/bang-12c3-<ngày>/ rồi ghi
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const GHI = process.argv.includes('ghi');
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const GOC = 'https://cmjithgtecypxmisbzvw.supabase.co/storage/v1/object/public/lesson_images/';
const urls = JSON.parse(readFileSync('scratch/anh-nho-12c3.json', 'utf8'));
urls.push(GOC + 'editor_images/bd529om9ji_1785382586089.jpg');   // 19: chiều cao 12A/12B
urls.push(GOC + 'questions/1785335451774_image.png');             // 20: tuổi kết hôn A/B

const T = (s) => `\\text{${s}}`;
const so = (s) => String(s).replace(/(\d),(\d)/g, '$1{,}$2');
/** Bảng dọc: hai (hoặc ba) cột, mỗi dòng một nhóm; dòng cuối tuỳ chọn (n = 40). */
function bangDoc(tieuDe, hang, cuoi) {
  const cot = '|' + tieuDe.map(() => 'c').join('|') + '|';
  const r = [tieuDe.map(T).join(' & ')];
  for (const h of hang) r.push(h.map(so).join(' & '));
  if (cuoi) r.push(tieuDe.slice(1).map(() => '').join(' & ') + ' & ' + cuoi);
  return `$$\\begin{array}{${cot}} \\hline ${r.join(' \\\\ \\hline ')} \\\\ \\hline \\end{array}$$`;
}
/** Bảng ngang: hàng đầu là các nhóm, các hàng sau là tần số của từng mẫu. */
function bangNgang(nhanNhom, nhom, dsHang) {
  const cot = '|' + ['c', ...nhom.map(() => 'c')].join('|') + '|';
  const r = [[T(nhanNhom), ...nhom.map(so)].join(' & ')];
  for (const [nhan, ts] of dsHang) r.push([T(nhan), ...ts.map(so)].join(' & '));
  return `$$\\begin{array}{${cot}} \\hline ${r.join(' \\\\ \\hline ')} \\\\ \\hline \\end{array}$$`;
}

const BANG = [
  bangDoc(['Lớp', 'Tần số'], [['[375;450)', 6], ['[450;525)', 15], ['[525;600)', 10], ['[600;675)', 6], ['[675;750)', 9], ['[750;825)', 4]], 'N = 50'),
  bangDoc(['Lớp', 'Tần số'], [['[15;20)', 10], ['[20;25)', 12], ['[25;30)', 14], ['[30;35)', 9], ['[35;40)', 5]]),
  bangDoc(['Số lượt đặt bàn', 'Tần số'], [['[1;6)', 14], ['[6;11)', 30], ['[11;16)', 25], ['[16;21)', 18], ['[21;26)', 5]]),
  bangDoc(['Tuổi kết hôn', 'Tần số'], [['[19;22)', 10], ['[22;25)', 27], ['[25;28)', 31], ['[28;31)', 25], ['[31;34)', 7]]),
  bangDoc(['Nhóm', 'Tần số'], [['[74;80)', 4], ['[80;86)', 6], ['[86;92)', 3], ['[92;98)', 4], ['[98;104)', 3], ['[104;110)', 7]], 'n = 27'),
  bangDoc(['Nhóm điểm', 'Tần số'], [['[1;3)', 3], ['[3;5)', 2], ['[5;7)', 10], ['[7;9)', 14], ['[9;11)', 7]], 'n = 36'),
  bangDoc(['Chiều cao (cm)', 'Số học sinh'], [['[150;152)', 5], ['[152;154)', 18], ['[154;156)', 40], ['[156;158)', 26], ['[158;160)', 8], ['[160;162]', 3]]),
  bangNgang('Độ dày (mm)', ['[18;19)', '[19;20)', '[20;21)', '[21;22)', '[22;23)'], [['Tần số', [3, 7, 23, 25, 2]]]),
  bangDoc(['Nhóm', 'Tần số'], [['[6,22;6,46)', 3], ['[6,46;6,70)', 7], ['[6,70;6,94)', 5], ['[6,94;7,18)', 20], ['[7,18;7,42)', 5]], 'n = 40'),
  bangDoc(['Lớp', 'Tần số'], [['[20;25)', 2], ['[25;30)', 7], ['[30;35)', 15], ['[35;40)', 8], ['[40;45)', 3]]),
  bangDoc(['Lớp', 'Tần số'], [['[0;100)', 20], ['[100;200)', 80], ['[200;300)', 70], ['[300;400)', 30], ['[400;500)', 10]], 'N = 210'),
  bangDoc(['Lớp khối lượng (gam)', 'Giá trị đại diện', 'Tần số'], [['[70;80)', 75, 3], ['[80;90)', 85, 6], ['[90;100)', 95, 12], ['[100;110)', 105, 6], ['[110;120)', 115, 3]], 'n = 30'),
  bangDoc(['Nhóm', 'Tần số'], [['[30;40)', 2], ['[40;50)', 10], ['[50;60)', 16], ['[60;70)', 8], ['[70;80)', 2], ['[80;90)', 2]], 'n = 40'),
  bangDoc(['Nhóm', 'Tần số'], [['[36;38)', 9], ['[38;40)', 15], ['[40;42)', 25], ['[42;44)', 30], ['[44;46)', 21]], 'n = 100'),
  bangDoc(['Nhóm', 'Số học sinh'], [['[30;40)', 2], ['[40;50)', 10], ['[50;60)', 16], ['[60;70)', 8], ['[70;80)', 2], ['[80;90)', 2]], 'n = 40'),
  bangNgang('Thời gian (phút)', ['[6;7)', '[7;8)', '[8;9)', '[9;10)', '[10;11)'], [['Học sinh lớp 10A', [8, 10, 13, 10, 9]], ['Học sinh lớp 10B', [4, 12, 17, 14, 3]]]),
  bangNgang('Thời gian (phút)', ['[0;20)', '[20;40)', '[40;60)', '[60;80)', '[80;100)'], [['Số học sinh', [4, 8, 12, 10, 8]]]),
  bangNgang('Nhóm', ['[0;2)', '[2;4)', '[4;6)', '[6;8)', '[8;10)'], [['Tần số ở lớp 12A', [5, 6, 6, 25, 3]], ['Tần số ở lớp 12B', [2, 5, 18, 16, 4]]]),
  bangNgang('Chỉ số AQI', ['[0;50)', '[50;100)', '[100;150)', '[150;200)'], [['Số thành phố', [73, 47, 7, 2]]]),
  bangNgang('Chiều cao (cm)', ['[150;155)', '[155;160)', '[160;165)', '[165;170)', '[170;175)', '[175;180)'], [['Số học sinh nữ lớp 12A', [2, 7, 12, 3, 0, 1]], ['Số học sinh nữ lớp 12B', [0, 9, 8, 2, 1, 5]]]),
  bangNgang('Tuổi kết hôn', ['[19;22)', '[22;25)', '[25;28)', '[28;31)', '[31;34)'], [['Số phụ nữ khu vực A', [10, 27, 31, 25, 7]], ['Số phụ nữ khu vực B', [47, 40, 11, 2, 0]]]),
];
if (BANG.length !== urls.length) throw new Error(`có ${urls.length} ảnh mà ${BANG.length} bảng`);
/* Bản đồ ảnh -> bảng cho va-giao-an.mjs --thay-anh: khối quiz không có sourceQuestionId (đề ôn tập cũ) vẫn đổi được. */
writeFileSync('scratch/thay-anh-12c3.json', JSON.stringify(urls.map((url, i) => ({ url, bang: BANG[i] })), null, 1));

const thuMuc = `backups/bang-12c3-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
let doi = 0;
const saoLuu = [];
for (let i = 0; i < urls.length; i++) {
  const u = urls[i], bang = BANG[i];
  const { data: q1 } = await sb.from('questions').select('id,question_id,content,image_url').ilike('content', `%${u}%`);
  const { data: q2 } = await sb.from('questions').select('id,question_id,content,image_url').eq('image_url', u);
  const ds = [...(q1 || []), ...(q2 || []).filter(x => !(q1 || []).some(y => y.id === x.id))];
  if (!ds.length) { console.log(`  (không câu nào dùng) #${i} ${u}`); continue; }
  for (const q of ds) {
    saoLuu.push({ id: q.id, question_id: q.question_id, content: q.content, image_url: q.image_url });
    let content = q.content;
    const mauAnh = new RegExp(`\\n*!\\[[^\\]]*\\]\\(${u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^)]*\\)\\n*`, 'g');
    /* Thay bằng HÀM: chuỗi thay có "$$" bị String.replace hiểu là ký hiệu đặc biệt, ra "$" đơn. */
    if (mauAnh.test(content)) content = content.replace(mauAnh, () => `\n\n${bang}\n\n`);
    else {
      /* Ảnh nằm ở image_url (không có trong đề): chèn bảng ngay sau câu "...bảng sau:" nếu có,
         không thì nối vào cuối - để bảng đứng đúng chỗ đề nhắc tới nó. */
      const dong = content.split('\n');
      const i = dong.findIndex(d => /:\s*$/.test(d.trim()));
      if (i >= 0 && i < dong.length - 1) dong.splice(i + 1, 0, '', bang, '');
      else dong.push('', bang);
      content = dong.join('\n');
    }
    content = content.replace(/\n{3,}/g, '\n\n').trim();
    const capNhat = { content };
    if (q.image_url === u) capNhat.image_url = null;
    doi++;
    console.log(`#${i} ${q.question_id}: ${q.content.slice(0, 60).replace(/\n/g, ' ')}…`);
    if (GHI) {
      const { error } = await sb.from('questions').update(capNhat).eq('id', q.id);
      if (error) console.log('   ✗', error.message);
    }
  }
}
if (GHI) {
  mkdirSync(thuMuc, { recursive: true });
  writeFileSync(`${thuMuc}/questions.json`, JSON.stringify(saoLuu, null, 1));
  console.log(`\n✓ đã đổi ${doi} câu · sao lưu ${thuMuc}/questions.json`);
} else console.log(`\nSẽ đổi ${doi} câu. Thêm "ghi" để ghi thật.`);
