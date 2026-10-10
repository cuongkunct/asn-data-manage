'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Sparkles } from 'lucide-react';

export interface SearchableOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  allowCustom?: boolean; // Cho phép nhập tự do / tùy chỉnh
  disabled?: boolean;
  className?: string;
  required?: boolean;
  emptyText?: string;
  showDropdownSearch?: boolean; // Hiển thị ô tìm kiếm riêng trong dropdown
  maxVisibleOptions?: number; // Giới hạn số lượng hiển thị (mặc định 80 kết quả) để DOM siêu nhẹ
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Chọn hoặc tìm kiếm...',
  searchPlaceholder = 'Tìm trong danh sách...',
  allowCustom = false,
  disabled = false,
  className = '',
  emptyText = 'Không tìm thấy kết quả phù hợp',
  showDropdownSearch = true,
  maxVisibleOptions = 80,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mainInputRef = useRef<HTMLInputElement>(null);

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // When dropdown opens, focus search input inside dropdown (if present and not custom mode, or focus dropdown search)
  useEffect(() => {
    if (isOpen) {
      setDropdownSearch('');
      if (!allowCustom && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    } else {
      setDropdownSearch('');
    }
  }, [isOpen, allowCustom]);

  // Find currently selected option object if matches (case-insensitive)
  const selectedOption = useMemo(() => {
    if (!value) return undefined;
    const v = value.trim().toLowerCase();
    return options.find(opt => (opt.value || '').trim().toLowerCase() === v || (opt.label || '').trim().toLowerCase() === v);
  }, [options, value]);

  // Filter options based on dropdown search term
  const filteredOptions = useMemo(() => {
    const term = dropdownSearch.trim().toLowerCase();
    if (!term) return options;
    return options.filter(opt =>
      opt.label.toLowerCase().includes(term) ||
      opt.value.toLowerCase().includes(term) ||
      (opt.subLabel && opt.subLabel.toLowerCase().includes(term)) ||
      (opt.badge && opt.badge.toLowerCase().includes(term))
    );
  }, [options, dropdownSearch]);

  // Giới hạn 50 - 100 kết quả (mặc định 80) để DOM siêu nhẹ, cuộn mượt mà 60 FPS
  const visibleOptions = useMemo(() => {
    if (filteredOptions.length <= maxVisibleOptions) {
      return filteredOptions;
    }

    const sliced = filteredOptions.slice(0, maxVisibleOptions);
    // Nếu option đang chọn nằm ngoài top N, đảm bảo đưa vào danh sách để luôn thấy checkmark
    const v = (value || '').trim().toLowerCase();
    if (value && !sliced.some(o => (o.value || '').trim().toLowerCase() === v || (o.label || '').trim().toLowerCase() === v)) {
      const selected = filteredOptions.find(o => (o.value || '').trim().toLowerCase() === v || (o.label || '').trim().toLowerCase() === v);
      if (selected) {
        sliced.unshift(selected);
      }
    }
    return sliced;
  }, [filteredOptions, maxVisibleOptions, value]);

  const handleSelectOption = (opt: SearchableOption) => {
    onChange(opt.value);
    setIsOpen(false);
    setDropdownSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setDropdownSearch('');
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {allowCustom ? (
        // ── MODE 1: Combobox (Nhập tùy chỉnh trực tiếp + Có nút mở dropdown chọn & tìm kiếm) ──
        <div className="relative flex items-center">
          <input
            ref={mainInputRef}
            type="text"
            value={value}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(e) => {
              onChange(e.target.value);
            }}
            onFocus={() => {
              // Only open if not open
              if (!isOpen) setIsOpen(true);
            }}
            className="w-full p-2.5 pr-16 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 transition"
          />
          <div className="absolute right-2 flex items-center gap-1 text-slate-400">
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:text-slate-600 dark:hover:text-slate-200 transition"
                title="Xóa"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={() => setIsOpen(!isOpen)}
              className="p-1 hover:text-amber-500 transition"
              title="Danh sách gợi ý"
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-500' : ''}`} />
            </button>
          </div>
        </div>
      ) : (
        // ── MODE 2: Standard Searchable Select Trigger Button ──
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border text-left font-medium flex items-center justify-between transition focus:outline-none focus:ring-2 focus:ring-amber-500 ${
            isOpen 
              ? 'border-amber-500 ring-2 ring-amber-500/20' 
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className="flex items-center gap-2 overflow-hidden truncate">
            {selectedOption ? (
              <div className="flex items-center gap-2 truncate">
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedOption.label}
                </span>
                {selectedOption.badge && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    {selectedOption.badge}
                  </span>
                )}
                {selectedOption.subLabel && (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                    ({selectedOption.subLabel})
                  </span>
                )}
              </div>
            ) : value ? (
              <span className="font-bold text-slate-900 dark:text-white truncate">
                {value}
              </span>
            ) : (
              <span className="text-slate-400 font-normal truncate">
                {placeholder}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2 text-slate-400">
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="p-0.5 hover:text-slate-600 dark:hover:text-slate-200 transition"
                title="Xóa lựa chọn"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-500' : ''}`} />
          </div>
        </button>
      )}

      {/* ── DROPDOWN POPOVER PANEL ── */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-fadeIn">
          {/* Ô tìm kiếm trong dropdown (áp dụng cho cả 2 mode khi showDropdownSearch=true) */}
          {showDropdownSearch && (
            <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={dropdownSearch}
                  onChange={(e) => setDropdownSearch(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                {dropdownSearch && (
                  <button
                    type="button"
                    onClick={() => setDropdownSearch('')}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Nếu là combobox và người dùng đã nhập một giá trị tùy biến khác với các option có sẵn */}
          {allowCustom && value && !options.some(o => o.value === value || o.label === value) && (
            <div className="p-2 border-b border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/20 text-xs flex items-center justify-between text-amber-700 dark:text-amber-300">
              <div className="flex items-center gap-1.5 truncate">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate">Giá trị tùy chỉnh hiện tại: <strong className="font-bold">{value}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-[10px] font-bold transition shrink-0 ml-2"
              >
                Giữ nguyên
              </button>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-1 divide-y divide-slate-100/50 dark:divide-slate-800/50">
            {filteredOptions.length === 0 ? (
              <div className="py-6 px-4 text-center text-xs text-slate-400">
                <p className="font-medium">{emptyText}</p>
                {allowCustom && dropdownSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(dropdownSearch);
                      setIsOpen(false);
                    }}
                    className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 text-white font-bold text-[11px] hover:bg-amber-600 transition shadow-sm"
                  >
                    Sử dụng &quot;{dropdownSearch}&quot;
                  </button>
                )}
              </div>
            ) : (
              <>
                {visibleOptions.map((opt) => {
                  const targetV = (value || '').trim().toLowerCase();
                  const isSelected = (opt.value || '').trim().toLowerCase() === targetV || (opt.label || '').trim().toLowerCase() === targetV;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelectOption(opt)}
                      className={`w-full px-3 py-2 text-left rounded-xl text-xs flex items-center justify-between gap-2 transition ${
                        isSelected
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                          : 'hover:bg-slate-100/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{opt.label}</span>
                          {opt.badge && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        {opt.subLabel && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                            {opt.subLabel}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      )}
                    </button>
                  );
                })}

                {/* Thông báo số lượng kết quả nếu vượt quá giới hạn */}
                {filteredOptions.length > maxVisibleOptions && (
                  <div className="p-2 text-center text-[10px] text-slate-400 dark:text-slate-500 bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1 font-medium">
                    <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>
                      Hiển thị {visibleOptions.length} / {filteredOptions.length.toLocaleString('vi-VN')} kết quả. Nhập từ khóa để tìm nhanh hơn.
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
