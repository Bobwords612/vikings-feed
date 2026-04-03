export default function ArticleSkeleton() {
  return (
    <div className="bg-purple-950/30 border border-purple-900/40 rounded-xl overflow-hidden animate-pulse">
      <div className="flex gap-4 p-4">
        {/* Thumbnail skeleton */}
        <div className="flex-shrink-0 w-24 h-18 sm:w-28 sm:h-20 rounded-lg bg-purple-900/40" />

        {/* Content skeleton */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="h-4 bg-purple-900/40 rounded w-full" />
          <div className="h-4 bg-purple-900/40 rounded w-3/4" />
          <div className="h-3 bg-purple-900/40 rounded w-1/2 mt-2" />
          <div className="flex gap-2 mt-2">
            <div className="h-3 bg-purple-900/40 rounded w-24" />
            <div className="h-3 bg-purple-900/40 rounded w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}
