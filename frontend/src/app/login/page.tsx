'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/authContext';
import { KeyRound, User, Lock, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('superadmin');
  const [password, setPassword] = useState('admin123');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    const result = await login(username.trim(), password);
    if (!result.success) {
      setErrorMsg(result.error || 'Đăng nhập thất bại.');
      setIsSubmitting(false);
    }
  };

  const fillCredential = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-slate-950 to-slate-950 text-slate-100 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header Logo */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-black text-2xl mx-auto shadow-xl shadow-amber-500/20">
            W
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            ASM <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono">ASM v1.0</span>
          </h1>
          <p className="text-xs text-slate-400">
            Hệ thống Quản lý Dữ liệu Tài khoản & Khách hàng ASM
          </p>
        </div>

        {/* Card Form */}
        <div className="p-8 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 shadow-2xl shadow-slate-950 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span>Đăng nhập hệ thống</span>
            </h2>
            <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-slate-800 text-slate-400">JWT Authenticated</span>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Tên tài khoản (Username)</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Mật khẩu (Password)</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <span>Xác thực & Truy cập</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <p className="text-[11px] font-bold text-slate-400">Tài khoản demo sẵn có:</p>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => fillCredential('superadmin', 'admin123')}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-left transition"
              >
                <span className="font-bold text-amber-400 block">SuperAdmin</span>
                <span className="text-[10px] text-slate-500">superadmin</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredential('manager_a', 'admin123')}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-left transition"
              >
                <span className="font-bold text-indigo-400 block">Manager</span>
                <span className="text-[10px] text-slate-500">manager_a</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredential('operator1', 'admin123')}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-left transition"
              >
                <span className="font-bold text-emerald-400 block">Operator</span>
                <span className="text-[10px] text-slate-500">operator1</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-500">
          ASM ASM Platform &copy; 2026. All rights reserved.
        </p>
      </div>
    </div>
  );
}
