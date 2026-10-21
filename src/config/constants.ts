export const DEFAULT_SERVICE_TYPES = [
  {
    id: 'FULL_3_RUONG',
    name: 'Full 3 Mốc Quà',
    price: 99000,
    originalPrice: 150000,
  },
  {
    id: 'RUONG_SS',
    name: 'Mốc Quà SS',
    price: 60000,
    originalPrice: 90000,
  },
  {
    id: 'RUONG_S_PLUS_PLUS',
    name: 'Mốc Quà S++',
    price: 30000,
    originalPrice: 45000,
  },
  {
    id: 'RUONG_S_PLUS',
    name: 'Mốc Quà S+',
    price: 15000,
    originalPrice: 25000,
  },
];

export type ServiceTypeId = string;

// Phí đơn ưu tiên làm trước
export const PRIORITY_ORDER_FEE = 19000;

export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  ERROR: 'error',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PENDING_VERIFICATION: 'pending_verification',
  PAID: 'paid',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Chưa thanh toán',
  pending_verification: 'Đợi xác nhận',
  paid: 'Đã thanh toán',
};

export const PAYMENT_STATUS_BADGES: Record<PaymentStatus, string> = {
  unpaid: 'bg-red-50 text-red-700 border border-red-200',
  pending_verification: 'bg-amber-50 text-amber-700 border border-amber-200',
  paid: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

export const EMPLOYEE_ROLE = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee',
} as const;

export type EmployeeRole = (typeof EMPLOYEE_ROLE)[keyof typeof EMPLOYEE_ROLE];

// Cấu hình thanh toán SePay / VietQR
export const PAYMENT_CONFIG = {
  BANK_ID: process.env.NEXT_PUBLIC_BANK_ID || "VPB", BANK_NAME: process.env.NEXT_PUBLIC_BANK_NAME || "VPBank", ACCOUNT_NO: process.env.NEXT_PUBLIC_BANK_ACCOUNT || "0966216495",
  ACCOUNT_NAME: process.env.NEXT_PUBLIC_BANK_HOLDER || 'NGUYEN VAN NAM',
  TEMPLATE: process.env.NEXT_PUBLIC_SEPAY_TEMPLATE || 'compact',
};

// Cấu hình mã sự kiện
export const EVENT_CODE_CONFIG = {
  REQUIRED_LENGTH: Number(process.env.NEXT_PUBLIC_EVENT_CODE_LENGTH || 10),
};

/**
 * Trích xuất mã sự kiện Chung Sức từ nội dung khách dán vào
 * Xử lý các dạng lời mời từ game: "Mã mời của tôi là --PwN8JZ5gWH--, [[lllzQTwgRzoEvGuQSGhzbNFyhTeB3PP ]]"
 */
export const extractEventCode = (
  rawInput: string,
  targetLength: number = EVENT_CODE_CONFIG.REQUIRED_LENGTH
): { cleanCode: string; isValid: boolean; error?: string } => {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return { cleanCode: '', isValid: false, error: 'Vui lòng nhập mã sự kiện chung sức' };
  }

  // 1. Nhận diện mẫu thường thấy khi chia sẻ từ game: --CODE-- (ví dụ: --PwN8JZ5gWH--)
  const dashMatch = trimmed.match(/--([A-Za-z0-9]+)--/);
  if (dashMatch && dashMatch[1]) {
    const code = dashMatch[1].trim();
    if (code.length === targetLength) {
      return { cleanCode: code, isValid: true };
    }
  }

  // 2. Nhận diện link chứa tham số code=... hoặc c=...
  const urlParamMatch = trimmed.match(/[?&](?:code|c)=([A-Za-z0-9]+)/i);
  if (urlParamMatch && urlParamMatch[1]) {
    const code = urlParamMatch[1].trim();
    if (code.length === targetLength) {
      return { cleanCode: code, isValid: true };
    }
  }

  // 3. Tìm chuỗi chữ & số độc lập có đúng độ dài targetLength (ví dụ 10 ký tự)
  const exactMatches = trimmed.match(new RegExp(`\\b[A-Za-z0-9]{${targetLength}}\\b`, 'g'));
  if (exactMatches && exactMatches.length > 0) {
    return { cleanCode: exactMatches[0], isValid: true };
  }

  // 4. Nếu không match regex độc lập, lọc các ký tự ngăn cách như ngoặc, dấu gạch, dấu phẩy, khoảng trắng
  const cleaned = trimmed
    .replace(/[\s\-_[\].,:;"'\/\\!@#$%^&*()+=?]/g, '')
    .replace(/[^A-Za-z0-9]/g, '');

  if (cleaned.length === targetLength) {
    return { cleanCode: cleaned, isValid: true };
  }

  if (cleaned.length === 0) {
    return { cleanCode: '', isValid: false, error: 'Không tìm thấy mã hợp lệ trong nội dung đã nhập' };
  }

  if (cleaned.length < targetLength) {
    return {
      cleanCode: cleaned,
      isValid: false,
      error: `Mã không hợp lệ (đang có ${cleaned.length}/${targetLength} ký tự, bị thiếu ký tự)`,
    };
  }

  return {
    cleanCode: cleaned.slice(0, targetLength),
    isValid: false,
    error: `Mã không hợp lệ (thừa ký tự, mã chuẩn cần đúng ${targetLength} ký tự)`,
  };
};

// Cấu hình liên hệ hỗ trợ
export const CONTACT_CONFIG = {
  ZALO_PHONE: process.env.NEXT_PUBLIC_ZALO_PHONE || '0966216495',
  ZALO_URL: process.env.NEXT_PUBLIC_ZALO_URL || 'https://zalo.me/0966216495',
  FACEBOOK_URL: process.env.NEXT_PUBLIC_FACEBOOK_URL || 'https://www.facebook.com/namdev1029',
};

/**
 * Sinh link ảnh QR SePay kèm nội dung chuyển khoản là mã đơn hàng
 */
export const getSepayQrUrl = (amount: number, orderId: string) => {
  const bank = encodeURIComponent(PAYMENT_CONFIG.BANK_ID);
  const acc = encodeURIComponent(PAYMENT_CONFIG.ACCOUNT_NO);
  const des = encodeURIComponent(orderId);
  return `https://qr.sepay.vn/img?bank=${bank}&acc=${acc}&template=${PAYMENT_CONFIG.TEMPLATE}&amount=${amount}&des=${des}`;
};

// Cấu hình video hướng dẫn lấy mã sự kiện
export const VIDEO_GUIDE_CONFIG = {
  // Có thể đặt file video vào thư mục /public/guide.mp4 hoặc dán URL video / YouTube
  VIDEO_URL: process.env.NEXT_PUBLIC_VIDEO_GUIDE_URL || '/guide.mp4',
  TITLE: 'Hướng dẫn lấy mã sự kiện Chung Sức',
};


