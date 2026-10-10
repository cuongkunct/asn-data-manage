'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  UserPlus, UserX, KeyRound, Shield, Activity,
  TrendingUp, ArrowUpRight, BarChart2, Calendar,
  Filter, RotateCcw, RefreshCw, Radio, Layers,
  Building2, Landmark, ChevronDown, Check, ExternalLink,
  Users, UserCheck, AlertCircle
} from 'lucide-react';
import { useI18n } from '../../context/i18nContext';
import { useSocket } from '../../context/socketContext';
import { formatCustomerLevel } from '@/utils/customerLevel';

export default function DashboardPage() {
  const { t } = useI18n();
  const { isConnected } = useSocket();

  // Filter States
  const [period, setPeriod] = useState<'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom' | 'all'>('this_week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [agentPrefix, setAgentPrefix] = useState('ALL');
  const [supplierId, setSupplierId] = useState('ALL');
  const [banker, setBanker] = useState('ALL');

  // Fluctuation Sub-tab in Widget 1
  const [fluctuationTab, setFluctuationTab] = useState<'newCreated' | 'deleted' | 'security'>('newCreated');

  // Query Dashboard Data with Active Filters
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['dashboard', period, startDate, endDate, agentPrefix, supplierId, banker],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('period', period);
      if (period === 'custom' && startDate && endDate) {
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      }
      if (agentPrefix && agentPrefix !== 'ALL') params.set('agentPrefix', agentPrefix);
      if (supplierId && supplierId !== 'ALL') params.set('supplierId', supplierId);
      if (banker && banker !== 'ALL') params.set('banker', banker);

      const token = typeof window !== 'undefined'
        ? (localStorage.getItem('asm_jwt_token') || localStorage.getItem('asm_token'))
        : null;
      const res = await fetch(`/api/dashboard/summary?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to fetch dashboard metrics');
      return res.json();
    },
    staleTime: 10000
  });

  const resetFilters = () => {
    setPeriod('this_week');
    setStartDate('');
    setEndDate('');
    setAgentPrefix('ALL');
    setSupplierId('ALL');
    setBanker('ALL');
  };

  const metrics = data?.metrics || {
    totalCustomers: 0,
    newCustomers: 0,
    deletedCustomers: 0,
    totalAccounts: 0,
    newAccounts: 0,
    totalSystemAccounts: 0,
    newSystemAccounts: 0,
    totalNotes: 0
  };

  const customerStatusDistribution = data?.customerStatusDistribution || {
    total: 0,
    active: { count: 0, percent: 0 },
    suspend: { count: 0, percent: 0 },
    closed: { count: 0, percent: 0 },
    security: { count: 0, percent: 0 }
  };

  const systemAccountDistribution = data?.systemAccountDistribution || {
    total: 0,
    active: { count: 0, percent: 0 },
    suspend: { count: 0, percent: 0 },
    closed: { count: 0, percent: 0 },
    unassigned: { count: 0, percent: 0 }
  };

  const accountStatusDistribution = data?.accountStatusDistribution || {
    total: 0,
    active: { count: 0, percent: 0 },
    suspend: { count: 0, percent: 0 },
    closed: { count: 0, percent: 0 },
    security: { count: 0, percent: 0 },
    unassigned: { count: 0, percent: 0 }
  };

  const accountMatrixData = data?.accountMatrixData || [];
  const matrixTotals = data?.matrixTotals || {
    active: 0,
    suspend: 0,
    closedCdl: 0,
    closed: 0,
    security: 0,
    unassigned: 0,
    total: 0
  };

  const customerFluctuations = data?.customerFluctuations || {
    newCreated: [],
    deleted: [],
    security: []
  };

  const filterOptions = data?.filterOptions || {
    suppliers: [],
    bankers: [],
    agentPrefixes: []
  };

  const periodLabel = data?.filter?.periodLabel || 'Tuần này';

  // Active fluctuation list
  const activeFluctuationList = customerFluctuations[fluctuationTab] || [];

  return (
    <div className="space-y-5 bg-slate-100 dark:bg-[#0b0f19] p-2 sm:p-4 rounded-2xl min-h-screen animate-fadeIn text-slate-800 dark:text-slate-100">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ── TOP PAGE COMPACT FILTER BAR (BỘ LỌC GỌN GÀNG ĐẦY ĐỦ) ── */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Filter className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Bộ lọc phân tích thống kê</span>
                {isFetching && <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Đang hiển thị theo: <span className="font-bold text-amber-600 dark:text-amber-400">{periodLabel}</span>
                {agentPrefix !== 'ALL' && <span> • Đại lý: <strong className="text-slate-900 dark:text-white">{agentPrefix}</strong></span>}
                {supplierId !== 'ALL' && <span> • NCC: <strong className="text-slate-900 dark:text-white">{supplierId}</strong></span>}
                {banker !== 'ALL' && <span> • Banker: <strong className="text-slate-900 dark:text-white">{banker}</strong></span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end lg:self-auto">
            {/* Realtime WS Badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
              isConnected
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
            }`}>
              <Radio className={`w-3 h-3 ${isConnected ? 'text-emerald-500 animate-pulse' : 'text-rose-500'}`} />
              <span>{isConnected ? 'Real-time DB' : 'Offline'}</span>
            </div>

            {/* Reset Filter Button */}
            <button
              onClick={resetFilters}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition active:scale-95"
              title="Đặt lại toàn bộ bộ lọc"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Đặt lại</span>
            </button>

            {/* Manual Refresh */}
            <button
              onClick={() => refetch()}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition active:scale-95"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-amber-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Filter 1: Khoảng thời gian */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>Khoảng thời gian:</span>
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-1.5 focus:ring-amber-500 transition cursor-pointer"
            >
              <option value="this_week">🗓️ Tuần này</option>
              <option value="last_week">🗓️ Tuần trước</option>
              <option value="this_month">📅 Tháng này</option>
              <option value="last_month">📅 Tháng trước</option>
              <option value="custom">⚙️ Tùy chỉnh (Từ - Đến)</option>
              <option value="all">🌐 Tất cả thời gian</option>
            </select>
          </div>

          {/* Filter 2: Đầu mã đại lý */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>Đầu mã đại lý:</span>
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={agentPrefix === 'ALL' ? '' : agentPrefix}
                onChange={(e) => setAgentPrefix(e.target.value.trim() ? e.target.value.trim() : 'ALL')}
                placeholder="Tất cả đại lý (hoặc nhập mã...)"
                list="agent-prefix-list"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 font-semibold text-xs focus:outline-none focus:ring-1.5 focus:ring-amber-500 transition"
              />
              <datalist id="agent-prefix-list">
                {filterOptions.agentPrefixes.map((p: string) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
              {agentPrefix !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setAgentPrefix('ALL')}
                  className="px-2 py-1 text-slate-400 hover:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                  title="Xóa lọc đại lý"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Filter 3: Nhà cung cấp (NCC) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-purple-500" />
              <span>Nhà cung cấp (NCC):</span>
            </label>
            {filterOptions.suppliers.length > 0 ? (
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-1.5 focus:ring-amber-500 transition cursor-pointer"
              >
                <option value="ALL">Tất cả nhà cung cấp</option>
                {filterOptions.suppliers.map((s: string) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <select
                disabled
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-400 font-semibold cursor-not-allowed"
              >
                <option>Chưa có NCC trong DB</option>
              </select>
            )}
          </div>

          {/* Filter 4: Banker */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-emerald-500" />
              <span>Banker:</span>
            </label>
            {filterOptions.bankers.length > 0 ? (
              <select
                value={banker}
                onChange={(e) => setBanker(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-1.5 focus:ring-amber-500 transition cursor-pointer"
              >
                <option value="ALL">Tất cả Banker</option>
                {filterOptions.bankers.map((b: string) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            ) : (
              <select
                disabled
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-400 font-semibold cursor-not-allowed"
              >
                <option>Chưa có Banker trong DB</option>
              </select>
            )}
          </div>
        </div>

        {/* Tùy chỉnh: Nhập Từ ngày - Đến ngày khi chọn 'custom' */}
        {period === 'custom' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-3 animate-fadeIn text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600 dark:text-slate-300">Từ ngày:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600 dark:text-slate-300">Đến ngày:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            {(startDate || endDate) && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                ✓ Đang áp dụng khoảng ngày tùy chỉnh
              </span>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ── TOP 4 VIBRANT METRIC CARDS ── */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Khách Hàng Mới (Blue) */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-100">
              KHÁCH HÀNG MỚI
            </h3>
            <div className="text-3xl font-black">
              {isLoading ? '...' : metrics.newCustomers}
            </div>
            <p className="text-[11px] text-blue-100 font-medium truncate max-w-[170px]" title={periodLabel}>
              Tạo trong: {periodLabel}
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md text-white">
            <UserPlus className="w-7 h-7" />
          </div>
        </div>

        {/* Card 2: Khách Hàng Đã Xóa / Tạm Ngưng (Red) */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-rose-500/20 relative overflow-hidden flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-100">
              KHÁCH HÀNG ĐÃ XÓA
            </h3>
            <div className="text-3xl font-black">
              {isLoading ? '...' : metrics.deletedCustomers}
            </div>
            <p className="text-[11px] text-rose-100 font-medium">
              Khách hàng tạm ngưng / xóa
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md text-white">
            <UserX className="w-7 h-7" />
          </div>
        </div>

        {/* Card 3: Tài Khoản Mới (Green) */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-100">
              TÀI KHOẢN MỚI
            </h3>
            <div className="text-3xl font-black">
              {isLoading ? '...' : metrics.newAccounts}
            </div>
            <p className="text-[11px] text-emerald-100 font-medium">
              Tài khoản DSTK tạo mới
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md text-white">
            <KeyRound className="w-7 h-7" />
          </div>
        </div>

        {/* Card 4: Tài Khoản HTTK Mới (Purple) */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-purple-500/20 relative overflow-hidden flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-100">
              HTTK MỚI
            </h3>
            <div className="text-3xl font-black">
              {isLoading ? '...' : metrics.newSystemAccounts}
            </div>
            <p className="text-[11px] text-purple-100 font-medium">
              Tài khoản HTTK tạo mới
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md text-white">
            <Shield className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ── MIDDLE GRID WIDGETS (3 TIỆN ÍCH PHÂN TÍCH) ── */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Widget 1: Biến động Khách Hàng */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <span className="w-1 h-4 bg-emerald-500 rounded-full"></span>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Biến động Khách Hàng
                </h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                {periodLabel}
              </span>
            </div>

            {/* Sub-tabs */}
            <div className="flex items-center gap-2 text-xs font-bold border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
              <button
                onClick={() => setFluctuationTab('newCreated')}
                className={`pb-1 transition ${
                  fluctuationTab === 'newCreated'
                    ? 'text-amber-500 border-b-2 border-amber-500 font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mới tạo ({customerFluctuations.newCreated.length})
              </button>
              <button
                onClick={() => setFluctuationTab('deleted')}
                className={`pb-1 transition ${
                  fluctuationTab === 'deleted'
                    ? 'text-rose-500 border-b-2 border-rose-500 font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Đã xóa ({customerFluctuations.deleted.length})
              </button>
              <button
                onClick={() => setFluctuationTab('security')}
                className={`pb-1 transition ${
                  fluctuationTab === 'security'
                    ? 'text-purple-500 border-b-2 border-purple-500 font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                An ninh ({customerFluctuations.security.length})
              </button>
            </div>

            {/* List Content */}
            <div className="h-44 overflow-y-auto space-y-2 pr-1">
              {activeFluctuationList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs">
                  <BarChart2 className="w-8 h-8 mb-2 text-slate-300 dark:text-slate-700" />
                  <span>Không có khách hàng trong mục này</span>
                </div>
              ) : (
                activeFluctuationList.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.customerCode}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500">
                        {formatCustomerLevel(item.level)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold ${
                        item.status === 'ACTIVE'
                          ? 'text-emerald-500'
                          : item.status === 'LOCKED'
                          ? 'text-purple-400'
                          : 'text-rose-500'
                      }`}>
                        {item.status}
                      </span>
                      <Link
                        href={`/overview?q=${encodeURIComponent(item.customerCode)}`}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-amber-500 transition"
                        title="Tra cứu hồ sơ"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Widget 2: Cơ cấu Trạng thái KH */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 bg-amber-500 rounded-full"></span>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Cơ cấu Trạng thái KH
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500">
              TỔNG SỐ: {customerStatusDistribution.total}
            </span>
          </div>

          <div className="flex items-center gap-4 py-2">
            {/* Donut Ring Visual */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <div className="w-full h-full rounded-full border-8 border-emerald-500 border-t-amber-500 border-r-rose-500"></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-base font-black text-slate-900 dark:text-white">
                  {customerStatusDistribution.total}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase">TỔNG KH</span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-1.5 text-xs flex-1 font-semibold">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active
                </span>
                <span className="text-slate-900 dark:text-white font-bold">
                  {customerStatusDistribution.active.count} ({customerStatusDistribution.active.percent}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> Suspend
                </span>
                <span className="text-slate-900 dark:text-white font-bold">
                  {customerStatusDistribution.suspend.count} ({customerStatusDistribution.suspend.percent}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span> Closed
                </span>
                <span className="text-slate-900 dark:text-white font-bold">
                  {customerStatusDistribution.closed.count} ({customerStatusDistribution.closed.percent}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span> An ninh
                </span>
                <span className="text-slate-900 dark:text-white font-bold">
                  {customerStatusDistribution.security.count} ({customerStatusDistribution.security.percent}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Widget 3: Hệ Thống Tài Khoản (HTTK) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Hệ Thống Tài Khoản
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500">
              TỔNG SỐ: {systemAccountDistribution.total}
            </span>
          </div>

          <div className="flex items-center gap-4 py-2">
            {/* Donut Ring Visual */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <div className="w-full h-full rounded-full border-8 border-teal-500 border-t-amber-500"></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-base font-black text-slate-900 dark:text-white">
                  {systemAccountDistribution.total}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase">TỔNG TK</span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-1.5 text-xs flex-1 font-semibold">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-teal-500"></span> Active
                </span>
                <span className="text-slate-900 dark:text-white font-bold">
                  {systemAccountDistribution.active.count} ({systemAccountDistribution.active.percent}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> Suspend
                </span>
                <span className="text-slate-900 dark:text-white font-bold">
                  {systemAccountDistribution.suspend.count} ({systemAccountDistribution.suspend.percent}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span> Closed
                </span>
                <span className="text-slate-900 dark:text-white font-bold">
                  {systemAccountDistribution.closed.count} ({systemAccountDistribution.closed.percent}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span> Chưa Giao
                </span>
                <span className="text-slate-900 dark:text-white font-bold">
                  {systemAccountDistribution.unassigned.count} ({systemAccountDistribution.unassigned.percent}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ── BOTTOM MATRIX: THỐNG KÊ CHI TIẾT TÀI KHOẢN THEO HỆ THỐNG & NCC ── */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 bg-amber-500 rounded-full"></span>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              🔑 Thống kê Danh Sách Tài Khoản - Biến động chi tiết
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-semibold">
            Khớp với bộ lọc đang chọn ({periodLabel})
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
          {/* Left Donut Summary Chart */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center space-y-4">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <div className="w-full h-full rounded-full border-[10px] border-emerald-500 border-t-amber-500 border-r-rose-500"></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {matrixTotals.total}
                </span>
                <span className="text-[10px] font-bold text-slate-400">TỔNG TK</span>
              </div>
            </div>

            <div className="w-full space-y-1.5 text-xs font-semibold">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {accountStatusDistribution.active.count} ({accountStatusDistribution.active.percent}%)
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Suspend</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {accountStatusDistribution.suspend.count} ({accountStatusDistribution.suspend.percent}%)
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Closed</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {accountStatusDistribution.closed.count} ({accountStatusDistribution.closed.percent}%)
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500"></span> An ninh</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {accountStatusDistribution.security.count} ({accountStatusDistribution.security.percent}%)
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400"></span> Chưa Giao</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {accountStatusDistribution.unassigned.count} ({accountStatusDistribution.unassigned.percent}%)
                </span>
              </div>
            </div>
          </div>

          {/* Right Detailed Status Matrix Table */}
          <div className="lg:col-span-3 overflow-x-auto">
            <table className="w-full text-center text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/70 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-3 text-left">HỆ THỐNG</th>
                  <th className="py-3 px-3 text-left">NCC</th>
                  <th className="py-3 px-3 text-emerald-600 dark:text-emerald-400">ACTIVE</th>
                  <th className="py-3 px-3 text-amber-600 dark:text-amber-400">SUSPEND</th>
                  <th className="py-3 px-3 text-rose-600 dark:text-rose-400">CLOSED CDL</th>
                  <th className="py-3 px-3 text-rose-500">CLOSED</th>
                  <th className="py-3 px-3 text-purple-600 dark:text-purple-400">AN NINH</th>
                  <th className="py-3 px-3 text-slate-500">CHƯA GIAO</th>
                  <th className="py-3 px-3 font-extrabold text-slate-900 dark:text-white">TỔNG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {accountMatrixData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Không có tài khoản nào phù hợp với bộ lọc hiện tại
                    </td>
                  </tr>
                ) : (
                  accountMatrixData.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 text-left font-bold text-slate-900 dark:text-white">
                        {row.system}
                      </td>
                      <td className="py-3 px-3 text-left text-slate-500">
                        {row.supplier}
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                        {row.active || 0}
                      </td>
                      <td className="py-3 px-3 font-bold text-amber-600 dark:text-amber-400">
                        {row.suspend || 0}
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {row.closedCdl || 0}
                      </td>
                      <td className="py-3 px-3 font-bold text-rose-500">
                        {row.closed || 0}
                      </td>
                      <td className="py-3 px-3 font-bold text-purple-600 dark:text-purple-400">
                        {row.security || 0}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-600 dark:text-slate-400">
                        {row.unassigned || 0}
                      </td>
                      <td className="py-3 px-3 font-extrabold text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-950/50">
                        {row.total || 0}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/70 dark:bg-slate-950 font-extrabold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800">
                  <td colSpan={2} className="py-3 px-3 text-left font-bold">TỔNG CỘNG</td>
                  <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">{matrixTotals.active}</td>
                  <td className="py-3 px-3 font-bold text-amber-600 dark:text-amber-400">{matrixTotals.suspend}</td>
                  <td className="py-3 px-3 font-bold text-slate-400">{matrixTotals.closedCdl}</td>
                  <td className="py-3 px-3 font-bold text-rose-500">{matrixTotals.closed}</td>
                  <td className="py-3 px-3 font-bold text-purple-600 dark:text-purple-400">{matrixTotals.security}</td>
                  <td className="py-3 px-3 font-bold text-slate-600 dark:text-slate-400">{matrixTotals.unassigned}</td>
                  <td className="py-3 px-3 font-bold text-amber-600 dark:text-amber-400 text-sm">{matrixTotals.total}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
