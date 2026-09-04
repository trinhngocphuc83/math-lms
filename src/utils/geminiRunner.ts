import { createAdminClient } from '@/utils/supabase/admin';
import { filterCleanKeys, blockKey } from '@/utils/aiKeyManager';

/**
 * Nơi duy nhất gọi Gemini cho toàn bộ ứng dụng.
 *
 * Vì sao cần: trước đây mỗi API route tự chép lại một vòng lặp xoay khoá riêng và
 * ghi cứng tên model vào 16 chỗ khác nhau. Khi Google để model đó quá tải (lỗi 503)
 * thì cả ứng dụng đứng im, muốn đổi sang model khác phải sửa 16 chỗ rồi triển khai lại.
 *
 * Cách chạy: duyệt lần lượt từng MODEL theo thứ tự ưu tiên; với mỗi model thử lần lượt
 * từng KHOÁ. Hết khoá mà vẫn không xong thì tụt xuống model kế tiếp.
 *
 * Hai loại lỗi phải phân biệt, vì cách xử lý ngược nhau:
 *   - 429 (cạn hạn mức): hạn mức tính riêng cho từng cặp khoá + model, nên treo đúng
 *     cặp đó lại 24 giờ rồi sang khoá khác. Khoá này vẫn dùng tốt ở model khác.
 *   - 503 (model quá tải): lỗi nằm ở phía Google, không liên quan khoá. Vẫn thử nốt
 *     các khoá còn lại theo đúng yêu cầu, nhưng KHÔNG chờ rồi thử lại cùng một khoá
 *     như bản cũ - chờ như thế chỉ cộng thêm thời gian chứ không cứu được gì.
 */

/** Dùng khi bảng ai_models chưa được tạo, để ứng dụng vẫn chạy bình thường. */
export const MODEL_MAC_DINH = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.5-flash'];

export const laLoiCanHanMuc = (msg: string): boolean =>
  /429|quota|exceeded|too many requests|resource has been exhausted/i.test(msg);

export const laLoiQuaTai = (msg: string): boolean =>
  /503|service unavailable|overloaded|high demand/i.test(msg);

/** Lỗi do CHÍNH TA bỏ cuộc vì hết giờ, không phải Google trả về. */
export const laLoiHetGio = (msg: string): boolean => /\[hết giờ\]/.test(msg);

/**
 * Hạn giờ cho MỘT lần gọi model, và ngân sách cho CẢ lượt gọi.
 *
 * Đo trong app ngày 04/09/2026: model đầu bảng bị Google quá tải, vòng lặp chạy qua từng
 * khoá mà không có hạn giờ nào, nên một lượt xếp 8 câu treo hơn 5 phút và không có cách
 * dừng. Trên Vercel hàm bị cắt ở 60 giây, trả về trang lỗi HTML chứ không phải JSON, nên
 * phía giao diện chỉ đọc được "Unexpected token 'A'" - không ai đoán ra là do quá tải.
 *
 * Ngân sách để dưới 60 giây của Vercel, chừa chỗ cho phần dựng câu trả lời.
 */
export const GIAY_MOI_LAN_GOI = 20;
export const GIAY_CA_LUOT = 45;

/** Bọc một lời hứa bằng hạn giờ; quá hạn thì ném lỗi có dấu [hết giờ] để phân biệt. */
function chanGio<T>(viec: Promise<T>, giay: number, nhan: string): Promise<T> {
  return new Promise<T>((nhan_, tuChoi) => {
    const dongHo = setTimeout(() => tuChoi(new Error(`[hết giờ] ${nhan} không trả lời trong ${giay} giây.`)), giay * 1000);
    viec.then((v) => { clearTimeout(dongHo); nhan_(v); },
              (e) => { clearTimeout(dongHo); tuChoi(e); });
  });
}

/**
 * Danh sách model đang bật, xếp theo thứ tự ưu tiên.
 * Bảng chưa có (hoặc lỗi kết nối) thì lùi về danh sách mặc định thay vì làm hỏng cả lượt gọi.
 */
export async function layDanhSachModel(): Promise<string[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('ai_models')
      .select('model_id, thu_tu, dang_bat')
      .eq('dang_bat', true)
      .order('thu_tu', { ascending: true });
    if (error) {
      console.warn('[geminiRunner] Không đọc được bảng ai_models, dùng danh sách mặc định:', error.message);
      return [...MODEL_MAC_DINH];
    }
    const ds = (data || []).map(r => r.model_id as string).filter(Boolean);
    return ds.length > 0 ? ds : [...MODEL_MAC_DINH];
  } catch (err: any) {
    console.warn('[geminiRunner] Lỗi kết nối CSDL khi đọc model:', err?.message);
    return [...MODEL_MAC_DINH];
  }
}

export type KetQuaGoiGemini = {
  text: string;
  /** Model nào đã trả lời được - dùng để ghi nhật ký và hiện lên giao diện. */
  model: string;
};

export type ThamSoGoiGemini = {
  /** Danh sách khoá thô. Hàm tự lọc khoá đang bị treo theo từng model. */
  keys: string[];
  /** Nội dung gửi đi: chuỗi, hoặc mảng phần tử theo định dạng của thư viện Google. */
  parts: any[];
  /** Cấu hình riêng của từng nơi gọi, ví dụ { responseMimeType: 'application/json' }. */
  generationConfig?: Record<string, any>;
  /** Ghi đè danh sách model (chủ yếu để kiểm thử). */
  models?: string[];
  /** Hạn giờ cho mỗi lần gọi một model, giây. Mặc định GIAY_MOI_LAN_GOI. */
  giayMoiLanGoi?: number;
  /** Ngân sách cho cả lượt, giây. Hết ngân sách thì dừng ngay, không thử tiếp. */
  giayCaLuot?: number;
};

/**
 * Gọi Gemini, tự xoay khoá rồi xoay model cho tới khi có kết quả.
 * Ném lỗi kèm nguyên nhân thật nếu mọi đường đều tắc.
 */
export async function goiGemini(thamSo: ThamSoGoiGemini): Promise<KetQuaGoiGemini> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const models = thamSo.models && thamSo.models.length > 0 ? thamSo.models : await layDanhSachModel();

  if (!thamSo.keys || thamSo.keys.length === 0) {
    throw new Error('Không có khoá AI nào để gọi. Thêm khoá ở trang Trạm kiểm soát Cổng A.I.');
  }

  let loiCuoi = '';
  const modelDaCan: string[] = [];   // model mà mọi khoá đều cạn hạn mức
  const modelQuaTai: string[] = [];  // model Google đang để quá tải

  const giayMoiLan = thamSo.giayMoiLanGoi ?? GIAY_MOI_LAN_GOI;
  const hanChot = Date.now() + (thamSo.giayCaLuot ?? GIAY_CA_LUOT) * 1000;
  const conGio = () => Date.now() < hanChot;
  let hetNganSach = false;

  for (const modelId of models) {
    if (!conGio()) { hetNganSach = true; break; }
    // Khoá bị treo được tính riêng cho từng model, nên phải lọc lại ở mỗi vòng.
    const keys = await filterCleanKeys(thamSo.keys, modelId);
    if (keys.length === 0) {
      modelDaCan.push(modelId);
      continue;
    }

    let soKhoaCan = 0;
    let coLoiQuaTai = false;
    let soLanQuaTai = 0;

    for (const apiKey of keys) {
      if (!conGio()) { hetNganSach = true; break; }
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: modelId,
          ...(thamSo.generationConfig ? { generationConfig: thamSo.generationConfig } : {}),
        });
        // Chặn giờ ở đây chứ không tin vào thư viện: gọi treo là cả lượt treo theo.
        // Không quá nửa số giây còn lại, để còn kịp thử một đường khác.
        const conLai = Math.max(3, Math.floor((hanChot - Date.now()) / 1000));
        const result = await chanGio(model.generateContent(thamSo.parts),
          Math.min(giayMoiLan, conLai), modelId);
        return { text: result.response.text(), model: modelId };
      } catch (e: any) {
        loiCuoi = e?.message || String(e);

        if (laLoiHetGio(loiCuoi)) {
          console.warn(`[geminiRunner] ${modelId}: khoá ***${apiKey.slice(-4)} quá hạn giờ, bỏ sang đường khác.`);
          continue;
        }

        if (laLoiCanHanMuc(loiCuoi)) {
          soKhoaCan++;
          await blockKey(apiKey, loiCuoi, modelId);
          console.warn(`[geminiRunner] ${modelId}: khoá ***${apiKey.slice(-4)} cạn hạn mức, sang khoá khác.`);
          continue;
        }

        if (laLoiQuaTai(loiCuoi)) {
          coLoiQuaTai = true;
          soLanQuaTai++;
          console.warn(`[geminiRunner] ${modelId} đang quá tải ở khoá ***${apiKey.slice(-4)}.`);
          /*
           * 503 là chuyện của MODEL, không phải của khoá - đổi khoá cũng vẫn 503. Hai khoá
           * liên tiếp báo quá tải là đủ kết luận, sang model khác ngay cho kịp ngân sách.
           * Đo trong app 04/09/2026: kho có 5 khoá, thử hết cả 5 rồi mới chuyển model thì
           * ngân sách 45 giây cạn trước khi kịp chạm tới model thứ ba - đúng model ổn định.
           */
          if (soLanQuaTai >= 2) {
            console.warn(`[geminiRunner] ${modelId} quá tải ở ${soLanQuaTai} khoá, bỏ qua model này.`);
            break;
          }
          continue;
        }

        console.warn(`[geminiRunner] ${modelId}: khoá ***${apiKey.slice(-4)} lỗi khác - ${loiCuoi.slice(0, 120)}`);
      }
    }

    if (soKhoaCan === keys.length) modelDaCan.push(modelId);
    else if (coLoiQuaTai) modelQuaTai.push(modelId);
    console.warn(`[geminiRunner] ${modelId} không dùng được, chuyển sang model kế tiếp.`);
    if (hetNganSach) break;
  }

  if (hetNganSach) {
    throw new Error(
      `[hết giờ] Đã thử ${(thamSo.giayCaLuot ?? GIAY_CA_LUOT)} giây mà chưa model nào trả lời. `
      + 'Thường là do model đầu bảng đang bị Google quá tải. Hãy thử lại, '
      + 'hoặc vào Cài đặt Cổng A.I đưa model ổn định lên trước. Lỗi cuối: ' + loiCuoi,
    );
  }

  // Báo đúng nguyên nhân để thầy cô biết nên chờ, nên thêm khoá, hay nên bật thêm model.
  if (modelDaCan.length === models.length) {
    throw new Error(
      `Cả ${thamSo.keys.length} khoá AI đều đã hết hạn mức trong ngày ở toàn bộ ${models.length} model đang bật `
      + `(${models.join(', ')}). Gói miễn phí của Google giới hạn số lượt mỗi ngày cho từng khoá và từng model. `
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
