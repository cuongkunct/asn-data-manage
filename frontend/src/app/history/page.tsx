'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  History, Search, Filter, Clock, Eye, 
  ShieldCheck, X, ChevronLeft, ChevronRight, RefreshCw 
} from 'lucide-react';
import { useI18n } from '../../context/i18nContext';

export default function HistoryPage() {
  const { t } = useI18n();

  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  const [selectedHistory, setSelectedHistory] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['history', page, limit, search, action, moduleFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        action,
        module: moduleFilter
      });
      const res = await fetch(`/api/history?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch history');
      return res.json();
    }
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('history.title')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Nhật ký kiểm toán hệ thống bất biến (Non-deletable audit log) lưu trữ đầy đủ IP, dữ liệu cũ & dữ liệu mới.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Audit Log Integrity Active</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input 
            type="text"
            placeholder="Search User, History ID, Object ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
          />
        </div>

        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold"
        >
          <option value="">-- Hành Động: All --</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="CHANGE_STATUS">CHANGE_STATUS</option>
          <option value="LOGIN">LOGIN</option>
        </select>

        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold"
        >
          <option value="">-- Module: All --</option>
          <option value="ACCOUNT">ACCOUNT</option>
          <option value="CUSTOMER">CUSTOMER</option>
          <option value="SYSTEM_ACCOUNT">SYSTEM_ACCOUNT</option>
          <option value="NOTE">NOTE</option>
          <option value="USER">USER</option>
          <option value="AUTH">AUTH</option>
        </select>
      </div>

      {/* History Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase">
                <th className="py-3.5 px-4">{t('history.user')}</th>
                <th className="py-3.5 px-4">{t('history.action')}</th>
                <th className="py-3.5 px-4">{t('history.module')}</th>
                <th className="py-3.5 px-4">{t('history.object')}</th>
                <th className="py-3.5 px-4">IP Address</th>
                <th className="py-3.5 px-4">{t('history.time')}</th>
                <th className="py-3.5 px-4 text-right">Chi Tiết Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-500" />
                    <span>Loading Audit Logs...</span>
                  </td>
                </tr>
              ) : data?.items?.map((h: any) => (
                <tr key={h._id || h.historyId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    {h.userName}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                      h.action === 'CREATE' ? 'bg-emerald-500/10 text-emerald-500' :
                      h.action === 'UPDATE' ? 'bg-blue-500/10 text-blue-500' :
                      h.action === 'DELETE' ? 'bg-rose-500/10 text-rose-500' :
                      'bg-slate-500/10 text-slate-400'
                    }`}>
                      {h.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-600 dark:text-slate-300">
                    {h.module}
                  </td>
                  <td className="py-3 px-4 font-mono text-brand-600 dark:text-brand-400">
                    {h.objectId}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                    {h.ipAddress || '127.0.0.1'}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                    {new Date(h.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedHistory(h)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-brand-500 font-semibold text-[11px] flex items-center gap-1 ml-auto"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem Diff</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diff Inspector Modal */}
      {selectedHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative max-h-[85vh] overflow-y-auto">
            <button onClick={() => setSelectedHistory(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Chi Tiết Thay Đổi: {selectedHistory.action} ({selectedHistory.objectId})
            </h3>
            <p className="text-xs text-slate-500 font-mono mb-4">
              User: {selectedHistory.userName} • Time: {new Date(selectedHistory.createdAt).toLocaleString()}
            </p>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <h4 className="font-bold text-rose-500 mb-2">Dữ Liệu Cũ (Old State):</h4>
                <pre className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 overflow-x-auto text-[11px] min-h-[150px]">
                  {selectedHistory.oldData ? JSON.stringify(selectedHistory.oldData, null, 2) : 'null'}
                </pre>
              </div>
              <div>
                <h4 className="font-bold text-emerald-500 mb-2">Dữ Liệu Mới (New State):</h4>
                <pre className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 overflow-x-auto text-[11px] min-h-[150px]">
                  {selectedHistory.newData ? JSON.stringify(selectedHistory.newData, null, 2) : 'null'}
                </pre>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button onClick={() => setSelectedHistory(null)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
