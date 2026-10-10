'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, RefreshCw, Edit, Trash2,
  Eye, EyeOff, Copy, Check, X, Shield, ChevronLeft, ChevronRight,
  Layers, Sparkles, Sliders, Send, AlertTriangle, FolderTree, ChevronDown
} from 'lucide-react';
import { useI18n } from '../../context/i18nContext';
import { syncAccountQueries } from '@/utils/syncQueries';
import SearchableSelect, { SearchableOption } from '@/components/SearchableSelect';
import DeleteSystemModal from '@/components/DeleteSystemModal';
import { formatCustomerLevel } from '@/utils/customerLevel';

interface AccountTreeNode {
  item: any;
  accountName: string;
  depth: number;
  hasChildren: boolean;
  childrenCount: number;
  children: AccountTreeNode[];
}

// Password Generator Helper
function generateRandomPassword(length = 12, special = true): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const specials = '!@#$%^&*';
  let charset = upper + lower + digits;
  if (special) charset += specials;
  return Array.from({ length }, () => charset[Math.floor(Math.random() * charset.length)]).join('');
}

export default function AccountsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  // Search & Filter state (matching top filter bar in Screenshot 1)
  const [searchCustomerCode, setSearchCustomerCode] = useState('');
  const [searchAccountName, setSearchAccountName] = useState('');
  const [searchLoginName, setSearchLoginName] = useState('');
  const [debouncedCustomerCode, setDebouncedCustomerCode] = useState('');
  const [debouncedAccountName, setDebouncedAccountName] = useState('');
  const [debouncedLoginName, setDebouncedLoginName] = useState('');

  const [systemId, setSystemId] = useState('ALL');
  const [supplierId, setSupplierId] = useState('ALL');
  const [accountTypeFilter, setAccountTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Tree state: Set of expanded account names
  const [expandedAccountNames, setExpandedAccountNames] = useState<Set<string>>(new Set());

  // Eye toggle for password column
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [toastMsg, setToastMsg] = useState('');

  // Modals & Drawer State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteSystemModalOpen, setIsDeleteSystemModalOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState<any>(null);
  const [subAccountsDrawerOpen, setSubAccountsDrawerOpen] = useState(false);
  const [selectedSubAccountAcc, setSelectedSubAccountAcc] = useState<any>(null);
  const [saveMode, setSaveMode] = useState<'normal' | 'copy' | 'new'>('normal');

  // Password Generator State inside Modal (matching Screenshot 2)
  const [pwdLength, setPwdLength] = useState(12);
  const [pwdSpecial, setPwdSpecial] = useState(true);

  // Sub Accounts dynamic list state
  const [subAccountsList, setSubAccountsList] = useState<Array<{ id: string; subName: string; username: string; password: string }>>([
    { id: 'sub_21', subName: 'Sub 21', username: '', password: '' },
    { id: 'sub_22', subName: 'Sub 22', username: '', password: '' },
    { id: 'sub_23', subName: 'Sub 23', username: '', password: '' },
    { id: 'sub_24', subName: 'Sub 24', username: '', password: '' },
  ]);

  // Form input state (matching Screenshot 2 fields)
  const [formData, setFormData] = useState({
    accountId: '',
    systemId: '',
    supplierId: '',
    productId: '',
    accountType: 'Đã Giao',
    status: 'ACTIVE',
    accountLevel: 'Super',
    managedBy: 'Công Ty',
    cutRetail: '',
    customerCode: '',
    accountName: '',
    loginName: '',
    password: '',
    code: '',
    notes: '',
  });

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCustomerCode(searchCustomerCode);
      setDebouncedAccountName(searchAccountName);
      setDebouncedLoginName(searchLoginName);
      setPage(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchCustomerCode, searchAccountName, searchLoginName]);

  // Fetch Accounts Query
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['accounts', page, limit, debouncedCustomerCode, debouncedAccountName, debouncedLoginName, statusFilter, systemId, supplierId, accountTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: debouncedAccountName || debouncedLoginName,
        customer_code: debouncedCustomerCode,
        status: statusFilter,
        system_id: systemId,
        supplier_id: supplierId,
        account_type: accountTypeFilter,
      });
      const res = await fetch(`/api/accounts?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch accounts');
      return res.json();
    }
  });

  // ── XÂY DỰNG CẤU TRÚC CÂY TÀI KHOẢN (ACCOUNT TREE VIEW) ──
  const accountTreeNodes = useMemo<AccountTreeNode[]>(() => {
    const rawItems: any[] = data?.items || [];
    if (!rawItems.length) return [];

    const nodeMap = new Map<string, AccountTreeNode>();
    rawItems.forEach(acc => {
      const key = (acc.accountName || acc.accountId || '').trim().toLowerCase();
      if (key) {
        nodeMap.set(key, {
          item: acc,
          accountName: acc.accountName || acc.accountId,
          depth: 0,
          hasChildren: false,
          childrenCount: 0,
          children: []
        });
      }
    });

    const rootNodes: AccountTreeNode[] = [];

    rawItems.forEach(acc => {
      const codeKey = (acc.accountName || acc.accountId || '').trim().toLowerCase();
      const node = nodeMap.get(codeKey);
      if (!node) return;

      let parentKey = (acc.parentAccountId || '').trim().toLowerCase();
      if (parentKey === 'cty' || !parentKey) {
        parentKey = '';
      }

      // 1. Tìm theo parentAccountId rõ ràng
      let parentNode = parentKey ? nodeMap.get(parentKey) : undefined;

      // 2. Tìm theo tiền tố (VD: 'AA' là cha của 'AAB')
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

      if (parentNode && parentNode.accountName !== node.accountName) {
        parentNode.children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    function updateMeta(node: AccountTreeNode, depth: number) {
      node.depth = depth;
      node.hasChildren = node.children.length > 0;
      node.childrenCount = node.children.length;
      node.children.forEach(child => updateMeta(child, depth + 1));
    }

    rootNodes.forEach(r => updateMeta(r, 0));
    return rootNodes;
  }, [data?.items]);

  const allParentAccountNames = useMemo<string[]>(() => {
    const parents: string[] = [];
    function scan(nodes: AccountTreeNode[]) {
      nodes.forEach(n => {
        if (n.hasChildren) {
          parents.push(n.accountName);
          scan(n.children);
        }
      });
    }
    scan(accountTreeNodes);
    return parents;
  }, [accountTreeNodes]);

  const isAllAccExpanded = allParentAccountNames.length > 0 && allParentAccountNames.every(u => expandedAccountNames.has(u));

  const toggleExpandAllAcc = () => {
    if (isAllAccExpanded) {
      setExpandedAccountNames(new Set());
    } else {
      setExpandedAccountNames(new Set(allParentAccountNames));
    }
  };

  const toggleAccExpand = (accName: string) => {
    setExpandedAccountNames(prev => {
      const next = new Set(prev);
      if (next.has(accName)) {
        next.delete(accName);
      } else {
        next.add(accName);
      }
      return next;
    });
  };

  const visibleAccountRows = useMemo<AccountTreeNode[]>(() => {
    const rows: AccountTreeNode[] = [];

    function traverse(nodes: AccountTreeNode[]) {
      nodes.forEach(node => {
        rows.push(node);
        if (expandedAccountNames.has(node.accountName) && node.children.length > 0) {
          traverse(node.children);
        }
      });
    }

    traverse(accountTreeNodes);
    return rows;
  }, [accountTreeNodes, expandedAccountNames]);

  // Fetch Configs Query (Lấy dữ liệu động từ Cấu hình chung!)
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

  // Fetch Customers Query (Lấy danh sách mã KH từ CSDL khách hàng!)
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

  // Options dropdown cho Mã Khách Hàng (tối ưu hóa 50-100 kết quả mượt mà)
  const customerDropdownOptions = useMemo<SearchableOption[]>(() => {
    return customerOptions.map((c: any) => ({
      value: c.customerCode,
      label: c.customerCode,
      subLabel: c.customerName
        ? `${c.customerName}${c.parentCustomerId ? ` • Cấp trên: ${c.parentCustomerId}` : ''}`
        : (c.parentCustomerId ? `Cấp trên: ${c.parentCustomerId}` : undefined),
      badge: c.level ? formatCustomerLevel(c.level) : (c.parentCustomerId ? `Cấp trên: ${c.parentCustomerId}` : 'Gốc'),
    }));
  }, [customerOptions]);

  // Dynamic dropdown arrays from Cấu hình chung
  const systemOptions = configsGrouped['system'] || [];
  const supplierOptions = configsGrouped['supplier'] || [];
  const productOptions = configsGrouped['product'] || [];
  const accountTypeOptions = configsGrouped['account_type'] || [];
  const accountLevelOptions = configsGrouped['account_level'] || [];
  const accountStatusOptions = configsGrouped['account_status'] || [];

  // Create / Update Account Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = editingAcc ? `/api/accounts/${editingAcc.accountId}` : '/api/accounts';
      const method = editingAcc ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save account');
      return res.json();
    },
    onSuccess: (savedData) => {
      syncAccountQueries(queryClient);
      if (saveMode === 'copy') {
        navigator.clipboard.writeText(`Tài khoản: ${savedData.accountName}\nPass: ${savedData.password}\nCode: ${savedData.code}`);
        showToast('Đã lưu & Copy thông tin tài khoản!');
      } else if (saveMode === 'new') {
        handleOpenCreate();
        showToast('Đã lưu! Sẵn sàng tạo tài khoản tiếp theo.');
        return;
      } else {
        showToast('Lưu tài khoản thành công!');
      }
      setIsFormOpen(false);
      setEditingAcc(null);
    }
  });

  // Delete Account Mutation
  const deleteMutation = useMutation({
    mutationFn: async (accId: string) => {
      const res = await fetch(`/api/accounts/${accId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete account');
      return res.json();
    },
    onSuccess: () => {
      syncAccountQueries(queryClient);
      showToast('Đã xóa tài khoản.');
    }
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenCreate = () => {
    setEditingAcc(null);
    const defaultSys = systemOptions[0]?.name || systemOptions[0]?.code || '';
    const defaultSup = supplierOptions[0]?.name || supplierOptions[0]?.code || '';
    const defaultProd = productOptions[0]?.name || productOptions[0]?.code || '';
    const defaultType = accountTypeOptions[0]?.name || accountTypeOptions[0]?.code || 'Đã Giao';
    const defaultLevel = accountLevelOptions[0]?.name || accountLevelOptions[0]?.code || 'Super';
    const defaultStatus = accountStatusOptions[0]?.code || accountStatusOptions[0]?.name || 'ACTIVE';
    const defaultCus = customerOptions[0]?.customerCode || 'CTY';

    setFormData({
      accountId: `ACC_${Date.now().toString().slice(-6)}`,
      systemId: defaultSys,
      supplierId: defaultSup,
      productId: defaultProd,
      accountType: defaultType,
      status: defaultStatus,
      accountLevel: defaultLevel,
      managedBy: 'Công Ty',
      cutRetail: '',
      customerCode: defaultCus,
      accountName: '',
      loginName: '',
      password: generateRandomPassword(pwdLength, pwdSpecial),
      code: '',
      notes: '',
    });

    setSubAccountsList([
      { id: 'sub_21', subName: 'Sub 21', username: '', password: '' },
      { id: 'sub_22', subName: 'Sub 22', username: '', password: '' },
      { id: 'sub_23', subName: 'Sub 23', username: '', password: '' },
      { id: 'sub_24', subName: 'Sub 24', username: '', password: '' },
    ]);

    setIsFormOpen(true);
  };

  const handleOpenSubAccounts = (acc: any) => {
    setSelectedSubAccountAcc(acc);
    setSubAccountsDrawerOpen(true);
  };

  const handleOpenEdit = (acc: any) => {
    setEditingAcc(acc);
    setFormData({
      accountId: acc.accountId,
      systemId: acc.systemId || (systemOptions[0]?.name || systemOptions[0]?.code || ''),
      supplierId: acc.supplierId || (supplierOptions[0]?.name || supplierOptions[0]?.code || ''),
      productId: acc.productId || (productOptions[0]?.name || productOptions[0]?.code || ''),
      accountType: acc.accountType || 'Chưa Giao',
      status: acc.status || 'ACTIVE',
      accountLevel: acc.accountLevel || 'Super',
      managedBy: acc.managedBy || 'Công Ty',
      cutRetail: acc.cutRetail || '',
      customerCode: acc.customerCode || '',
      accountName: acc.accountName || '',
      loginName: acc.loginName || '',
      password: acc.password || '',
      code: acc.code || '',
      notes: acc.notes || '',
    });

    const existingSubs = (acc.subAccounts || []).map((s: any, idx: number) => ({
      id: s.id || `sub_${idx + 21}`,
      subName: s.subName || `Sub ${idx + 21}`,
      username: s.username || '',
      password: s.password || ''
    }));

    const defaultSubNames = ['Sub 21', 'Sub 22', 'Sub 23', 'Sub 24'];
    const paddedSubs = [...existingSubs];
    while (paddedSubs.length < 4) {
      const nextIdx = paddedSubs.length;
      const name = defaultSubNames[nextIdx] || `Sub ${nextIdx + 21}`;
      paddedSubs.push({
        id: `sub_${nextIdx + 21}`,
        subName: name,
        username: '',
        password: ''
      });
    }
    setSubAccountsList(paddedSubs);
    setIsFormOpen(true);
  };

  const handleUpdateSubAccount = (index: number, field: 'username' | 'password' | 'subName', value: string) => {
    setSubAccountsList(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleGenerateSubPassword = (index: number) => {
    const newPwd = generateRandomPassword(pwdLength, pwdSpecial);
    handleUpdateSubAccount(index, 'password', newPwd);
  };

  const handleAddSubAccountRow = () => {
    setSubAccountsList(prev => {
      const nextNum = prev.length + 21;
      return [
        ...prev,
        {
          id: `sub_${Date.now()}_${prev.length}`,
          subName: `Sub ${nextNum}`,
          username: '',
          password: ''
        }
      ];
    });
  };

  const handleRemoveSubAccountRow = (index: number) => {
    setSubAccountsList(prev => prev.filter((_, i) => i !== index));
  };

  const handleGeneratePassword = () => {
    const newPwd = generateRandomPassword(pwdLength, pwdSpecial);
    setFormData(prev => ({ ...prev, password: newPwd }));
  };

  const handleSubmitForm = (e: React.FormEvent, mode: 'normal' | 'copy' | 'new' = 'normal') => {
    e.preventDefault();
    setSaveMode(mode);

    // Build subAccounts array cleanly (trimmed and uppercase for username)
    const subAccountsPayload = subAccountsList
      .filter(s => s.username.trim() || s.password.trim())
      .map(s => ({
        id: s.id,
        subName: s.subName || 'Sub Account',
        username: s.username.trim().toUpperCase(),
        password: s.password
      }));

    const payload = {
      accountId: (formData.accountId || '').trim().toUpperCase(),
      systemId: (formData.systemId || '').trim().toUpperCase(),
      supplierId: (formData.supplierId || '').trim().toUpperCase(),
      productId: (formData.productId || '').trim().toUpperCase(),
      accountType: formData.accountType,
      status: formData.status,
      accountLevel: formData.accountLevel,
      managedBy: formData.managedBy,
      cutRetail: formData.cutRetail,
      customerCode: (formData.customerCode || '').trim().toUpperCase(),
      accountName: (formData.accountName || '').trim().toUpperCase(),
      loginName: (formData.loginName || '').trim(),
      password: formData.password,
      code: (formData.code || '').trim().toUpperCase(),
      notes: formData.notes,
      subAccounts: subAccountsPayload
    };

    saveMutation.mutate(payload);
  };

  const handleClearFilters = () => {
    setSearchCustomerCode('');
    setSearchAccountName('');
    setSearchLoginName('');
    setSystemId('ALL');
    setSupplierId('ALL');
    setAccountTypeFilter('ALL');
    setStatusFilter('ALL');
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

      {/* ── 1. REALTIME TOP FILTER BAR (Khớp UI Screenshot 1) ── */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Filter Inputs Grid */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Mã KH input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Mã KH..."
              value={searchCustomerCode}
              onChange={(e) => setSearchCustomerCode(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-32 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Tên tài khoản input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tên tài khoản..."
              value={searchAccountName}
              onChange={(e) => setSearchAccountName(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-40 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Login input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Login..."
              value={searchLoginName}
              onChange={(e) => setSearchLoginName(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-32 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Tất cả hệ thống select */}
          <select
            value={systemId}
            onChange={(e) => { setSystemId(e.target.value); setPage(1); }}
            className="py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
          >
            <option value="ALL">Tất cả hệ thống</option>
            {systemOptions.map((s: any) => (
              <option key={s.id || s.code} value={s.name || s.code}>{s.name || s.code}</option>
            ))}
          </select>

          {/* Tất cả NCC select */}
          <select
            value={supplierId}
            onChange={(e) => { setSupplierId(e.target.value); setPage(1); }}
            className="py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
          >
            <option value="ALL">Tất cả NCC</option>
            {supplierOptions.map((sup: any) => (
              <option key={sup.id || sup.code} value={sup.name || sup.code}>{sup.name || sup.code}</option>
            ))}
          </select>

          {/* Tất cả loại select */}
          <select
            value={accountTypeFilter}
            onChange={(e) => { setAccountTypeFilter(e.target.value); setPage(1); }}
            className="py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
          >
            <option value="ALL">Tất cả loại</option>
            {accountTypeOptions.map((t: any) => (
              <option key={t.id || t.code} value={t.name || t.code}>{t.name || t.code}</option>
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
                <option value="PENDING">Pending</option>
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
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
          </button>
        </div>

        {/* Right Buttons: [Thu gọn/Mở rộng cây], [Xóa HT], [Gửi KH], [+ Thêm] */}
        <div className="flex items-center gap-2">
          {allParentAccountNames.length > 0 && (
            <button
              onClick={toggleExpandAllAcc}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs shadow-sm transition flex items-center gap-1.5"
              title={isAllAccExpanded ? "Thu gọn tất cả cây tài khoản" : "Mở rộng toàn bộ cây tài khoản"}
            >
              <FolderTree className="w-3.5 h-3.5 text-amber-500" />
              <span>{isAllAccExpanded ? 'Thu gọn cây' : 'Mở rộng cây'}</span>
            </button>
          )}

          <button
            onClick={() => setIsDeleteSystemModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-rose-500/90 hover:bg-rose-600 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
            title="Xóa toàn bộ tài khoản theo hệ thống hoặc nhà cung cấp"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa HT</span>
          </button>

          <button
            onClick={() => showToast('Đã gửi thông tin cho Khách Hàng.')}
            className="px-3 py-1.5 rounded-xl border border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/5 hover:bg-blue-500/10 font-bold text-xs transition flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5 text-blue-500" />
            <span>Gửi KH</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-950 font-black text-xs shadow-md transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm</span>
          </button>
        </div>
      </div>

      {/* ── 2. MAIN DATA TABLE (Khớp UI Screenshot 1) ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-wider">
                <th className="py-3 px-3">HỆ THỐNG / NCC</th>
                <th className="py-3 px-3">SẢN PHẨM</th>
                <th className="py-3 px-3">MÃ KH</th>
                <th className="py-3 px-3">TÀI KHOẢN / LOGIN</th>
                <th className="py-3 px-3">PASS / CODE</th>
                <th className="py-3 px-3">LOẠI / CẤP</th>
                <th className="py-3 px-3">TRẠNG THÁI</th>
                <th className="py-3 px-3">QUẢN LÝ</th>
                <th className="py-3 px-3">GHI CHÚ</th>
                <th className="py-3 px-3 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold text-slate-800 dark:text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    <span>Đang tải danh sách tài khoản từ CSDL...</span>
                  </td>
                </tr>
              ) : visibleAccountRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Shield className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                      <p className="font-bold text-slate-600 dark:text-slate-400">Không có dữ liệu tài khoản</p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleAccountRows.map((node) => {
                  const acc = node.item;
                  const sysName = systemOptions.find((s: any) => s.code === acc.systemId || s.name === acc.systemId)?.name || acc.systemId || '3IN1BET';
                  const supName = supplierOptions.find((s: any) => s.code === acc.supplierId || s.name === acc.supplierId)?.name || acc.supplierId || '3IN1BET';
                  const isPassVisible = visiblePasswords[acc.accountId || acc._id];
                  const isExpanded = expandedAccountNames.has(acc.accountName);

                  return (
                    <tr
                      key={acc._id || acc.accountId}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group ${node.depth > 0 ? 'bg-slate-50/50 dark:bg-slate-950/25' : ''
                        }`}
                    >
                      {/* HỆ THỐNG / NCC */}
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-blue-600 dark:text-blue-400 text-[11px] uppercase tracking-tight">{sysName}</div>
                        <div className="text-[10px] font-bold text-amber-600 dark:text-amber-500 mt-0.5 uppercase">{supName}</div>
                      </td>

                      {/* SẢN PHẨM */}
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] border border-slate-200 dark:border-slate-700 inline-block">
                          {acc.productId || 'Sportbooks'}
                        </span>
                      </td>

                      {/* MÃ KH */}
                      <td className="py-3 px-3 font-extrabold text-slate-900 dark:text-white text-xs">
                        {acc.customerCode || 'CTY'}
                      </td>

                      {/* TÀI KHOẢN / LOGIN (Hierarchical Tree Cell) */}
                      <td className="py-3 px-3 max-w-[200px]">
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
                              onClick={() => toggleAccExpand(acc.accountName)}
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
                              <div className="flex flex-col text-left">
                                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                                  {acc.accountName}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  {acc.loginName || (acc.code ? `Code: ${acc.code}` : '—')}
                                </span>
                              </div>
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                {node.childrenCount}
                              </span>
                            </button>
                          ) : (
                            <div className="flex flex-col pl-4">
                              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs truncate">
                                {acc.accountName}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                {acc.loginName || (acc.code ? `Code: ${acc.code}` : '—')}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* PASS / CODE */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">
                            {acc.password ? (isPassVisible ? acc.password : '••••••••••') : '—'}
                          </span>
                          {acc.password && (
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => togglePasswordVisibility(acc.accountId || acc._id)}
                                className="p-0.5 text-slate-400 hover:text-amber-500 transition"
                                title={isPassVisible ? 'Ẩn pass' : 'Hiện pass'}
                              >
                                {isPassVisible ? <EyeOff className="w-3.5 h-3.5 text-amber-500" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(acc.password);
                                  showToast('Đã copy mật khẩu!');
                                }}
                                className="p-0.5 text-slate-400 hover:text-emerald-500 transition"
                                title="Copy pass"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        {acc.code && (
                          <div className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                            Code: {acc.code}
                          </div>
                        )}
                      </td>

                      {/* LOẠI / CẤP (2 pills side-by-side) */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${acc.accountType === 'QLH Cắt lẻ' || acc.accountType === 'QLH'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            }`}>
                            {acc.accountType || 'Đã Giao'}
                          </span>

                          <span className="px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px]">
                            {acc.accountLevel || 'Admin'}
                          </span>
                        </div>
                      </td>

                      {/* TRẠNG THÁI */}
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${acc.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                          acc.status === 'CLOSED' ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-200' :
                            'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          }`}>
                          {acc.status === 'ACTIVE' ? 'Active' : acc.status === 'CLOSED' ? 'Closed' : (acc.status || 'Active')}
                        </span>
                      </td>

                      {/* QUẢN LÝ */}
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${acc.managedBy === 'SubFull' || acc.managedBy === 'subfull'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                          }`}>
                          {acc.managedBy || 'Công Ty'}
                        </span>
                      </td>

                      {/* GHI CHÚ */}
                      <td className="py-3 px-3 max-w-[150px]">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1" title={acc.notes}>
                          {acc.notes || '—'}
                        </span>
                      </td>

                      {/* THAO TÁC */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenSubAccounts(acc)}
                            className="p-1 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Sub Accounts"
                          >
                            <Layers className="w-3.5 h-3.5" />
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
                              if (confirm(`Xóa tài khoản "${acc.accountName}"?`)) {
                                deleteMutation.mutate(acc.accountId);
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

        {/* Footer Pagination Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">


          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-extrabold text-xs">
              {page} / {data?.totalPages || 1}
            </span>
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

      {/* ── 3. MODAL "THÊM TÀI KHOẢN MỚI" / "SỬA TÀI KHOẢN" (Khớp UI Screenshot 2) ── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-3xl bg-white dark:bg-[#0e1420] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/40">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {editingAcc ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1.5 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable Form) */}
            <div className="overflow-y-auto flex-1 p-6 space-y-6 text-xs">
              {/* SECTION 1: PHÂN LOẠI & HỆ THỐNG */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-3 h-px bg-slate-300 dark:bg-slate-700" />
                  PHÂN LOẠI &amp; HỆ THỐNG
                  <span className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                        <option value="VIVA88">VIVA88</option>
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
                        <option value="C9">C9</option>
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
                        <option value="Sportbooks">Sportbooks</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: THÔNG TIN TÀI KHOẢN */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-3 h-px bg-slate-300 dark:bg-slate-700" />
                  THÔNG TIN TÀI KHOẢN
                  <span className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Loại Tài Khoản * (Lấy từ Cấu hình chung!) */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Loại Tài Khoản <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.accountType}
                      onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {accountTypeOptions.length > 0 ? (
                        accountTypeOptions.map((t: any) => (
                          <option key={t.id || t.code} value={t.name || t.code}>{t.name || t.code}</option>
                        ))
                      ) : (
                        <>
                          <option value="Đã Giao">Đã Giao</option>
                          <option value="Chưa Giao">Chưa Giao</option>
                          <option value="QLH Cắt lẻ">QLH Cắt lẻ</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Trạng Thái * (Lấy từ Cấu hình chung!) */}
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
                          <option value="PENDING">Pending</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Cấp Tài Khoản * (Lấy từ Cấu hình chung!) */}
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
                          <option value="Admin">Admin</option>
                          <option value="Master">Master</option>
                          <option value="Agent">Agent</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Quản Lý Bởi * */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Quản Lý Bởi <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.managedBy}
                      onChange={(e) => setFormData({ ...formData, managedBy: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="Công Ty">Công Ty</option>
                      <option value="SubFull">SubFull</option>
                      <option value="Khách Hàng">Khách Hàng</option>
                      <option value="Lưu Hỗ Trợ">Lưu Hỗ Trợ</option>
                    </select>
                  </div>

                  {/* Cắt lẻ */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Cắt lẻ
                    </label>
                    <input
                      type="text"
                      list="cut-retail-options-acc"
                      placeholder="Cắt lẻ ..."
                      value={formData.cutRetail}
                      onChange={(e) => setFormData({ ...formData, cutRetail: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <datalist id="cut-retail-options-acc">
                      <option value="All" />
                      <option value="Không" />
                    </datalist>
                  </div>

                  {/* Mã Khách Hàng * (Lấy danh sách mã KH từ DB!) */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Mã Khách Hàng <span className="text-rose-500">*</span>
                    </label>
                    <SearchableSelect
                      options={customerDropdownOptions}
                      value={formData.customerCode}
                      onChange={(val) => setFormData(prev => ({ ...prev, customerCode: val }))}
                      placeholder="Chọn hoặc tìm kiếm Mã KH..."
                      searchPlaceholder="Nhập mã hoặc tên khách hàng..."
                      emptyText="Không tìm thấy khách hàng phù hợp"
                    />
                  </div>

                  {/* Tên Tài Khoản * */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Tên Tài Khoản <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: DGsub30..."
                      value={formData.accountName}
                      onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Login Name */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Login Name
                    </label>
                    <input
                      type="text"
                      placeholder="Tên đăng nhập hệ thống..."
                      value={formData.loginName}
                      onChange={(e) => setFormData({ ...formData, loginName: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: CẤU HÌNH TẠO MẬT KHẨU (Khớp Slider & Toggle Screenshot 2) */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                    <Sliders className="w-4 h-4 text-amber-500" />
                    <span>Cấu hình tạo mật khẩu</span>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 font-bold">
                      <span className="text-slate-500">ĐỘ DÀI</span>
                      <span className="text-sm text-slate-900 dark:text-white font-black">{pwdLength}</span>
                      <input
                        type="range"
                        min={8} max={32}
                        value={pwdLength}
                        onChange={(e) => setPwdLength(Number(e.target.value))}
                        className="w-24 accent-amber-500 cursor-pointer"
                      />
                    </div>

                    <label className="flex items-center gap-2 font-bold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                      <span>KÝ TỰ ĐẶC BIỆT</span>
                      <input
                        type="checkbox"
                        checked={pwdSpecial}
                        onChange={(e) => setPwdSpecial(e.target.checked)}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Mật khẩu * */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Mật khẩu <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full p-2.5 pr-16 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Mật khẩu..."
                      />
                      <div className="absolute right-1.5 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handleGeneratePassword}
                          className="p-1 rounded text-slate-400 hover:text-amber-500"
                          title="Tạo mật khẩu ngẫu nhiên"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(formData.password);
                            showToast('Đã copy pass!');
                          }}
                          className="p-1 rounded text-slate-400 hover:text-emerald-500"
                          title="Copy pass"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Mã Code */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                      Mã Code
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="w-full p-2.5 pr-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="VD: 666888..."
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(formData.code);
                          showToast('Đã copy code!');
                        }}
                        className="absolute right-2.5 text-slate-400 hover:text-emerald-500"
                        title="Copy code"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Ghi chú */}
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                    Ghi chú
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ghi chú bổ sung..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* SECTION 4: TÀI KHOẢN PHỤ (SUB ACCOUNTS) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 flex-1">
                    <span className="w-3 h-px bg-slate-300 dark:bg-slate-700" />
                    TÀI KHOẢN PHỤ (SUB ACCOUNTS)
                    <span className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddSubAccountRow}
                    className="ml-3 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center gap-1.5 transition shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm Sub Account
                  </button>
                </div>

                <div className="space-y-3">
                  {subAccountsList.map((sub, idx) => (
                    <div key={sub.id || idx} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/80">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <input
                            type="text"
                            value={sub.subName}
                            onChange={(e) => handleUpdateSubAccount(idx, 'subName', e.target.value)}
                            className="bg-transparent font-bold text-xs text-slate-700 dark:text-slate-300 focus:outline-none hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded px-1 -ml-1 transition"
                            placeholder="Tên Sub..."
                          />
                          <span className="text-[10px] text-slate-400">Login</span>
                        </div>
                        <input
                          type="text"
                          placeholder={`Tên đăng nhập ${sub.subName}...`}
                          value={sub.username}
                          onChange={(e) => handleUpdateSubAccount(idx, 'username', e.target.value)}
                          className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-slate-700 dark:text-slate-300">Mật khẩu</span>
                          {subAccountsList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSubAccountRow(idx)}
                              className="text-slate-400 hover:text-rose-500 transition text-[10px] flex items-center gap-0.5"
                              title="Xóa Sub này"
                            >
                              <Trash2 className="w-3 h-3" />
                              Xóa
                            </button>
                          )}
                        </div>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            placeholder={`Mật khẩu ${sub.subName}...`}
                            value={sub.password}
                            onChange={(e) => handleUpdateSubAccount(idx, 'password', e.target.value)}
                            className="w-full p-2 pr-14 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <div className="absolute right-1.5 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleGenerateSubPassword(idx)}
                              className="p-1 text-slate-400 hover:text-amber-500 transition"
                              title="Tạo pass ngẫu nhiên"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(sub.password);
                                showToast('Đã copy pass!');
                              }}
                              className="p-1 text-slate-400 hover:text-emerald-500 transition"
                              title="Copy pass"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer Action Buttons (Khớp 4 nút Screenshot 2) */}
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

      {/* ── 4. SUB ACCOUNTS DRAWER ── */}
      {subAccountsDrawerOpen && selectedSubAccountAcc && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full p-6 shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Sub Accounts: {selectedSubAccountAcc.accountName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Parent ID: {selectedSubAccountAcc.accountId}
                  </p>
                </div>
                <button onClick={() => setSubAccountsDrawerOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[70vh] pr-1">
                {(selectedSubAccountAcc.subAccounts || []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">Chưa có sub account nào.</p>
                ) : (
                  (selectedSubAccountAcc.subAccounts || []).map((sub: any, idx: number) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                        <span>{sub.subName}</span>
                        <span className="text-indigo-500 font-semibold">{sub.username}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>Pass: {sub.password || '••••••••'}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(sub.password);
                            showToast('Đã copy pass sub!');
                          }}
                          className="text-[10px] underline text-indigo-600 hover:text-indigo-400"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSubAccountsDrawerOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. DELETE SYSTEM MODAL ── */}
      <DeleteSystemModal
        isOpen={isDeleteSystemModalOpen}
        onClose={() => setIsDeleteSystemModalOpen(false)}
        onSuccess={() => {
          refetch();
          showToast('Đã xóa hệ thống thành công trên toàn bộ hệ thống!');
        }}
        initialSystemName={systemId !== 'ALL' ? systemId : ''}
        initialSupplierName={supplierId !== 'ALL' ? supplierId : ''}
      />
    </div>
  );
}
