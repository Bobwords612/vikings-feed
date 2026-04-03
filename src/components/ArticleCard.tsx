'use client';

import { formatDistanceToNow } from 'date-fns';
import OverflowMenu from './OverflowMenu';

interface Source {
  id: number;
  name: string;
  url: string;
  tier: string;
  logoUrl: string | null;
  allowsIframe: boolean;
}

export interface Article {
  id: number;
  title: string;
  description: string | null;
  url: string;
  imageUrl: string | null;
  author: string | null;
  publishedAt: string;
  source: Source;
}

interface ArticleCardProps {
  article: Article;
  onOpen: (article: Article) => void;
  isBookmarked: boolean;
  onToggleBookmark: (id: number) => void;
  onNotInterested: (articleId: number) => void;
  onShowLess: (sourceId: number, sourceName: string) => void;
  onHideSource: (sourceId: number, sourceName: string) => void;
  onMoreFrom: (sourceId: number, sourceName: string) => void;
}

const TIER_BADGE: Record<string, { label: string; cls: string }> = {
  official: { label: 'Official', cls: 'bg-purple-600/60 text-purple-200' },
  beat: { label: 'Beat', cls: 'bg-blue-600/50 text-blue-200' },
  fan: { label: 'Fan', cls: 'bg-emerald-700/50 text-emerald-200' },
  social: { label: 'Social', cls: 'bg-amber-700/50 text-amber-200' },
};

export default function ArticleCard({
  article, onOpen, isBookmarked, onToggleBookmark,
  onNotInterested, onShowLess, onHideSource, onMoreFrom,
}: ArticleCardProps) {
  const timeAgo = formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true });
  const badge = TIER_BADGE[article.source.tier] || TIER_BADGE.fan;

  const menuItems = [
    {
      label: 'Not interested',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      ),
      onClick: () => onNotInterested(article.id),
    },
    {
      label: `Show less from ${article.source.name}`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M4 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clipRule="evenodd" />
        </svg>
      ),
      onClick: () => onShowLess(article.source.id, article.source.name),
    },
    {
      label: `More from ${article.source.name}`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
      ),
      onClick: () => onMoreFrom(article.source.id, article.source.name),
    },
    {
      label: `Hide ${article.source.name}`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.092 1.092a4 4 0 0 0-5.558-5.558Z" clipRule="evenodd" />
          <path d="M10.748 13.93l2.523 2.523A9.987 9.987 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 4.09 5.12l2.109 2.109a4 4 0 0 0 4.55 4.55l.707.708-.708-.557Z" />
        </svg>
      ),
      destructive: true,
      onClick: () => onHideSource(article.source.id, article.source.name),
    },
  ];

  return (
    <div className="relative group">
      <button
        onClick={() => onOpen(article)}
        className="w-full text-left bg-purple-950/30 border border-purple-900/40 rounded-xl overflow-hidden hover:bg-purple-950/50 hover:border-purple-700/50 transition-all active:scale-[0.99]"
      >
        <div className="flex gap-4 p-4">
          {/* Thumbnail */}
          <div className="flex-shrink-0 w-24 h-18 sm:w-28 sm:h-20 rounded-lg overflow-hidden bg-purple-900/30">
            {article.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={article.imageUrl}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  const el = e.target as HTMLImageElement;
                  el.style.display = 'none';
                  el.parentElement!.classList.add('flex', 'items-center', 'justify-center');
                  const span = document.createElement('span');
                  span.className = 'text-purple-600 font-bold text-lg';
                  span.textContent = article.source.name.charAt(0);
                  el.parentElement!.appendChild(span);
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-purple-800/30">
                <span className="text-purple-400 font-bold text-lg">{article.source.name.charAt(0)}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pr-14">
            <h2 className="font-semibold text-white leading-snug line-clamp-2 text-sm sm:text-base">
              {article.title}
            </h2>
            {article.description && (
              <p className="text-xs sm:text-sm text-purple-300/70 mt-1 line-clamp-2">
                {article.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 text-xs text-purple-500 flex-wrap">
              <span className="font-medium text-purple-400">{article.source.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
              <span>·</span>
              <span>{timeAgo}</span>
              {article.author && (
                <>
                  <span className="hidden sm:inline">·</span>
                  <span className="hidden sm:inline">{article.author}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </button>

      {/* Top-right action buttons */}
      <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark(article.id);
          }}
          className="p-1.5 rounded-full bg-purple-900/50 hover:bg-purple-800/70 transition-colors"
          aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={isBookmarked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={2}
            className={`w-4 h-4 ${isBookmarked ? 'text-purple-300' : 'text-purple-500'}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
          </svg>
        </button>
        <OverflowMenu items={menuItems} />
      </div>
    </div>
  );
}
