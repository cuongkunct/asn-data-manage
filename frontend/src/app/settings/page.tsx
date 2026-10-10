'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, RefreshCw, Plus, Edit3, Trash2, X, ChevronLeft, ChevronRight, AlertCircle, Settings, CheckSquare, Square
} from 'lucide-react';
import { useI18n } from '../../context/i18nContext';
import { syncConfigQueries } from '@/utils/syncQueries';

export interface ConfigItem {
  id: string;
  code: string;
  name: string;
  group: string;
  sortOrder?: number;
  systems?: string[];
}

const CONFIG_TABS = [
  { key: 'product', label: 'Sản Phẩm' },
  { key: 'supplier', label: 'Nhà Cung Cấp' },
  { key: 'system', label: 'Hệ Thống' },
  { key: 'account_level', label: 'Cấp Tài Khoản' },
  { key: 'account_status', label: 'Trạng Thái Tài Khoản' },
  { key: 'customer_status', label: 'Trạng Thái Khách Hàng' },
  { key: 'account_type', label: 'Loại Tài Khoản' },
  { key: 'ott_app', label: 'Ứng Dụng' },
  { key: 'note_type', label: 'Loại Ghi chú' }
];

export default function SettingsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  // Active category tab state (Default: 'product' - Sản Phẩm)
  const [activeGroupKey, setActiveGroupKey] = useState<string>('product');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConfigItem | null>(null);
  const [systemSearchQuery, setSystemSearchQuery] = useState<string>('');
  const [formData, setFormData] = useState({
    group: 'product',
    code: '',
    name: '',
    sortOrder: 1,
    systems: [] as string[]
  });

  // Fetch Configs Query
  const { data: configsData, isLoading, isError, refetch } = useQuery({
    queryKey: ['configs'],
    queryFn: async () => {
      const res = await fetch('/api/configs');
      if (!res.ok) throw new Error('Không thể tải danh mục cấu hình.');
      return res.json();
    }
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const isEdit = Boolean(editingItem);
      const url = isEdit ? `/api/configs/${editingItem?.id}` : '/api/configs';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Thao tác lưu thất bại.');
      }
      return res.json();
    },
    onSuccess: () => {
      syncConfigQueries(queryClient);
      closeModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/configs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Xóa cấu hình thất bại.');
      return res.json();
    },
    onSuccess: () => {
      syncConfigQueries(queryClient);
    }
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setSystemSearchQuery('');
    setFormData({ group: activeGroupKey, code: '', name: '', sortOrder: 1, systems: [] });
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setSystemSearchQuery('');
    setFormData({ group: activeGroupKey, code: '', name: '', sortOrder: 1, systems: [] });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ConfigItem) => {
    setEditingItem(item);
    setSystemSearchQuery('');
    setFormData({
      group: item.group,
      code: item.code,
      name: item.name || item.code,
      sortOrder: item.sortOrder || 1,
      systems: item.systems || []
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      code: formData.code.trim(),
      name: formData.name.trim() || formData.code.trim(),
      sortOrder: Number(formData.sortOrder) || 1
    });
  };

  // Raw grouped configs
  const rawGrouped = configsData?.grouped || {};
  const currentGroupItems: ConfigItem[] = rawGrouped[activeGroupKey] || [];

  // Available system options for multi-select (from 'system' tab)
  const systemOptions: ConfigItem[] = rawGrouped['system'] || [];

  // Filtered system options in modal search
  const filteredSystemOptions = systemOptions.filter(sys => {
    if (!systemSearchQuery.trim()) return true;
    const q = systemSearchQuery.toLowerCase().trim();
    return sys.name.toLowerCase().includes(q) || sys.code.toLowerCase().includes(q);
  });

  const handleToggleSystem = (sysCode: string) => {
    setFormData(prev => {
      const exists = prev.systems.includes(sysCode);
      if (exists) {
        return { ...prev, systems: prev.systems.filter(s => s !== sysCode) };
      } else {
        return { ...prev, systems: [...prev.systems, sysCode] };
      }
    });
  };

  const handleSelectAllSystems = () => {
    const allCodes = systemOptions.map(sys => sys.code || sys.name);
    setFormData(prev => ({ ...prev, systems: allCodes }));
  };

  const handleDeselectAllSystems = () => {
    setFormData(prev => ({ ...prev, systems: [] }));
  };

  // Filter items by search query
  const filteredItems = currentGroupItems.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.name.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      (item.systems && item.systems.some(s => s.toLowerCase().includes(q)))
    );
  });

  // Pagination calculation
  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const displayedItems = filteredItems.slice(startIndex, startIndex + pageSize);

  const showSystemsColumn = activeGroupKey === 'product' || activeGroupKey === 'supplier';

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* 1. TOP HORIZONTAL CATEGORY TABS (Băng tab nhóm cấu hình) */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl px-4 pt-3 shadow-sm overflow-x-auto">
        <div className="flex items-center gap-6 whitespace-nowrap min-w-max text-xs font-semibold">
          {CONFIG_TABS.map((tab) => {
            const isActive = activeGroupKey === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveGroupKey(tab.key);
                  setCurrentPage(1);
                }}
                className={`pb-3 transition relative ${
                  isActive
                    ? 'text-amber-500 font-extrabold border-b-2 border-amber-500'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. MAIN TOOLBAR & TABLE CONTAINER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar Header */}
        <div className="p-4 border-b border-slate-150 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Search input + Refresh button */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm cấu hình..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
            <button
              onClick={() => refetch()}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
              title="Làm mới"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Right: + Thêm Button */}
          <button
            onClick={handleOpenAdd}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-950 font-extrabold text-xs transition flex items-center justify-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm</span>
          </button>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto min-h-[350px]">
          {isLoading ? (
            <div className="py-20 text-center text-slate-400">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-semibold">Đang tải dữ liệu cấu hình...</p>
            </div>
          ) : isError ? (
            <div className="py-16 text-center text-rose-400 space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
              <p className="text-xs font-bold">Lỗi khi tải dữ liệu từ máy chủ API.</p>
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <p className="text-xs font-semibold">Không tìm thấy bản ghi cấu hình nào.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  {showSystemsColumn && <th className="py-3.5 px-6">HỆ THỐNG PHÂN PHỐI</th>}
                  <th className="py-3.5 px-6">TÊN HIỂN THỊ</th>
                  <th className="py-3.5 px-6 text-center w-32">THỨ TỰ</th>
                  <th className="py-3.5 px-6 text-right w-36">HÀNH ĐỘNG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold text-slate-800 dark:text-slate-200">
                {displayedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    {/* Render HỆ THỐNG PHÂN PHỐI pills for Product & Supplier Tabs */}
                    {showSystemsColumn && (
                      <td className="py-3.5 px-6">
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {item.systems && item.systems.length > 0 ? (
                            item.systems.map((sys, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 font-bold text-[11px]"
                              >
                                {sys}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Chưa chọn hệ thống</span>
                          )}
                        </div>
                      </td>
                    )}

                    <td className="py-3.5 px-6 font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                      {item.name || item.code}
                    </td>

                    <td className="py-3.5 px-6 text-center text-slate-500 dark:text-slate-400">
                      {item.sortOrder || 1}
                    </td>

                    <td className="py-3.5 px-6 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-amber-500 text-slate-500 hover:text-amber-500 transition inline-flex items-center justify-center"
                        title="Sửa bản ghi"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Bạn có chắc chắn muốn xóa "${item.name || item.code}"?`)) {
                            deleteMutation.mutate(item.id);
                          }
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-rose-500 text-slate-500 hover:text-rose-500 transition inline-flex items-center justify-center"
                        title="Xóa bản ghi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 3. FOOTER PAGINATION BAR */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Hiển thị <span className="font-bold text-slate-900 dark:text-white">{totalItems > 0 ? startIndex + 1 : 0}</span> - <span className="font-bold text-slate-900 dark:text-white">{Math.min(startIndex + pageSize, totalItems)}</span> trong <span className="font-bold text-slate-900 dark:text-white">{totalItems}</span> bản ghi
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span>Dòng mỗi trang:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-extrabold text-xs">
                {currentPage}
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: THÊM / SỬA CẤU HÌNH */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative text-xs shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <button onClick={closeModal} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {editingItem ? 'Chỉnh sửa cấu hình' : 'Thêm cấu hình mới'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tên hiển thị */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên hiển thị <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value, code: e.target.value })}
                  placeholder="Nhập tên hiển thị"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Thứ tự hiển thị */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Thứ tự hiển thị
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) || 1 })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* CHỌN HỆ THỐNG PHÂN PHỐI (Dành cho tab Sản Phẩm & Nhà Cung Cấp) */}
              {(formData.group === 'product' || formData.group === 'supplier') && (
                <div className="space-y-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Các Hệ Thống Phân Phối:
                  </label>

                  {/* Selected Pills Container */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-indigo-500/40 min-h-[42px] flex flex-wrap gap-1.5">
                    {formData.systems.length === 0 ? (
                      <span className="text-slate-400 text-[11px] italic">Chưa chọn hệ thống nào...</span>
                    ) : (
                      formData.systems.map(sysCode => (
                        <span
                          key={sysCode}
                          className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] border border-indigo-500/30 flex items-center gap-1"
                        >
                          <span>{sysCode}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleSystem(sysCode)}
                            className="hover:text-rose-500"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Searchable Checkbox List Box */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden text-xs">
                    {/* Search inside checkbox list */}
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                      <input
                        type="text"
                        placeholder="Gõ để tìm nhanh..."
                        value={systemSearchQuery}
                        onChange={(e) => setSystemSearchQuery(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>

                    {/* Scrollable Checkbox List */}
                    <div className="max-h-40 overflow-y-auto p-2 space-y-1">
                      {filteredSystemOptions.length === 0 ? (
                        <p className="text-[11px] text-slate-400 text-center py-2">Không tìm thấy hệ thống nào.</p>
                      ) : (
                        filteredSystemOptions.map(sys => {
                          const sysCode = sys.code || sys.name;
                          const isChecked = formData.systems.includes(sysCode);
                          return (
                            <label
                              key={sys.id}
                              onClick={() => handleToggleSystem(sysCode)}
                              className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer font-semibold text-slate-800 dark:text-slate-200 select-none"
                            >
                              <div className={`w-4 h-4 rounded flex items-center justify-center ${isChecked ? 'bg-brand-600 text-white' : 'border border-slate-300 dark:border-slate-700'}`}>
                                {isChecked && <CheckSquare className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />}
                              </div>
                              <span>{sysCode}</span>
                            </label>
                          );
                        })
                      )}
                    </div>

                    {/* Footer Select All / Deselect All */}
                    <div className="p-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[11px] font-bold bg-slate-50/50 dark:bg-slate-900/50">
                      <button
                        type="button"
                        onClick={handleSelectAllSystems}
                        className="text-indigo-500 hover:underline"
                      >
                        Chọn tất cả
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllSystems}
                        className="text-slate-500 hover:underline"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-950 font-extrabold shadow"
                >
                  {editingItem ? 'Cập Nhật' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
