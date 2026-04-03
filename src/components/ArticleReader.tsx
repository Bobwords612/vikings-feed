'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Article } from './ArticleCard';

interface ArticleReaderProps {
  article: Article;
  onClose: () => void;
}

export default function ArticleReader({ article, onClose }: ArticleReaderProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeFailed, setIframeFailed] = useState(!article.source.allowsIframe);
  const [isClosing, setIsClosing] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  // Escape key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  // iframe timeout fallback — if iframe doesn't load in 4s, show fallback
  useEffect(() => {
    if (article.source.allowsIframe && !iframeLoaded) {
      timeoutRef.current = setTimeout(() => {
        if (!iframeLoaded) setIframeFailed(true);
      }, 4000);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [article.source.allowsIframe, iframeLoaded]);

  function handleIframeLoad() {
    setIframeLoaded(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }

  // Swipe right to close
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  }

  function handleTouchMove(e: React.TouchEvent) {
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchCurrentX.current - touchStartX.current;
    if (diff > 0 && overlayRef.current) {
      overlayRef.current.style.transform = `translateX(${Math.min(diff, 300)}px)`;
      overlayRef.current.style.opacity = `${1 - (diff / 400)}`;
    }
  }

  function handleTouchEnd() {
    const diff = touchCurrentX.current - touchStartX.current;
    if (diff > 120) {
      handleClose();
    } else if (overlayRef.current) {
      overlayRef.current.style.transform = '';
      overlayRef.current.style.opacity = '';
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/80 flex flex-col transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
    >
      <div
        ref={overlayRef}
        className={`flex flex-col flex-1 bg-[#1a0933] transition-transform duration-200 ${isClosing ? 'translate-y-full' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Reader header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1a0933] border-b border-purple-900/50 flex-shrink-0">
          <button
            onClick={handleClose}
            className="text-purple-300 hover:text-white text-sm font-medium"
          >
            ← Back to Feed
          </button>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-500 hover:text-purple-300 text-xs"
          >
            Open in new tab ↗
          </a>
        </div>

        {/* Loading progress bar */}
        {article.source.allowsIframe && !iframeLoaded && !iframeFailed && (
          <div className="h-0.5 bg-purple-900/30 overflow-hidden flex-shrink-0">
            <div className="h-full bg-purple-500 animate-[loading_1.5s_ease-in-out_infinite] w-1/3" />
          </div>
        )}

        {/* Content area */}
        {!iframeFailed ? (
          // iframe mode
          <div className="flex-1 relative">
            {!iframeLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#1a0933]">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-purple-400 text-sm">Loading article...</p>
                </div>
              </div>
            )}
            <iframe
              src={article.url}
              className="w-full h-full bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              referrerPolicy="no-referrer"
              onLoad={handleIframeLoad}
            />
          </div>
        ) : (
          // Fallback mode — site blocks iframes
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
              <div className="w-16 h-16 rounded-full bg-purple-900/50 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-purple-400">{article.source.name.charAt(0)}</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-2 leading-snug">{article.title}</h2>
              <p className="text-purple-400 text-sm mb-1">{article.source.name}</p>
              {article.description && (
                <p className="text-purple-300/60 text-sm mt-3 line-clamp-3">{article.description}</p>
              )}
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-8 px-8 py-3 rounded-full bg-purple-700 text-white font-medium hover:bg-purple-600 transition-colors"
              >
                Open Article ↗
              </a>
              <p className="text-purple-600 text-xs mt-4">
                This site doesn't allow in-app reading. You'll be taken to the source.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
