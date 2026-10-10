'use client';

import React, { useState } from 'react';
import { Copy, RefreshCw, Check, KeyRound, X } from 'lucide-react';
import { useI18n } from '../context/i18nContext';

interface PasswordGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPassword?: (pwd: string) => void;
}

export function PasswordGeneratorModal({ isOpen, onClose, onSelectPassword }: PasswordGeneratorModalProps) {
  const { t } = useI18n();
  const [length, setLength] = useState<number>(12);
  const [uppercase, setUppercase] = useState<boolean>(true);
  const [lowercase, setLowercase] = useState<boolean>(true);
  const [numbers, setNumbers] = useState<boolean>(true);
  const [specialChars, setSpecialChars] = useState<boolean>(true);
  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/accounts/generate-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ length, uppercase, lowercase, numbers, specialChars })
      });
      const data = await res.json();
      setGeneratedPassword(data.password);
      setCopied(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedPassword) return;
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (generatedPassword && onSelectPassword) {
      onSelectPassword(generatedPassword);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-500">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('common.passwordGenerator')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tùy chỉnh các tham số độ dài và ký tự cho mật khẩu an toàn
            </p>
          </div>
        </div>

        {/* Display Field */}
        <div className="mb-5 relative">
          <div className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 pr-24 text-sm tracking-wider text-slate-900 dark:text-brand-300 font-semibold min-h-[46px] flex items-center break-all select-all">
            {generatedPassword || <span className="text-slate-400 font-normal text-xs">Nhấn "Tạo mật khẩu" để bắt đầu...</span>}
          </div>
          <div className="absolute right-2 top-2 flex items-center gap-1">
            <button
              onClick={handleCopy}
              disabled={!generatedPassword}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-40 transition flex items-center gap-1 text-xs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleGenerate}
              className="p-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Config Options */}
        <div className="space-y-4 mb-6 text-sm">
          <div>
            <div className="flex justify-between items-center mb-1 text-slate-700 dark:text-slate-300 font-medium">
              <span>Độ dài mật khẩu (Length):</span>
              <span className="font-bold text-brand-600 dark:text-brand-400">{length}</span>
            </div>
            <input 
              type="range" 
              min={8} 
              max={32} 
              value={length} 
              onChange={(e) => setLength(Number(e.target.value))}
              className="w-full accent-brand-600 cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input 
                type="checkbox" 
                checked={uppercase} 
                onChange={(e) => setUppercase(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 accent-brand-600" 
              />
              <span>Chữ hoa (A-Z)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input 
                type="checkbox" 
                checked={lowercase} 
                onChange={(e) => setLowercase(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 accent-brand-600" 
              />
              <span>Chữ thường (a-z)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input 
                type="checkbox" 
                checked={numbers} 
                onChange={(e) => setNumbers(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 accent-brand-600" 
              />
              <span>Chữ số (0-9)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input 
                type="checkbox" 
                checked={specialChars} 
                onChange={(e) => setSpecialChars(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 accent-brand-600" 
              />
              <span>Ký tự đặc biệt (!@#$)</span>
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Tạo mật khẩu
          </button>
          {onSelectPassword && (
            <button
              onClick={handleApply}
              disabled={!generatedPassword}
              className="flex-1 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium shadow-lg shadow-brand-500/25 transition text-sm"
            >
              Áp dụng mật khẩu
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
