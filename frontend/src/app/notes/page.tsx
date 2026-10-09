'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FileText, Plus, Search, RefreshCw, Edit, Trash2, 
  Check, X, ChevronLeft, ChevronRight, Shield
} from 'lucide-react';
import { useI18n } from '../../context/i18nContext';
import SearchableSelect, { SearchableOption } from '@/components/SearchableSelect';
import { syncNoteQueries } from '@/utils/syncQueries';

export default function NotesPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  // Search & Filter state (matching top filter bar in Screenshot 1)
  const [searchCustomerCode, setSearchCustomerCode] = useState('');
  const [searchApplicableCustomer, setSearchApplicableCustomer] = useState('');
  const [debouncedCustomerCode, setDebouncedCustomerCode] = useState('');
  const [debouncedApplicableCustomer, setDebouncedApplicableCustomer] = useState('');

  const [noteTypeFilter, setNoteTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const [toastMsg, setToastMsg] = useState('');

  // Modals State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [saveMode, setSaveMode] = useState<'normal' | 'copy' | 'new'>('normal');

  // Form input state (matching Screenshot 2 fields)
  const [formData, setFormData] = useState({
    customerCode: '',
    applicableCustomer: 'ALL',
    noteType: 'BƠM ĐIỂM',
    requirement: '',
    specialNote: '',
    detailPreset: 'XÁC NHẬN', // 'Không chọn' | 'XÁC NHẬN' | 'KHÔNG CẦN XÁC NHẬN'
    content: ''
  });

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCustomerCode(searchCustomerCode);
      setDebouncedApplicableCustomer(searchApplicableCustomer);
      setPage(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchCustomerCode, searchApplicableCustomer]);

  // Fetch Configs Query (Lấy dữ liệu động từ Cấu hình chung cho loại ghi chú)
  const { data: configsData } = useQuery({
    queryKey: ['configs'],
    queryFn: async () => {
      const res = await fetch('/api/configs');
      if (!res.ok) return { grouped: {} };
      return res.json();
    },
    staleTime: 10 * 1000,
  });
  const configsGrouped = configsData?.grouped || {};
  const noteTypeOptions = configsGrouped['note_type'] || [];

  // Fetch Customers Query (Lấy danh sách mã KH từ CSDL khách hàng)
  const { data: customersData } = useQuery({
    queryKey: ['customers-mini'],
    queryFn: async () => {
      const res = await fetch('/api/customers?limit=1000');
      if (!res.ok) return { items: [] };
      return res.json();
    },
    staleTime: 10 * 1000,
  });
  const customerOptions = customersData?.items || [];

  // Options dropdown cho Mã Khách Hàng (tìm kiếm chuyên nghiệp, dùng chung style với Hệ Thống Tài Khoản)
  const customerDropdownOptions = useMemo<SearchableOption[]>(() => {
    return customerOptions.map((c: any) => ({
      value: c.customerCode,
      label: c.customerCode,
      subLabel: c.customerName
        ? `${c.customerName}${c.parentCustomerId ? ` • Cấp trên: ${c.parentCustomerId}` : ''}`
        : (c.parentCustomerId ? `Cấp trên: ${c.parentCustomerId}` : undefined),
      badge: c.level || (c.parentCustomerId ? `Cấp trên: ${c.parentCustomerId}` : 'Gốc'),
    }));
  }, [customerOptions]);

  // Options dropdown cho Khách Hàng Áp Dụng (hiển thị danh sách khách hàng các cấp contains Mã Khách Hàng)
  const applicableCustomerOptions = useMemo<SearchableOption[]>(() => {
    const list: SearchableOption[] = [
      {
        value: 'ALL',
        label: 'ALL',
        subLabel: 'Áp dụng cho tất cả cấp con / toàn bộ',
        badge: 'Toàn bộ'
      }
    ];

    const currentCode = (formData.customerCode || '').trim().toUpperCase();

    // Tập hợp mã KH hợp lệ: contains currentCode hoặc là con cháu của currentCode
    const matchingCodes = new Set<string>();

    if (currentCode) {
      // 1. Mã KH contains currentCode (vd: KKN khớp KKN, KKN-01, KKN-02...)
      customerOptions.forEach((c: any) => {
        const code = (c.customerCode || '').trim().toUpperCase();
        if (code && code.includes(currentCode)) {
          matchingCodes.add(code);
        }
      });

      // 2. Tìm đệ quy các cấp con cháu theo parentCustomerId
      let addedMore = true;
      while (addedMore) {
        addedMore = false;
        customerOptions.forEach((c: any) => {
          const code = (c.customerCode || '').trim().toUpperCase();
          const parent = (c.parentCustomerId || '').trim().toUpperCase();
          if (code && parent && matchingCodes.has(parent) && !matchingCodes.has(code)) {
            matchingCodes.add(code);
            addedMore = true;
          }
        });
      }
    }

    const filteredCustomers = customerOptions.filter((c: any) => {
      if (!currentCode) return true;
      const code = (c.customerCode || '').trim().toUpperCase();
      return matchingCodes.has(code);
    });

    // Đưa mã khách hàng có kí tự ngắn hơn lên đầu
    filteredCustomers.sort((a: any, b: any) => {
      const codeA = (a.customerCode || '').trim();
      const codeB = (b.customerCode || '').trim();
      if (codeA.length !== codeB.length) {
        return codeA.length - codeB.length;
      }
      return codeA.localeCompare(codeB);
    });

    filteredCustomers.forEach((c: any) => {
      list.push({
        value: c.customerCode,
        label: c.customerCode,
        subLabel: c.customerName
          ? `${c.customerName}${c.parentCustomerId ? ` • Cấp trên: ${c.parentCustomerId}` : ''}`
          : (c.parentCustomerId ? `Cấp trên: ${c.parentCustomerId}` : undefined),
        badge: c.level || (c.parentCustomerId ? `Cấp trên: ${c.parentCustomerId}` : 'Gốc'),
      });
    });

    // Giữ giá trị đang lưu nếu có
    if (
      formData.applicableCustomer &&
      formData.applicableCustomer !== 'ALL' &&
      !list.some(opt => opt.value === formData.applicableCustomer)
    ) {
      list.push({
        value: formData.applicableCustomer,
        label: formData.applicableCustomer,
        subLabel: 'Giá trị hiện tại',
        badge: 'Đã lưu'
      });
    }

    return list;
  }, [customerOptions, formData.customerCode, formData.applicableCustomer]);

  const handleCustomerCodeChange = (newCode: string) => {
    setFormData(prev => {
      // Nếu applicableCustomer cũ không phải ALL và không chứa newCode, reset về ALL
      const isApplicableStillValid = 
        prev.applicableCustomer === 'ALL' || 
        (newCode && prev.applicableCustomer.toUpperCase().includes(newCode.toUpperCase()));

      return {
        ...prev,
        customerCode: newCode,
        applicableCustomer: isApplicableStillValid ? prev.applicableCustomer : 'ALL'
      };
    });
  };

  // Fetch Notes List Query
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notes', page, limit, debouncedCustomerCode, debouncedApplicableCustomer, noteTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        customer_code: debouncedCustomerCode,
        applicable_customer: debouncedApplicableCustomer,
        note_type: noteTypeFilter,
      });
      const res = await fetch(`/api/notes?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch notes');
      return res.json();
    }
  });

  // Create / Update Note Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = editingNote ? `/api/notes/${editingNote.noteId}` : '/api/notes';
      const method = editingNote ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save note');
      }
      return res.json();
    },
    onSuccess: (savedData) => {
      syncNoteQueries(queryClient);
      if (saveMode === 'copy') {
        navigator.clipboard.writeText(`Mã KH: ${savedData.customerCode}\nLoại: ${savedData.noteType}\nNội dung: ${savedData.content}`);
        showToast('Đã lưu & Copy ghi chú!');
      } else if (saveMode === 'new') {
        handleOpenCreate();
        showToast('Đã lưu! Sẵn sàng tạo ghi chú tiếp theo.');
        return;
      } else {
        showToast(editingNote ? 'Cập nhật ghi chú thành công!' : 'Thêm ghi chú mới thành công!');
      }
      setIsFormOpen(false);
      setEditingNote(null);
    },
    onError: (err: any) => {
      showToast(`Lỗi: ${err.message}`);
    }
  });

  // Delete Note Mutation
  const deleteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const res = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete note');
      return res.json();
    },
    onSuccess: () => {
      syncNoteQueries(queryClient);
      showToast('Đã xóa ghi chú.');
    }
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const handleOpenCreate = () => {
    setEditingNote(null);
    const defaultType = noteTypeOptions[0]?.name || noteTypeOptions[0]?.code || 'BƠM ĐIỂM';

    setFormData({
      customerCode: '',
      applicableCustomer: 'ALL',
      noteType: defaultType,
      requirement: '',
      specialNote: '',
      detailPreset: 'XÁC NHẬN',
      content: ''
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (note: any) => {
    setEditingNote(note);
    setFormData({
      customerCode: note.customerCode || 'A01',
      applicableCustomer: note.applicableCustomer || 'ALL',
      noteType: note.noteType || 'BƠM ĐIỂM',
      requirement: note.requirement || '',
      specialNote: note.specialNote || '',
      detailPreset: note.content === 'KHÔNG CẦN XÁC NHẬN' ? 'KHÔNG CẦN XÁC NHẬN' : note.content === 'XÁC NHẬN' ? 'XÁC NHẬN' : 'Không chọn',
      content: note.content || ''
    });
    setIsFormOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent, mode: 'normal' | 'copy' | 'new' = 'normal') => {
    e.preventDefault();
    setSaveMode(mode);

    if (!formData.customerCode.trim()) {
      showToast('Vui lòng chọn Mã Khách Hàng!');
      return;
    }

    const finalContent = formData.detailPreset !== 'Không chọn' 
      ? formData.detailPreset 
      : (formData.content.trim() || 'XÁC NHẬN');

    const payload = {
      customerCode: formData.customerCode,
      applicableCustomer: formData.applicableCustomer || `Áp dụng cho ${formData.customerCode}`,
      noteType: formData.noteType,
      requirement: formData.requirement,
      specialNote: formData.specialNote,
      content: finalContent
    };

    saveMutation.mutate(payload);
  };

  const handleClearFilters = () => {
    setSearchCustomerCode('');
    setSearchApplicableCustomer('');
    setNoteTypeFilter('ALL');
    setPage(1);
  };

  return (
    <div className="space-y-4 animate-fadeIn max-w-[1600px] mx-auto pb-10">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-6 z-[200] px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-2xl flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-slate-300 dark:text-slate-700 font-light text-lg">|</span>
          <h1 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Ghi Chú Khách Hàng
          </h1>
        </div>
      </div>

      {/* Top Filter Bar (Khớp Screenshot 1) */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Left Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Tìm theo Mã KH... Input */}
          <div className="relative flex items-center min-w-[160px] max-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo Mã KH..."
              value={searchCustomerCode}
              onChange={(e) => setSearchCustomerCode(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {searchCustomerCode && (
              <button onClick={() => setSearchCustomerCode('')} className="absolute right-2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Khách áp dụng... Input */}
          <div className="relative flex items-center min-w-[160px] max-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400" />
            <input
              type="text"
              placeholder="Khách áp dụng..."
              value={searchApplicableCustomer}
              onChange={(e) => setSearchApplicableCustomer(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {searchApplicableCustomer && (
              <button onClick={() => setSearchApplicableCustomer('')} className="absolute right-2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tất cả loại ghi chú select */}
          <select
            value={noteTypeFilter}
            onChange={(e) => { setNoteTypeFilter(e.target.value); setPage(1); }}
            className="py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
          >
            <option value="ALL">Tất cả loại ghi chú</option>
            {noteTypeOptions.length > 0 ? (
              noteTypeOptions.map((t: any) => (
                <option key={t.id || t.code} value={t.name || t.code}>{t.name || t.code}</option>
              ))
            ) : (
              <>
                <option value="MỞ MỚI">MỞ MỚI</option>
                <option value="BƠM ĐIỂM">BƠM ĐIỂM</option>
                <option value="CHỈNH MAX">CHỈNH MAX</option>
              </>
            )}
          </select>

          {/* Action Buttons: [X], [Refresh] */}
          <button
            onClick={handleClearFilters}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
            title="Xóa bộ lọc"
          >
            <X className="w-4 h-4" />
          </button>

          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
            title="Tải lại"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Right Action Button: [+ Thêm] */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenCreate()}
            className="px-4 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Thêm
          </button>
        </div>
      </div>

      {/* Main Table (Khớp Screenshot 1) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-[10px] uppercase font-black tracking-wider text-slate-400 dark:text-slate-500">
                <th className="py-3 px-3">MÃ KH</th>
                <th className="py-3 px-3">KHÁCH ÁP DỤNG</th>
                <th className="py-3 px-3">LOẠI GHI CHÚ</th>
                <th className="py-3 px-3">YÊU CẦU</th>
                <th className="py-3 px-3">GHI CHÚ ĐẶC BIỆT</th>
                <th className="py-3 px-3">CHI TIẾT GHI CHÚ</th>
                <th className="py-3 px-3">THỜI GIAN</th>
                <th className="py-3 px-3 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                    Đang tải danh sách ghi chú...
                  </td>
                </tr>
              ) : (data?.items || []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-1.5">
                      <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                      <span className="font-semibold text-sm">Không tìm thấy ghi chú nào</span>
                      <span className="text-xs text-slate-400">Bấm nút "+ Thêm" để tạo mới ghi chú khách hàng.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.items.map((note: any) => {
                  const detailText = note.content || 'XÁC NHẬN';
                  const isConfirm = detailText === 'XÁC NHẬN';
                  const isNoConfirm = detailText === 'KHÔNG CẦN XÁC NHẬN';

                  return (
                    <tr key={note.noteId || note._id} className="hover:bg-amber-50/20 dark:hover:bg-amber-500/5 transition">
                      {/* MÃ KH */}
                      <td className="py-3 px-3 font-mono font-extrabold text-slate-900 dark:text-white text-xs">
                        {note.customerCode || '—'}
                      </td>

                      {/* KHÁCH ÁP DỤNG */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {note.applicableCustomer || note.customerCode || '—'}
                      </td>

                      {/* LOẠI GHI CHÚ */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          {note.noteType || 'MỞ MỚI'}
                        </span>
                      </td>

                      {/* YÊU CẦU */}
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                        {note.requirement || '—'}
                      </td>

                      {/* GHI CHÚ ĐẶC BIỆT */}
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400 max-w-[150px]">
                        <span className="line-clamp-1" title={note.specialNote}>
                          {note.specialNote || '—'}
                        </span>
                      </td>

                      {/* CHI TIẾT GHI CHÚ */}
                      <td className="py-3 px-3">
                        {isConfirm ? (
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            XÁC NHẬN
                          </span>
                        ) : isNoConfirm ? (
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            KHÔNG CẦN XÁC NHẬN
                          </span>
                        ) : (
                          <span className="text-slate-700 dark:text-slate-300 text-xs">
                            {detailText}
                          </span>
                        )}
                      </td>

                      {/* THỜI GIAN */}
                      <td className="py-3 px-3 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        <div>Tạo: {note.createdAt ? new Date(note.createdAt).toLocaleDateString('vi-VN') : '—'}</div>
                        <div>Sửa: {note.updatedAt ? new Date(note.updatedAt).toLocaleDateString('vi-VN') : '—'}</div>
                      </td>

                      {/* THAO TÁC */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(note)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Sửa"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Xóa ghi chú của KH "${note.customerCode}"?`)) {
                                deleteMutation.mutate(note.noteId || note._id);
                              }
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination Bar (Khớp Screenshot 1) */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Hiển thị <span className="font-bold text-slate-900 dark:text-white">{data?.total > 0 ? ((page - 1) * limit) + 1 : 0}</span> - <span className="font-bold text-slate-900 dark:text-white">{Math.min(page * limit, data?.total || 0)}</span> trong <span className="font-bold text-slate-900 dark:text-white">{data?.total || 0}</span> bản ghi
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-xs">
              <span>Dòng mỗi trang:</span>
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className="py-1 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: Math.min(5, data?.totalPages || 1) }, (_, i) => {
                  const pNum = i + 1;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={`w-7 h-7 rounded-lg font-bold text-xs transition ${
                        page === pNum
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={page >= (data?.totalPages || 1)}
                onClick={() => setPage(p => Math.min(data?.totalPages || 1, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL THÊM / SỬA GHI CHÚ MỚI (Khớp 100% Screenshot 2) ── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/40">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {editingNote ? 'Sửa Ghi Chú' : 'Thêm Ghi Chú Mới'}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {/* SECTION 1: THÔNG TIN ĐỊNH DANH */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-3 h-px bg-slate-300 dark:bg-slate-700" />
                  THÔNG TIN ĐỊNH DANH
                  <span className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Mã Khách Hàng * */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Mã Khách Hàng <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      options={customerDropdownOptions}
                      value={formData.customerCode}
                      onChange={handleCustomerCodeChange}
                      placeholder="Chọn hoặc tìm kiếm Mã KH..."
                      searchPlaceholder="Nhập mã hoặc tên khách hàng..."
                      emptyText="Không tìm thấy khách hàng phù hợp"
                    />
                  </div>

                  {/* Khách Hàng Áp Dụng */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Khách Hàng Áp Dụng
                    </label>
                    <SearchableSelect
                      options={applicableCustomerOptions}
                      value={formData.applicableCustomer}
                      onChange={(val) => setFormData(prev => ({ ...prev, applicableCustomer: val }))}
                      placeholder="Chọn khách hàng áp dụng..."
                      searchPlaceholder="Tìm kiếm khách áp dụng..."
                      emptyText="Không tìm thấy khách hàng áp dụng phù hợp"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: NỘI DUNG GHI CHÚ */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-3 h-px bg-slate-300 dark:bg-slate-700" />
                  NỘI DUNG GHI CHÚ
                  <span className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Loại Ghi Chú * */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Loại Ghi Chú <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.noteType}
                      onChange={(e) => setFormData({ ...formData, noteType: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {noteTypeOptions.length > 0 ? (
                        noteTypeOptions.map((t: any) => (
                          <option key={t.id || t.code} value={t.name || t.code}>{t.name || t.code}</option>
                        ))
                      ) : (
                        <>
                          <option value="BƠM ĐIỂM">BƠM ĐIỂM</option>
                          <option value="MỞ MỚI">MỞ MỚI</option>
                          <option value="CHỈNH MAX">CHỈNH MAX</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Yêu Cầu */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Yêu Cầu
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Yêu cầu..."
                      value={formData.requirement}
                      onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Ghi Chú Đặc Biệt */}
                <div className="mt-4">
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                    Ghi Chú Đặc Biệt
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ghi chú đặc biệt (nếu có)..."
                    value={formData.specialNote}
                    onChange={(e) => setFormData({ ...formData, specialNote: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Chi Tiết Ghi Chú với Dropdown Selector ở Header Field (Khớp Screenshot 2) */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-600 dark:text-slate-400 font-bold">
                      Chi Tiết Ghi Chú
                    </label>
                    <select
                      value={formData.detailPreset}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ 
                          ...formData, 
                          detailPreset: val,
                          content: val !== 'Không chọn' ? val : formData.content 
                        });
                      }}
                      className="py-1 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none"
                    >
                      <option value="Không chọn">Không chọn</option>
                      <option value="XÁC NHẬN">XÁC NHẬN</option>
                      <option value="KHÔNG CẦN XÁC NHẬN">KHÔNG CẦN XÁC NHẬN</option>
                    </select>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Chi tiết ghi chú..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

            </div>

            {/* Modal Footer Action Buttons (Khớp Screenshot 2) */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={(e) => handleSubmitForm(e, 'normal')}
                disabled={saveMutation.isPending}
                className="px-7 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-950 font-black shadow-lg transition"
              >
                {saveMutation.isPending ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
