'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SourcePreferences } from '@/lib/sourcePreferences';
import {
  getSourcePreferences,
  hideSource,
  unhideSource,
  togglePriority,
  toggleShowLess,
} from '@/lib/sourcePreferences';

interface SourceInfo {
  id: number;
  name: string;
  tier: string;
  logoUrl: string | null;
  articleCount: number;
}

interface SourceManagerProps {
  open: boolean;
  onClose: () => void;
  onPrefsChange: (prefs: SourcePreferences) => void;
}

const TIER_LABELS: Record<string, string> = {
  official: 'Official',
  beat: 'Beat Reporter',
  fan: 'Fan Site',
  social: 'Social',
};

const TIER_COLORS: Record<string, string> = {
  official: 'bg-purple-600 text-white',
  beat: 'bg-blue-600/80 text-blue-100',
  fan: 'bg-emerald-700/80 text-emerald-100',
  social: 'bg-amber-700/80 text-amber-100',
};

export default function SourceManager({ open, onClose, onPrefsChange }: SourceManagerProps) {
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [prefs, setPrefs] = useState<SourcePreferences>(getSourcePreferences());
  const [loading, setLoading] = useState(true);

  const refreshPrefs = useCallback(() => {
    const p = getSourcePreferences();
    setPrefs(p);
    onPrefsChange(p);
  }, [onPrefsChange]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/sources?detail=true')
      .then((res) => res.json())
      .then((data) => {
        setSources(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    refreshPrefs();
  }, [open, refreshPrefs]);

  function handleToggleHidden(sourceId: number) {
    if (prefs.hidden.includes(sourceId)) {
      unhideSource(sourceId);
    } else {
      hideSource(sourceId);
    }
    refreshPrefs();
  }

  function handleTogglePriority(sourceId: number) {
    togglePriority(sourceId);
    refreshPrefs();
  }

  function handleToggleShowLess(sourceId: number) {
    toggleShowLess(sourceId);
    refreshPrefs();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
      <div className="flex-1 flex flex-col bg-[#1a0933] max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-purple-900/50 flex-shrink-0">
          <h2 className="text-lg font-bold text-purple-300">Manage Sources</h2>
          <button
            onClick={onClose}
            className="text-purple-400 hover:text-white text-sm font-medium"
          >
            Done
          </button>
        </div>

        {/* Legend */}
        <div className="px-4 py-3 border-b border-purple-900/30 flex-shrink-0">
          <div className="flex flex-wrap gap-2">
            {Object.entries(TIER_LABELS).map(([tier, label]) => (
              <span key={tier} className={`text-[10px] px-2 py-0.5 rounded-full ${TIER_COLORS[tier]}`}>
                {label}
              </span>
            ))}
          </div>
          <p className="text-purple-500 text-xs mt-2">
            Star sources to boost them. Toggle visibility to hide sources from your feed.
          </p>
        </div>

        {/* Source list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-purple-400 text-sm">Loading sources...</div>
          ) : (
            <div className="divide-y divide-purple-900/30">
              {sources.map((source) => {
                const hidden = prefs.hidden.includes(source.id);
                const priority = prefs.priority.includes(source.id);
                const showLess = prefs.showLess.includes(source.id);

                return (
                  <div
                    key={source.id}
                    className={`flex items-center gap-3 px-4 py-3 ${hidden ? 'opacity-40' : ''}`}
                  >
                    {/* Source initial / logo */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-900/40 flex items-center justify-center overflow-hidden">
                      {source.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={source.logoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-purple-400 font-bold text-sm">{source.name.charAt(0)}</span>
                      )}
                    </div>

                    {/* Source info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">{source.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${TIER_COLORS[source.tier] || TIER_COLORS.fan}`}>
                          {TIER_LABELS[source.tier] || source.tier}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-purple-500">{source.articleCount} articles</span>
                        {showLess && <span className="text-[10px] text-amber-500">Showing less</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Show less toggle */}
                      <button
                        onClick={() => handleToggleShowLess(source.id)}
                        className={`p-1.5 rounded-full transition-colors ${
                          showLess ? 'bg-amber-800/50 text-amber-400' : 'bg-purple-900/30 text-purple-600 hover:text-purple-400'
                        }`}
                        aria-label={showLess ? 'Show normal amount' : 'Show less'}
                        title={showLess ? 'Show normal amount' : 'Show less from this source'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                        </svg>
                      </button>

                      {/* Priority star */}
                      <button
                        onClick={() => handleTogglePriority(source.id)}
                        className={`p-1.5 rounded-full transition-colors ${
                          priority ? 'bg-yellow-800/50 text-yellow-400' : 'bg-purple-900/30 text-purple-600 hover:text-purple-400'
                        }`}
                        aria-label={priority ? 'Remove priority' : 'Mark as priority'}
                        title={priority ? 'Remove priority' : 'Priority — always show near top'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                        </svg>
                      </button>

                      {/* Visibility toggle */}
                      <button
                        onClick={() => handleToggleHidden(source.id)}
                        className={`p-1.5 rounded-full transition-colors ${
                          hidden ? 'bg-red-900/50 text-red-400' : 'bg-purple-900/30 text-purple-600 hover:text-purple-400'
                        }`}
                        aria-label={hidden ? 'Show source' : 'Hide source'}
                        title={hidden ? 'Show in feed' : 'Hide from feed'}
                      >
                        {hidden ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.092 1.092a4 4 0 0 0-5.558-5.558Z" clipRule="evenodd" />
                            <path d="M10.748 13.93l2.523 2.523A9.987 9.987 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 4.09 5.12l2.109 2.109a4 4 0 0 0 4.55 4.55l.707.708-.708-.557Z" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                            <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
