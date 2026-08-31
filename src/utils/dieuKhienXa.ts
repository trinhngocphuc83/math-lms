import { createClient } from "@/utils/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Điều khiển trình chiếu bằng điện thoại.
 *
 * Dùng Realtime của Supabase - đã có sẵn trong dự án, không phải dựng thêm máy chủ nào.
 * Thử thật trên hai máy: gửi lệnh nhận được ngay.
 *
 * MÁY CHIẾU LÀ NƠI GIỮ TRẠNG THÁI THẬT, điện thoại chỉ ra lệnh và hiển thị lại. Nhờ vậy
 * điện thoại rớt mạng giữa chừng thì bài giảng không hề bị ảnh hưởng; cắm lại là máy
 * chiếu phát trạng thái mới, điện thoại tự khớp.
 */

/** Lệnh điện thoại gửi lên máy chiếu. */
export type Lenh =
  | { viec: 'sau' }
  | { viec: 'truoc' }
  | { viec: 'nhay'; slide: number }
  | { viec: 'toan-man-hinh' }
  | { viec: 'mo-goi-ten' }
  | { viec: 'dong-goi-ten' }
  | { viec: 'quay' }
  | { viec: 'diem'; diem: number }
  | { viec: 'vang' }
  | { viec: 'bo-lai' }
  | { viec: 'mo-san-khau' }
  /* Thao tác ngay trên câu hỏi tương tác đang chiếu */
  | { viec: 'chon-dap-an'; chon: number }
  | { viec: 'hien-dap-an' }
  | { viec: 'nhap-dap-an'; chu: string }
  | { viec: 'xem-loi-giai' }
  | { viec: 'nhay-cau'; cau: number }
  | { viec: 'dat-gio'; phut: number }
  | { viec: 'dung-gio' }
  /**
   * Cuộn nội dung đang chiếu lên/xuống.
   *
   * Lời giải chi tiết dài hơn một màn thì phần dưới bị khuất. Thầy cô đang đứng giữa lớp
   * cầm điện thoại, không với tới chuột máy chiếu để cuộn - nên cuộn từ đây.
   * `huong` = 1 là xuống, -1 là lên.
   */
  | { viec: 'cuon'; huong: 1 | -1 }
  /** Điện thoại vừa vào, xin máy chiếu phát lại trạng thái */
  | { viec: 'xin-trang-thai' };

/** Trạng thái máy chiếu phát xuống điện thoại. */
export interface TrangThaiChieu {
  slide: number;
  tongSlide: number;
  /** Nội dung slide đang chiếu (đã ghép các mảnh đang hiện) */
  dangChieu: string;
  /** Nội dung slide kế tiếp - để Thầy cô biết sắp giảng gì */
  keTiep: string;
  /** Vòng quay có đang mở không */
  moGoiTen: boolean;
  /** Tên em vừa quay trúng */
  trungAi: string;
  /** "Vòng 2 · còn 5/16" */
  tomTatQuay: string;
  /**
   * Slide đang chiếu là CÂU HỎI TƯƠNG TÁC thì gửi kèm đề và phương án, để điện thoại bày
   * đúng mấy nút A B C D - Thầy cô chọn đáp án ngay trên tay, không phải về chỗ máy tính.
   */
  cauHoi?: {
    loai: string;
    de: string;
    phuongAn: string[];
    /** Chọn một phương án có nghĩa không. Cụm mệnh đề Đúng/Sai thì không - chỉ để đọc. */
    bamDuoc: boolean;
    /** Đã bấm hiện đáp án chưa */
    hienDapAn: boolean;
    /** Đang chọn phương án nào */
    dangChon: number | null;
    /** Phương án đúng - gửi cho điện thoại của Thầy cô, không gửi cho học sinh */
    dapAn: number | null;
    /** Đáp án của câu trả lời ngắn */
    dapAnChu: string;
    /** Đang ở bước nào: 0 đề · 1 đáp án · 2 lời giải */
    buoc: number;
    /** Lời giải chi tiết, để Thầy cô đọc ngay trên tay lúc chữa bài */
    loiGiai: string;
  } | null;
  /** Giây còn lại của đồng hồ, 0 là không chạy */
  gioConLai?: number;
  /** Đang chữa câu thứ mấy trên tổng bao nhiêu câu (0 nếu slide này không phải câu hỏi) */
  soCau?: number;
  tongCau?: number;
}

const TEN_KENH = (ma: string) => `dieu-khien-${ma}`;

/** Mã phiên 6 ký tự, chỉ dùng chữ và số dễ đọc - bỏ 0/O, 1/I cho khỏi nhầm khi gõ tay. */
export function taoMaPhien(): string {
  const chu = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ra = '';
  for (let i = 0; i < 6; i++) ra += chu[Math.floor(Math.random() * chu.length)];
  return ra;
}

/**
 * Phía MÁY CHIẾU: nghe lệnh từ điện thoại, và phát trạng thái xuống.
 */
export function moKenhMayChieu(
  ma: string,
  khiCoLenh: (l: Lenh) => void,
  khiDienThoaiVao?: () => void,
): { phat: (tt: TrangThaiChieu) => void; dong: () => void; kenh: RealtimeChannel } {
  const supabase = createClient();
  const kenh = supabase.channel(TEN_KENH(ma));

  kenh.on('broadcast', { event: 'lenh' }, (p: any) => {
    const l = p?.payload as Lenh;
    if (!l?.viec) return;
    if (l.viec === 'xin-trang-thai') khiDienThoaiVao?.();
    khiCoLenh(l);
  });
  kenh.subscribe();

  return {
    phat: (tt: TrangThaiChieu) => {
      kenh.send({ type: 'broadcast', event: 'trang-thai', payload: tt });
    },
    dong: () => { try { supabase.removeChannel(kenh); } catch { /* thôi */ } },
    kenh,
  };
}

/**
 * Phía ĐIỆN THOẠI: gửi lệnh lên, và nghe trạng thái về.
 */
export function moKenhDienThoai(
  ma: string,
  khiCoTrangThai: (tt: TrangThaiChieu) => void,
  khiDoiKetNoi?: (noiDuoc: boolean) => void,
): { gui: (l: Lenh) => void; dong: () => void } {
  const supabase = createClient();
  const kenh = supabase.channel(TEN_KENH(ma));

  kenh.on('broadcast', { event: 'trang-thai' }, (p: any) => {
    if (p?.payload) khiCoTrangThai(p.payload as TrangThaiChieu);
  });

  kenh.subscribe((tt: string) => {
    const noiDuoc = tt === 'SUBSCRIBED';
    khiDoiKetNoi?.(noiDuoc);
    /* Vào được rồi thì xin máy chiếu phát lại trạng thái ngay, khỏi phải chờ Thầy cô
       bấm một cái mới biết đang ở slide nào. */
    if (noiDuoc) {
      setTimeout(() => kenh.send({
        type: 'broadcast', event: 'lenh', payload: { viec: 'xin-trang-thai' },
      }), 250);
    }
  });

  return {
    gui: (l: Lenh) => { kenh.send({ type: 'broadcast', event: 'lenh', payload: l }); },
    dong: () => { try { supabase.removeChannel(kenh); } catch { /* thôi */ } },
  };
}
