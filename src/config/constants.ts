export const DEFAULT_SERVICE_TYPES = [
  {
    id: 'FULL_3_RUONG',
    name: 'Làm Full 3 Rương',
    price: 99000,
  },
  {
    id: 'RUONG_SS',
    name: 'Rương SS',
    price: 60000,
  },
  {
    id: 'RUONG_S_PLUS_PLUS',
    name: 'Rương S++',
    price: 30000,
  },
  {
    id: 'RUONG_S_PLUS',
    name: 'Rương S+',
    price: 15000,
  },
];

export type ServiceTypeId = string;

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
  BANK_ID: process.env.NEXT_PUBLIC_BANK_ID || 'MB',
  BANK_NAME: process.env.NEXT_PUBLIC_BANK_NAME || 'MB Bank (Quân Đội)',
  ACCOUNT_NO: process.env.NEXT_PUBLIC_BANK_ACCOUNT || '0333888999',
  ACCOUNT_NAME: process.env.NEXT_PUBLIC_BANK_HOLDER || 'NGUYEN VAN A',
  TEMPLATE: process.env.NEXT_PUBLIC_SEPAY_TEMPLATE || 'compact',
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

