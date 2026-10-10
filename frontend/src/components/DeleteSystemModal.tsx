'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Zap, X, Lock, Database, ClipboardList, Loader2,
  AlertTriangle, Check, Layers, Trash2
} from 'lucide-react';

interface DeleteSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialSystemName?: string;
  initialSupplierName?: string;
}

interface PreviewData {
  accountsCount: number;
  systemAccountsCount: number;
  qlhCount: number;
  total: number;
  samples?: {
    accounts: any[];
    systemAccounts: any[];
    qlh: any[];
  };
}

export default function DeleteSystemModal({
  isOpen,
  onClose,
  onSuccess,
  initialSystemName = '',
  initialSupplierName = ''
}: DeleteSystemModalProps) {
  const [bySupplier, setBySupplier] = useState(false);
  const [systemName, setSystemName] = useState(initialSystemName);
  const [supplierName, setSupplierName] = useState(initialSupplierName);

  const [availableSystems, setAvailableSystems] = useState<string[]>([]);
  const [availableSuppliers, setAvailableSuppliers] = useState<string[]>([]);

  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewError, setPreviewError] = useState('');

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Get Auth Token Helper
  const getAuthToken = () => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('asm_jwt_token') || localStorage.getItem('asm_token') || '';
  };

  // Fetch available options when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Reset state
    setSystemName(initialSystemName);
    setSupplierName(initialSupplierName);
    setBySupplier(!!initialSupplierName);
    setPreview(null);
    setPreviewError('');
    setDeleteResult(null);

    const fetchOptions = async () => {
      try {
        const token = getAuthToken();
        const res = await fetch('/api/accounts/delete-system/options', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setAvailableSystems(data.systems || []);
          setAvailableSuppliers(data.suppliers || []);
        }
      } catch (e) {
        console.error('Failed to load system options', e);
      }
    };

    fetchOptions();
  }, [isOpen, initialSystemName, initialSupplierName]);

  // Debounced preview calculation
  useEffect(() => {
    if (!isOpen) return;

    const trimmedSys = systemName.trim();
    const trimmedSup = supplierName.trim();

    // If both empty, clear preview
    if (!trimmedSys && (!bySupplier || !trimmedSup)) {
      setPreview(null);
      setIsLoadingPreview(false);
      setPreviewError('');
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingPreview(true);
      setPreviewError('');

      try {
        const token = getAuthToken();
        const res = await fetch('/api/accounts/delete-system/preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            systemName: trimmedSys,
            supplierName: trimmedSup,
            bySupplier
          })
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Lỗi khi kiểm tra dữ liệu.');
        }

        const data: PreviewData = await res.json();
        setPreview(data);
      } catch (err: any) {
        setPreviewError(err.message || 'Không thể tính toán dữ liệu ảnh hưởng.');
        setPreview(null);
      } finally {
        setIsLoadingPreview(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isOpen, systemName, supplierName, bySupplier]);

  // Handle Delete Execution
  const handleDelete = async () => {
    const trimmedSys = systemName.trim();
    const trimmedSup = supplierName.trim();

    if (!trimmedSys && (!bySupplier || !trimmedSup)) {
      alert('Vui lòng nhập Tên hệ thống hoặc chọn Nhà cung cấp cần xóa.');
      return;
    }

    const confirmMsg = `XÁC NHẬN XÓA TOÀN BỘ HỆ THỐNG:\n\n- Hệ thống: ${trimmedSys || '(Không chọn)'}\n- Nhà cung cấp: ${bySupplier && trimmedSup ? trimmedSup : '(Tất cả)'}\n- Tổng số tài khoản sẽ xóa: ${preview?.total || 0}\n\nThao tác này sẽ xóa vĩnh viễn dữ liệu trên cả 3 trang: Hệ Thống Tài Khoản, Danh Sách Tài Khoản, và Quản Lý Hộ.\n\nBạn có chắc chắn muốn tiếp tục?`;
    
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsDeleting(true);
    setDeleteResult(null);

    try {
      const token = getAuthToken();
      const res = await fetch('/api/accounts/delete-system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          systemName: trimmedSys,
          supplierName: trimmedSup,
          bySupplier
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Lỗi khi thực hiện xóa.');
      }

      setDeleteResult({
        type: 'success',
        message: data.message || `Đã xóa thành công ${data.deleted?.total || 0} tài khoản.`
      });

      if (onSuccess) {
        onSuccess();
      }

      // Close modal after 1.5 seconds on success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setDeleteResult({
        type: 'error',
        message: err.message || 'Xóa hệ thống thất bại.'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div className="p-5 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center text-white shadow-md shadow-rose-500/25 shrink-0">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                Xóa Hệ Thống (DSTK &amp; HTTK &amp; QLH)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Xóa tất cả tài khoản thuộc một hệ thống cụ thể trên toàn bộ hệ thống
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── BODY ── */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Result Alert Toast */}
          {deleteResult && (
            <div className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 ${
              deleteResult.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
            }`}>
              {deleteResult.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              )}
              <span>{deleteResult.message}</span>
            </div>
          )}

          {/* Toggle Switch Card: Xóa theo Nhà cung cấp cụ thể? */}
          <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Lock className="w-4 h-4 text-slate-500" />
              <span>Xóa theo Nhà cung cấp cụ thể?</span>
            </div>

            {/* Orange/Amber Toggle Switch (as shown in user screenshot) */}
            <button
              type="button"
              role="switch"
              aria-checked={bySupplier}
              onClick={() => setBySupplier(!bySupplier)}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                bySupplier ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  bySupplier ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Input Grid: Tên Hệ Thống & Nhà Cung Cấp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            {/* Tên Hệ Thống */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Tên Hệ Thống Cần Xóa (Khớp hoàn toàn)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  placeholder="Ví dụ: VIVA88"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                />
              </div>

              {/* Quick suggestions chips */}
              {availableSystems.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {availableSystems.slice(0, 4).map((sys) => (
                    <button
                      key={sys}
                      type="button"
                      onClick={() => setSystemName(sys)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition ${
                        systemName.toUpperCase() === sys.toUpperCase()
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {sys}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Nhà Cung Cấp */}
            <div>
              <label className={`block font-bold mb-1.5 ${
                bySupplier ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'
              }`}>
                Nhà Cung Cấp Cần Xóa (Khớp hoàn toàn)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => {
                    setSupplierName(e.target.value);
                    if (e.target.value && !bySupplier) setBySupplier(true);
                  }}
                  disabled={!bySupplier}
                  placeholder="Ví dụ: C3, C2..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-950 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold transition ${
                    bySupplier
                      ? 'border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white'
                      : 'border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-950/50 text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                />
              </div>

              {/* Quick suggestions chips */}
              {bySupplier && availableSuppliers.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {availableSuppliers.slice(0, 4).map((sup) => (
                    <button
                      key={sup}
                      type="button"
                      onClick={() => setSupplierName(sup)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition ${
                        supplierName.toUpperCase() === sup.toUpperCase()
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {sup}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── PREVIEW CONTAINER ── */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-5 min-h-[160px] flex flex-col items-center justify-center text-center">
            {isLoadingPreview ? (
              <div className="py-4 flex flex-col items-center gap-2 text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
                <p className="text-xs font-semibold">Đang tính toán dữ liệu ảnh hưởng trên toàn hệ thống...</p>
              </div>
            ) : previewError ? (
              <div className="py-2 text-rose-500 text-xs flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="w-4 h-4" />
                <span>{previewError}</span>
              </div>
            ) : !preview ? (
              <div className="py-4 flex flex-col items-center text-slate-400 dark:text-slate-500">
                <ClipboardList className="w-12 h-12 stroke-[1.25] text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-medium mt-2">
                  Nhập thông tin để xem trước dữ liệu ảnh hưởng
                </p>
              </div>
            ) : preview.total === 0 ? (
              <div className="py-4 space-y-1">
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  Không tìm thấy tài khoản nào khớp điều kiện
                </p>
                <p className="text-[11px] text-slate-400">
                  Hệ thống: &quot;{systemName || 'Tất cả'}&quot; {bySupplier ? `• NCC: "${supplierName || 'Tất cả'}"` : ''} hiện không có dữ liệu tại HTTK, DSTK hoặc QLH.
                </p>
              </div>
            ) : (
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
                  <span className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                    Dữ liệu sẽ bị xóa tại 3 trang
                  </span>
                  <span className="text-[11px] font-black text-rose-600 dark:text-rose-400">
                    Tổng cộng: {preview.total} tài khoản
                  </span>
                </div>

                {/* 3 Metrics Badge Bar */}
                <div className="grid grid-cols-3 gap-2 text-left">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase block">
                      Hệ Thống TK
                    </span>
                    <span className="text-base font-black text-purple-700 dark:text-purple-300">
                      {preview.systemAccountsCount} <span className="text-[10px] font-normal">TK</span>
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase block">
                      Danh Sách TK
                    </span>
                    <span className="text-base font-black text-blue-700 dark:text-blue-300">
                      {preview.accountsCount} <span className="text-[10px] font-normal">TK</span>
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase block">
                      Quản Lý Hộ
                    </span>
                    <span className="text-base font-black text-amber-700 dark:text-amber-300">
                      {preview.qlhCount} <span className="text-[10px] font-normal">TK</span>
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] text-left leading-relaxed">
                  ⚠️ <strong>Cảnh báo:</strong> Thao tác xóa không thể hoàn tác. Toàn bộ {preview.total} tài khoản thuộc hệ thống <strong>{systemName}</strong>{bySupplier && supplierName ? ` (NCC: ${supplierName})` : ''} sẽ bị xóa vĩnh viễn khỏi MongoDB.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Đóng
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={!preview || preview.total === 0 || isDeleting}
            className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang xóa...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
