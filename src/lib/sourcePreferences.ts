const PREFS_KEY = 'vikings-feed-source-prefs';

export interface SourcePreferences {
  hidden: number[];       // source IDs fully hidden from feed
  showLess: number[];     // source IDs with reduced frequency
  priority: number[];     // source IDs boosted to top
  sortOrder: number[];    // source IDs in user-defined order
}

const DEFAULT_PREFS: SourcePreferences = {
  hidden: [],
  showLess: [],
  priority: [],
  sortOrder: [],
};

export function getSourcePreferences(): SourcePreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

function save(prefs: SourcePreferences) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function hideSource(sourceId: number): SourcePreferences {
  const prefs = getSourcePreferences();
  if (!prefs.hidden.includes(sourceId)) {
    prefs.hidden.push(sourceId);
  }
  // Remove from showLess if present
  prefs.showLess = prefs.showLess.filter((id) => id !== sourceId);
  save(prefs);
  return prefs;
}

export function unhideSource(sourceId: number): SourcePreferences {
  const prefs = getSourcePreferences();
  prefs.hidden = prefs.hidden.filter((id) => id !== sourceId);
  save(prefs);
  return prefs;
}

export function toggleShowLess(sourceId: number): SourcePreferences {
  const prefs = getSourcePreferences();
  const idx = prefs.showLess.indexOf(sourceId);
  if (idx >= 0) {
    prefs.showLess.splice(idx, 1);
  } else {
    prefs.showLess.push(sourceId);
  }
  save(prefs);
  return prefs;
}

export function togglePriority(sourceId: number): SourcePreferences {
  const prefs = getSourcePreferences();
  const idx = prefs.priority.indexOf(sourceId);
  if (idx >= 0) {
    prefs.priority.splice(idx, 1);
  } else {
    prefs.priority.push(sourceId);
  }
  save(prefs);
  return prefs;
}

export function setSortOrder(sourceIds: number[]): SourcePreferences {
  const prefs = getSourcePreferences();
  prefs.sortOrder = sourceIds;
  save(prefs);
  return prefs;
}

export function isHidden(sourceId: number): boolean {
  return getSourcePreferences().hidden.includes(sourceId);
}

export function isShowLess(sourceId: number): boolean {
  return getSourcePreferences().showLess.includes(sourceId);
}

export function isPriority(sourceId: number): boolean {
  return getSourcePreferences().priority.includes(sourceId);
}
