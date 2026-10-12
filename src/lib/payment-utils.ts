/**
 * Utility functions for VietQR payment generation & memo sanitization
 * Tối ưu hóa chuỗi nội dung chuyển khoản để đối soát thủ công nhanh nhất.
 */

// Bộ ký tự loại trừ hoàn toàn các ký tự dễ nhầm lẫn: 0, O, 1, I, L
const SAFE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * 1. Sinh Mã Đơn Hàng (Order Code)
 * - Tiền tố cố định 2 ký tự (mặc định: TK)
 * - 4 ký tự ngẫu nhiên (chỉ dùng số và chữ in hoa trong SAFE_CHARS)
 * - Độ dài cố định: đúng 6 ký tự
 * - Ví dụ hợp lệ: TK8A3C, TK7M9X
 */
export function generateOrderCode(prefix: string = 'TK'): string {
  const cleanPrefix = (prefix || 'TK').slice(0, 2).toUpperCase();
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * SAFE_CHARS.length);
    randomPart += SAFE_CHARS[randomIndex];
  }
  return `${cleanPrefix}${randomPart}`;
}

/**
 * 2. Chuẩn hóa nội dung gắn vào VietQR (Sanitization & Compact Memo)
 * - Chuyển chữ hoa (.toUpperCase())
 * - Loại bỏ dấu tiếng Việt (chuyển Á, À... thành A, Đ thành D)
 * - Xóa sạch khoảng trắng, dấu gạch nối, dấu chấm: chỉ giữ lại [A-Z0-9]
 * - Giới hạn tối đa không quá 10 ký tự
 */
export function sanitizeMemo(text: string): string {
  if (!text) return '';

  return text
    .normalize('NFD') // Tách tổ hợp ký tự và dấu
    .replace(/[\u0300-\u036f]/g, '') // Xóa các dấu thanh
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '') // Chỉ giữ lại A-Z và 0-9
    .slice(0, 10);
}

export interface VietQRParams {
  bankId: string;
  accountNo: string;
  amount: number;
  memo: string;
  accountName?: string;
  template?: 'compact' | 'compact2';
}

/**
 * 3. Cấu hình URL VietQR chuẩn (img.vietqr.io)
 * Định dạng:
 * https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<CLEAN_MEMO>&accountName=<ENCODED_NAME>
 */
export function buildVietQRUrl({
  bankId,
  accountNo,
  amount,
  memo,
  accountName,
  template = 'compact',
}: VietQRParams): string {
  const cleanBank = encodeURIComponent(bankId.trim());
  const cleanAcc = encodeURIComponent(accountNo.trim().replace(/\s+/g, ''));
  const cleanMemo = encodeURIComponent(sanitizeMemo(memo));
  const safeAmount = Math.max(0, Math.round(amount));
  const selectedTemplate = template === 'compact2' ? 'compact2' : 'compact';

  let url = `https://img.vietqr.io/image/${cleanBank}-${cleanAcc}-${selectedTemplate}.png?amount=${safeAmount}&addInfo=${cleanMemo}`;

  if (accountName && accountName.trim()) {
    url += `&accountName=${encodeURIComponent(accountName.trim().toUpperCase())}`;
  }

  return url;
}
