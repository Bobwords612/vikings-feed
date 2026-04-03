'use client';

import { formatDistanceToNow } from 'date-fns';

interface Source {
  id: number;
  name: string;
  url: string;
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
}

export default function ArticleCard({ article, onOpen, isBookmarked, onToggleBookmark }: ArticleCardProps) {
  const timeAgo = formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true });

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
          <div className="flex-1 min-w-0 pr-8">
            <h2 className="font-semibold text-white leading-snug line-clamp-2 text-sm sm:text-base">
              {article.title}
            </h2>
            {article.description && (
              <p className="text-xs sm:text-sm text-purple-300/70 mt-1 line-clamp-2">
                {article.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 text-xs text-purple-500">
              <span className="font-medium text-purple-400">{article.source.name}</span>
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

      {/* Bookmark button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleBookmark(article.id);
        }}
        className="absolute top-3 right-3 p-1.5 rounded-full bg-purple-900/50 hover:bg-purple-800/70 transition-colors z-10"
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
    </div>
  );
}
