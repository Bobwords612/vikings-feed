'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ArticleCard from '@/components/ArticleCard';
import type { Article } from '@/components/ArticleCard';
import ArticleSkeleton from '@/components/ArticleSkeleton';
import ArticleReader from '@/components/ArticleReader';
import { getBookmarks, toggleBookmark as toggleBM } from '@/lib/bookmarks';

interface SourceTab {
  id: number;
  name: string;
}

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Source filtering
  const [sources, setSources] = useState<SourceTab[]>([]);
  const [activeSource, setActiveSource] = useState<number | null>(null);

  // Reader
  const [readerArticle, setReaderArticle] = useState<Article | null>(null);

  // Feed fetching
  const [fetching, setFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState<string | null>(null);

  // Bookmarks
  const [bookmarkIds, setBookmarkIds] = useState<number[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);

  // Pull-to-refresh
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const mainRef = useRef<HTMLElement>(null);

  // Auto-refresh
  const [newArticlesBanner, setNewArticlesBanner] = useState(false);
  const latestArticleId = useRef<number | null>(null);

  const observerRef = useRef<HTMLDivElement>(null);

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    setBookmarkIds(getBookmarks());
  }, []);

  // Fetch sources for filter tabs
  useEffect(() => {
    fetch('/api/sources')
      .then((res) => res.json())
      .then(setSources)
      .catch(() => {});
  }, []);

  const fetchArticles = useCallback(async (cursorId?: number, sourceId?: number | null) => {
    try {
      if (cursorId) setLoadingMore(true);
      setError(null);

      const params = new URLSearchParams({ limit: '30' });
      if (cursorId) params.set('cursor', String(cursorId));
      if (sourceId) params.set('source', String(sourceId));

      const res = await fetch(`/api/articles?${params}`);
      if (!res.ok) throw new Error('Failed to load articles');
      const data = await res.json();

      setArticles((prev) => cursorId ? [...prev, ...data.articles] : data.articles);
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);

      // Track latest article for auto-refresh
      if (!cursorId && data.articles.length > 0) {
        latestArticleId.current = data.articles[0].id;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  // Infinite scroll with loadingMore guard
  useEffect(() => {
    if (!observerRef.current || !hasMore || showBookmarks) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && cursor && !loadingMore) {
          fetchArticles(cursor, activeSource);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [cursor, hasMore, loadingMore, activeSource, showBookmarks, fetchArticles]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Fetch new feeds server-side
        await fetch('/api/cron/fetch-feeds', { method: 'POST' });
        // Check for new articles
        const res = await fetch('/api/articles?limit=1');
        const data = await res.json();
        if (data.articles.length > 0 && latestArticleId.current && data.articles[0].id > latestArticleId.current) {
          setNewArticlesBanner(true);
        }
      } catch {
        // Silent fail for background refresh
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Source filter change
  function handleSourceChange(sourceId: number | null) {
    setActiveSource(sourceId);
    setShowBookmarks(false);
    setArticles([]);
    setCursor(null);
    setHasMore(true);
    setLoading(true);
    fetchArticles(undefined, sourceId);
  }

  // Fetch feeds manually
  async function handleFetchFeeds() {
    setFetching(true);
    setFetchResult(null);
    try {
      const res = await fetch('/api/cron/fetch-feeds', { method: 'POST' });
      const data = await res.json();
      setFetchResult(`Fetched ${data.newArticles} new articles`);
      await fetchArticles(undefined, activeSource);
    } catch {
      setFetchResult('Failed to fetch feeds');
    } finally {
      setFetching(false);
      setTimeout(() => setFetchResult(null), 3000);
    }
  }

  // Load new articles from banner
  function handleLoadNewArticles() {
    setNewArticlesBanner(false);
    setArticles([]);
    setCursor(null);
    setLoading(true);
    fetchArticles(undefined, activeSource);
  }

  // Bookmark toggle
  function handleToggleBookmark(id: number) {
    const updated = toggleBM(id);
    setBookmarkIds([...updated]);
  }

  // Pull-to-refresh handlers
  function handleTouchStart(e: React.TouchEvent) {
    if (mainRef.current && mainRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchStartY.current) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0 && mainRef.current && mainRef.current.scrollTop === 0) {
      setPullDistance(Math.min(diff * 0.5, 80));
    }
  }

  async function handleTouchEnd() {
    if (pullDistance > 60) {
      setIsRefreshing(true);
      try {
        await fetch('/api/cron/fetch-feeds', { method: 'POST' });
        await fetchArticles(undefined, activeSource);
      } catch {
        // silent
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
    touchStartY.current = 0;
  }

  // Determine displayed articles
  const displayedArticles = showBookmarks
    ? articles.filter((a) => bookmarkIds.includes(a.id))
    : articles;

  return (
    <div className="min-h-screen bg-[#1a0933] text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#1a0933]/95 backdrop-blur border-b border-purple-900/50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚔️</span>
            <h1 className="text-xl font-bold text-purple-300">Vikings Feed</h1>
          </div>
          <div className="flex items-center gap-2">
            {fetchResult && (
              <span className="text-xs text-purple-400 hidden sm:inline">{fetchResult}</span>
            )}
            <button
              onClick={() => {
                setShowBookmarks(!showBookmarks);
                if (!showBookmarks) {
                  // When entering bookmarks mode, reload all articles to filter from
                  setActiveSource(null);
                  setArticles([]);
                  setLoading(true);
                  fetchArticles();
                }
              }}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                showBookmarks
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-800/50 text-purple-300 hover:bg-purple-700/50'
              }`}
            >
              Saved
            </button>
            <button
              onClick={handleFetchFeeds}
              disabled={fetching}
              className="text-xs px-3 py-1.5 rounded-full bg-purple-800/50 text-purple-300 hover:bg-purple-700/50 disabled:opacity-50 transition-colors"
            >
              {fetching ? '...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Source filter tabs */}
        {!showBookmarks && sources.length > 0 && (
          <div className="max-w-3xl mx-auto px-4 pb-2 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max">
              <button
                onClick={() => handleSourceChange(null)}
                className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                  activeSource === null
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-900/40 text-purple-400 hover:bg-purple-800/40'
                }`}
              >
                All Sources
              </button>
              {sources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => handleSourceChange(source.id)}
                  className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                    activeSource === source.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-900/40 text-purple-400 hover:bg-purple-800/40'
                  }`}
                >
                  {source.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* New articles banner */}
      {newArticlesBanner && (
        <button
          onClick={handleLoadNewArticles}
          className="sticky top-[52px] z-30 w-full py-2 bg-purple-700 text-white text-sm font-medium text-center hover:bg-purple-600 transition-colors"
        >
          New articles available — tap to load
        </button>
      )}

      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="flex items-center justify-center overflow-hidden transition-all"
          style={{ height: isRefreshing ? 48 : pullDistance }}
        >
          <div className={`w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full ${isRefreshing ? 'animate-spin' : ''}`}
            style={!isRefreshing ? { transform: `rotate(${pullDistance * 3}deg)` } : undefined}
          />
        </div>
      )}

      {/* Article Feed */}
      <main
        ref={mainRef}
        className="flex-1 max-w-3xl mx-auto w-full px-4 py-6"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Error banner */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-900/30 border border-red-800/40 flex items-center justify-between">
            <span className="text-red-300 text-sm">{error}</span>
            <button
              onClick={() => fetchArticles(undefined, activeSource)}
              className="text-xs px-3 py-1 rounded-full bg-red-800/50 text-red-200 hover:bg-red-700/50"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <ArticleSkeleton key={i} />
            ))}
          </div>
        ) : displayedArticles.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">{showBookmarks ? '🔖' : '📰'}</div>
            <p className="text-purple-300 text-lg font-medium">
              {showBookmarks ? 'No saved articles' : 'No articles yet'}
            </p>
            <p className="text-purple-500 text-sm mt-1 mb-4">
              {showBookmarks
                ? 'Tap the bookmark icon on articles to save them'
                : 'Fetch feeds to populate your stream'}
            </p>
            {!showBookmarks && (
              <button
                onClick={handleFetchFeeds}
                disabled={fetching}
                className="px-6 py-2 rounded-full bg-purple-700 text-white hover:bg-purple-600 disabled:opacity-50 transition-colors"
              >
                {fetching ? 'Fetching...' : 'Fetch Feeds Now'}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayedArticles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onOpen={setReaderArticle}
                isBookmarked={bookmarkIds.includes(article.id)}
                onToggleBookmark={handleToggleBookmark}
              />
            ))}

            {/* Infinite scroll sentinel */}
            {!showBookmarks && (
              <div ref={observerRef} className="py-8 text-center">
                {hasMore ? (
                  <div className="text-purple-500 text-sm">
                    {loadingMore ? 'Loading more...' : ''}
                  </div>
                ) : (
                  <div className="text-purple-700 text-sm">You're all caught up</div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Article Reader Overlay */}
      {readerArticle && (
        <ArticleReader
          article={readerArticle}
          onClose={() => setReaderArticle(null)}
        />
      )}
    </div>
  );
}
