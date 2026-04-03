'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ArticleCard from '@/components/ArticleCard';
import type { Article } from '@/components/ArticleCard';
import ArticleSkeleton from '@/components/ArticleSkeleton';
import ArticleReader from '@/components/ArticleReader';
import SourceManager from '@/components/SourceManager';
import { getBookmarks, toggleBookmark as toggleBM } from '@/lib/bookmarks';
import {
  getSourcePreferences,
  hideSource,
  toggleShowLess,
  togglePriority,
  type SourcePreferences,
} from '@/lib/sourcePreferences';

interface SourceTab {
  id: number;
  name: string;
  tier: string;
}

type FeedMode = 'top' | 'latest';

const CONTENT_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'breaking', label: 'Breaking' },
  { key: 'analysis', label: 'Analysis' },
  { key: 'rumors', label: 'Rumors' },
  { key: 'gameday', label: 'Game Day' },
] as const;
type ContentFilter = typeof CONTENT_FILTERS[number]['key'];

// Simple keyword-based content classification
function classifyArticle(article: Article): string {
  const text = `${article.title} ${article.description || ''}`.toLowerCase();
  if (/breaking|report|official|signing|trade|release|cut|waive|acquir/i.test(text)) return 'breaking';
  if (/analy|film|breakdown|tape|scheme|stat|grade|rank|evaluat|deep dive/i.test(text)) return 'analysis';
  if (/rumor|expect|likely|could|may|report|sources say|buzz|speculation|mock draft|predict/i.test(text)) return 'rumors';
  if (/game|score|recap|preview|matchup|play|win|loss|defeat|victory|touchdown|quarter/i.test(text)) return 'gameday';
  return 'all';
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

  // Feed mode
  const [feedMode, setFeedMode] = useState<FeedMode>('latest');

  // Content type filter
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all');

  // Reader
  const [readerArticle, setReaderArticle] = useState<Article | null>(null);

  // Feed fetching
  const [fetching, setFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState<string | null>(null);

  // Bookmarks
  const [bookmarkIds, setBookmarkIds] = useState<number[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);

  // Source preferences
  const [sourcePrefs, setSourcePrefs] = useState<SourcePreferences>(
    () => (typeof window !== 'undefined' ? getSourcePreferences() : { hidden: [], showLess: [], priority: [], sortOrder: [] })
  );
  const [showSourceManager, setShowSourceManager] = useState(false);

  // Undo toast
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  // Hidden articles (not interested)
  const [hiddenArticleIds, setHiddenArticleIds] = useState<Set<number>>(new Set());

  // Pull-to-refresh
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const mainRef = useRef<HTMLElement>(null);

  // Auto-refresh
  const [newArticlesBanner, setNewArticlesBanner] = useState(false);
  const latestArticleId = useRef<number | null>(null);

  const observerRef = useRef<HTMLDivElement>(null);

  function showToast(message: string, undo?: () => void) {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ message, undo });
    toastTimeout.current = setTimeout(() => setToast(null), 4000);
  }

  // Load bookmarks and prefs from localStorage on mount
  useEffect(() => {
    setBookmarkIds(getBookmarks());
    setSourcePrefs(getSourcePreferences());
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

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  // Infinite scroll
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
        await fetch('/api/cron/fetch-feeds', { method: 'POST' });
        const res = await fetch('/api/articles?limit=1');
        const data = await res.json();
        if (data.articles.length > 0 && latestArticleId.current && data.articles[0].id > latestArticleId.current) {
          setNewArticlesBanner(true);
        }
      } catch { /* silent */ }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  function handleSourceChange(sourceId: number | null) {
    setActiveSource(sourceId);
    setShowBookmarks(false);
    setArticles([]);
    setCursor(null);
    setHasMore(true);
    setLoading(true);
    fetchArticles(undefined, sourceId);
  }

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

  function handleLoadNewArticles() {
    setNewArticlesBanner(false);
    setArticles([]);
    setCursor(null);
    setLoading(true);
    fetchArticles(undefined, activeSource);
  }

  function handleToggleBookmark(id: number) {
    const updated = toggleBM(id);
    setBookmarkIds([...updated]);
  }

  // Three-dot menu handlers
  function handleNotInterested(articleId: number) {
    setHiddenArticleIds((prev) => new Set([...prev, articleId]));
    showToast('Article hidden', () => {
      setHiddenArticleIds((prev) => {
        const next = new Set(prev);
        next.delete(articleId);
        return next;
      });
    });
  }

  function handleShowLess(sourceId: number, sourceName: string) {
    const prefs = toggleShowLess(sourceId);
    setSourcePrefs({ ...prefs });
    const isNowShowLess = prefs.showLess.includes(sourceId);
    showToast(
      isNowShowLess ? `Showing less from ${sourceName}` : `Showing normal amount from ${sourceName}`,
      () => {
        const reverted = toggleShowLess(sourceId);
        setSourcePrefs({ ...reverted });
      }
    );
  }

  function handleHideSource(sourceId: number, sourceName: string) {
    const prefs = hideSource(sourceId);
    setSourcePrefs({ ...prefs });
    showToast(`${sourceName} hidden from feed`, () => {
      const { unhideSource } = require('@/lib/sourcePreferences');
      const reverted = unhideSource(sourceId);
      setSourcePrefs({ ...reverted });
    });
  }

  function handleMoreFrom(sourceId: number, sourceName: string) {
    const prefs = togglePriority(sourceId);
    setSourcePrefs({ ...prefs });
    const isNowPriority = prefs.priority.includes(sourceId);
    showToast(
      isNowPriority ? `${sourceName} boosted to top` : `${sourceName} priority removed`
    );
  }

  // Pull-to-refresh
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
      } catch { /* silent */ }
      finally { setIsRefreshing(false); }
    }
    setPullDistance(0);
    touchStartY.current = 0;
  }

  // Filter and sort articles for display
  function getDisplayedArticles(): Article[] {
    let result = articles;

    // Bookmarks mode
    if (showBookmarks) {
      return result.filter((a) => bookmarkIds.includes(a.id));
    }

    // Remove hidden articles
    result = result.filter((a) => !hiddenArticleIds.has(a.id));

    // Remove hidden sources
    result = result.filter((a) => !sourcePrefs.hidden.includes(a.source.id));

    // Content type filter
    if (contentFilter !== 'all') {
      result = result.filter((a) => classifyArticle(a) === contentFilter);
    }

    // "Show less" sources: only show every 3rd article
    if (sourcePrefs.showLess.length > 0) {
      const showLessCounters: Record<number, number> = {};
      result = result.filter((a) => {
        if (!sourcePrefs.showLess.includes(a.source.id)) return true;
        showLessCounters[a.source.id] = (showLessCounters[a.source.id] || 0) + 1;
        return showLessCounters[a.source.id] % 3 === 1; // show 1 in 3
      });
    }

    // Feed mode: "top" sorts by priority sources first, then recency
    if (feedMode === 'top') {
      result = [...result].sort((a, b) => {
        const aPriority = sourcePrefs.priority.includes(a.source.id) ? 1 : 0;
        const bPriority = sourcePrefs.priority.includes(b.source.id) ? 1 : 0;
        if (aPriority !== bPriority) return bPriority - aPriority;
        // Within same priority, sort by tier (official > beat > fan > social)
        const tierOrder: Record<string, number> = { official: 0, beat: 1, fan: 2, social: 3 };
        const aTier = tierOrder[a.source.tier] ?? 2;
        const bTier = tierOrder[b.source.tier] ?? 2;
        if (aTier !== bTier) return aTier - bTier;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });
    }

    return result;
  }

  const displayedArticles = getDisplayedArticles();
  const visibleSources = sources.filter((s) => !sourcePrefs.hidden.includes(s.id));

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
              onClick={() => setShowSourceManager(true)}
              className="text-xs px-3 py-1.5 rounded-full bg-purple-800/50 text-purple-300 hover:bg-purple-700/50 transition-colors"
              title="Manage Sources"
            >
              Sources
            </button>
            <button
              onClick={() => {
                setShowBookmarks(!showBookmarks);
                if (!showBookmarks) {
                  setActiveSource(null);
                  setContentFilter('all');
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

        {/* Feed mode toggle + Content type filters */}
        {!showBookmarks && (
          <div className="max-w-3xl mx-auto px-4 pb-2 space-y-2">
            {/* Feed mode tabs */}
            <div className="flex gap-1 bg-purple-900/30 rounded-lg p-0.5 w-fit">
              <button
                onClick={() => setFeedMode('top')}
                className={`text-xs px-3 py-1 rounded-md transition-colors ${
                  feedMode === 'top' ? 'bg-purple-600 text-white' : 'text-purple-400 hover:text-purple-300'
                }`}
              >
                Top Stories
              </button>
              <button
                onClick={() => setFeedMode('latest')}
                className={`text-xs px-3 py-1 rounded-md transition-colors ${
                  feedMode === 'latest' ? 'bg-purple-600 text-white' : 'text-purple-400 hover:text-purple-300'
                }`}
              >
                Latest
              </button>
            </div>

            {/* Content type + source filter chips */}
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 min-w-max">
                {/* Content type filters */}
                {CONTENT_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setContentFilter(f.key)}
                    className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                      contentFilter === f.key
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-900/40 text-purple-400 hover:bg-purple-800/40'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}

                {/* Divider */}
                {visibleSources.length > 0 && (
                  <div className="w-px bg-purple-800/50 mx-1 self-stretch" />
                )}

                {/* Source filters */}
                <button
                  onClick={() => handleSourceChange(null)}
                  className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                    activeSource === null && !showBookmarks
                      ? 'bg-purple-700/60 text-purple-200'
                      : 'bg-purple-900/40 text-purple-500 hover:bg-purple-800/40'
                  }`}
                >
                  All Sources
                </button>
                {visibleSources.map((source) => (
                  <button
                    key={source.id}
                    onClick={() => handleSourceChange(source.id)}
                    className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                      activeSource === source.id
                        ? 'bg-purple-700/60 text-purple-200'
                        : 'bg-purple-900/40 text-purple-500 hover:bg-purple-800/40'
                    }`}
                  >
                    {source.name}
                  </button>
                ))}
              </div>
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
            <div className="text-4xl mb-4">{showBookmarks ? '🔖' : contentFilter !== 'all' ? '🔍' : '📰'}</div>
            <p className="text-purple-300 text-lg font-medium">
              {showBookmarks ? 'No saved articles' : contentFilter !== 'all' ? `No ${contentFilter} articles` : 'No articles yet'}
            </p>
            <p className="text-purple-500 text-sm mt-1 mb-4">
              {showBookmarks
                ? 'Tap the bookmark icon on articles to save them'
                : contentFilter !== 'all'
                  ? 'Try a different filter or check back later'
                  : 'Fetch feeds to populate your stream'}
            </p>
            {!showBookmarks && contentFilter === 'all' && (
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
                onNotInterested={handleNotInterested}
                onShowLess={handleShowLess}
                onHideSource={handleHideSource}
                onMoreFrom={handleMoreFrom}
              />
            ))}

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

      {/* Undo Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#2a1548] border border-purple-800/60 rounded-xl px-4 py-3 shadow-xl shadow-black/40 flex items-center gap-3 animate-[fadeIn_0.2s_ease-out]">
          <span className="text-purple-200 text-sm">{toast.message}</span>
          {toast.undo && (
            <button
              onClick={() => {
                toast.undo!();
                setToast(null);
              }}
              className="text-purple-400 hover:text-white text-sm font-medium"
            >
              Undo
            </button>
          )}
        </div>
      )}

      {/* Article Reader Overlay */}
      {readerArticle && (
        <ArticleReader
          article={readerArticle}
          onClose={() => setReaderArticle(null)}
        />
      )}

      {/* Source Manager Modal */}
      <SourceManager
        open={showSourceManager}
        onClose={() => setShowSourceManager(false)}
        onPrefsChange={(prefs) => setSourcePrefs({ ...prefs })}
      />
    </div>
  );
}
