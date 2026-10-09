'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'vi' | 'en';

const translations = {
  vi: {
    appName: 'Hệ Thống Quản Lý ASM',
    subtitle: 'Account & Customer Data Management System',
    nav: {
      dashboard: 'Dashboard Overview',
      accounts: 'Danh Sách Tài Khoản',
      systemAccounts: 'Hệ Thống Tài Khoản',
      customers: 'Quản Lý Khách Hàng',
      notes: 'Ghi Chú Khách Hàng',
      overview: 'Tra Cứu Tổng Quan',
      history: 'Lịch Sử Thao Tác',
      settings: 'Cấu Hình & Phân Quyền',
    },
    common: {
      search: 'Tìm kiếm realtime...',
      status: 'Trạng thái',
      all: 'Tất cả',
      active: 'Hoạt động',
      inactive: 'Tạm ngưng',
      locked: 'Đã khóa',
      pending: 'Chờ duyệt',
      deleted: 'Đã xóa',
      actions: 'Thao tác',
      add: 'Thêm mới',
      edit: 'Chỉnh sửa',
      delete: 'Xóa',
      save: 'Lưu thay đổi',
      cancel: 'Hủy bỏ',
      loading: 'Đang tải...',
      refresh: 'Làm mới',
      viewDetail: 'Xem chi tiết',
      subAccounts: 'Sub Accounts',
      parent: 'Cấp trên',
      filter: 'Bộ lọc',
      clearFilter: 'Xóa lọc',
      confirmDelete: 'Bạn có chắc chắn muốn xóa bản ghi này?',
      success: 'Thành công',
      error: 'Lỗi',
      generatePassword: 'Tạo Mật Khẩu',
      passwordGenerator: 'Cấu hình tạo mật khẩu'
    },
    dashboard: {
      title: 'Tổng Quan Báo Cáo',
      totalAccounts: 'Tổng Số Tài Khoản',
      activeAccounts: 'Tài Khoản Active',
      totalCustomers: 'Tổng Khách Hàng',
      totalNotes: 'Tổng Số Ghi Chú',
      growthTrend: 'Biến Động Số Lượng',
      statusDistribution: 'Phân Bộ Trạng Thái',
      recentActivities: 'Lịch Sử Thao Tác Mới Nhất'
    },
    accounts: {
      title: 'Quản Lý Danh Sách Tài Khoản',
      accountName: 'Tên Tài Khoản',
      accountId: 'Mã Tài Khoản',
      customerCode: 'Mã Khách Hàng',
      system: 'Hệ Thống',
      supplier: 'Nhà Cung Cấp',
      product: 'Sản Phẩm',
      level: 'Cấp Tài Khoản',
      managedBy: 'Quản Lý Bởi',
      cutRetail: 'Cắt Lẻ',
      password: 'Mật Khẩu',
      code: 'Mã Code',
      subCount: 'Số Sub'
    },
    systemAccounts: {
      title: 'Cấu Trúc Hệ Thống Tài Khoản',
      treeView: 'Xem Dạng Cây Hierarchy',
      listView: 'Xem Dạng Bảng',
      systemUsername: 'Tên Username Hệ Thống',
      parentAccount: 'Tài Khoản Cấp Trên'
    },
    customers: {
      title: 'Danh Sách Khách Hàng',
      customerCode: 'Mã KH',
      parentCustomer: 'KH Cấp Trên',
      level: 'Cấp Độ KH',
      ottApps: 'Ứng Dụng OTT',
      manageOnBehalf: 'Quản Lý Hộ',
      linkedAccounts: 'Tài Khoản Liên Quan'
    },
    notes: {
      title: 'Ghi Chú Khách Hàng',
      noteId: 'Mã Ghi Chú',
      noteType: 'Loại Ghi Chú',
      requirement: 'Yêu Cầu',
      specialNote: 'Ghi Chú Đặc Biệt',
      content: 'Nội Dung Ghi Chú',
      createdBy: 'Người Tạo'
    },
    overview: {
      title: 'Tra Cứu Dữ Liệu Tập Trung (Unified Overview)',
      inputPlaceholder: 'Nhập Mã Khách Hàng (VD: CUS_001) hoặc Mã Tài Khoản (VD: ACC_001)...',
      searchBtn: 'Tra Cứu Tập Trung',
      notFound: 'Không tìm thấy dữ liệu liên quan cho từ khóa tra cứu.'
    },
    history: {
      title: 'Lịch Sử Thao Tác Hệ Thống',
      action: 'Hành Động',
      module: 'Module',
      user: 'Người Thực Hiện',
      object: 'Đối Tượng',
      time: 'Thời Gian',
      oldData: 'Dữ Liệu Cũ',
      newData: 'Dữ Liệu Mới'
    },
    settings: {
      title: 'Cấu Hình Hệ Thống & Quản Lý Người Dùng',
      usersTab: 'Người Dùng & Phân Quyền (RBAC)',
      configsTab: 'Danh Mục Dropdown Động'
    }
  },
  en: {
    appName: 'ASM Data Management',
    subtitle: 'Account & Customer Data Management System',
    nav: {
      dashboard: 'Dashboard Overview',
      accounts: 'Account Directory',
      systemAccounts: 'System Accounts',
      customers: 'Customer Management',
      notes: 'Customer Notes',
      overview: 'Unified Overview Lookup',
      history: 'Audit History Logs',
      settings: 'Settings & RBAC',
    },
    common: {
      search: 'Realtime search...',
      status: 'Status',
      all: 'All',
      active: 'Active',
      inactive: 'Inactive',
      locked: 'Locked',
      pending: 'Pending',
      deleted: 'Deleted',
      actions: 'Actions',
      add: 'Add New',
      edit: 'Edit',
      delete: 'Delete',
      save: 'Save Changes',
      cancel: 'Cancel',
      loading: 'Loading...',
      refresh: 'Refresh',
      viewDetail: 'View Detail',
      subAccounts: 'Sub Accounts',
      parent: 'Parent',
      filter: 'Filter',
      clearFilter: 'Clear Filter',
      confirmDelete: 'Are you sure you want to delete this record?',
      success: 'Success',
      error: 'Error',
      generatePassword: 'Generate Password',
      passwordGenerator: 'Password Generator Settings'
    },
    dashboard: {
      title: 'Analytics & Overview Dashboard',
      totalAccounts: 'Total Accounts',
      activeAccounts: 'Active Accounts',
      totalCustomers: 'Total Customers',
      totalNotes: 'Total Notes',
      growthTrend: 'Growth & Trend Analysis',
      statusDistribution: 'Status Distribution',
      recentActivities: 'Recent Operations Feed'
    },
    accounts: {
      title: 'Account Directory',
      accountName: 'Account Name',
      accountId: 'Account ID',
      customerCode: 'Customer Code',
      system: 'System',
      supplier: 'Supplier',
      product: 'Product',
      level: 'Account Level',
      managedBy: 'Managed By',
      cutRetail: 'Cut Retail',
      password: 'Password',
      code: 'Code',
      subCount: 'Sub Accounts'
    },
    systemAccounts: {
      title: 'System Accounts Hierarchy',
      treeView: 'Hierarchy Tree View',
      listView: 'List Table View',
      systemUsername: 'System Username',
      parentAccount: 'Parent Account'
    },
    customers: {
      title: 'Customer Directory',
      customerCode: 'Customer Code',
      parentCustomer: 'Parent Customer',
      level: 'Customer Level',
      ottApps: 'OTT Messaging Apps',
      manageOnBehalf: 'Manage On Behalf',
      linkedAccounts: 'Linked Accounts'
    },
    notes: {
      title: 'Customer Notes',
      noteId: 'Note ID',
      noteType: 'Note Type',
      requirement: 'Requirement',
      specialNote: 'Special Note',
      content: 'Note Content',
      createdBy: 'Created By'
    },
    overview: {
      title: 'Unified Customer & Account Lookup',
      inputPlaceholder: 'Enter Customer Code (e.g. CUS_001) or Account ID (e.g. ACC_001)...',
      searchBtn: 'Unified Search',
      notFound: 'No matching customer or account records found.'
    },
    history: {
      title: 'System Audit History Logs',
      action: 'Action',
      module: 'Module',
      user: 'User',
      object: 'Object ID',
      time: 'Timestamp',
      oldData: 'Old State',
      newData: 'New State'
    },
    settings: {
      title: 'System Configurations & User Roles',
      usersTab: 'User Management (RBAC)',
      configsTab: 'Dynamic Dropdown Configs'
    }
  }
};

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (path: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'vi',
  setLang: () => {},
  t: (p) => p
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('vi');

  useEffect(() => {
    const saved = localStorage.getItem('asm_lang') as Language;
    if (saved && (saved === 'vi' || saved === 'en')) {
      setLangState(saved);
    }
  }, []);

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem('asm_lang', l);
  };

  const t = (path: string): string => {
    const keys = path.split('.');
    let curr: any = translations[lang];
    for (const k of keys) {
      if (!curr || curr[k] === undefined) return path;
      curr = curr[k];
    }
    return typeof curr === 'string' ? curr : path;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
