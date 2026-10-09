'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, Users, KeyRound, Server, FileText, 
  History, ArrowRight, ShieldCheck, Layers, Clock, AlertCircle,
  Copy, Check, ExternalLink, RefreshCw, ChevronRight, Eye, ShieldAlert,
  ChevronDown
} from 'lucide-react';
import { useI18n } from '../../context/i18nContext';
import Link from 'next/link';

export default function OverviewPage() {
  const { t } = useI18n();
  const [queryInput, setQueryInput] = useState('CUS_001');
  const [activeQuery, setActiveQuery] = useState('CUS_001');
  const [activeTab, setActiveTab] = useState<'all' | 'accounts' | 'systems' | 'notes' | 'history'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['overview', activeQuery],
    queryFn: async () => {
      const token = localStorage.getItem('asm_token');
      const res = await fetch(`/api/overview/lookup?q=${encodeURIComponent(activeQuery)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Lookup failed');
      return res.json();
    },
    enabled: Boolean(activeQuery),
    staleTime: 30000
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (queryInput.trim()) {
      setActiveQuery(queryInput.trim());
    }
  };

  const customer = data?.customer;
  const accounts = data?.accounts || [];
  const systemAccounts = data?.systemAccounts || [];
  const notes = data?.notes || [];
  const history = data?.history || [];

  const totalLinked = accounts.length + systemAccounts.length + notes.length;

  return (
    <div className="space-y-4 animate-fadeIn max-w-[1600px] mx-auto pb-10">
      {/* ── TOP SEARCH & HEADER BAR (GỌN GÀNG, TỐI GIẢN) ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{t('overview.title')}</span>
              {isFetching && <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-500" />}
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Tra cứu nhanh hồ sơ khách hàng, tài khoản, HTTK và lịch sử
            </p>
          </div>
        </div>

        {/* Compact Search Form */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-lg w-full md:w-auto">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text"
              placeholder="Nhập Mã KH (CUS_001) hoặc Mã TK (ACC_001)..."
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 transition text-slate-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm shrink-0"
          >
            <span>Tra cứu</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* ── KPI METRICS SUMMARY BAR (4 THỐNG KÊ GỌN) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Mã Khách Hàng</span>
            <div className="text-sm font-black font-mono text-slate-900 dark:text-white mt-0.5 truncate max-w-[130px]">
              {customer?.customerCode || activeQuery}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Tài Khoản DSTK</span>
            <div className="text-base font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {accounts.length} <span className="text-[11px] font-normal text-slate-400">tài khoản</span>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <KeyRound className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Hệ Thống HTTK</span>
            <div className="text-base font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {systemAccounts.length} <span className="text-[11px] font-normal text-slate-400">liên kết</span>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Server className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Ghi Chú & Thao Tác</span>
            <div className="text-base font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {notes.length} <span className="text-[11px] font-normal text-slate-400">ghi chú • {history.length} log</span>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <FileText className="w-4 h-4" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="w-7 h-7 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2.5" />
          <p className="text-xs font-semibold">Đang truy vấn dữ liệu từ MongoDB...</p>
        </div>
      ) : !customer && accounts.length === 0 ? (
        <div className="p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-500 space-y-3">
          <AlertCircle className="w-9 h-9 mx-auto text-amber-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {t('overview.notFound')}
          </h3>
          <p className="text-xs max-w-md mx-auto">
            Không tìm thấy bản ghi phù hợp với từ khóa <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-brand-500 font-bold">{activeQuery}</code>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* ── CỘT TRÁI (4 COL): HỒ SƠ KHÁCH HÀNG COMPACT + LỊCH SỬ THAO TÁC ── */}
          <div className="lg:col-span-4 space-y-4">
            {/* Customer Profile Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                    KH
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Hồ sơ khách hàng</div>
                    <div className="text-sm font-mono font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{customer?.customerCode || activeQuery}</span>
                      <button 
                        onClick={() => copyToClipboard(customer?.customerCode || activeQuery, 'cus_code')}
                        className="text-slate-400 hover:text-brand-500 p-0.5 rounded transition"
                        title="Copy mã KH"
                      >
                        {copiedKey === 'cus_code' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  customer?.status === 'ACTIVE' 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-rose-500/10 text-rose-500'
                }`}>
                  {customer?.status || 'ACTIVE'}
                </span>
              </div>

              {/* Thông tin chi tiết thu gọn */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                  <span className="text-slate-400 text-[10px] block">Cấp KH (Level)</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 font-mono">
                    {customer?.level || '1-0'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                  <span className="text-slate-400 text-[10px] block">Quản Lý Hộ (QLH)</span>
                  <span className={`font-extrabold ${customer?.manageOnBehalf ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>
                    {customer?.manageOnBehalf ? 'Có (Quản lý hộ)' : 'Không'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                  <span className="text-slate-400 text-[10px] block">Cấp trên (Parent)</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                    {customer?.parentCustomerId || 'CTY'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                  <span className="text-slate-400 text-[10px] block">Kênh OTT</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 truncate block">
                    {Array.isArray(customer?.ottApps) ? customer.ottApps.join(', ') : (customer?.ottApp || 'Telegram')}
                  </span>
                </div>
              </div>

              {customer?.notes && (
                <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs">
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block mb-0.5">Ghi chú KH:</span>
                  <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed line-clamp-3">
                    {customer.notes}
                  </p>
                </div>
              )}

              <div className="pt-1 flex items-center justify-between text-xs text-brand-600 dark:text-brand-400 font-bold">
                <Link href={`/customers`} className="flex items-center gap-1 hover:underline text-[11px]">
                  <span>Xem trong DS Khách Hàng</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <Link href={`/quan-ly-ho`} className="flex items-center gap-1 hover:underline text-[11px]">
                  <span>Cây Quản Lý Hộ</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Audit History Timeline (Gọn) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
                  <History className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Lịch Sử Thao Tác ({history.length})</span>
                </h3>
                <Link href="/history" className="text-[11px] text-brand-500 hover:underline">
                  Xem tất cả
                </Link>
              </div>

              {history.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">Chưa có nhật ký thao tác nào.</p>
              ) : (
                <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                  {history.slice(0, 10).map((h: any, idx: number) => (
                    <div key={idx} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold text-slate-900 dark:text-white">{h.action}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(h.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between font-mono">
                        <span>{h.module}: {h.objectId}</span>
                        <span className="text-slate-400">bởi {h.userName || 'System'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── CỘT PHẢI (8 COL): TABS CHUYỂN ĐỔI NHANH (TẤT CẢ / TK DSTK / HTTK / GHI CHÚ) ── */}
          <div className="lg:col-span-8 space-y-4">
            {/* Filter Tabs */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 shadow-sm flex items-center gap-1 overflow-x-auto">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'all'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>Tất cả</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/20">
                  {totalLinked}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('accounts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'accounts'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>DSTK ({accounts.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('systems')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'systems'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Server className="w-3.5 h-3.5" />
                <span>HTTK ({systemAccounts.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('notes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'notes'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Ghi Chú ({notes.length})</span>
              </button>
            </div>

            {/* TAB CONTENT 1: DANH SÁCH TÀI KHOẢN (DSTK) */}
            {(activeTab === 'all' || activeTab === 'accounts') && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Danh Sách Tài Khoản ({accounts.length})</span>
                  </h3>
                  <Link href="/accounts" className="text-[11px] text-brand-500 hover:underline font-bold">
                    Quản lý DSTK →
                  </Link>
                </div>

                {accounts.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Không có tài khoản DSTK liên kết.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 uppercase font-mono">
                          <th className="py-2 px-2.5">Mã TK</th>
                          <th className="py-2 px-2.5">Tên TK</th>
                          <th className="py-2 px-2.5">Hệ Thống</th>
                          <th className="py-2 px-2.5">Cấp TK</th>
                          <th className="py-2 px-2.5">Trạng Thái</th>
                          <th className="py-2 px-2.5 text-right">Copy / Chi tiết</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {accounts.map((acc: any) => (
                          <tr key={acc.accountId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                            <td className="py-2.5 px-2.5 font-mono font-bold text-brand-600 dark:text-brand-400">
                              {acc.accountId}
                            </td>
                            <td className="py-2.5 px-2.5 font-medium text-slate-900 dark:text-white">
                              {acc.accountName}
                            </td>
                            <td className="py-2.5 px-2.5 text-slate-500 font-mono text-[11px]">
                              {acc.systemId || '-'}{acc.supplierId ? ` / ${acc.supplierId}` : ''}
                            </td>
                            <td className="py-2.5 px-2.5">
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-[10px]">
                                {acc.accountLevel || 'Super'}
                              </span>
                            </td>
                            <td className="py-2.5 px-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                acc.status === 'ACTIVE' 
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                  : 'bg-rose-500/10 text-rose-500'
                              }`}>
                                {acc.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-2.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => copyToClipboard(acc.accountId, `acc_${acc.accountId}`)}
                                  className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                                  title="Copy mã TK"
                                >
                                  {copiedKey === `acc_${acc.accountId}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                                <Link 
                                  href={`/accounts`} 
                                  className="p-1 rounded text-slate-400 hover:text-brand-500 transition"
                                  title="Xem tại trang DSTK"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: HỆ THỐNG TÀI KHOẢN (HTTK) */}
            {(activeTab === 'all' || activeTab === 'systems') && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
                    <Server className="w-3.5 h-3.5 text-purple-500" />
                    <span>Hệ Thống Tài Khoản - Hierarchy ({systemAccounts.length})</span>
                  </h3>
                  <Link href="/system-accounts" className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-bold">
                    Cấu trúc cây HTTK →
                  </Link>
                </div>

                {systemAccounts.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Không có hệ thống HTTK nào liên kết với khách hàng này.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {systemAccounts.map((sys: any) => (
                      <div 
                        key={sys.systemAccountId} 
                        className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between hover:border-purple-500/50 transition"
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{sys.systemUsername}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono">
                              Cấp {sys.accountLevel || '1-0'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            ID: {sys.systemAccountId} • KH: {sys.customerCode}
                          </div>
                        </div>

                        <button
                          onClick={() => copyToClipboard(sys.systemUsername, `sys_${sys.systemAccountId}`)}
                          className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                          title="Copy Username"
                        >
                          {copiedKey === `sys_${sys.systemAccountId}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 3: GHI CHÚ KHÁCH HÀNG */}
            {(activeTab === 'all' || activeTab === 'notes') && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
                    <FileText className="w-3.5 h-3.5 text-amber-500" />
                    <span>Ghi Chú & Yêu Cầu Riêng ({notes.length})</span>
                  </h3>
                  <Link href="/notes" className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-bold">
                    Quản lý ghi chú →
                  </Link>
                </div>

                {notes.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Không có ghi chú nào cho khách hàng này.</p>
                ) : (
                  <div className="space-y-2">
                    {notes.map((n: any) => (
                      <div 
                        key={n.noteId} 
                        className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-amber-600 dark:text-amber-400 text-[11px] px-2 py-0.5 rounded bg-amber-500/10">
                            {n.noteType || 'Ghi chú chung'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Mã: {n.noteId}
                          </span>
                        </div>
                        <p className="text-slate-800 dark:text-slate-200 text-xs leading-relaxed">
                          {n.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
