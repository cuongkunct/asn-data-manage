'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Server, Shield, FileText,
  Search, History, Settings, Moon, Sun, Monitor,
  Radio, KeyRound, Bell, Download, RefreshCw, Filter,
  ChevronDown, LogOut, UserCheck, Layers, X
} from 'lucide-react';
import { useI18n } from '../context/i18nContext';
import { useTheme } from '../context/themeContext';
import { useSocket } from '../context/socketContext';
import { useAuth } from '../context/authContext';

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { user, logout } = useAuth();

  const navGroups = [
    {
      title: 'DASHBOARD',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/overview', label: 'Tổng Quan', icon: Layers },
      ]
    },
    {
      title: 'QUẢN LÝ DỮ LIỆU',
      items: [
        { href: '/quan-ly-ho', label: 'Quản Lý Hộ', icon: UserCheck },
        { href: '/accounts', label: 'Danh Sách Tài Khoản', icon: KeyRound },
        { href: '/system-accounts', label: 'Hệ Thống Tài Khoản', icon: Server },
      ]
    },
    {
      title: 'QUẢN LÝ KHÁCH HÀNG',
      items: [
        { href: '/customers', label: 'Danh Sách Khách Hàng', icon: Users },
        { href: '/notes', label: 'Ghi Chú Khách Hàng', icon: FileText },
      ]
    },
    {
      title: 'LỊCH SỬ',
      items: [
        { href: '/history', label: 'Lịch sử thao tác', icon: History },
      ]
    },
    {
      title: 'HỆ THỐNG',
      items: [
        { href: '/users', label: 'Quản lý người dùng', icon: Users },
        { href: '/settings', label: 'Cấu hình chung', icon: Settings },
        { href: 'http://localhost:3001/swagger', label: 'Tài liệu Swagger API', icon: Shield, external: true },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-sidebar-bg dark:bg-[#080d1c] text-slate-300 flex flex-col h-screen sticky top-0 shrink-0 select-none z-30 border-r border-sidebar-border shadow-xl">
      {/* Brand Logo */}
      <div className="p-5 border-b border-sidebar-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-amber-500/20">
          A
        </div>
        <div>
          <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1">
            ASM <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">ASM</span>
          </h1>
        </div>
      </div>

      {/* Nav List with Group Headers */}
      <div className="flex-1 py-4 px-3 space-y-5 overflow-y-auto">
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <h3 className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-400 tracking-wider uppercase">
              {group.title}
            </h3>
            <div className="space-y-0.5 pt-1">
              {group.items.map((item: any) => {
                const Icon = item.icon;
                if (item.external) {
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-amber-400 hover:bg-sidebar-hover transition-all group"
                      title="Mở tài liệu Swagger API (Authorize Bearer Token)"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span>{item.label}</span>
                      </div>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-black border border-emerald-500/30">
                        DOCS
                      </span>
                    </a>
                  );
                }
                const href = item.href.split('?')[0];
                const isActive = pathname === href || (pathname === '/' && href === '/dashboard');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${isActive
                        ? 'bg-sidebar-active text-amber-400 shadow-md shadow-slate-900/50 font-bold border-l-2 border-amber-400'
                        : 'text-slate-300 hover:bg-sidebar-hover hover:text-white'
                      }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer User Profile */}
      <div className="p-4 border-t border-sidebar-border bg-sidebar-hover/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shadow-sm">
            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="text-left text-xs truncate max-w-[120px]">
            <p className="font-bold text-white leading-tight truncate">{user?.fullName || 'User'}</p>
            <p className="text-[10px] text-amber-400 font-semibold truncate">{user?.role || 'OPERATOR'}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
          title="Đăng xuất"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, t } = useI18n();
  const { theme, setTheme } = useTheme();
  const { isConnected } = useSocket();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dynamic Title according to active module
  const getPageTitle = (path: string) => {
    if (path === '/' || path === '/dashboard') return 'Dashboard Thống Kê';
    if (path.startsWith('/overview')) return 'Tổng Quan Tra Cứu';
    if (path.startsWith('/quan-ly-ho')) return 'Quản Lý Hộ';
    if (path.startsWith('/accounts')) return 'Danh Sách Tài Khoản';
    if (path.startsWith('/system-accounts')) return 'Hệ Thống Tài Khoản';
    if (path.startsWith('/customers')) return 'Danh Sách Khách Hàng';
    if (path.startsWith('/notes')) return 'Ghi Chú Khách Hàng';
    if (path.startsWith('/history')) return 'Lịch Sử Thao Tác';
    if (path.startsWith('/users')) return 'Quản Lý Người Dùng';
    if (path.startsWith('/settings')) return 'Cấu Hình Chung';
    return 'Hệ Thống Quản Lý Dữ Liệu';
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      router.push(`/overview?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/overview');
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <header className="bg-white dark:bg-[#0b0f19]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-3 sticky top-0 z-20 shadow-sm transition-colors">
      {/* Top Main Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Module Title Indicator */}
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-5 bg-amber-500 rounded-full shadow-sm shadow-amber-500/50"></span>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
            {getPageTitle(pathname)}
          </h2>
        </div>

        {/* ASM Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Form Tra Cứu (Chuyển hướng đến Tổng quan khi tìm kiếm) */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tra cứu Mã KH, Mã TK, HTTK..."
                className="pl-8.5 pr-8 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs w-48 sm:w-60 md:w-72 focus:outline-none focus:ring-1.5 focus:ring-amber-500 transition shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Nút Tra cứu (thay thế nút Lọc dữ liệu) */}
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold transition flex items-center gap-1.5 shadow-sm shadow-amber-500/25 shrink-0 cursor-pointer"
              title="Tra cứu dữ liệu tại Tổng Quan"
            >
              <Search className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Tra cứu</span>
            </button>
          </form>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition active:scale-95 cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
          </button>

          {/* Divider */}
          <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1"></div>

          {/* WS Realtime indicator */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
            isConnected
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 text-rose-500'
          }`}>
            <Radio className={`w-3 h-3 ${isConnected ? 'text-emerald-500 animate-pulse' : 'text-rose-500'}`} />
            <span>{isConnected ? 'WS Live' : 'WS Offline'}</span>
          </div>

          {/* Utilities: Lang & Theme */}
          <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2">
            <button
              onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
              className="px-2 py-1 rounded text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
              title="Chuyển ngôn ngữ"
            >
              {lang === 'vi' ? '🇻🇳 VI' : '🇺🇸 EN'}
            </button>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 rounded text-slate-500 hover:text-amber-500 transition"
              title="Chuyển chế độ sáng/tối"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>

          {/* User Profile Avatar */}
          <div
            className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs ml-1 shadow select-none cursor-pointer"
            title={`${user?.fullName || 'User'} (${user?.role || 'OPERATOR'})`}
          >
            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
