'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, RefreshCw, Edit, Trash2, X, ChevronLeft, ChevronRight,
  Copy, Eye, EyeOff, Sparkles, Shield, RotateCcw, Save, FilePlus, Hash
} from 'lucide-react';
import { syncQlhQueries } from '@/utils/syncQueries';

// ─── Types ───────────────────────────────────────────────────────────────────
interface QLHAccount {
  _id?: string;
  accountId: string;
  systemId: string;
  supplierId: string;
  productId: string;
  accountType: string;
  accountLevel: string;
  managedBy: string;
  cutRetail?: string;
  customerCode: string;
  accountName: string;
  loginName?: string;
  password?: string;
  code?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Password Generator ──────────────────────────────────────────────────────
function generateLocalPassword(length = 14, special = true): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const specials = '!@#$%^&*';
  let charset = upper + lower + digits;
  if (special) charset += specials;
  return Array.from({ length }, () => charset[Math.floor(Math.random() * charset.length)]).join('');
}

// ─── Status Badge ────────────────────────────────────────────────────────────
const LEVEL_COLORS: Record<string, string> = {
  'LEVEL_1': 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20',
  'LEVEL_2': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
  'Master': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  'Agent': 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20',
};

const MANAGED_BY_MAP: Record<string, string> = {
  company: 'Công Ty',
  customer: 'Khách Hàng',
  support: 'Lưu Hỗ Trợ',
  subfull: 'SubFull',
  'Công Ty': 'Công Ty',
  'Khách Hàng': 'Khách Hàng',
  'Lưu Hỗ Trợ': 'Lưu Hỗ Trợ',
  'SubFull': 'SubFull',
};

const normalizeManagedBy = (val?: string): string => {
  if (!val) return 'Công Ty';
  return MANAGED_BY_MAP[val] || val;
};

// ─── Default form ─────────────────────────────────────────────────────────────
const DEFAULT_FORM = {
  systemId: '',
  supplierId: '',
  productId: '',
  accountType: 'QLH',
  accountLevel: 'Agent',
  managedBy: 'Công Ty',
  cutRetail: '',
  customerCode: '',
  accountName: '',
  loginName: '',
  password: '',
  code: '',
  notes: '',
  // password config
  pwdLength: 14,
  pwdSpecial: true,
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function QuanLyHoPage() {
  const queryClient = useQueryClient();

  // Tab state
  const [activeTab, setActiveTab] = useState<'qlh' | 'qlh_cat_le'>('qlh');

  // Filter state
  const [searchCode, setSearchCode] = useState('');
  const [debouncedCode, setDebouncedCode] = useState('');
  const [searchAccount, setSearchAccount] = useState('');
  const [debouncedAcc, setDebouncedAcc] = useState('');
  const [filterSystem, setFilterSystem] = useState('ALL');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QLHAccount | null>(null);
  const [formData, setFormData] = useState({ ...DEFAULT_FORM });
  const [showPwd, setShowPwd] = useState(false);
  const [showPwdConfig, setShowPwdConfig] = useState(false);
  const [saveMode, setSaveMode] = useState<'normal' | 'new' | 'copy'>('normal');
  const [copyAlert, setCopyAlert] = useState('');

  // Debounce code search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedCode(searchCode); setPage(1); }, 220);
    return () => clearTimeout(t);
  }, [searchCode]);

  // Debounce account search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedAcc(searchAccount); setPage(1); }, 220);
    return () => clearTimeout(t);
  }, [searchAccount]);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['qlh', page, limit, debouncedCode, debouncedAcc, filterSystem, activeTab],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: debouncedCode,
        search_account: debouncedAcc,
        system_id: filterSystem,
        tab: activeTab,
      });
      const res = await fetch(`/api/quan-ly-ho?${params}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    }
  });

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

  const { data: customersData } = useQuery({
    queryKey: ['customers-mini'],
    queryFn: async () => {
      const res = await fetch('/api/customers?limit=1000');
      if (!res.ok) return { items: [] };
      return res.json();
    },
    staleTime: 10 * 1000,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = editingItem ? `/api/quan-ly-ho/${editingItem.accountId}` : '/api/quan-ly-ho';
      const method = editingItem ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save');
      return res.json();
    },
    onSuccess: (savedData) => {
      syncQlhQueries(queryClient);
      if (saveMode === 'new') {
        resetForm();
      } else if (saveMode === 'copy') {
        setFormData(prev => ({ ...prev, accountName: '', loginName: '', password: generateLocalPassword(prev.pwdLength, prev.pwdSpecial) }));
        setEditingItem(null);
      } else {
        setIsFormOpen(false);
        setEditingItem(null);
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/quan-ly-ho/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      return res.json();
    },
    onSuccess: () => syncQlhQueries(queryClient)
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormData({ ...DEFAULT_FORM, password: generateLocalPassword(14, true) });
    setEditingItem(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowPwdConfig(false);
    setShowPwd(false);

    const defaultSys = systems[0]?.name || systems[0]?.code || '';
    const defaultSup = suppliers[0]?.name || suppliers[0]?.code || '';
    const defaultProd = products[0]?.name || products[0]?.code || '';

    setFormData(prev => ({
      ...prev,
      systemId: defaultSys,
      supplierId: defaultSup,
      productId: defaultProd,
      accountType: activeTab === 'qlh_cat_le' ? 'QLH Cắt Lẻ' : 'QLH',
      cutRetail: ''
    }));

    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: QLHAccount) => {
    setEditingItem(item);
    setFormData({
      systemId: item.systemId || (systems[0]?.name || systems[0]?.code || ''),
      supplierId: item.supplierId || (suppliers[0]?.name || suppliers[0]?.code || ''),
      productId: item.productId || (products[0]?.name || products[0]?.code || ''),
      accountType: item.accountType || 'QLH',
      accountLevel: item.accountLevel || 'Agent',
      managedBy: normalizeManagedBy(item.managedBy),
      cutRetail: item.cutRetail || '',
      customerCode: item.customerCode || '',
      accountName: item.accountName || '',
      loginName: item.loginName || item.code || '',
      password: item.password || '',
      code: item.code || item.loginName || '',
      notes: item.notes || '',
      pwdLength: 14,
      pwdSpecial: true,
    });
    setShowPwd(false);
    setShowPwdConfig(false);
    setIsFormOpen(true);
  };

  const handleGeneratePassword = () => {
    const pwd = generateLocalPassword(formData.pwdLength, formData.pwdSpecial);
    setFormData(f => ({ ...f, password: pwd }));
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyAlert(`Đã copy ${label}`);
      setTimeout(() => setCopyAlert(''), 1800);
    });
  };

  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = (e: React.FormEvent, mode: 'normal' | 'new' | 'copy' = 'normal') => {
    e.preventDefault();
    setSaveMode(mode);
    const payload = {
      systemId: formData.systemId,
      supplierId: formData.supplierId,
      productId: formData.productId,
      accountType: formData.accountType,
      accountLevel: formData.accountLevel,
      managedBy: formData.managedBy,
      cutRetail: formData.cutRetail,
      customerCode: formData.customerCode,
      accountName: formData.accountName,
      loginName: formData.loginName,
      password: formData.password,
      code: formData.code || formData.loginName,
      notes: formData.notes,
    };
    saveMutation.mutate(payload);
  };

  const handleClearFilter = () => {
    setSearchCode('');
    setSearchAccount('');
    setFilterSystem('ALL');
    setPage(1);
  };

  const formatDate = (d?: string) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };
  const formatTime = (d?: string) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const systems = configsGrouped['system'] || [];
  const suppliers = configsGrouped['supplier'] || [];
  const products = configsGrouped['product'] || [];
  const accountTypes = [
    { code: 'QLH', name: 'QLH' },
    { code: 'QLH Cắt Lẻ', name: 'QLH Cắt Lẻ' },
  ];
  const accountLevels = configsGrouped['account_level'] && configsGrouped['account_level'].length > 0
    ? configsGrouped['account_level']
    : [
      { code: 'Master', name: 'Master' },
      { code: 'Agent', name: 'Agent' },
      { code: 'LEVEL_1', name: 'Cấp 1' },
      { code: 'LEVEL_2', name: 'Cấp 2' },
      { code: 'LEVEL_3', name: 'Cấp 3' },
    ];
  const customers = customersData?.items || [];
  const items: QLHAccount[] = data?.items || [];
  const total: number = data?.total || 0;
  const totalPages: number = data?.totalPages || 1;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Copy Alert Toast */}
      {copyAlert && (
        <div className="fixed top-5 right-6 z-[200] px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xl flex items-center gap-2 animate-fadeIn">
          <Check className="w-3.5 h-3.5" />
          {copyAlert}
        </div>
      )}

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-5 bg-amber-500 rounded-full inline-block" />
            Quản Lý Hộ
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 ml-4">
            Quản lý tập trung tài khoản theo hệ thống và phân loại. Tổng: <span className="font-bold text-slate-700 dark:text-slate-300">{total}</span> bản ghi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCreate}
            className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/25 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Thêm QLH
          </button>
        </div>
      </div>

      {/* ── TABS + FILTER BAR ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Tab Row */}
        <div className="flex items-center gap-0 border-b border-slate-200 dark:border-slate-800 px-4 pt-3">
          {[
            { key: 'qlh', label: 'QLH' },
            { key: 'qlh_cat_le', label: 'QLH Cắt Lẻ' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key as any); setPage(1); }}
              className={`px-5 py-2 text-xs font-bold rounded-t-xl mr-1 border-b-2 transition-all ${activeTab === tab.key
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-slate-50/60 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800">
          {/* Search by customer code */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Mã KH..."
              value={searchCode}
              onChange={e => setSearchCode(e.target.value)}
              className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white w-36 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Search by account name/login */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tài khoản / Login..."
              value={searchAccount}
              onChange={e => setSearchAccount(e.target.value)}
              className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white w-44 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* System filter */}
          <select
            value={filterSystem}
            onChange={e => { setFilterSystem(e.target.value); setPage(1); }}
            className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">-- Hệ thống: Tất cả --</option>
            {systems.map((s: any) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>

          {/* Clear */}
          <button
            onClick={handleClearFilter}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:text-rose-500 hover:border-rose-300 transition"
            title="Xóa bộ lọc"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:text-amber-500 transition"
            title="Làm mới"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
          </button>
        </div>

        {/* ── TABLE ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#0d1120] border-b border-slate-200 dark:border-slate-800">
                {['HỆ THỐNG / NCC', 'MÃ KH', 'TÀI KHOẢN / LOGIN', 'PASS / CODE', 'LOẠI / CẮT LẺ', 'QUẢN LÝ / CẤP TK', 'GHI CHÚ', 'THỜI GIAN', 'THAO TÁC'].map(col => (
                  <th key={col} className="py-3 px-3 font-black text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                    <p>Đang tải dữ liệu...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Shield className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                      <p className="font-semibold text-sm">Không có dữ liệu</p>
                      <p className="text-[11px]">Chưa có bản ghi Quản Lý Hộ nào. Nhấn "+ Thêm QLH" để tạo mới.</p>
                    </div>
                  </td>
                </tr>
              ) : items.map((item) => (
                <tr key={item._id || item.accountId} className="hover:bg-amber-50/30 dark:hover:bg-amber-500/5 transition group">
                  {/* HỆ THỐNG / NCC */}
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-900 dark:text-white text-[11px]">
                      {systems.find((s: any) => s.code === item.systemId || s.name === item.systemId)?.name || item.systemId}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {suppliers.find((s: any) => s.code === item.supplierId || s.name === item.supplierId)?.name || item.supplierId}
                    </div>
                  </td>

                  {/* MÃ KH */}
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {item.customerCode}
                    </span>
                  </td>

                  {/* TÀI KHOẢN / LOGIN */}
                  <td className="py-2.5 px-3 max-w-[140px]">
                    <div className="font-bold text-slate-900 dark:text-white text-[11px] truncate">{item.accountName}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">{item.loginName || item.code || '—'}</div>
                  </td>

                  {/* PASS / CODE */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {item.password 
                          ? (visiblePasswords[item.accountId || item._id!] ? item.password : '••••••••••') 
                          : '—'}
                      </span>
                      {item.password && (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => togglePasswordVisibility(item.accountId || item._id!)}
                            className="p-1 text-slate-400 hover:text-amber-500 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            title={visiblePasswords[item.accountId || item._id!] ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                          >
                            {visiblePasswords[item.accountId || item._id!] ? (
                              <EyeOff className="w-3.5 h-3.5 text-amber-500" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleCopy(item.password!, 'mật khẩu')}
                            className="p-1 text-slate-400 hover:text-emerald-500 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Copy mật khẩu"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    {item.code && (
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate max-w-[110px]" title={`Mã Code: ${item.code}`}>
                        Code: {item.code}
                      </div>
                    )}
                  </td>

                  {/* LOẠI / CẮT LẺ */}
                  <td className="py-2.5 px-3">
                    <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{item.accountType || '—'}</div>
                    {item.cutRetail && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        {item.cutRetail}
                      </span>
                    )}
                  </td>

                  {/* QUẢN LÝ / CẤP TK */}
                  <td className="py-2.5 px-3">
                    <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      {MANAGED_BY_MAP[item.managedBy] || item.managedBy || '—'}
                    </div>
                    <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${LEVEL_COLORS[item.accountLevel] || 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      {item.accountLevel}
                    </span>
                  </td>

                  {/* GHI CHÚ */}
                  <td className="py-2.5 px-3 max-w-[140px]">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{item.notes || '—'}</span>
                  </td>

                  {/* THỜI GIAN */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="text-[10px] text-slate-400 space-y-0.5">
                      <div><span className="text-slate-500 font-bold">Tạo:</span> {formatDate(item.createdAt)} <span className="text-slate-300 dark:text-slate-600">{formatTime(item.createdAt)}</span></div>
                      <div><span className="text-slate-500 font-bold">Sửa:</span> {formatDate(item.updatedAt)} <span className="text-slate-300 dark:text-slate-600">{formatTime(item.updatedAt)}</span></div>
                    </div>
                  </td>

                  {/* THAO TÁC */}
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Xóa tài khoản "${item.accountName}"? Thao tác không thể hoàn tác.`)) {
                            deleteMutation.mutate(item.accountId);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION ── */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/30">
          <span>
            {total === 0 ? 'Không có dữ liệu' : `${((page - 1) * limit) + 1}–${Math.min(page * limit, total)} / ${total} bản ghi`}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300 px-2">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════ MODAL FORM ═══════════════════════════════ */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-2xl bg-white dark:bg-[#0e1420] border border-slate-200 dark:border-slate-700/60 rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700/60 shrink-0">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-500" />
                {editingItem ? 'Chỉnh Sửa Quản Lý Hộ' : 'Thêm Quản Lý Hộ'}
              </h3>
              <button
                onClick={() => { setIsFormOpen(false); setEditingItem(null); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5 text-xs">

              {/* ─ Section 1: HỆ THỐNG & PHÂN LOẠI ─ */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-3 h-px bg-slate-300 dark:bg-slate-600" />
                  HỆ THỐNG &amp; PHÂN LOẠI
                  <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700/60" />
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Hệ Thống">
                    <select
                      value={formData.systemId}
                      onChange={e => setFormData(f => ({ ...f, systemId: e.target.value }))}
                      className="form-select-qlh"
                    >
                      {systems.map((s: any) => <option key={s.id || s.code || s.name} value={s.name || s.code}>{s.name || s.code}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Nhà Cung Cấp">
                    <select
                      value={formData.supplierId}
                      onChange={e => setFormData(f => ({ ...f, supplierId: e.target.value }))}
                      className="form-select-qlh"
                    >
                      {suppliers.map((s: any) => <option key={s.id || s.code || s.name} value={s.name || s.code}>{s.name || s.code}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Loại">
                    <select
                      value={formData.accountType}
                      onChange={e => setFormData(f => ({ ...f, accountType: e.target.value }))}
                      className="form-select-qlh"
                    >
                      {accountTypes.map((t: any) => (
                        <option key={t.code || t.id || t.name} value={t.code || t.name}>
                          {t.name || t.code}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Cắt Lẻ">
                    <input
                      type="text"
                      list="qlh-cut-retail-list"
                      placeholder="Chọn All, Không hoặc nhập tùy chỉnh..."
                      value={formData.cutRetail}
                      onChange={e => setFormData(f => ({ ...f, cutRetail: e.target.value }))}
                      className="form-input-qlh"
                    />
                    <datalist id="qlh-cut-retail-list">
                      <option value="All" />
                      <option value="Không" />
                    </datalist>
                  </FormField>
                </div>
              </div>

              {/* ─ Section 2: THÔNG TIN TÀI KHOẢN ─ */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-3 h-px bg-slate-300 dark:bg-slate-600" />
                  THÔNG TIN TÀI KHOẢN
                  <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700/60" />
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Mã Khách Hàng">
                    <select
                      value={formData.customerCode}
                      onChange={e => setFormData(f => ({ ...f, customerCode: e.target.value }))}
                      className="form-select-qlh"
                    >
                      {customers.length > 0
                        ? customers.map((c: any) => (
                          <option key={c.customerCode} value={c.customerCode}>{c.customerCode}</option>
                        ))
                        : Array.from({ length: 20 }, (_, i) => (
                          <option key={i} value={`CUS_${String(i + 1).padStart(3, '0')}`}>
                            {`CUS_${String(i + 1).padStart(3, '0')}`}
                          </option>
                        ))
                      }
                    </select>
                  </FormField>
                  <FormField label="Cấp Tài Khoản">
                    <select
                      value={formData.accountLevel}
                      onChange={e => setFormData(f => ({ ...f, accountLevel: e.target.value }))}
                      className="form-select-qlh"
                    >
                      {accountLevels.map((lvl: any) => (
                        <option key={lvl.code || lvl.id || lvl.name} value={lvl.code || lvl.name}>
                          {lvl.name || lvl.code}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Tên Tài Khoản" required>
                    <input
                      type="text"
                      placeholder="VD: MSSUB2024..."
                      value={formData.accountName}
                      onChange={e => setFormData(f => ({ ...f, accountName: e.target.value }))}
                      className="form-input-qlh"
                      required
                    />
                  </FormField>
                  <FormField label="Login Name">
                    <input
                      type="text"
                      placeholder="Tên đăng nhập hệ thống..."
                      value={formData.loginName}
                      onChange={e => setFormData(f => ({ ...f, loginName: e.target.value }))}
                      className="form-input-qlh"
                    />
                  </FormField>
                </div>
              </div>

              {/* ─ Section 3: BẢO MẬT & QUẢN LÝ ─ */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-3 h-px bg-slate-300 dark:bg-slate-600" />
                  BẢO MẬT &amp; QUẢN LÝ
                  <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700/60" />
                </h4>

                {/* Password config toggle */}
                <div className="mb-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => setShowPwdConfig(v => !v)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Cấu hình tạo mật khẩu tự động
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${showPwdConfig ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                      {showPwdConfig ? 'Đang mở' : 'Cài đặt'}
                    </span>
                  </button>
                  {showPwdConfig && (
                    <div className="mt-3 flex items-center gap-4 text-[11px]">
                      <label className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-400">
                        Độ dài:
                        <input
                          type="number"
                          min={8} max={32}
                          value={formData.pwdLength}
                          onChange={e => setFormData(f => ({ ...f, pwdLength: Number(e.target.value) }))}
                          className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-center"
                        />
                      </label>
                      <label className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.pwdSpecial}
                          onChange={e => setFormData(f => ({ ...f, pwdSpecial: e.target.checked }))}
                          className="w-4 h-4 accent-amber-500 rounded"
                        />
                        Ký tự đặc biệt
                      </label>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Password field */}
                  <FormField label="Mật khẩu">
                    <div className="relative flex">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={formData.password}
                        onChange={e => setFormData(f => ({ ...f, password: e.target.value }))}
                        className="form-input-qlh flex-1 pr-20 font-mono"
                        placeholder="Nhập hoặc tạo mật khẩu..."
                      />
                      <div className="absolute right-1 top-1 flex gap-0.5">
                        <button
                          type="button"
                          onClick={() => setShowPwd(v => !v)}
                          className="p-1.5 rounded text-slate-400 hover:text-slate-600"
                        >
                          {showPwd ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                        <button
                          type="button"
                          onClick={handleGeneratePassword}
                          className="p-1.5 rounded bg-amber-500 text-slate-950 hover:bg-amber-400"
                          title="Tạo mật khẩu mới"
                        >
                          <Sparkles className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(formData.password, 'mật khẩu')}
                          className="p-1.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
                          title="Copy mật khẩu"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </FormField>

                  {/* Code field */}
                  <FormField label="Mã Code">
                    <input
                      type="text"
                      placeholder="Code / Mã tra cứu..."
                      value={formData.code}
                      onChange={e => setFormData(f => ({ ...f, code: e.target.value }))}
                      className="form-input-qlh font-mono"
                    />
                  </FormField>

                  {/* Managed by */}
                  <FormField label="Quản Lý Bởi">
                    <select
                      value={formData.managedBy}
                      onChange={e => setFormData(f => ({ ...f, managedBy: e.target.value }))}
                      className="form-select-qlh"
                    >
                      <option value="Công Ty">Công Ty</option>
                      <option value="Khách Hàng">Khách Hàng</option>
                      <option value="Lưu Hỗ Trợ">Lưu Hỗ Trợ</option>
                      <option value="SubFull">SubFull</option>
                    </select>
                  </FormField>
                </div>

                {/* Notes */}
                <div className="mt-3">
                  <FormField label="Ghi chú">
                    <textarea
                      rows={2}
                      placeholder="Ghi chú bổ sung về tài khoản này..."
                      value={formData.notes}
                      onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                      className="form-input-qlh resize-none"
                    />
                  </FormField>
                </div>
              </div>
            </div>

            {/* Modal Footer – Action Buttons */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-end gap-2 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => { setIsFormOpen(false); setEditingItem(null); }}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition"
              >
                Hủy
              </button>
              {!editingItem && (
                <>
                  <button
                    type="button"
                    onClick={e => handleSubmit(e as any, 'new')}
                    disabled={saveMutation.isPending}
                    className="px-4 py-2 rounded-xl border border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 font-bold transition flex items-center gap-1.5"
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                    Lưu &amp; Mới
                  </button>
                  <button
                    type="button"
                    onClick={e => handleSubmit(e as any, 'copy')}
                    disabled={saveMutation.isPending}
                    className="px-4 py-2 rounded-xl border border-indigo-500/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 font-bold transition flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Lưu &amp; Copy
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={e => handleSubmit(e as any, 'normal')}
                disabled={saveMutation.isPending}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-lg shadow-amber-500/25 transition flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {saveMutation.isPending ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline CSS for form inputs */}
      <style jsx global>{`
        .form-input-qlh {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border-radius: 0.625rem;
          border: 1px solid;
          font-size: 0.75rem;
          transition: all 0.15s;
          outline: none;
        }
        .dark .form-input-qlh {
          background-color: #111827;
          border-color: #374151;
          color: #f1f5f9;
        }
        .form-input-qlh {
          background-color: #f8fafc;
          border-color: #e2e8f0;
          color: #0f172a;
        }
        .form-input-qlh:focus {
          ring: 2px;
          border-color: #f59e0b;
          box-shadow: 0 0 0 2px rgba(245,158,11,0.2);
        }
        .form-select-qlh {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border-radius: 0.625rem;
          border: 1px solid;
          font-size: 0.75rem;
          font-weight: 600;
          transition: all 0.15s;
          outline: none;
          cursor: pointer;
        }
        .dark .form-select-qlh {
          background-color: #111827;
          border-color: #374151;
          color: #f1f5f9;
        }
        .form-select-qlh {
          background-color: #f8fafc;
          border-color: #e2e8f0;
          color: #0f172a;
        }
        .form-select-qlh:focus {
          border-color: #f59e0b;
          box-shadow: 0 0 0 2px rgba(245,158,11,0.2);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
      `}</style>
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────
function FormField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
