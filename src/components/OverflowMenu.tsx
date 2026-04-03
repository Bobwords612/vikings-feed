'use client';

import { useState, useRef, useEffect } from 'react';

interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  onClick: () => void;
}

interface OverflowMenuProps {
  items: MenuItem[];
}

export default function OverflowMenu({ items }: OverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="p-1.5 rounded-full bg-purple-900/50 hover:bg-purple-800/70 transition-colors"
        aria-label="More options"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-purple-400">
          <path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM11.5 15.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 rounded-xl bg-[#2a1548] border border-purple-800/60 shadow-xl shadow-black/40 z-50 overflow-hidden animate-[fadeIn_0.15s_ease-out]">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                item.onClick();
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                item.destructive
                  ? 'text-red-400 hover:bg-red-900/30'
                  : 'text-purple-200 hover:bg-purple-800/40'
              }`}
            >
              {item.icon && <span className="flex-shrink-0 w-4 h-4">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
