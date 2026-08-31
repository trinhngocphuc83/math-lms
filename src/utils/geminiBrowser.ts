/**
 * Gọi Gemini từ phía TRÌNH DUYỆT (trang quét đề, soạn bài, sinh câu tương tự).
 *
 * Bản chạy trên máy chủ nằm ở geminiRunner.ts. Phải tách làm hai vì trình duyệt không
 * đụng được vào cơ sở dữ liệu (khoá API và sổ treo là bí mật của máy chủ). Trình duyệt
 * xin khoá + danh sách model qua /api/admin/gemini-key, và báo ngược về đó khi một cặp
 * khoá + model cạn hạn mức.
 *
 * Quy tắc xoay giống hệt bản máy chủ: duyệt từng MODEL theo thứ tự ưu tiên, mỗi model
 * thử lần lượt từng KHOÁ; hết khoá thì tụt xuống model kế tiếp.
 */

export const laLoiCanHanMuc = (msg: string): boolean =>
  /429|quota|exceeded|too many requests|resource has been exhausted/i.test(msg);

/** Lỗi do CHÍNH TA cắt vì model ngồi im quá lâu - xem choToiDa. */
export const laLoiQuaHan = (msg: string): boolean =>
  /không trả lời trong \d+ giây/.test(msg);

export const laLoiQuaTai = (msg: string): boolean =>
  /503|service unavailable|overloaded|high demand/i.test(msg);

/** Dùng khi máy chủ không trả về danh sách model (bản cũ, hoặc bảng ai_models chưa tạo). */
const MODEL_MAC_DINH = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.5-flash'];

export type CauHinhAI = {
  keys: string[];
  models: string[];
  /** Các cặp khoá + model đang bị treo vì cạn hạn mức. */
  treo: { key: string; model: string }[];
};

/** Xin khoá và danh sách model từ máy chủ. Ném lỗi kèm nguyên nhân thật nếu không cấp được. */
export async function layCauHinhAI(): Promise<CauHinhAI> {
  const res = await fetch('/api/admin/gemini-key');

  // Máy chủ trả về HTML chứ không phải JSON khi phiên đăng nhập hết hạn hoặc đường dẫn
  // hỏng. Gọi thẳng res.json() lúc đó ném ra "Unexpected token '<', \"<!DOCTYPE\"..." -
  // câu này người dùng đọc không hiểu gì mà cũng chẳng biết phải làm sao.
  const kieu = res.headers.get('content-type') || '';
  if (!kieu.includes('application/json')) {
    throw new Error(
      res.status === 401 || res.status === 403
        ? 'Phiên đăng nhập đã hết hạn. Hãy tải lại trang và đăng nhập lại.'
        : `Không hỏi được cấu hình AI (máy chủ trả mã ${res.status}). Hãy tải lại trang; nếu vẫn vậy thì báo quản trị.`
    );
  }

  const data = await res.json();
  if (!res.ok || !data.keys || data.keys.length === 0) {
    throw new Error(data.error || 'Không thể cấp phát khoá AI.');
  }
  return {
    keys: data.keys as string[],
    models: (data.models && data.models.length > 0 ? data.models : MODEL_MAC_DINH) as string[],
    treo: (data.treo || []) as { key: string; model: string }[],
  };
}

/** Báo về máy chủ để treo cặp khoá + model này lại 24 giờ. Lỗi mạng thì bỏ qua, không chặn việc quét. */
async function baoKhoaDaCan(key: string, model: string, reason: string): Promise<void> {
  try {
    await fetch('/api/admin/gemini-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, model, reason: reason.slice(0, 300) }),
    });
  } catch {
    // Không treo được thì lần sau thử lại khoá này, chỉ tốn thêm một lượt chứ không hỏng gì.
  }
}

export type KetQuaGoiGemini = { text: string; model: string };

/**
 * Hạn giờ cho việc NHỎ (đọc một câu, dựng lại một khối).
 *
 * Đo ngày 31/08/2026 trên cùng MỘT ảnh câu hỏi thật, mỗi model hai lượt:
 *   gemini-3.6-flash (đang xếp thứ nhất): 93,4s rồi 9,8s - thất thường
 *   gemini-3.5-flash (thứ hai):            6,4s rồi 4,9s - đều đặn
 *   gemini-3.7-flash (thứ ba):             lỗi cả hai lượt, có lượt treo 305s
 * Model chạy được trả lời trong 5-13 giây, nên quá 25 giây coi như đang treo: bỏ để tụt
 * xuống model kế tiếp, mất thêm ~5 giây còn hơn bắt thầy cô ngồi nhìn vòng quay 93 giây.
 *
 * KHÔNG đặt làm mặc định cho mọi lượt gọi: đường bóc cả đề 25-30 câu kèm lời giải vốn
 * lâu thật, cắt ngang nó là hỏng việc đang chạy tốt. Chỗ nào biết chắc việc nhỏ thì
 * truyền số này vào.
 */
export const GIAY_CHO_VIEC_NHO = 25;

/**
 * Đặt hạn giờ cho một lượt gọi model.
 *
 * Đo ngày 31/08/2026: có model ngồi im 305 giây rồi mới báo lỗi mạng. Không có hạn giờ
 * thì thầy cô ngồi nhìn vòng quay suốt chừng ấy, trong khi model kế tiếp trong danh sách
 * trả lời chỉ trong 1,6-1,8 giây. Hết hạn thì coi như model đó hỏng và tụt xuống model
 * sau - đúng cách vẫn xử lý khi model cạn hạn mức hay quá tải.
 *
 * KHÔNG huỷ được lượt gọi đã bay đi (SDK không nhận tín hiệu huỷ), nhưng bỏ mặc nó thì
 * cũng chỉ tốn một lượt hạn mức, còn hơn giữ người dùng chờ.
 */
function choToiDa<T>(viec: Promise<T>, giay: number, modelId: string): Promise<T> {
  if (!giay || giay <= 0) return viec;
  return Promise.race([
    viec,
    new Promise<T>((_, tuChoi) =>
      setTimeout(() => tuChoi(new Error(`${modelId} không trả lời trong ${giay} giây`)), giay * 1000),
    ),
  ]);
}

/**
 * Gọi Gemini, tự xoay khoá rồi xoay model cho tới khi có kết quả.
 *
 * @param cauHinh Kết quả của layCauHinhAI(). Truyền sẵn để một lượt quét nhiều ảnh
 *                chỉ phải xin khoá một lần.
 */
export async function goiGeminiTrenTrinhDuyet(
  cauHinh: CauHinhAI,
  parts: any[],
  generationConfig?: Record<string, any>,
  /** 0 (mặc định) là chờ đến khi nào có; xem GIAY_CHO_VIEC_NHO. */
  giayChoToiDa: number = 0,
): Promise<KetQuaGoiGemini> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');

  let loiCuoi = '';
  const modelDaCan: string[] = [];
  const modelQuaTai: string[] = [];

  for (const modelId of cauHinh.models) {
    // Lọc lại ở mỗi model vì hạn mức tính riêng cho từng cặp khoá + model.
    const daTreo = new Set(cauHinh.treo.filter(t => t.model === modelId).map(t => t.key));
    const keys = cauHinh.keys.filter(k => !daTreo.has(k));
    if (keys.length === 0) {
      modelDaCan.push(modelId);
      continue;
    }

    let soKhoaCan = 0;
    let coLoiQuaTai = false;

    for (const apiKey of keys) {
      const batDau = Date.now();
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: modelId,
          ...(generationConfig ? { generationConfig } : {}),
        });
        const result = await choToiDa(model.generateContent(parts), giayChoToiDa, modelId);
        console.log(`[AI] ${modelId} trả lời sau ${((Date.now() - batDau) / 1000).toFixed(1)}s`);
        return { text: result.response.text(), model: modelId };
      } catch (e: any) {
        loiCuoi = e?.message || String(e);
        console.warn(`[AI] ${modelId} hỏng sau ${((Date.now() - batDau) / 1000).toFixed(1)}s: ${loiCuoi.slice(0, 80)}`);

        /* Quá hạn giờ là MODEL đang treo chứ không phải khoá hỏng - đổi khoá cũng treo y
           như vậy. Bỏ hẳn model này, sang model kế tiếp. Đo 31/08/2026: không làm thế thì
           một model treo ăn 5 khoá x 25 giây = 125 giây rồi mới chịu tụt xuống. */
        if (laLoiQuaHan(loiCuoi)) {
          console.warn(`[AI] ${modelId} treo, bỏ luôn model này chứ không thử khoá khác.`);
          break;
        }

        if (laLoiCanHanMuc(loiCuoi)) {
          soKhoaCan++;
          // Ghi nhớ ngay trong phiên để các lần gọi sau của cùng lượt quét không thử lại.
          cauHinh.treo.push({ key: apiKey, model: modelId });
          void baoKhoaDaCan(apiKey, modelId, loiCuoi);
          console.warn(`[AI] ${modelId}: khoá ***${apiKey.slice(-4)} cạn hạn mức, sang khoá khác.`);
          continue;
        }

        if (laLoiQuaTai(loiCuoi)) {
          coLoiQuaTai = true;
          console.warn(`[AI] ${modelId} đang quá tải.`);
          continue;
        }

        console.warn(`[AI] ${modelId}: khoá ***${apiKey.slice(-4)} lỗi khác - ${loiCuoi.slice(0, 120)}`);
      }
    }

    if (soKhoaCan === keys.length) modelDaCan.push(modelId);
    else if (coLoiQuaTai) modelQuaTai.push(modelId);
    console.warn(`[AI] ${modelId} không dùng được, chuyển sang model kế tiếp.`);
  }

  if (modelDaCan.length === cauHinh.models.length) {
    throw new Error(
      `Cả ${cauHinh.keys.length} khoá AI đều đã hết hạn mức trong ngày ở toàn bộ ${cauHinh.models.length} model đang bật `
      + `(${cauHinh.models.join(', ')}). Gói miễn phí của Google giới hạn số lượt mỗi ngày cho từng khoá và từng model. `
      + 'Hãy thêm khoá mới, bật thêm model ở trang Trạm kiểm soát Cổng A.I, hoặc chờ sang ngày mới.',
    );
  }
  if (modelQuaTai.length > 0) {
    throw new Error(
      `Các model ${modelQuaTai.join(', ')} đang bị Google quá tải (lỗi 503), những model còn lại cũng không gọi được. `
      + 'Hãy thử lại sau ít phút, hoặc bật thêm model dự phòng ở trang Trạm kiểm soát Cổng A.I. '
      + 'Lỗi cuối: ' + loiCuoi,
    );
  }
  throw new Error('Không gọi được model AI nào. Lỗi cuối: ' + loiCuoi);
}
