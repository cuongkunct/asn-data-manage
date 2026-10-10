'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, RefreshCw, Edit, Trash2,
  Check, X, Shield, ChevronLeft, ChevronRight, UserPlus,
  FolderTree, ChevronDown
} from 'lucide-react';
import { useI18n } from '../../context/i18nContext';
import SearchableSelect, { SearchableOption } from '../../components/SearchableSelect';
import { syncSystemAccountQueries } from '@/utils/syncQueries';
import DeleteSystemModal from '../../components/DeleteSystemModal';

interface SystemAccountTreeNode {
  item: any;
  systemUsername: string;
  depth: number;
  hasChildren: boolean;
  childrenCount: number;
  children: SystemAccountTreeNode[];
}

export default function SystemAccountsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  // Search & Filter state (matching top filter bar in Screenshot 1)
  const [searchCustomerCode, setSearchCustomerCode] = useState('');
  const [searchParentAccount, setSearchParentAccount] = useState('');
  const [searchAccountName, setSearchAccountName] = useState('');
  const [debouncedCustomerCode, setDebouncedCustomerCode] = useState('');
  const [debouncedParentAccount, setDebouncedParentAccount] = useState('');
  const [debouncedAccountName, setDebouncedAccountName] = useState('');

  const [systemId, setSystemId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Tree state: Set of expanded system usernames
  const [expandedSysUsernames, setExpandedSysUsernames] = useState<Set<string>>(new Set());

  const [toastMsg, setToastMsg] = useState('');

  // Modals State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteSystemModalOpen, setIsDeleteSystemModalOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState<any>(null);
  const [saveMode, setSaveMode] = useState<'normal' | 'copy' | 'new'>('normal');

  // Form input state (matching Screenshot 2 fields)
  const [formData, setFormData] = useState({
    systemAccountId: '',
    systemId: '',
    supplierId: '',
    productId: '',
    accountLevel: 'Super',
    accountType: '',
    status: 'ACTIVE',
    customerCode: '',
    parentCustomerId: '',
    parentAccountId: '',
    systemUsername: '',
    notes: '',
  });

  // Debounce effect for search inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCustomerCode(searchCustomerCode);
      setDebouncedParentAccount(searchParentAccount);
      setDebouncedAccountName(searchAccountName);
      setPage(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchCustomerCode, searchParentAccount, searchAccountName]);

  // Fetch System Accounts List Query
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['systemAccounts', page, limit, debouncedCustomerCode, debouncedParentAccount, debouncedAccountName, statusFilter, systemId],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: debouncedAccountName,
        customer_code: debouncedCustomerCode,
        parent_account_id: debouncedParentAccount,
        status: statusFilter,
        system_id: systemId,
      });
      const res = await fetch(`/api/system-accounts?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch system accounts');
      return res.json();
    }
  });

  // ── XÂY DỰNG CẤU TRÚC CÂY HỆ THỐNG TÀI KHOẢN (ACCOUNT TREE VIEW) ──
  const systemAccountTreeNodes = useMemo<SystemAccountTreeNode[]>(() => {
    const rawItems: any[] = data?.items || [];
    if (!rawItems.length) return [];

    const nodeMap = new Map<string, SystemAccountTreeNode>();
    rawItems.forEach(acc => {
      const key = (acc.systemUsername || acc.systemAccountId || '').trim().toLowerCase();
      if (key) {
        nodeMap.set(key, {
          item: acc,
          systemUsername: acc.systemUsername || acc.systemAccountId,
          depth: 0,
          hasChildren: false,
          childrenCount: 0,
          children: []
        });
      }
    });

    const rootNodes: SystemAccountTreeNode[] = [];

    rawItems.forEach(acc => {
      const codeKey = (acc.systemUsername || acc.systemAccountId || '').trim().toLowerCase();
      const node = nodeMap.get(codeKey);
      if (!node) return;

      let parentKey = (acc.parentAccountId || '').trim().toLowerCase();

      // Bỏ qua giá trị rỗng hoặc 'cty'
      if (parentKey === 'cty' || !parentKey) {
        parentKey = '';
      }

      // 1. Tìm theo parentAccountId rõ ràng
      let parentNode = parentKey ? nodeMap.get(parentKey) : undefined;

      // 2. Tìm theo tiền tố (VD: 'AA' là cha của 'AAB') nếu không có parentAccountId rõ ràng
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

      if (parentNode && parentNode.systemUsername !== node.systemUsername) {
        parentNode.children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    function updateMeta(node: SystemAccountTreeNode, depth: number) {
      node.depth = depth;
      node.hasChildren = node.children.length > 0;
      node.childrenCount = node.children.length;
      node.children.forEach(child => updateMeta(child, depth + 1));
    }

    rootNodes.forEach(r => updateMeta(r, 0));
    return rootNodes;
  }, [data?.items]);

  // Danh sách các tài khoản có con
  const allParentSysUsernames = useMemo<string[]>(() => {
    const parents: string[] = [];
    function scan(nodes: SystemAccountTreeNode[]) {
      nodes.forEach(n => {
        if (n.hasChildren) {
          parents.push(n.systemUsername);
          scan(n.children);
        }
      });
    }
    scan(systemAccountTreeNodes);
    return parents;
  }, [systemAccountTreeNodes]);

  const isAllSysExpanded = allParentSysUsernames.length > 0 && allParentSysUsernames.every(u => expandedSysUsernames.has(u));

  const toggleExpandAllSys = () => {
    if (isAllSysExpanded) {
      setExpandedSysUsernames(new Set());
    } else {
      setExpandedSysUsernames(new Set(allParentSysUsernames));
    }
  };

  const toggleSysExpand = (username: string) => {
    setExpandedSysUsernames(prev => {
      const next = new Set(prev);
      if (next.has(username)) {
        next.delete(username);
      } else {
        next.add(username);
      }
      return next;
    });
  };

  // Flatten cây thành danh sách dòng hiển thị (chỉ hiển thị con khi cha mở rộng)
  const visibleSysAccountRows = useMemo<SystemAccountTreeNode[]>(() => {
    const rows: SystemAccountTreeNode[] = [];

    function traverse(nodes: SystemAccountTreeNode[]) {
      nodes.forEach(node => {
        rows.push(node);
        if (expandedSysUsernames.has(node.systemUsername) && node.children.length > 0) {
          traverse(node.children);
        }
      });
    }

    traverse(systemAccountTreeNodes);
    return rows;
  }, [systemAccountTreeNodes, expandedSysUsernames]);

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

  // Fetch All Accounts Query (Lấy danh sách từ CSDL Tài Khoản: /api/accounts)
  const { data: allAccountsData } = useQuery({
    queryKey: ['allAccountsForParentSelect'],
    queryFn: async () => {
      const res = await fetch('/api/accounts?limit=1000');
      if (!res.ok) return { items: [] };
      return res.json();
    },
    staleTime: 10 * 1000,
  });
  const allAccountsList: any[] = allAccountsData?.items || [];

  // Fetch All System Accounts Query (Lấy từ /api/system-accounts)
  const { data: allSysAccountsData } = useQuery({
    queryKey: ['allSystemAccountsForSelect'],
    queryFn: async () => {
      const res = await fetch('/api/system-accounts?limit=1000');
      if (!res.ok) return { items: [] };
      return res.json();
    },
    staleTime: 10 * 1000,
  });
  const allSysAccounts: any[] = allSysAccountsData?.items || [];

  // Options dropdown cho Mã Khách Hàng (tìm kiếm chuyên nghiệp)
  const customerDropdownOptions = useMemo<SearchableOption[]>(() => {
    return customerOptions.map((c: any) => ({
      value: c.customerCode,
      label: c.customerCode,
      subLabel: c.customerName
        ? `${c.customerName}${c.parentCustomerId ? ` • Cấp trên: ${c.parentCustomerId}` : ''}`
        : (c.parentCustomerId ? `Cấp trên: ${c.parentCustomerId}` : undefined),
      badge: c.parentCustomerId ? `Cấp trên: ${c.parentCustomerId}` : 'Gốc',
    }));
  }, [customerOptions]);

  // Danh sách gợi ý Tài khoản cấp trên (Lấy từ Danh Sách Tài Khoản & Hệ Thống Tài Khoản, KHÔNG lấy khách hàng, KHÔNG hiển thị dư tài khoản mặc định)
  const relatedParentAccounts = useMemo<SearchableOption[]>(() => {
    const list: SearchableOption[] = [];

    const currentSys = (formData.systemId || '').trim().toLowerCase();
    const currentUsername = (formData.systemUsername || '').trim().toLowerCase();

    // Tập hợp toàn bộ tài khoản (từ Danh Sách Tài Khoản và Hệ Thống Tài Khoản)
    const rawAccounts: Array<{ name: string; systemId?: string; level?: string; supplier?: string }> = [];

    // 1. Thêm từ Danh Sách Tài Khoản (/api/accounts)
    allAccountsList.forEach((acc: any) => {
      const name = acc.accountName || acc.accountId;
      if (name && !rawAccounts.some(r => r.name.toLowerCase() === name.toLowerCase())) {
        rawAccounts.push({
          name,
          systemId: acc.systemId,
          level: acc.accountLevel,
          supplier: acc.supplierId
        });
      }
    });

    // 2. Thêm từ Hệ Thống Tài Khoản (/api/system-accounts)
    allSysAccounts.forEach((acc: any) => {
      if (editingAcc && acc.systemAccountId === editingAcc.systemAccountId) return;
      const name = acc.systemUsername;
      if (name && !rawAccounts.some(r => r.name.toLowerCase() === name.toLowerCase())) {
        rawAccounts.push({
          name,
          systemId: acc.systemId,
          level: acc.accountLevel,
          supplier: acc.supplierId
        });
      }
    });

    // Sắp xếp ưu tiên:
    // 1. Cùng Hệ Thống (systemId)
    // 2. Tên tài khoản liên quan / bắt đầu bằng tiền tố Tên Tài Khoản Hệ Thống đang nhập
    // 3. Theo thứ tự ABC
    rawAccounts.sort((a, b) => {
      const aSys = (a.systemId || '').toLowerCase() === currentSys ? 1 : 0;
      const bSys = (b.systemId || '').toLowerCase() === currentSys ? 1 : 0;
      if (aSys !== bSys) return bSys - aSys;

      if (currentUsername) {
        const prefix = currentUsername.slice(0, 3);
        const aPrefix = a.name.toLowerCase().startsWith(prefix) ? 1 : 0;
        const bPrefix = b.name.toLowerCase().startsWith(prefix) ? 1 : 0;
        if (aPrefix !== bPrefix) return bPrefix - aPrefix;

        const aContains = a.name.toLowerCase().includes(currentUsername) ? 1 : 0;
        const bContains = b.name.toLowerCase().includes(currentUsername) ? 1 : 0;
        if (aContains !== bContains) return bContains - aContains;
      }

      return a.name.localeCompare(b.name);
    });

    // Đưa vào danh sách options cho dropdown
    rawAccounts.forEach((acc) => {
      if (!list.some(item => item.value.toLowerCase() === acc.name.toLowerCase())) {
        list.push({
          value: acc.name,
          label: acc.name,
          subLabel: `Hệ thống: ${acc.systemId || 'N/A'}${acc.level ? ` • Cấp: ${acc.level}` : ''}${acc.supplier ? ` • NCC: ${acc.supplier}` : ''}`,
          badge: acc.level || 'Tài khoản',
        });
      }
    });

    return list;
  }, [allAccountsList, allSysAccounts, formData.systemId, formData.systemUsername, editingAcc]);

  // Dynamic dropdown arrays from Cấu hình chung
  const systemOptions = configsGrouped['system'] || [];
  const supplierOptions = configsGrouped['supplier'] || [];
  const productOptions = configsGrouped['product'] || [];
  const accountTypeOptions = configsGrouped['account_type'] || [];
  const accountLevelOptions = configsGrouped['account_level'] || [];
  const accountStatusOptions = configsGrouped['account_status'] || [];

  // Create / Update Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = editingAcc ? `/api/system-accounts/${editingAcc.systemAccountId}` : '/api/system-accounts';
      const method = editingAcc ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save system account');
      return res.json();
    },
    onSuccess: (savedData) => {
      syncSystemAccountQueries(queryClient);
      if (saveMode === 'copy') {
        navigator.clipboard.writeText(`Tài khoản: ${savedData.systemUsername}\nMã KH: ${savedData.customerCode}\nHệ thống: ${savedData.systemId}`);
        showToast('Đã lưu & Copy thông tin tài khoản hệ thống!');
      } else if (saveMode === 'new') {
        handleOpenCreate();
        showToast('Đã lưu! Sẵn sàng tạo tài khoản hệ thống tiếp theo.');
        return;
      } else {
        showToast('Lưu hệ thống tài khoản thành công!');
      }
      setIsFormOpen(false);
      setEditingAcc(null);
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (sysId: string) => {
      const res = await fetch(`/api/system-accounts/${sysId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete system account');
      return res.json();
    },
    onSuccess: () => {
      syncSystemAccountQueries(queryClient);
      showToast('Đã xóa hệ thống tài khoản.');
    }
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const handleCustomerCodeChange = (code: string) => {
    const cleanCode = (code || '').trim().toUpperCase();
    const foundCust = customerOptions.find((c: any) => (c.customerCode || '').trim().toUpperCase() === cleanCode);
    const parentCust = foundCust?.parentCustomerId || '';
    setFormData(prev => ({
      ...prev,
      customerCode: cleanCode,
      parentCustomerId: parentCust ? parentCust.trim().toUpperCase() : ''
    }));
  };

  const handleOpenCreate = (parentPreset?: string) => {
    setEditingAcc(null);
    const defaultSys = systemOptions[0]?.name || systemOptions[0]?.code || 'VIVA88';
    const defaultSup = supplierOptions[0]?.name || supplierOptions[0]?.code || 'C9';
    const defaultProd = productOptions[0]?.name || productOptions[0]?.code || 'Sportbooks';
    const defaultType = accountTypeOptions[0]?.name || accountTypeOptions[0]?.code || '';
    const defaultLevel = accountLevelOptions[0]?.name || accountLevelOptions[0]?.code || 'Super';
    const defaultStatus = accountStatusOptions[0]?.code || accountStatusOptions[0]?.name || 'ACTIVE';
    const defaultCus = customerOptions[0]?.customerCode || '';
    const defaultParentCus = customerOptions[0]?.parentCustomerId || '';

    setFormData({
      systemAccountId: `SYS_ACC_${Date.now().toString().slice(-6)}`,
      systemId: defaultSys,
      supplierId: defaultSup,
      productId: defaultProd,
      accountLevel: defaultLevel,
      accountType: defaultType,
      status: defaultStatus,
      customerCode: '',
      parentCustomerId: '',
      parentAccountId: parentPreset || '',
      systemUsername: '',
      notes: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (acc: any) => {
    setEditingAcc(acc);
    setFormData({
      systemAccountId: acc.systemAccountId,
      systemId: acc.systemId || (systemOptions[0]?.name || systemOptions[0]?.code || ''),
      supplierId: acc.supplierId || (supplierOptions[0]?.name || supplierOptions[0]?.code || ''),
      productId: acc.productId || (productOptions[0]?.name || productOptions[0]?.code || ''),
      accountLevel: acc.accountLevel || 'Super',
      accountType: acc.accountType || '',
      status: acc.status || 'ACTIVE',
      customerCode: acc.customerCode || '',
      parentCustomerId: acc.parentCustomerId || '',
      parentAccountId: acc.parentAccountId || '',
      systemUsername: acc.systemUsername || '',
      notes: acc.notes || '',
    });
    setIsFormOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent, mode: 'normal' | 'copy' | 'new' = 'normal') => {
    e.preventDefault();
    setSaveMode(mode);

    if (!formData.systemUsername.trim()) {
      showToast('Vui lòng nhập Tên Tài Khoản Hệ Thống!');
      return;
    }

    const payload = {
      systemAccountId: (formData.systemAccountId || '').trim().toUpperCase(),
      systemId: (formData.systemId || '').trim().toUpperCase(),
      supplierId: (formData.supplierId || '').trim().toUpperCase(),
      productId: (formData.productId || '').trim().toUpperCase(),
      accountLevel: formData.accountLevel,
      accountType: formData.accountType,
      status: formData.status,
      customerCode: (formData.customerCode || '').trim().toUpperCase(),
      parentCustomerId: (formData.parentCustomerId || '').trim().toUpperCase(),
      parentAccountId: formData.parentAccountId ? formData.parentAccountId.trim().toUpperCase() : null,
      systemUsername: (formData.systemUsername || '').trim().toUpperCase(),
      notes: formData.notes,
    };

    saveMutation.mutate(payload);
  };

  const handleClearFilters = () => {
    setSearchCustomerCode('');
    setSearchParentAccount('');
    setSearchAccountName('');
    setSystemId('ALL');
    setStatusFilter('ALL');
    setPage(1);
  };

  // Badge Level Colors Mapping (Matching Screenshot 1)
  const getLevelBadge = (level: string) => {
    const lvlUpper = (level || '').toUpperCase();
    if (lvlUpper.includes('AGENT')) {
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
    }
    if (lvlUpper.includes('MEMBER')) {
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
    }
    if (lvlUpper.includes('MASTER')) {
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20';
    }
    return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'; // Super
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
            Hệ Thống Tài Khoản
          </h1>
        </div>
      </div>

      {/* Top Filter Bar (Khớp Screenshot 1) */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Left Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Mã KH... Input */}
          <div className="relative flex items-center min-w-[140px] max-w-[180px]">
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
          <div className="relative flex items-center min-w-[140px] max-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cấp trên..."
              value={searchParentAccount}
              onChange={(e) => setSearchParentAccount(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {searchParentAccount && (
              <button onClick={() => setSearchParentAccount('')} className="absolute right-2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tên tài khoản... Input */}
          <div className="relative flex items-center min-w-[150px] max-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400" />
            <input
              type="text"
              placeholder="Tên tài khoản..."
              value={searchAccountName}
              onChange={(e) => setSearchAccountName(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {searchAccountName && (
              <button onClick={() => setSearchAccountName('')} className="absolute right-2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tất cả hệ thống select */}
          <select
            value={systemId}
            onChange={(e) => { setSystemId(e.target.value); setPage(1); }}
            className="py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
          >
            <option value="ALL">Tất cả hệ thống</option>
            {systemOptions.map((sys: any) => (
              <option key={sys.id || sys.code} value={sys.name || sys.code}>{sys.name || sys.code}</option>
            ))}
          </select>

          {/* Tất cả trạng thái select */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
          >
            <option value="ALL">Tất cả trạng thái</option>
            {accountStatusOptions.length > 0 ? (
              accountStatusOptions.map((s: any) => (
                <option key={s.id || s.code} value={s.code || s.name}>{s.name || s.code}</option>
              ))
            ) : (
              <>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="CLOSED">Closed</option>
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

        {/* Right Action Buttons: [Thu gọn/Mở rộng cây], [Xóa HT], [+ Thêm] */}
        <div className="flex items-center gap-2">
          {allParentSysUsernames.length > 0 && (
            <button
              onClick={toggleExpandAllSys}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs shadow-sm transition flex items-center gap-1.5"
              title={isAllSysExpanded ? "Thu gọn tất cả cây tài khoản" : "Mở rộng toàn bộ cây tài khoản"}
            >
              <FolderTree className="w-3.5 h-3.5 text-amber-500" />
              <span>{isAllSysExpanded ? 'Thu gọn cây' : 'Mở rộng cây'}</span>
            </button>
          )}

          <button
            onClick={() => setIsDeleteSystemModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
            title="Xóa toàn bộ tài khoản theo hệ thống hoặc nhà cung cấp"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa HT</span>
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
                <th className="py-3 px-3">HỆ THỐNG / NCC</th>
                <th className="py-3 px-3">SẢN PHẨM</th>
                <th className="py-3 px-3">MÃ KH</th>
                <th className="py-3 px-3">TÀI KHOẢN</th>
                <th className="py-3 px-3">CẤP</th>
                <th className="py-3 px-3">LOẠI TÀI KHOẢN</th>
                <th className="py-3 px-3">TRẠNG THÁI</th>
                <th className="py-3 px-3">GHI CHÚ</th>
                <th className="py-3 px-3">THỜI GIAN</th>
                <th className="py-3 px-3 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                    Đang tải dữ liệu hệ thống tài khoản...
                  </td>
                </tr>
              ) : visibleSysAccountRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-1.5">
                      <Shield className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                      <span className="font-semibold text-sm">Không tìm thấy bản ghi nào</span>
                      <span className="text-xs text-slate-400">Thử thay đổi bộ lọc hoặc bấm nút "+ Thêm" để tạo mới.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleSysAccountRows.map((node) => {
                  const acc = node.item;
                  const isExpanded = expandedSysUsernames.has(acc.systemUsername);
                  return (
                    <tr
                      key={acc.systemAccountId || acc._id}
                      className={`hover:bg-amber-50/20 dark:hover:bg-amber-500/5 transition ${
                        node.depth > 0 ? 'bg-slate-50/50 dark:bg-slate-950/25' : ''
                      }`}
                    >
                      {/* HỆ THỐNG / NCC */}
                      <td className="py-3 px-3 font-medium">
                        <div className="font-extrabold text-slate-900 dark:text-white text-xs">
                          {acc.systemId || 'VIVA88'}
                        </div>
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                          {acc.supplierId || 'C9'}
                        </div>
                      </td>

                      {/* SẢN PHẨM */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {acc.productId || 'Sportbooks'}
                        </span>
                      </td>

                      {/* MÃ KH */}
                      <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                        {acc.customerCode || '—'}
                      </td>

                      {/* TÀI KHOẢN (Hierarchical Tree Cell) */}
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
                              onClick={() => toggleSysExpand(acc.systemUsername)}
                              className="inline-flex items-center gap-1.5 py-0.5 px-1.5 -ml-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition group cursor-pointer"
                              title={isExpanded ? 'Thu gọn cấp dưới' : 'Mở rộng cấp dưới'}
                            >
                              <span
                                className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${
                                  isExpanded
                                    ? 'bg-amber-500 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                                }`}
                              >
                                <ChevronRight
                                  className={`w-3 h-3 transition-transform duration-200 ${
                                    isExpanded ? 'rotate-90' : ''
                                  }`}
                                />
                              </span>
                              <span className="font-extrabold text-slate-900 dark:text-white text-xs group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                                {acc.systemUsername}
                              </span>
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                {node.childrenCount}
                              </span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 pl-4">
                              <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                                {acc.systemUsername}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* CẤP */}
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${getLevelBadge(acc.accountLevel)}`}>
                          {acc.accountLevel || 'Super'}
                        </span>
                      </td>

                      {/* LOẠI TÀI KHOẢN */}
                      <td className="py-3 px-3">
                        <span className="text-slate-500 dark:text-slate-400 text-xs">
                          {acc.accountType || '—'}
                        </span>
                      </td>

                      {/* TRẠNG THÁI */}
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${acc.status === 'ACTIVE'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : acc.status === 'CLOSED'
                              ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-200'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          }`}>
                          {acc.status === 'ACTIVE' ? 'Active' : acc.status === 'CLOSED' ? 'Closed' : (acc.status || 'Active')}
                        </span>
                      </td>

                      {/* GHI CHÚ */}
                      <td className="py-3 px-3 max-w-[150px]">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1" title={acc.notes}>
                          {acc.notes || '—'}
                        </span>
                      </td>

                      {/* THỜI GIAN */}
                      <td className="py-3 px-3 text-[10px] text-slate-400 dark:text-slate-500">
                        <div>Tạo: {acc.createdAt ? new Date(acc.createdAt).toLocaleDateString('vi-VN') : '—'}</div>
                        <div>Sửa: {acc.updatedAt ? new Date(acc.updatedAt).toLocaleDateString('vi-VN') : '—'}</div>
                      </td>

                      {/* THAO TÁC */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenCreate(acc.systemUsername)}
                            className="p-1 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Thêm cấp dưới"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(acc)}
                            className="p-1 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Sửa"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Xóa hệ thống tài khoản "${acc.systemUsername}"?`)) {
                                deleteMutation.mutate(acc.systemAccountId || acc._id);
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

      {/* ── MODAL THÊM / SỬA HỆ THỐNG TÀI KHOẢN (Khớp 100% Screenshot 2) ── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/40">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {editingAcc ? 'Sửa Hệ Thống Tài Khoản' : 'Thêm Hệ Thống Tài Khoản'}
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

              {/* SECTION 1: PHÂN LOẠI & HỆ THỐNG */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-3 h-px bg-slate-300 dark:bg-slate-700" />
                  PHÂN LOẠI &amp; HỆ THỐNG
                  <span className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Hệ Thống * */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Hệ Thống <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.systemId}
                      onChange={(e) => setFormData({ ...formData, systemId: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {systemOptions.length > 0 ? (
                        systemOptions.map((s: any) => (
                          <option key={s.id || s.code} value={s.name || s.code}>{s.name || s.code}</option>
                        ))
                      ) : (
                        <>
                          <option value="VIVA88">VIVA88</option>
                          <option value="PMKT">PMKT</option>
                          <option value="3IN1BET">3IN1BET</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Nhà Cung Cấp * */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Nhà Cung Cấp <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.supplierId}
                      onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {supplierOptions.length > 0 ? (
                        supplierOptions.map((sup: any) => (
                          <option key={sup.id || sup.code} value={sup.name || sup.code}>{sup.name || sup.code}</option>
                        ))
                      ) : (
                        <>
                          <option value="C9">C9</option>
                          <option value="PMKT">PMKT</option>
                          <option value="3IN1BET">3IN1BET</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Sản Phẩm * */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Sản Phẩm <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.productId}
                      onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {productOptions.length > 0 ? (
                        productOptions.map((p: any) => (
                          <option key={p.id || p.code} value={p.name || p.code}>{p.name || p.code}</option>
                        ))
                      ) : (
                        <>
                          <option value="Sportbooks">Sportbooks</option>
                          <option value="PMKT">PMKT</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Cấp Tài Khoản * */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Cấp Tài Khoản <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.accountLevel}
                      onChange={(e) => setFormData({ ...formData, accountLevel: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {accountLevelOptions.length > 0 ? (
                        accountLevelOptions.map((lvl: any) => (
                          <option key={lvl.id || lvl.code} value={lvl.name || lvl.code}>{lvl.name || lvl.code}</option>
                        ))
                      ) : (
                        <>
                          <option value="Super">Super</option>
                          <option value="Master">Master</option>
                          <option value="Agent">Agent</option>
                          <option value="Member">Member</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Loại Tài Khoản */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Loại Tài Khoản
                    </label>
                    <select
                      value={formData.accountType}
                      onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">Chọn loại tài khoản</option>
                      {accountTypeOptions.map((t: any) => (
                        <option key={t.id || t.code} value={t.name || t.code}>{t.name || t.code}</option>
                      ))}
                    </select>
                  </div>

                  {/* Trạng Thái * */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Trạng Thái <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {accountStatusOptions.length > 0 ? (
                        accountStatusOptions.map((s: any) => (
                          <option key={s.id || s.code} value={s.code || s.name}>{s.name || s.code}</option>
                        ))
                      ) : (
                        <>
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                          <option value="CLOSED">Closed</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: THÔNG TIN KHÁCH HÀNG & TÀI KHOẢN */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-3 h-px bg-slate-300 dark:bg-slate-700" />
                  THÔNG TIN KHÁCH HÀNG &amp; TÀI KHOẢN
                  <span className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                </h4>

                <div className="space-y-4">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Tên Tài Khoản Hệ Thống * */}
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                        Tên Tài Khoản Hệ Thống <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="VD: KTT884301, AZ0501..."
                        value={formData.systemUsername}
                        onChange={(e) => setFormData({ ...formData, systemUsername: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Tài khoản cấp trên */}
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1 flex items-center justify-between">
                        <span>Tài khoản cấp trên</span>
                        <span className="text-[10px] font-normal text-slate-400">Chọn hoặc nhập tự do</span>
                      </label>
                      <SearchableSelect
                        options={relatedParentAccounts}
                        value={formData.parentAccountId}
                        onChange={(val) => setFormData({ ...formData, parentAccountId: val })}
                        allowCustom={true}
                        placeholder="Chọn hoặc nhập tài khoản cấp trên..."
                        searchPlaceholder="Tìm kiếm tài khoản liên quan..."
                        emptyText="Không tìm thấy tài khoản phù hợp"
                      />
                    </div>
                  </div>
                </div>

                {/* Ghi chú */}
                <div className="mt-4">
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                    Ghi chú
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ghi chú bổ sung..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

            </div>

            {/* Modal Footer Action Buttons */}
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
                onClick={(e) => handleSubmitForm(e, 'copy')}
                disabled={saveMutation.isPending}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-md transition"
              >
                Lưu &amp; Copy
              </button>

              <button
                type="button"
                onClick={(e) => handleSubmitForm(e, 'new')}
                disabled={saveMutation.isPending}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-md transition"
              >
                Lưu &amp; Mới
              </button>

              <button
                type="button"
                onClick={(e) => handleSubmitForm(e, 'normal')}
                disabled={saveMutation.isPending}
                className="px-6 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-950 font-black shadow-lg transition"
              >
                {saveMutation.isPending ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE SYSTEM MODAL ── */}
      <DeleteSystemModal
        isOpen={isDeleteSystemModalOpen}
        onClose={() => setIsDeleteSystemModalOpen(false)}
        onSuccess={() => {
          refetch();
          showToast('Đã xóa hệ thống thành công trên toàn bộ hệ thống!');
        }}
        initialSystemName={systemId !== 'ALL' ? systemId : ''}
      />
    </div>
  );
}
