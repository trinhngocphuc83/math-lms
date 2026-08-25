// Nhờ AI vẽ lại một hình minh hoạ bằng SVG, cho ảnh cắt ra bị mờ hoặc rỗ.
//
// Ảnh chụp từ sách rồi cắt ra thì độ nét chỉ đến thế; phóng to và làm nét (autoCropImage)
// cứu được phần nào chứ không dựng lại được nét đã mất. Vẽ lại bằng SVG thì nét là nét
// vector, in cỡ nào cũng sắc.
//
// RỦI RO PHẢI BIẾT: máy VẼ LẠI chứ không phải làm sạch, nên nó có thể chép sai một con
// số trên trục hay một nhãn điểm - và câu hỏi thành sai mà không ai hay. Vì vậy bản vẽ
// lại KHÔNG bao giờ tự thay vào bài: nó phải nằm cạnh ảnh gốc cho thầy cô soi từng con
// số rồi mới bấm nhận.

import { goiGeminiTrenTrinhDuyet, type CauHinhAI } from "./geminiBrowser";

const LOI_DAN = `Bạn nhìn thấy một HÌNH VẼ trong đề thi (đồ thị, sơ đồ, hình học, mạch điện, bảng số liệu...).
Hãy vẽ lại y hệt hình đó bằng SVG để in ra giấy cho sắc nét.

QUY TẮC BẮT BUỘC:
1. TUYỆT ĐỐI KHÔNG đổi bất kỳ con số, chữ, nhãn, đơn vị nào. Chép lại y nguyên những gì
   nhìn thấy. Nhìn không rõ chỗ nào thì ghi đúng cái mình đọc được, KHÔNG được đoán thêm.
2. Giữ đúng bố cục, tỉ lệ và vị trí tương đối của mọi thành phần.
3. Dùng nét đen (#000) trên nền trắng, trừ khi hình gốc có màu thì giữ đúng màu đó.
4. Chữ dùng font-family="Times New Roman, serif". Cỡ chữ vừa phải so với hình.
5. Có thuộc tính viewBox, KHÔNG đặt width/height cố định, để phóng to thu nhỏ không vỡ.
6. KHÔNG dùng <script>, <foreignObject>, <image>, hay bất kỳ liên kết ra ngoài nào.
7. Chỉ trả về đúng mã SVG, bắt đầu bằng <svg và kết thúc bằng </svg>. Không giải thích.`;

export interface KetQuaVeLai {
  svg: string;
  model: string;
  /** Chữ đọc được trong hình, để thầy cô soi nhanh xem máy có chép sai số nào không. */
  chuTrongHinh: string[];
}

/**
 * Cắt bỏ mọi thứ có thể chạy được hoặc gọi ra ngoài khỏi mã SVG.
 *
 * SVG là tài liệu chạy được: nhét <script> hay onclick vào là thành lỗ hổng. Máy đang
 * ngoan nhưng lời dặn không phải là hàng rào - hàng rào là chỗ này. Cũng chặn <image> và
 * mọi href để hình không lôi dữ liệu từ máy chủ lạ về.
 */
export function locSvgAnToan(svg: string): { sach: string; daBo: string[] } {
  const daBo: string[] = [];
  let s = String(svg || "");

  const catThe = (ten: string) => {
    const re = new RegExp(`<${ten}[\\s\\S]*?</${ten}>|<${ten}[^>]*/>`, "gi");
    if (re.test(s)) { daBo.push(`<${ten}>`); s = s.replace(re, ""); }
  };
  catThe("script");
  catThe("foreignObject");
  catThe("image");
  catThe("use");
  catThe("animate");

  if (/\son\w+\s*=/i.test(s)) { daBo.push("thuộc tính on..."); s = s.replace(/\son\w+\s*=\s*(["'])[\s\S]*?\1/gi, ""); }
  if (/\s(?:xlink:)?href\s*=/i.test(s)) { daBo.push("liên kết href"); s = s.replace(/\s(?:xlink:)?href\s*=\s*(["'])[\s\S]*?\1/gi, ""); }
  // url(...) trỏ ra ngoài; url(#...) trỏ nội bộ (gradient, marker) thì giữ
  if (/url\(\s*["']?(?!#)/i.test(s)) { daBo.push("url() ra ngoài"); s = s.replace(/url\(\s*["']?(?!#)[^)]*\)/gi, "none"); }

  return { sach: s, daBo };
}

/**
 * Bỏ kích thước cứng, chỉ giữ viewBox, để hình co giãn theo khung chứa.
 *
 * Máy hay kèm width="300" height="150" dù đã dặn đừng; để nguyên thì hình hiện bé xíu
 * trong khung xem trước và rỗ khi phóng to lúc chuyển sang PNG.
 */
export function chuanHoaKhungSvg(svg: string): string {
  let s = svg.replace(/<svg([^>]*)>/i, (_m, attrs: string) => {
    let a = attrs.replace(/\s(width|height)\s*=\s*(["'])[^"']*\2/gi, "");
    if (!/viewBox\s*=/i.test(a)) {
      // Không có viewBox thì dựng tạm theo kích thước máy ghi, hoặc khổ mặc định
      const w = (svg.match(/\bwidth\s*=\s*["']?(\d+)/i) || [])[1] || "800";
      const h = (svg.match(/\bheight\s*=\s*["']?(\d+)/i) || [])[1] || "600";
      a += ` viewBox="0 0 ${w} ${h}"`;
    }
    if (!/xmlns\s*=/i.test(a)) a += ' xmlns="http://www.w3.org/2000/svg"';
    return `<svg${a}>`;
  });
  // Nền trắng hẳn, không để trong suốt - dán vào Word hay in ra mới không lộ nền xám
  if (!/<rect[^>]*fill\s*=\s*["']?(#fff|#ffffff|white)/i.test(s)) {
    s = s.replace(/(<svg[^>]*>)/i, '$1<rect x="0" y="0" width="100%" height="100%" fill="#ffffff"/>');
  }
  return s;
}

/* ===================== VẼ LẠI TỰ ĐỘNG NGAY SAU KHI QUÉT ===================== */

const LOI_DAN_TU_DONG = `Bạn nhìn thấy một HÌNH ẢNH cắt từ đề thi. Làm hai việc:

VIỆC 1 - THẨM ĐỊNH: hình này có vẽ lại được bằng SVG cho giống hệt không?
  VẼ LẠI ĐƯỢC: đồ thị, hệ trục, bảng số liệu, sơ đồ mạch điện, hình hình học, bảng biến
  thiên, sơ đồ khối - tức là những hình chỉ gồm đường nét, chữ và hình khối đơn giản.
  KHÔNG VẼ LẠI ĐƯỢC: ảnh chụp thật (đồ vật, thí nghiệm, người), tranh vẽ nhiều màu có
  đổ bóng, hình có kết cấu/vân phức tạp, ảnh quá mờ không đọc nổi chi tiết.

VIỆC 2 - nếu vẽ lại được thì vẽ, theo đúng các quy tắc sau:
  1. TUYỆT ĐỐI KHÔNG đổi bất kỳ con số, chữ, nhãn, đơn vị nào. Chép y nguyên. Nhìn không
     rõ chỗ nào thì coi như KHÔNG vẽ lại được, chứ đừng đoán bừa.
  2. Giữ đúng bố cục, tỉ lệ và vị trí tương đối của mọi thành phần.
  3. Nét đen (#000) trên nền trắng, trừ khi hình gốc có màu thì giữ đúng màu đó.
  4. Chữ dùng font-family="Times New Roman, serif", cỡ vừa phải so với hình.
  5. Có viewBox, KHÔNG đặt width/height cố định.
  6. KHÔNG dùng <script>, <foreignObject>, <image>, hay liên kết ra ngoài.

TRẢ VỀ ĐÚNG KHUÔN SAU, không giải thích gì thêm, không bọc trong JSON hay dấu nháy:

VELAIDUOC: co
<svg ...>...</svg>

hoặc, nếu không vẽ lại được:

VELAIDUOC: khong
LYDO: <nói ngắn gọn vì sao>`;

export interface KetQuaThamDinh {
  veLaiDuoc: boolean;
  lyDo: string;
  svg: string;
  chuTrongHinh: string[];
  model: string;
}

/** Đọc base64 của một Blob, bỏ phần tiền tố "data:...;base64,". */
async function blobSangBase64(blob: Blob): Promise<string> {
  return new Promise<string>((ok, hong) => {
    const fr = new FileReader();
    fr.onload = () => ok(String(fr.result).split(",")[1] || "");
    fr.onerror = () => hong(new Error("Không đọc được ảnh"));
    fr.readAsDataURL(blob);
  });
}

/**
 * Vừa thẩm định vừa vẽ, trong MỘT lượt gọi.
 *
 * Gộp hai việc vào một lượt chứ không hỏi trước rồi vẽ sau: quét một tài liệu có chục
 * hình thì mỗi lượt gọi thêm là thêm nửa phút chờ. Máy nhìn hình một lần là đủ để vừa
 * biết có vẽ lại nổi không, vừa vẽ luôn.
 *
 * Máy tự nhận "không vẽ được" khi gặp ảnh chụp thật hoặc hình quá mờ - đó là điều mong
 * muốn: thà rơi về ảnh cắt còn hơn vẽ bừa rồi sai số liệu.
 */
export async function thamDinhVaVeLai(
  cauHinh: CauHinhAI,
  anhCat: Blob,
): Promise<KetQuaThamDinh> {
  const base64 = await blobSangBase64(anhCat);
  /*
   * CỐ Ý không xin JSON.
   *
   * Bản đầu bắt máy trả JSON có trường "svg". Chạy thử trên ảnh thật thì hỏng 1/3 số
   * lượt: mã SVG dài nhiều dòng, nhét vào một chuỗi JSON là phải thoát hết dấu xuống
   * dòng, máy làm không chuẩn nên JSON.parse gãy. Khuôn phẳng "VELAIDUOC: co" rồi tới
   * thẳng thẻ <svg> thì không có gì để hỏng.
   */
  const kq = await goiGeminiTrenTrinhDuyet(
    cauHinh,
    [{ text: LOI_DAN_TU_DONG }, { inlineData: { data: base64, mimeType: anhCat.type || "image/png" } }],
    { temperature: 0.2 },
  );

  const tho = (kq.text.match(/<svg[\s\S]*<\/svg>/i) || [])[0] || "";
  const noiKhong = /VELAIDUOC\s*:\s*khong/i.test(kq.text);
  const lyDoMay = (kq.text.match(/LYDO\s*:\s*([^\n]+)/i) || [])[1] || "";

  // Máy nói không vẽ được, HOẶC nói được mà chẳng có thẻ svg nào - đều rơi về ảnh cắt
  if (noiKhong || !tho.trim()) {
    return {
      veLaiDuoc: false,
      lyDo: (lyDoMay || "máy không vẽ lại được hình này").trim(),
      svg: "", chuTrongHinh: [], model: kq.model,
    };
  }

  const { sach } = locSvgAnToan(tho);
  const svg = chuanHoaKhungSvg(sach);

  /*
   * Chốt cuối: SVG phải thật sự có hình.
   *
   * Máy đôi khi trả về khung <svg> rỗng hoặc chỉ có mỗi nền trắng mà vẫn báo vẽ được.
   * Nhận bừa thì hình biến mất khỏi câu hỏi mà không ai hay, nên đếm số nét: dưới 3
   * thành phần vẽ thì coi như hỏng, rơi về ảnh cắt.
   */
  const soNet = (svg.match(/<(line|polyline|path|rect|circle|ellipse|polygon|text)[\s>]/g) || []).length;
  if (soNet < 3) {
    return { veLaiDuoc: false, lyDo: "bản vẽ máy trả về gần như rỗng", svg: "", chuTrongHinh: [], model: kq.model };
  }

  const chuTrongHinh = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => m[1].trim()).filter(Boolean);
  return { veLaiDuoc: true, lyDo: "", svg, chuTrongHinh, model: kq.model };
}

/** Nhờ AI đọc một ảnh hình vẽ rồi trả về mã SVG đã lọc sạch. */
export async function veLaiHinhBangAI(
  cauHinh: CauHinhAI,
  urlAnh: string,
  onTienDo?: (moTa: string) => void,
): Promise<KetQuaVeLai> {
  onTienDo?.("Đang tải ảnh gốc...");
  const res = await fetch(urlAnh);
  if (!res.ok) throw new Error(`Không tải được ảnh gốc (mã ${res.status}).`);
  const blob = await res.blob();
  const base64 = await new Promise<string>((ok, hong) => {
    const fr = new FileReader();
    fr.onload = () => ok(String(fr.result).split(",")[1] || "");
    fr.onerror = () => hong(new Error("Không đọc được ảnh gốc"));
    fr.readAsDataURL(blob);
  });

  onTienDo?.("Máy đang vẽ lại hình...");
  const kq = await goiGeminiTrenTrinhDuyet(
    cauHinh,
    // Dùng inlineData/mimeType kiểu SDK, giống aiQuestionScan.ts - không phải kiểu
    // inline_data/mime_type của REST thuần, SDK không hiểu.
    [{ text: LOI_DAN }, { inlineData: { data: base64, mimeType: blob.type || "image/png" } }],
    { temperature: 0.2 },
  );

  const tho = (kq.text.match(/<svg[\s\S]*<\/svg>/i) || [])[0] || "";
  if (!tho) throw new Error("Máy không trả về hình SVG. Thử lại một lượt nữa.");

  const { sach } = locSvgAnToan(tho);
  const svg = chuanHoaKhungSvg(sach);
  const chuTrongHinh = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)]
    .map(m => m[1].trim()).filter(Boolean);

  return { svg, model: kq.model, chuTrongHinh };
}

/**
 * Dựng SVG thành ảnh PNG độ phân giải cao.
 *
 * Vì sao phải đổi sang PNG chứ không dùng thẳng SVG: xuất Word và các màn học sinh đều
 * đi qua thẻ ảnh thường, mà SVG lưu trên Storage thì Word không nhúng được. PNG dựng ở
 * bề ngang lớn nên in A4 vẫn sắc, còn bản SVG vẫn giữ lại để sau này vẽ lại to hơn.
 */
export async function svgSangPng(svg: string, beRong = 1600): Promise<Blob> {
  const khung = (svg.match(/viewBox\s*=\s*["']([^"']+)["']/i) || [])[1] || "0 0 800 600";
  const [, , vw, vh] = khung.trim().split(/[\s,]+/).map(Number);
  const tiLe = vh && vw ? vh / vw : 0.75;

  const w = Math.max(400, Math.round(beRong));
  const h = Math.max(300, Math.round(w * tiLe));

  const blobSvg = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blobSvg);
  try {
    const img = await new Promise<HTMLImageElement>((ok, hong) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => hong(new Error("Không dựng được hình SVG thành ảnh"));
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Trình duyệt không hỗ trợ canvas");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((ok, hong) => {
      canvas.toBlob(b => (b ? ok(b) : hong(new Error("Không tạo được ảnh PNG"))), "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Lưu bản vẽ lại: PNG để dùng ngay, kèm SVG gốc để sau còn dựng lại to hơn. */
export async function luuHinhVeLai(supabase: any, svg: string): Promise<{ urlPng: string; urlSvg: string }> {
  const ma = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const png = await svgSangPng(svg);
  const duongPng = `questions/velai_${ma}.png`;
  const { error: loiPng } = await supabase.storage.from("lesson_images")
    .upload(duongPng, png, { contentType: "image/png" });
  if (loiPng) throw loiPng;

  const duongSvg = `questions/velai_${ma}.svg`;
  const { error: loiSvg } = await supabase.storage.from("lesson_images")
    .upload(duongSvg, new Blob([svg], { type: "image/svg+xml" }), { contentType: "image/svg+xml" });
  if (loiSvg) console.warn("Không lưu được bản SVG (vẫn dùng được PNG):", loiSvg);

  return {
    urlPng: supabase.storage.from("lesson_images").getPublicUrl(duongPng).data.publicUrl as string,
    urlSvg: supabase.storage.from("lesson_images").getPublicUrl(duongSvg).data.publicUrl as string,
  };
}

/* ===================== CHẤM ĐỘ NÉT ===================== */

export interface DiemNetAnh {
  /** Càng cao càng nét. Dưới ~120 là mờ thấy rõ khi in. */
  diem: number;
  beRong: number;
  /** Nên mời thầy cô vẽ lại hình này không. */
  nenVeLai: boolean;
  moTa: string;
}

/**
 * Chấm độ nét bằng phương sai Laplace - cách đo mờ tiêu chuẩn trong xử lý ảnh.
 *
 * Ảnh nét thì các nét mực đổi độ sáng đột ngột nên Laplace cho giá trị lớn, phương sai
 * cao. Ảnh mờ thì mọi thứ nhoè vào nhau, phương sai tụt hẳn. Cộng thêm điều kiện bề
 * ngang: hình rộng dưới 400px thì in lên A4 kiểu gì cũng rỗ, dù có nét.
 */
export async function chamDoNetAnh(urlAnh: string): Promise<DiemNetAnh> {
  const img = await new Promise<HTMLImageElement>((ok, hong) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => ok(i);
    i.onerror = () => hong(new Error("Không đọc được ảnh để chấm độ nét"));
    i.src = urlAnh;
  });
  return chamDoNetTuAnh(img);
}

/** Chấm độ nét ngay trên ảnh vừa cắt, chưa cần tải lên Storage. */
export async function chamDoNetTuBlob(blob: Blob): Promise<DiemNetAnh> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((ok, hong) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => hong(new Error("Không đọc được ảnh để chấm độ nét"));
      i.src = url;
    });
    return chamDoNetTuAnh(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function chamDoNetTuAnh(img: HTMLImageElement): DiemNetAnh {
  const w = img.naturalWidth, h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ canvas");
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, w, h).data;

  const xam = new Float32Array(w * h);
  for (let i = 0, k = 0; i < d.length; i += 4, k++) {
    xam[k] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  }

  let tong = 0, tongBinh = 0, dem = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const k = y * w + x;
      const lap = 4 * xam[k] - xam[k - 1] - xam[k + 1] - xam[k - w] - xam[k + w];
      tong += lap; tongBinh += lap * lap; dem++;
    }
  }
  const tb = dem ? tong / dem : 0;
  const diem = dem ? tongBinh / dem - tb * tb : 0;

  const heptQua = w < 400;
  const mo = diem < 120;
  return {
    diem: Math.round(diem),
    beRong: w,
    nenVeLai: mo || heptQua,
    moTa: mo && heptQua ? "Hình vừa mờ vừa nhỏ, in ra sẽ rỗ"
      : mo ? "Hình bị mờ, in ra sẽ nhoè nét"
      : heptQua ? `Hình chỉ rộng ${w}px, in lên A4 sẽ rỗ`
      : "Hình đủ nét",
  };
}
