const STORAGE_KEY = 'vikings-feed-bookmarks';

export function getBookmarks(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleBookmark(id: number): number[] {
  const bookmarks = getBookmarks();
  const index = bookmarks.indexOf(id);
  if (index >= 0) {
    bookmarks.splice(index, 1);
  } else {
    bookmarks.unshift(id);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  return bookmarks;
}

export function isBookmarked(id: number): boolean {
  return getBookmarks().includes(id);
}
