import { QueryClient } from '@tanstack/react-query';

/**
 * Đồng bộ toàn bộ dữ liệu liên quan đến Khách Hàng:
 * - Bảng Khách Hàng (customers)
 * - Tất cả dropdown Khách Hàng (customers-mini) ở mọi màn hình (Accounts, System Accounts, Notes, QLH)
 * - Bảng Tài Khoản, Hệ Thống Tài Khoản, Ghi Chú, Quản Lý Hộ, Dashboard, Overview
 */
export const syncCustomerQueries = async (queryClient: QueryClient) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['customers'] }),
    queryClient.invalidateQueries({ queryKey: ['customers-mini'] }),
    queryClient.invalidateQueries({ queryKey: ['accounts'] }),
    queryClient.invalidateQueries({ queryKey: ['systemAccounts'] }),
    queryClient.invalidateQueries({ queryKey: ['notes'] }),
    queryClient.invalidateQueries({ queryKey: ['qlh'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['overview'] }),
  ]);
};

/**
 * Đồng bộ toàn bộ dữ liệu liên quan đến Tài Khoản:
 * - Bảng Tài Khoản (accounts)
 * - Dropdown Tài Khoản cấp trên trong Hệ Thống Tài Khoản (allAccountsForParentSelect)
 * - Bảng Hệ Thống Tài Khoản (systemAccounts)
 * - Bảng Quản Lý Hộ (qlh)
 * - Dashboard, Overview
 */
export const syncAccountQueries = async (queryClient: QueryClient) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['accounts'] }),
    queryClient.invalidateQueries({ queryKey: ['allAccountsForParentSelect'] }),
    queryClient.invalidateQueries({ queryKey: ['systemAccounts'] }),
    queryClient.invalidateQueries({ queryKey: ['allSystemAccountsForSelect'] }),
    queryClient.invalidateQueries({ queryKey: ['qlh'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['overview'] }),
  ]);
};

/**
 * Đồng bộ toàn bộ dữ liệu liên quan đến Hệ Thống Tài Khoản:
 * - Bảng Hệ Thống Tài Khoản (systemAccounts)
 * - Dropdown Tài Khoản Hệ Thống (allSystemAccountsForSelect)
 * - Bảng Tài Khoản (accounts)
 * - Dropdown Tài Khoản cấp trên (allAccountsForParentSelect)
 * - Dashboard, Overview
 */
export const syncSystemAccountQueries = async (queryClient: QueryClient) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['systemAccounts'] }),
    queryClient.invalidateQueries({ queryKey: ['allSystemAccountsForSelect'] }),
    queryClient.invalidateQueries({ queryKey: ['accounts'] }),
    queryClient.invalidateQueries({ queryKey: ['allAccountsForParentSelect'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['overview'] }),
  ]);
};

/**
 * Đồng bộ toàn bộ dữ liệu liên quan đến Ghi Chú:
 * - Bảng Ghi Chú (notes)
 * - Dashboard, Overview
 */
export const syncNoteQueries = async (queryClient: QueryClient) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['notes'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['overview'] }),
  ]);
};

/**
 * Đồng bộ toàn bộ Cấu Hình Chung (Configs):
 * - Dropdown Hệ thống, Nhà cung cấp, Sản phẩm, Loại TK, Cấp TK, Loại ghi chú... trên mọi trang
 */
export const syncConfigQueries = async (queryClient: QueryClient) => {
  await queryClient.invalidateQueries({ queryKey: ['configs'] });
};

/**
 * Đồng bộ toàn bộ Quản Lý Hộ:
 * - Bảng QLH (qlh)
 * - Bảng Tài Khoản (accounts)
 * - Hệ Thống Tài Khoản (systemAccounts)
 */
export const syncQlhQueries = async (queryClient: QueryClient) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['qlh'] }),
    queryClient.invalidateQueries({ queryKey: ['accounts'] }),
    queryClient.invalidateQueries({ queryKey: ['allAccountsForParentSelect'] }),
    queryClient.invalidateQueries({ queryKey: ['systemAccounts'] }),
    queryClient.invalidateQueries({ queryKey: ['allSystemAccountsForSelect'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['overview'] }),
  ]);
};
