'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Source {
  id: number;
  name: string;
  url: string;
  logoUrl: string | null;
}

interface Article {
  id: number;
  title: string;
  description: string | null;
  url: string;
  imageUrl: string | null;
  author: string | null;
  publishedAt: string;
  source: Source;
}

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [readerUrl, setReaderUrl] = useState<string | null>(null);
  const observerRef = useRef<HTMLDivElement>(null);

  const fetchArticles = useCallback(async (cursorId?: number) => {
    const params = new URLSearchParams({ limit: '30' });
    if (cursorId) params.set('cursor', String(cursorId));

    const res = await fetch(`/api/articles?${params}`);
    const data = await res.json();

    setArticles((prev) => cursorId ? [...prev, ...data.articles] : data.articles);
    setCursor(data.nextCursor);
    setHasMore(!!data.nextCursor);
    setLoading(false);
  }, []);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  // Infinite scroll
  useEffect(() => {
    if (!observerRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && cursor) fetchArticles(cursor); },
      { threshold: 0.1 }
    );
    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [cursor, hasMore, fetchArticles]);

  function timeAgo(date: string): string {
    const now = Date.now();
    const then = new Date(date).getTime();
    const mins = Math.floor((now - then) / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return (
    <div className="min-h-screen bg-[#1a0933] text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#1a0933]/95 backdrop-blur border-b border-purple-900/50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚔️</span>
            <h1 className="text-xl font-bold text-purple-300">Vikings Feed</h1>
          </div>
          <span className="text-xs text-purple-500">SKOL</span>
        </div>
      </header>

      {/* Article Feed */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-20 text-purple-400">Loading articles...</div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">📰</div>
            <p className="text-purple-300 text-lg font-medium">No articles yet</p>
            <p className="text-purple-500 text-sm mt-1">Run the feed fetcher to populate</p>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <button
                key={article.id}
                onClick={() => setReaderUrl(article.url)}
                className="w-full text-left bg-purple-950/30 border border-purple-900/40 rounded-xl overflow-hidden hover:bg-purple-950/50 hover:border-purple-700/50 transition-all"
              >
                <div className="flex gap-4 p-4">
                  {/* Thumbnail */}
                  {article.imageUrl && (
                    <div className="flex-shrink-0 w-28 h-20 rounded-lg overflow-hidden bg-purple-900/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={article.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-white leading-snug line-clamp-2">
                      {article.title}
                    </h2>
                    {article.description && (
                      <p className="text-sm text-purple-300/70 mt-1 line-clamp-2">
                        {article.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-purple-500">
                      <span className="font-medium text-purple-400">{article.source.name}</span>
                      <span>·</span>
                      <span>{timeAgo(article.publishedAt)}</span>
                      {article.author && (
                        <>
                          <span>·</span>
                          <span>{article.author}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {/* Infinite scroll sentinel */}
            <div ref={observerRef} className="py-8 text-center">
              {hasMore ? (
                <div className="text-purple-500 text-sm">Loading more...</div>
              ) : (
                <div className="text-purple-700 text-sm">You're all caught up ⚔️</div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Reader Overlay — embedded article view */}
      {readerUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
          {/* Reader header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#1a0933] border-b border-purple-900/50">
            <button
              onClick={() => setReaderUrl(null)}
              className="text-purple-300 hover:text-white text-sm font-medium"
            >
              ← Back to Feed
            </button>
            <a
              href={readerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-500 hover:text-purple-300 text-xs"
            >
              Open in new tab ↗
            </a>
          </div>

          {/* Embedded article */}
          <iframe
            src={readerUrl}
            className="flex-1 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
}
