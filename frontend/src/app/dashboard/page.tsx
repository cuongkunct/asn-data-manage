'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  UserPlus, UserX, KeyRound, Shield, Activity,
  TrendingUp, ArrowUpRight, BarChart2
} from 'lucide-react';
import { useI18n } from '../../context/i18nContext';

export default function DashboardPage() {
  const { t } = useI18n();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/summary');
      if (!res.ok) throw new Error('Failed to fetch dashboard metrics');
      return res.json();
    }
  });

  const metrics = data?.metrics || {
    totalAccounts: 35,
    activeAccounts: 27,
    inactiveAccounts: 4,
    lockedAccounts: 4,
    totalCustomers: 20,
    activeCustomers: 18,
    inactiveCustomers: 2,
    totalNotes: 25
  };

  // ASM Detailed Matrix Data
  const accountMatrixData = [
    { system: '3N1BET', supplier: '3N1BET', active: 113, suspend: 2, closedCdl: '-', closed: 16, security: '-', unassigned: 56, total: 187 },
    { system: 'DUAIS889', supplier: 'CS', active: 15, suspend: 1, closedCdl: '-', closed: '-', security: '-', unassigned: 14, total: 30 },
    { system: 'FISHBET', supplier: 'FISHBET', active: 31, suspend: '-', closedCdl: '-', closed: 2, security: '-', unassigned: 6, total: 39 },
    { system: 'HPWDNRR9', supplier: 'HPWDNRR9', active: 9, suspend: '-', closedCdl: '-', closed: '-', security: '-', unassigned: 5, total: 14 },
    { system: 'HT388', supplier: 'CS', active: 34, suspend: 2, closedCdl: '-', closed: 2, security: '-', unassigned: 10, total: 48 },
  ];

  return (
    <div className="space-y-6 bg-slate-100 dark:bg-[#0b0f19] p-2 sm:p-4 rounded-2xl min-h-screen animate-fadeIn">
      {/* Top 4 ASM Vibrant Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Khách Hàng Mới (Blue) */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-100">
              KHÁCH HÀNG MỚI
            </h3>
            <div className="text-3xl font-black font-mono">
              {isLoading ? '0' : metrics.totalCustomers}
            </div>
            <p className="text-[11px] text-blue-100 font-medium">
              Khách hàng được tạo
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md text-white">
            <UserPlus className="w-7 h-7" />
          </div>
        </div>

        {/* Card 2: Khách Hàng Đã Xóa (Red) */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-rose-500/20 relative overflow-hidden flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-100">
              KHÁCH HÀNG ĐÃ XÓA
            </h3>
            <div className="text-3xl font-black font-mono">
              {metrics.inactiveCustomers}
            </div>
            <p className="text-[11px] text-rose-100 font-medium">
              Khách hàng đã xóa
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
            <div className="text-3xl font-black font-mono">
              {metrics.totalAccounts}
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
              TÀI KHOẢN MỚI
            </h3>
            <div className="text-3xl font-black font-mono">
              {metrics.activeAccounts}
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

      {/* Middle Grid Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Widget 1: Biến động Khách Hàng */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <span className="w-1 h-4 bg-emerald-500 rounded-full"></span>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Biến động Khách Hàng
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-semibold">Tuần trước</span>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold border-b border-slate-100 dark:border-slate-800 pb-2 mb-6">
              <span className="text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 pb-1">Mới tạo (0)</span>
              <span className="text-slate-400">Đã xóa (0)</span>
              <span className="text-slate-400">An ninh (0)</span>
            </div>

            <div className="h-36 flex flex-col items-center justify-center text-center text-slate-400 text-xs">
              <BarChart2 className="w-8 h-8 mb-2 text-slate-300 dark:text-slate-700" />
              <span>Không có khách hàng mới trong kỳ</span>
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
            <span className="text-xs font-bold text-slate-500 font-mono">TỔNG SỐ: 4008</span>
          </div>

          <div className="flex items-center gap-4 py-2">
            {/* Donut Ring */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <div className="w-full h-full rounded-full border-8 border-emerald-500 border-t-amber-500 border-r-rose-500 animate-spin-slow"></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-base font-black text-slate-900 dark:text-white font-mono">4008</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase">TỔNG KH</span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-1.5 text-xs flex-1 font-semibold">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active
                </span>
                <span className="font-mono text-slate-900 dark:text-white font-bold">3627 (90%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> Suspend
                </span>
                <span className="font-mono text-slate-900 dark:text-white font-bold">200 (5%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span> Closed
                </span>
                <span className="font-mono text-slate-900 dark:text-white font-bold">73 (2%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span> An ninh
                </span>
                <span className="font-mono text-slate-900 dark:text-white font-bold">103 (3%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Widget 3: Hệ Thống Tài Khoản */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Hệ Thống Tài Khoản
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500 font-mono">TỔNG SỐ: 12023</span>
          </div>

          <div className="flex items-center gap-4 py-2">
            {/* Donut Ring */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <div className="w-full h-full rounded-full border-8 border-teal-500 border-t-amber-500"></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-base font-black text-slate-900 dark:text-white font-mono">12023</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase">TỔNG TK</span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-1.5 text-xs flex-1 font-semibold">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-teal-500"></span> Active
                </span>
                <span className="font-mono text-slate-900 dark:text-white font-bold">11084 (92%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> Suspend
                </span>
                <span className="font-mono text-slate-900 dark:text-white font-bold">910 (8%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span> Closed có dữ liệu
                </span>
                <span className="font-mono text-slate-900 dark:text-white font-bold">22 (0%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span> Chưa Giao
                </span>
                <span className="font-mono text-slate-900 dark:text-white font-bold">7 (0%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Matrix Widget: Thống kê Danh Sách Tài Khoản - Biến động chi tiết */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-5 bg-amber-500 rounded-full"></span>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            🔑 Thống kê Danh Sách Tài Khoản - Biến động chi tiết
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
          {/* Left Donut Summary Chart */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center space-y-4">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <div className="w-full h-full rounded-full border-[10px] border-emerald-500 border-t-amber-500 border-r-rose-500"></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black text-slate-900 dark:text-white font-mono">3290</span>
                <span className="text-[10px] font-bold text-slate-400">TỔNG TK</span>
              </div>
            </div>

            <div className="w-full space-y-1.5 text-xs font-semibold">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active</span>
                <span className="font-mono font-bold">2316 (70%)</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Suspend</span>
                <span className="font-mono font-bold">61 (2%)</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Closed</span>
                <span className="font-mono font-bold">286 (9%)</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500"></span> An ninh</span>
                <span className="font-mono font-bold">23 (1%)</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400"></span> Chưa Giao</span>
                <span className="font-mono font-bold">604 (18%)</span>
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
                {accountMatrixData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 text-left font-bold text-slate-900 dark:text-white font-mono">{row.system}</td>
                    <td className="py-3 px-3 text-left text-slate-500 font-mono">{row.supplier}</td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">{row.active}</td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-600 dark:text-amber-400">{row.suspend}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{row.closedCdl}</td>
                    <td className="py-3 px-3 font-mono font-bold text-rose-500">{row.closed}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{row.security}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-600 dark:text-slate-400">{row.unassigned}</td>
                    <td className="py-3 px-3 font-mono font-extrabold text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-950/50">{row.total}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100/70 dark:bg-slate-950 font-extrabold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800">
                  <td colSpan={2} className="py-3 px-3 text-left font-mono">TỔNG CỘNG</td>
                  <td className="py-3 px-3 font-mono text-emerald-600 dark:text-emerald-400">2316</td>
                  <td className="py-3 px-3 font-mono text-amber-600 dark:text-amber-400">61</td>
                  <td className="py-3 px-3 font-mono text-slate-400">0</td>
                  <td className="py-3 px-3 font-mono text-rose-500">286</td>
                  <td className="py-3 px-3 font-mono text-purple-600 dark:text-purple-400">23</td>
                  <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">604</td>
                  <td className="py-3 px-3 font-mono text-brand-600 dark:text-brand-400 text-sm">3290</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
