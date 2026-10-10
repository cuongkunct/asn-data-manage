/**
 * Chuyển đổi level từ DB sang format hiển thị trên UI:
 * - 0 -> "0-0"
 * - 1 -> "1-0"
 * - 2 -> "2-1"
 * - 3 -> "3-2"
 * - N -> `${N}-${N-1}`
 * - "1-0", "2-1", "0-0" -> giữ nguyên nếu đã đúng format X-Y
 */
export function formatCustomerLevel(level: any): string {
  if (level === undefined || level === null || level === '') return '1-0';
  const str = String(level).trim();
  // Nếu đã ở dạng X-Y (VD: 1-0, 2-1, 0-0)
  if (/^\d+-\d+$/.test(str)) {
    return str;
  }
  // Nếu là số nguyên
  if (/^\d+$/.test(str)) {
    const n = parseInt(str, 10);
    if (n === 0) return '0-0';
    return `${n}-${n - 1}`;
  }
  return str;
}

/**
 * Chuẩn hóa giá trị level khi người dùng điền vào để lưu vào DB:
 * - Điền 1 hoặc 1-0 -> lưu vào db là "1"
 * - Điền 0 hoặc 0-0 -> lưu vào db là "0"
 * - Điền 2 hoặc 2-1 -> lưu vào db là "2"
 * - Điền 3 hoặc 3-2 -> lưu vào db là "3"
 */
export function normalizeCustomerLevel(level: any): string {
  if (level === undefined || level === null) return '1';
  const str = String(level).trim();
  if (!str) return '1';
  const match = str.match(/^(\d+)/);
  if (match) {
    return match[1];
  }
  return str;
}
