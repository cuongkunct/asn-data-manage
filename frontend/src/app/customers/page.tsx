'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, RefreshCw, Edit, Trash2,
  Check, X, ChevronLeft, ChevronRight, Star, ArrowLeftRight, MessageSquare,
  FolderTree, ChevronDown
} from 'lucide-react';
import { useI18n } from '../../context/i18nContext';
import { syncCustomerQueries } from '@/utils/syncQueries';
import { formatCustomerLevel, normalizeCustomerLevel } from '@/utils/customerLevel';

interface CustomerTreeNode {
  item: any;
  customerCode: string;
  depth: number;
  hasChildren: boolean;
  childrenCount: number;
  children: CustomerTreeNode[];
}

export default function CustomersPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  // Search & Filter state (matching top filter bar in Screenshot 1)
  const [searchCustomerCode, setSearchCustomerCode] = useState('');
  const [searchParentCustomer, setSearchParentCustomer] = useState('');
  const [debouncedCustomerCode, setDebouncedCustomerCode] = useState('');
  const [debouncedParentCustomer, setDebouncedParentCustomer] = useState('');

  const [qlhFilter, setQlhFilter] = useState('ALL'); // 'ALL', 'YES', 'NO'
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Tree state: Set of expanded customer codes
  const [expandedCustomerCodes, setExpandedCustomerCodes] = useState<Set<string>>(new Set());

  const [toastMsg, setToastMsg] = useState('');

  // Modals State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCust, setEditingCust] = useState<any>(null);

  // Form input state (matching Screenshot 2 fields)
  const [formData, setFormData] = useState({
    customerCode: '',
    parentId: '',
    parentCustomerId: '',
    status: 'ACTIVE',
    level: '1',
    ottApp: 'Telegram',
    manageOnBehalf: false, // Quản Lý Hộ
    notes: ''
  });

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCustomerCode(searchCustomerCode);
      setDebouncedParentCustomer(searchParentCustomer);
      setPage(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchCustomerCode, searchParentCustomer]);

  // Fetch Customers List Query
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customers', page, limit, debouncedCustomerCode, debouncedParentCustomer, qlhFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        customer_code: debouncedCustomerCode,
        parent_customer_id: debouncedParentCustomer,
        qlh: qlhFilter,
        status: statusFilter,
      });
      const res = await fetch(`/api/customers?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch customers');
      return res.json();
    }
  });

  // Fetch Configs Query (Lấy dữ liệu động từ Cấu hình chung)
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
  const customerStatusOptions = configsGrouped['customer_status'] || [];

  const getStatusLabel = (statusCode: string) => {
    const found = customerStatusOptions.find((o: any) => (o.code || '').toLowerCase() === (statusCode || '').toLowerCase());
    if (found?.name) return found.name;
    if (statusCode === 'ACTIVE') return 'Active';
    if (statusCode === 'INACTIVE') return 'Inactive';
    if (statusCode === 'CLOSED') return 'Closed';
    return statusCode || 'Active';
  };

  // ── XÂY DỰNG CẤU TRÚC CÂY KHÁCH HÀNG (TREE VIEW) ──
  const customerTreeNodes = useMemo<CustomerTreeNode[]>(() => {
    const rawItems: any[] = data?.items || [];
    if (!rawItems.length) return [];

    const nodeMap = new Map<string, CustomerTreeNode>();
    rawItems.forEach(c => {
      nodeMap.set(c.customerCode.trim().toLowerCase(), {
        item: c,
        customerCode: c.customerCode,
        depth: 0,
        hasChildren: false,
        childrenCount: 0,
        children: []
      });
    });

    const rootNodes: CustomerTreeNode[] = [];

    rawItems.forEach(c => {
      const codeKey = c.customerCode.trim().toLowerCase();
      const node = nodeMap.get(codeKey)!;
      let parentKey = (c.parentCustomerId || '').trim().toLowerCase();

      // Bỏ qua giá trị mặc định 'cty' hoặc rỗng
      if (parentKey === 'cty' || !parentKey) {
        parentKey = '';
      }

      // 1. Tìm cha theo parentCustomerId rõ ràng
      let parentNode = parentKey ? nodeMap.get(parentKey) : undefined;

      // 2. Tìm cha theo tiền tố (VD: 'AA' là cha của 'AAB') nếu không có parentCustomerId rõ ràng
      if (!parentNode) {
        let bestPrefixKey = '';
        nodeMap.forEach((_, key) => {
          if (key !== codeKey && codeKey.startsWith(key) && key.length > bestPrefixKey.length) {
            bestPrefixKey = key;
          }
        });
        if (bestPrefixKey) {
          parentNode = nodeMap.get(bestPrefixKey);
        }
      }

      if (parentNode && parentNode.customerCode !== node.customerCode) {
        parentNode.children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    function updateMeta(node: CustomerTreeNode, depth: number) {
      node.depth = depth;
      node.hasChildren = node.children.length > 0;
      node.childrenCount = node.children.length;
      node.children.forEach(child => updateMeta(child, depth + 1));
    }

    rootNodes.forEach(r => updateMeta(r, 0));
    return rootNodes;
  }, [data?.items]);

  // Danh sách các mã KH có con
  const allParentCustomerCodes = useMemo<string[]>(() => {
    const parents: string[] = [];
    function scan(nodes: CustomerTreeNode[]) {
      nodes.forEach(n => {
        if (n.hasChildren) {
          parents.push(n.customerCode);
          scan(n.children);
        }
      });
    }
    scan(customerTreeNodes);
    return parents;
  }, [customerTreeNodes]);

  const isAllExpanded = allParentCustomerCodes.length > 0 && allParentCustomerCodes.every(c => expandedCustomerCodes.has(c));

  const toggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedCustomerCodes(new Set());
    } else {
      setExpandedCustomerCodes(new Set(allParentCustomerCodes));
    }
  };

  const toggleCustomerExpand = (code: string) => {
    setExpandedCustomerCodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  // Flatten cây thành danh sách dòng hiển thị (chỉ lấy con cháu khi cha đang mở rộng)
  const visibleCustomerRows = useMemo<CustomerTreeNode[]>(() => {
    const rows: CustomerTreeNode[] = [];

    function traverse(nodes: CustomerTreeNode[]) {
      nodes.forEach(node => {
        rows.push(node);
        if (expandedCustomerCodes.has(node.customerCode) && node.children.length > 0) {
          traverse(node.children);
        }
      });
    }

    traverse(customerTreeNodes);
    return rows;
  }, [customerTreeNodes, expandedCustomerCodes]);

  // Create / Update Customer Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = editingCust ? `/api/customers/${editingCust.customerCode}` : '/api/customers';
      const method = editingCust ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save customer');
      }
      return res.json();
    },
    onSuccess: () => {
      syncCustomerQueries(queryClient);
      showToast(editingCust ? 'Cập nhật khách hàng thành công!' : 'Thêm khách hàng thành công!');
      setIsFormOpen(false);
      setEditingCust(null);
    },
    onError: (err: any) => {
      showToast(`Lỗi: ${err.message}`);
    }
  });

  // Delete Customer Mutation
  const deleteMutation = useMutation({
    mutationFn: async (custCode: string) => {
      const res = await fetch(`/api/customers/${custCode}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete customer');
      return res.json();
    },
    onSuccess: () => {
      syncCustomerQueries(queryClient);
      showToast('Đã xóa khách hàng.');
    }
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const handleOpenCreate = (parentParam?: any) => {
    setEditingCust(null);

    let parentCode = '';
    let parentMongoId = '';
    let autoLevel = '1';

    if (parentParam) {
      if (typeof parentParam === 'string') {
        parentCode = parentParam;
      } else if (typeof parentParam === 'object') {
        parentCode = parentParam.customerCode || '';
        parentMongoId = parentParam._id || '';
      }

      // Tìm thông tin khách hàng cha
      const parentObj = typeof parentParam === 'object' && parentParam.level
        ? parentParam
        : data?.items?.find((c: any) => c.customerCode === parentCode || c._id === parentMongoId);

      if (parentObj) {
        if (!parentMongoId) parentMongoId = parentObj._id || '';
        if (!parentCode) parentCode = parentObj.customerCode || '';
        // Tự động tăng cấp độ
        const match = (String(parentObj.level || '')).match(/^(\d+)/);
        const parentLevelNum = match ? parseInt(match[1], 10) : 1;
        autoLevel = String(parentLevelNum + 1);
      } else {
        autoLevel = '2';
      }
    } else {
      // Cây đầu tiên
      autoLevel = '1';
    }

    const defaultStatus = customerStatusOptions[0]?.code || 'ACTIVE';
    setFormData({
      customerCode: '',
      parentId: parentMongoId || '',
      parentCustomerId: parentCode || '',
      status: defaultStatus,
      level: autoLevel,
      ottApp: 'Telegram',
      manageOnBehalf: false,
      notes: ''
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (cust: any) => {
    setEditingCust(cust);
    setFormData({
      customerCode: cust.customerCode || '',
      parentId: cust.parentId || '',
      parentCustomerId: cust.parentCustomerId || '',
      status: cust.status || 'ACTIVE',
      level: normalizeCustomerLevel(cust.level),
      ottApp: cust.ottApps?.[0] || 'Telegram',
      manageOnBehalf: Boolean(cust.manageOnBehalf),
      notes: cust.notes || ''
    });
    setIsFormOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerCode.trim()) {
      showToast('Vui lòng nhập Mã KH!');
      return;
    }

    const cleanParent = formData.parentCustomerId.trim();
    let finalParentId: string | null = formData.parentId || null;
    if (!finalParentId && cleanParent && cleanParent.toLowerCase() !== 'cty') {
      const found = (data?.items || []).find((c: any) => c.customerCode.toLowerCase() === cleanParent.toLowerCase());
      finalParentId = found ? found._id : (cleanParent || null);
    }

    const payload = {
      customerCode: formData.customerCode.trim().toUpperCase(),
      parentId: finalParentId || null,
      status: formData.status,
      level: normalizeCustomerLevel(formData.level),
      ottApps: [formData.ottApp],
      manageOnBehalf: formData.manageOnBehalf,
      notes: formData.notes
    };

    saveMutation.mutate(payload);
  };

  const handleClearFilters = () => {
    setSearchCustomerCode('');
    setSearchParentCustomer('');
    setQlhFilter('ALL');
    setStatusFilter('ALL');
    setPage(1);
  };

  // OTT Badge Color Helper (Matching Screenshot 1)
  const getOttBadgeStyle = (app: string) => {
    const appLower = (app || '').toLowerCase();
    if (appLower.includes('viber')) {
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20';
    }
    if (appLower.includes('zalo')) {
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
    }
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'; // Telegram default
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
            Danh Sách Khách Hàng
          </h1>
        </div>
      </div>

      {/* Top Filter Bar (Khớp Screenshot 1) */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Left Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Mã KH... Input */}
          <div className="relative flex items-center min-w-[150px] max-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400" />
            <input
              type="text"
              placeholder="Mã KH..."
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

          {/* Cấp trên... Input */}
          <div className="relative flex items-center min-w-[150px] max-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cấp trên..."
              value={searchParentCustomer}
              onChange={(e) => setSearchParentCustomer(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {searchParentCustomer && (
              <button onClick={() => setSearchParentCustomer('')} className="absolute right-2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tất cả QLH select */}
          <select
            value={qlhFilter}
            onChange={(e) => { setQlhFilter(e.target.value); setPage(1); }}
            className="py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
          >
            <option value="ALL">Tất cả QLH</option>
            <option value="YES">Có QLH</option>
            <option value="NO">Không QLH</option>
          </select>

          {/* Trạng thái khách hàng select */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
          >
            <option value="ALL">Tất cả trạng thái</option>
            {customerStatusOptions.length > 0 ? (
              customerStatusOptions.map((s: any) => (
                <option key={s.id || s.code} value={s.code || s.name}>
                  {s.name || s.code}
                </option>
              ))
            ) : (
              <>
                <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                <option value="INACTIVE">Tạm ngưng (INACTIVE)</option>
                <option value="CLOSED">Đóng/Khóa (CLOSED)</option>
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

        {/* Right Action Buttons: [Thu gọn/Mở rộng cây], [Chuyển Mã KH], [+ Thêm] */}
        <div className="flex items-center gap-2">
          {allParentCustomerCodes.length > 0 && (
            <button
              onClick={toggleExpandAll}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs shadow-sm transition flex items-center gap-1.5"
              title={isAllExpanded ? "Thu gọn tất cả cây khách hàng" : "Mở rộng toàn bộ cây khách hàng"}
            >
              <FolderTree className="w-3.5 h-3.5 text-amber-500" />
              <span>{isAllExpanded ? 'Thu gọn cây' : 'Mở rộng cây'}</span>
            </button>
          )}

          <button
            onClick={() => showToast('Tính năng Chuyển Mã KH')}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Chuyển Mã KH
          </button>

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
                <th className="py-3 px-3">CẤP TRÊN</th>
                <th className="py-3 px-3">QUẢN LÝ HỘ</th>
                <th className="py-3 px-3">CẤP</th>
                <th className="py-3 px-3">TRẠNG THÁI</th>
                <th className="py-3 px-3">THÔNG TIN</th>
                <th className="py-3 px-3">ỨNG DỤNG</th>
                <th className="py-3 px-3">THỜI GIAN TẠO</th>
                <th className="py-3 px-3 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                    Đang tải danh sách khách hàng...
                  </td>
                </tr>
              ) : visibleCustomerRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-1.5">
                      <Users className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                      <span className="font-semibold text-sm">Không tìm thấy khách hàng nào</span>
                      <span className="text-xs text-slate-400">Bấm nút "+ Thêm" để tạo mới khách hàng.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleCustomerRows.map((node) => {
                  const cust = node.item;
                  const ottName = (cust.ottApps && cust.ottApps[0]) || 'Telegram';
                  const isExpanded = expandedCustomerCodes.has(cust.customerCode);
                  return (
                    <tr
                      key={cust.customerCode || cust._id}
                      className={`hover:bg-amber-50/20 dark:hover:bg-amber-500/5 transition ${node.depth > 0 ? 'bg-slate-50/50 dark:bg-slate-950/25' : ''
                        }`}
                    >
                      {/* MÃ KH (Hierarchical Tree Cell) */}
                      <td className="py-3 px-3">
                        <div
                          style={{ paddingLeft: `${node.depth * 20}px` }}
                          className="flex items-center gap-1.5"
                        >
                          {node.depth > 0 && (
                            <span className="text-slate-300 dark:text-slate-700 text-xs select-none">
                              └─
                            </span>
                          )}

                          {node.hasChildren ? (
                            <button
                              type="button"
                              onClick={() => toggleCustomerExpand(cust.customerCode)}
                              className="inline-flex items-center gap-1.5 py-0.5 px-1.5 -ml-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition group cursor-pointer"
                              title={isExpanded ? 'Thu gọn cấp dưới' : 'Mở rộng cấp dưới'}
                            >
                              <span
                                className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${isExpanded
                                    ? 'bg-amber-500 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                                  }`}
                              >
                                <ChevronRight
                                  className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''
                                    }`}
                                />
                              </span>
                              <span className="font-extrabold text-slate-900 dark:text-white text-xs group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                                {cust.customerCode}
                              </span>
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                {node.childrenCount}
                              </span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 pl-4">
                              <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                                {cust.customerCode}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* CẤP TRÊN */}
                      <td className="py-3 px-3 font-bold text-slate-700 dark:text-slate-300">
                        {cust.parentCustomerId || '—'}
                      </td>

                      {/* QUẢN LÝ HỘ */}
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold border ${cust.manageOnBehalf
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}>
                          {cust.manageOnBehalf ? 'Có' : 'Không'}
                        </span>
                      </td>

                      {/* CẤP */}
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          <span>{formatCustomerLevel(cust.level)}</span>
                          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        </span>
                      </td>

                      {/* TRẠNG THÁI */}
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${cust.status === 'ACTIVE'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : cust.status === 'CLOSED'
                              ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-200'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          }`}>
                          {getStatusLabel(cust.status)}
                        </span>
                      </td>

                      {/* THÔNG TIN */}
                      <td className="py-3 px-3 max-w-[200px]">
                        <span className="text-[11px] text-slate-700 dark:text-slate-300 line-clamp-1" title={cust.notes}>
                          {cust.notes || '—'}
                        </span>
                      </td>

                      {/* ỨNG DỤNG */}
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold ${getOttBadgeStyle(ottName)}`}>
                          {ottName}
                        </span>
                      </td>

                      {/* THỜI GIAN TẠO */}
                      <td className="py-3 px-3 text-[10px] text-slate-400 dark:text-slate-500">
                        {cust.createdAt ? new Date(cust.createdAt).toLocaleString('vi-VN') : '01/01/2024 00:00:00'}
                      </td>

                      {/* THAO TÁC */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenCreate(cust)}
                            className="p-1 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Thêm KH cấp dưới"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(cust)}
                            className="p-1 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Sửa"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Xóa khách hàng "${cust.customerCode}"?`)) {
                                deleteMutation.mutate(cust.customerCode);
                              }
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
                      className={`w-7 h-7 rounded-lg font-bold text-xs transition ${page === pNum
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

      {/* ── MODAL THÊM / SỬA KHÁCH HÀNG (Khớp 100% Screenshot 2) ── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/40">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {editingCust ? 'Sửa Khách Hàng' : 'Thêm Khách Hàng'}
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

              {/* SECTION 1: THÔNG TIN KHÁCH HÀNG */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-3 h-px bg-slate-300 dark:bg-slate-700" />
                  THÔNG TIN KHÁCH HÀNG
                  <span className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Mã KH * */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Mã KH <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="VD: A01, A02..."
                      value={formData.customerCode}
                      onChange={(e) => setFormData({ ...formData, customerCode: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Cấp Trên */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Cấp Trên {formData.parentId && <span className="text-[10px] text-amber-500 font-normal">(ID: {formData.parentId})</span>}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        list="parent-customer-list"
                        placeholder="Bỏ trống nếu không có cấp trên, hoặc chọn/nhập mã hoặc ID cấp trên..."
                        value={formData.parentCustomerId}
                        onChange={(e) => {
                          const val = e.target.value;
                          const matched = (data?.items || []).find((c: any) =>
                            c.customerCode.toLowerCase() === val.trim().toLowerCase() ||
                            c._id === val.trim()
                          );
                          setFormData({
                            ...formData,
                            parentCustomerId: val,
                            parentId: matched ? matched._id : ''
                          });
                        }}
                        className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <datalist id="parent-customer-list">
                        {(data?.items || [])
                          .filter((c: any) => !editingCust || c.customerCode !== editingCust.customerCode)
                          .map((c: any) => (
                            <option key={c._id} value={c.customerCode}>
                              Mã: {c.customerCode} • Cấp {formatCustomerLevel(c.level)} • ID Mongo: {c._id}
                            </option>
                          ))}
                      </datalist>
                    </div>
                  </div>

                  {/* Trạng Thái * (Lấy từ Cấu hình chung) */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Trạng Thái <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {customerStatusOptions.length > 0 ? (
                        customerStatusOptions.map((s: any) => (
                          <option key={s.id || s.code} value={s.code || s.name}>
                            {s.name ? `${s.name} (${s.code})` : s.code}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                          <option value="INACTIVE">Tạm ngưng (INACTIVE)</option>
                          <option value="CLOSED">Đóng/Khóa (CLOSED)</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Cấp độ */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Cấp độ
                    </label>
                    <input
                      type="text"
                      placeholder="VD: 1 (hiển thị 1-0), 2 (hiển thị 2-1), 0 (hiển thị 0-0)..."
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Ứng dụng (Ott) */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Ứng dụng (Ott)
                    </label>
                    <select
                      value={formData.ottApp}
                      onChange={(e) => setFormData({ ...formData, ottApp: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="Telegram">Telegram</option>
                      <option value="Zalo">Zalo</option>
                      <option value="Viber">Viber</option>
                      <option value="Skype">Skype</option>
                    </select>
                  </div>

                  {/* Quản Lý Hộ (Toggle Switch - Khớp Screenshot 2) */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Quản Lý Hộ
                    </label>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className={`font-black text-xs uppercase tracking-wider ${formData.manageOnBehalf ? 'text-amber-500' : 'text-slate-400'}`}>
                        {formData.manageOnBehalf ? 'CÓ' : 'KHÔNG'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, manageOnBehalf: !formData.manageOnBehalf })}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.manageOnBehalf ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${formData.manageOnBehalf ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: THÔNG TIN BỔ SUNG */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-3 h-px bg-slate-300 dark:bg-slate-700" />
                  THÔNG TIN BỔ SUNG
                  <span className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                </h4>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                    Ghi chú / Thông tin chi tiết
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Ghi chú / Thông tin chi tiết..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                onClick={handleSubmitForm}
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
