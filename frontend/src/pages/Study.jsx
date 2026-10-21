// src/pages/Study.jsx
import React, {
  useState, useEffect, useLayoutEffect, useRef, useCallback,
} from 'react';
import {
  BookOpen, Search, FileText, Presentation, HelpCircle, Book,
  Download, Bot, MessageSquare, X, Loader2, Send, Sparkles,
  Play, Clock, CheckCircle2, XCircle, Timer, Eye,
  List, LayoutGrid, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
} from 'lucide-react';
import HTMLFlipBook from 'react-pageflip';
import { pdfjs } from 'react-pdf';
import { useToast } from '../components/Toast';
import {
  useListMaterialsQuery, useListQuizzesQuery, useGetQuizQuery,
  useStartAttemptMutation, useSubmitAttemptMutation, useListMyAttemptsQuery,
} from '../features/studyApiSlice';
import {
  useSummarizeMaterialMutation, useChatWithMaterialMutation,
} from '../features/aiApiSlice';

// =========================================
// PDF.JS WORKER (CDN — no bundler config needed)
// =========================================
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// =========================================
// PDF → IMAGE LOADER
// =========================================
const PDF_RENDER_SCALE = 2.5;

const loadPdfImages = async (url, onProgress, isCancelled, onAspect) => {
  const loadingTask = pdfjs.getDocument({ url });
  const pdf = await loadingTask.promise;
  const total = pdf.numPages;
  const images = [];

  for (let i = 1; i <= total; i++) {
    if (isCancelled?.()) {
      pdf.destroy();
      return images;
    }
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
    if (i === 1) onAspect?.(viewport.width / viewport.height);
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    images.push(canvas.toDataURL('image/jpeg', 0.85));
    canvas.width = 0;
    canvas.height = 0;
    onProgress?.(i, total);
  }

  return images;
};

// =========================================
// SKELETON
// =========================================
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-zinc-800 ${className}`} />
);

// =========================================
// PDF BOOK VIEWER
// =========================================
const ZOOM_STEPS = [1, 1.5, 2, 3, 4];
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const PdfBookViewer = ({ isOpen, onClose, material }) => {
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showHint, setShowHint] = useState(false);
  const [pageAspect, setPageAspect] = useState(0.707);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const bookRef = useRef(null);
  const bodyRef = useRef(null);
  const panRef = useRef(null);
  const zoomRef = useRef(1);
  const prevZoomRef = useRef(1);
  const wasZoomedRef = useRef(false);
  const dragRef = useRef(null);
  const lastTapRef = useRef(0);

  zoomRef.current = zoom;

  const total = images.length;
  const ready = !isLoading && !error && total > 0;
  const zoomed = zoom > 1;
  const displayPage = Math.min(currentPage + 1, total);

  const spread = !isMobile && box.w >= 480;
  const maxPageW = spread ? box.w / 2 : box.w;
  const pageH = Math.floor(Math.min(box.h, maxPageW / pageAspect, 760));
  const pageW = Math.floor(pageH * pageAspect);
  const bookW = spread ? pageW * 2 : pageW;
  const canShowBook = ready && total > 1 && box.w > 0 && pageH > 50;

  useEffect(() => {
    if (!isOpen) return;
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [isOpen]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!isOpen || !el) return;
    const measure = () => {
      const cs = window.getComputedStyle(el);
      const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const h = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      setBox({ w: Math.max(0, Math.floor(w)), h: Math.max(0, Math.floor(h)) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setImages([]);
      setZoom(1);
      return;
    }
    if (!material?.fileUrl) return;
    let cancelled = false;

    setImages([]);
    setIsLoading(true);
    setError(null);
    setCurrentPage(0);
    setZoom(1);
    setProgress({ current: 0, total: 0 });

    loadPdfImages(
      material.fileUrl,
      (curr, tot) => { if (!cancelled) setProgress({ current: curr, total: tot }); },
      () => cancelled,
      (aspect) => { if (!cancelled && aspect > 0) setPageAspect(aspect); },
    )
      .then((imgs) => {
        if (cancelled) return;
        setImages(imgs);
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('PDF load failed:', err);
        setError(err?.message || 'Failed to load document');
        setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, material?.fileUrl]);

  const goPrev = useCallback(() => {
    if (zoomed) {
      setCurrentPage((p) => Math.max(0, p - 1));
    } else {
      bookRef.current?.pageFlip()?.flipPrev();
    }
  }, [zoomed]);

  const goNext = useCallback(() => {
    if (zoomed) {
      setCurrentPage((p) => Math.min(total - 1, p + 1));
    } else {
      bookRef.current?.pageFlip()?.flipNext();
    }
  }, [zoomed, total]);

  useEffect(() => {
    if (wasZoomedRef.current && !zoomed) {
      try {
        bookRef.current?.pageFlip()?.turnToPage(currentPage);
      } catch (e) { /* ignore */ }
    }
    wasZoomedRef.current = zoomed;
  }, [zoomed]);

  const zoomIn = useCallback(() => {
    const cur = zoomRef.current;
    setZoom(ZOOM_STEPS.find((s) => s > cur + 0.01) ?? MAX_ZOOM);
  }, []);

  const zoomOut = useCallback(() => {
    const cur = zoomRef.current;
    const smaller = [...ZOOM_STEPS].reverse().find((s) => s < cur - 0.01);
    setZoom(smaller ?? MIN_ZOOM);
  }, []);

  const resetZoom = useCallback(() => setZoom(1), []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (zoomRef.current > 1) setZoom(1);
        else onClose();
      } else if (!ready) {
        return;
      } else if (e.key === 'ArrowLeft') {
        goPrev();
      } else if (e.key === 'ArrowRight') {
        goNext();
      } else if (e.key === '+' || e.key === '=') {
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        zoomOut();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, ready, onClose, goPrev, goNext, zoomIn, zoomOut]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!isOpen || !ready || !el) return;

    let pinching = false;
    let startDist = 0;
    let startZoom = 1;

    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    const onStart = (e) => {
      if (e.touches.length >= 2) {
        if (!pinching) {
          pinching = true;
          startDist = dist(e.touches);
          startZoom = zoomRef.current;
        }
        e.stopPropagation();
      } else if (pinching) {
        e.stopPropagation();
      }
    };
    const onMove = (e) => {
      if (!pinching) return;
      e.stopPropagation();
      if (e.touches.length === 2) {
        e.preventDefault();
        const next = clamp((startZoom * dist(e.touches)) / startDist, MIN_ZOOM, MAX_ZOOM);
        setZoom(next < 1.05 ? 1 : next);
      }
    };
    const onEnd = (e) => {
      if (!pinching) return;
      e.stopPropagation();
      if (e.touches.length === 0) pinching = false;
    };
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const next = clamp(zoomRef.current * (e.deltaY < 0 ? 1.12 : 1 / 1.12), MIN_ZOOM, MAX_ZOOM);
      setZoom(next < 1.05 ? 1 : next);
    };

    const opts = { capture: true, passive: false };
    el.addEventListener('touchstart', onStart, opts);
    el.addEventListener('touchmove', onMove, opts);
    el.addEventListener('touchend', onEnd, opts);
    el.addEventListener('touchcancel', onEnd, opts);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onStart, opts);
      el.removeEventListener('touchmove', onMove, opts);
      el.removeEventListener('touchend', onEnd, opts);
      el.removeEventListener('touchcancel', onEnd, opts);
      el.removeEventListener('wheel', onWheel);
    };
  }, [isOpen, ready]);

  useLayoutEffect(() => {
    const el = panRef.current;
    const prev = prevZoomRef.current;
    prevZoomRef.current = zoom;
    if (!el || zoom <= 1) return;

    if (prev <= 1) {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
      el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
      return;
    }
    const r = zoom / prev;
    el.scrollLeft = (el.scrollLeft + el.clientWidth / 2) * r - el.clientWidth / 2;
    el.scrollTop = (el.scrollTop + el.clientHeight / 2) * r - el.clientHeight / 2;
  }, [zoom]);

  useEffect(() => {
    const el = panRef.current;
    if (el && zoomRef.current > 1) {
      el.scrollTop = 0;
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    }
  }, [currentPage]);

  useEffect(() => {
    if (!isOpen || !ready || !isMobile || total < 2) {
      setShowHint(false);
      return;
    }
    setShowHint(true);
    const t = setTimeout(() => setShowHint(false), 3500);
    return () => clearTimeout(t);
  }, [isOpen, ready, isMobile, total]);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      setZoom((z) => (z > 1 ? 1 : 2.5));
    } else {
      lastTapRef.current = now;
    }
  };

  const onPanMouseDown = (e) => {
    const el = panRef.current;
    if (!el) return;
    dragRef.current = { x: e.clientX, y: e.clientY, l: el.scrollLeft, t: el.scrollTop };
    el.style.cursor = 'grabbing';
    e.preventDefault();
  };
  const onPanMouseMove = (e) => {
    const d = dragRef.current;
    const el = panRef.current;
    if (!d || !el) return;
    el.scrollLeft = d.l - (e.clientX - d.x);
    el.scrollTop = d.t - (e.clientY - d.y);
  };
  const endPanDrag = () => {
    dragRef.current = null;
    if (panRef.current) panRef.current.style.cursor = 'grab';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-zinc-950/95 backdrop-blur-md animate-in fade-in duration-200">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-950/90 px-3 py-3 sm:px-4" style={{ paddingTop: 'max(env(safe-area-inset-top), 0.75rem)' }}>
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-yellow-500/10 text-yellow-500">
            <BookOpen className="h-4 w-4" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-[13px] font-semibold text-white">
              {material?.title}
            </h2>
            <p className="truncate text-[10px] text-zinc-500">
              {material?.course?.code || 'Document'}
              {total > 0 && <> · Page {displayPage} of {total}</>}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {ready && (
            <div className="flex items-center rounded-md bg-zinc-800 p-0.5">
              <button
                onClick={zoomOut}
                disabled={zoom <= MIN_ZOOM}
                aria-label="Zoom out"
                title="Zoom out"
                className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:text-zinc-400"
              >
                <ZoomOut className="h-3.5 w-3.5" strokeWidth={2.2} />
              </button>
              <button
                onClick={resetZoom}
                aria-label="Reset zoom"
                title="Reset zoom"
                className="min-w-[2.4rem] px-0.5 text-center font-mono text-[10px] font-semibold text-zinc-400 transition-colors hover:text-white"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={zoomIn}
                disabled={zoom >= MAX_ZOOM}
                aria-label="Zoom in"
                title="Zoom in"
                className="flex h-7 w-7 items-center justify-center rounded text-yellow-500 transition-colors hover:text-yellow-400 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:text-yellow-500"
              >
                <ZoomIn className="h-3.5 w-3.5" strokeWidth={2.2} />
              </button>
            </div>
          )}
          <a
            href={material?.fileUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-800 text-zinc-400 transition-colors hover:text-white"
            title="Download"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={2.2} />
          </a>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-800 text-zinc-400 transition-colors hover:text-white"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <div
        ref={bodyRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden px-2 py-2 md:px-6 md:py-4"
      >
        {isLoading && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-500" strokeWidth={2.2} />
            <p className="text-[11.5px] text-zinc-400">
              {progress.total > 0
                ? `Rendering page ${progress.current} of ${progress.total}…`
                : 'Opening document…'}
            </p>
            {progress.total > 0 && (
              <div className="h-1 w-48 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full bg-yellow-500 transition-all duration-200"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        {!isLoading && error && (
          <div className="max-w-sm rounded-xl border border-dashed border-zinc-800 bg-zinc-900 p-6 text-center">
            <XCircle className="mx-auto mb-2.5 h-8 w-8 text-red-500" strokeWidth={1.5} />
            <h3 className="text-[13px] font-semibold text-white">Couldn't render document</h3>
            <p className="mt-1 text-[11px] text-zinc-500">{error}</p>
            <a
              href={material?.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block rounded-md bg-yellow-500 px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400"
            >
              Open in new tab
            </a>
          </div>
        )}

        {ready && total === 1 && !zoomed && (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ touchAction: 'none' }}
            onClick={handleTap}
          >
            <img
              src={images[0]}
              alt="Page 1"
              draggable={false}
              className="max-h-full max-w-full select-none rounded-md border border-zinc-800 bg-zinc-100 object-contain shadow-2xl"
            />
          </div>
        )}

        {canShowBook && (
          <div
            className="flex items-center justify-center"
            style={{ width: bookW, height: pageH }}
          >
            <HTMLFlipBook
              key={`${pageW}x${pageH}-${spread ? 'spread' : 'single'}`}
              ref={bookRef}
              width={pageW}
              height={pageH}
              size="fixed"
              startPage={currentPage}
              usePortrait={true}
              showCover={true}
              mobileScrollSupport={true}
              useMouseEvents={true}
              clickEventForward={true}
              showPageCorners={true}
              swipeDistance={30}
              flippingTime={700}
              maxShadowOpacity={0.35}
              drawShadow={true}
              onFlip={(e) => setCurrentPage(e.data)}
              className="pdf-flipbook"
              style={{}}
            >
              {images.map((src, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center overflow-hidden bg-zinc-100"
                >
                  <img
                    src={src}
                    alt={`Page ${i + 1}`}
                    className="h-full w-full select-none object-contain"
                    draggable={false}
                  />
                </div>
              ))}
            </HTMLFlipBook>
          </div>
        )}

        {ready && zoomed && (
          <div
            ref={panRef}
            className="custom-scrollbar absolute inset-0 overflow-auto bg-zinc-950"
            style={{ touchAction: 'pan-x pan-y', cursor: 'grab' }}
            onMouseDown={onPanMouseDown}
            onMouseMove={onPanMouseMove}
            onMouseUp={endPanDrag}
            onMouseLeave={endPanDrag}
            onClick={handleTap}
          >
            <div style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}>
              <img
                src={images[currentPage]}
                alt={`Page ${currentPage + 1}`}
                className="h-full w-full select-none object-contain"
                draggable={false}
              />
            </div>
          </div>
        )}
      </div>

      {ready && total > 1 && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-950/90 px-4 py-2.5" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}>
          <button
            onClick={goPrev}
            disabled={zoomed && currentPage <= 0}
            className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
            Prev
          </button>

          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-mono font-semibold text-zinc-400">
              {displayPage}
            </span>
            <span className="text-[10.5px] text-zinc-600">/</span>
            <span className="text-[10.5px] font-mono text-zinc-500">{total}</span>
          </div>

          <button
            onClick={goNext}
            disabled={zoomed && currentPage >= total - 1}
            className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.4} />
          </button>
        </div>
      )}

      {showHint && !zoomed && currentPage === 0 && (
        <div className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-[10px] text-zinc-400 shadow-lg animate-in fade-in duration-500">
          Swipe or tap edges to turn pages · Pinch to zoom
        </div>
      )}
    </div>
  );
};

// =========================================
// AI SUMMARY MODAL
// =========================================
const SummaryModal = ({ isOpen, onClose, material, summary, isLoading }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="md:hidden absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-zinc-800 bg-zinc-900 animate-in slide-in-from-bottom duration-300">
        <div className="flex shrink-0 justify-center pb-1.5 pt-2.5">
          <div className="h-1 w-9 rounded-full bg-zinc-700" />
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-4 pb-3">
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-yellow-500" strokeWidth={2.2} />
            <div className="min-w-0">
              <h3 className="truncate text-[14px] font-semibold text-white">AI Summary</h3>
              <p className="truncate text-[10.5px] text-zinc-500">{material?.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-zinc-400">
            <X className="h-3.5 w-3.5" strokeWidth={2.2} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="mb-3 h-7 w-7 animate-spin text-yellow-500" />
              <p className="text-[11.5px] text-zinc-400">AI is reading and summarizing...</p>
            </div>
          ) : summary ? (
            <div className="space-y-4">
              <div>
                <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-yellow-500">Overview</h3>
                <p className="text-[12.5px] leading-relaxed text-zinc-300">{summary.summary}</p>
              </div>
              {summary.keyPoints?.length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-yellow-500">Key Points</h3>
                  <ul className="space-y-1.5">
                    {summary.keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12.5px] text-zinc-300">
                        <span className="mt-0.5 text-yellow-500">•</span> {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="py-6 text-center text-[12px] text-red-400">Failed to generate summary.</p>
          )}
        </div>
      </div>

      <div className="hidden md:flex absolute inset-0 items-center justify-center p-4" onClick={onClose}>
        <div className="flex max-h-[80vh] w-full max-w-xl flex-col rounded-2xl border border-zinc-800 bg-zinc-900 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-yellow-500/10 text-yellow-500">
                <Sparkles className="h-4 w-4" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-[14px] font-semibold text-white">AI Summary</h2>
                <p className="truncate text-[10.5px] text-zinc-500">{material?.title}</p>
              </div>
            </div>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800 text-zinc-400 hover:text-white">
              <X className="h-3.5 w-3.5" strokeWidth={2.2} />
            </button>
          </div>
          <div className="overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-yellow-500" />
                <p className="text-[12px] text-zinc-400">AI is reading and summarizing the document...</p>
              </div>
            ) : summary ? (
              <div className="space-y-5">
                <div>
                  <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-yellow-500">Overview</h3>
                  <p className="text-[12.5px] leading-relaxed text-zinc-300">{summary.summary}</p>
                </div>
                {summary.keyPoints?.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-yellow-500">Key Points</h3>
                    <ul className="space-y-2">
                      {summary.keyPoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12.5px] text-zinc-300">
                          <span className="mt-0.5 text-yellow-500">•</span> {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="py-6 text-center text-[12.5px] text-red-400">Failed to generate summary.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================
// AI CHAT MODAL
// =========================================
const ChatModal = ({ isOpen, onClose, material }) => {
  const [chatWithAI, { isLoading }] = useChatWithMaterialMutation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  // Lock body scroll to prevent the whole page from shifting when keyboard opens
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setMessages([{ role: 'assistant', content: `Hi! I've read "${material?.title}". Ask me anything about it.` }]);
      setInput('');
    }
  }, [isOpen, material]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await chatWithAI({ materialId: material.id, message: userMsg, history }).unwrap();
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (err) {
      setMessages(prev => [
        ...prev, 
        { role: 'assistant', content: err?.data?.message || "Sorry, I encountered an error. Please try again." }
      ]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-900 sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative z-10 flex h-[100dvh] w-full flex-col bg-zinc-900 sm:h-[80vh] sm:max-w-lg sm:rounded-2xl sm:border sm:border-zinc-800">
        
        {/* Drag handle (Mobile only) */}
        <div className="flex shrink-0 justify-center pb-1.5 pt-2.5 sm:hidden">
          <div className="h-1 w-9 rounded-full bg-zinc-700" />
        </div>

        {/* Header (Locked at the top) */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950/30 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-yellow-500/10 text-yellow-500">
              <Bot className="h-4 w-4" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[13px] font-semibold text-white">Study AI</h2>
              <p className="truncate text-[10px] text-zinc-500 max-w-[180px]">{material?.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800 text-zinc-400 hover:text-white">
            <X className="h-3.5 w-3.5" strokeWidth={2.2} />
          </button>
        </div>

        {/* Messages (Scrollable) */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] whitespace-pre-wrap leading-relaxed rounded-xl px-3.5 py-2 text-[12px] ${
                msg.role === 'user' ? 'bg-yellow-500 text-zinc-950 rounded-br-sm' : 'bg-zinc-800 text-zinc-200 rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-xl rounded-bl-sm bg-zinc-800 px-3.5 py-2.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-500" />
                <span className="text-[11px] text-zinc-400">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input form (Locked at the bottom) */}
        <form 
          onSubmit={handleSend} 
          className="shrink-0 border-t border-zinc-800 bg-zinc-950/30 p-2.5" 
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.625rem)' }}
        >
          <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 p-1 focus-within:border-yellow-500/50 transition-colors">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this document..."
              className="flex-1 bg-transparent px-2 py-1.5 text-[12px] text-white focus:outline-none placeholder:text-zinc-600"
            />
            <button type="submit" disabled={!input.trim() || isLoading} className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-yellow-500 text-zinc-950 disabled:opacity-50">
              <Send className="h-3.5 w-3.5" strokeWidth={2.2} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================
// FILE ICON HELPER
// =========================================
const getFileIcon = (type) => {
  switch (type) {
    case 'slide': return <Presentation className="h-4 w-4" strokeWidth={2} />;
    case 'past_question': return <HelpCircle className="h-4 w-4" strokeWidth={2} />;
    case 'textbook': return <Book className="h-4 w-4" strokeWidth={2} />;
    default: return <FileText className="h-4 w-4" strokeWidth={2} />;
  }
};

// =========================================
// MAIN STUDY COMPONENT
// =========================================
const Study = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('materials');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'

  const [activeQuizId, setActiveQuizId] = useState(null);
  const [deadline, setDeadline] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);

  const [search, setSearch] = useState('');
  const [summaryMaterial, setSummaryMaterial] = useState(null);
  const [chatMaterial, setChatMaterial] = useState(null);
  const [viewerMaterial, setViewerMaterial] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);

  const { data: materialsData, isLoading: isMaterialsLoading } = useListMaterialsQuery({ search }, { skip: activeQuizId });
  const { data: quizzesData, isLoading: isQuizzesLoading } = useListQuizzesQuery(undefined, { skip: activeQuizId });
  const { data: quizData, isLoading: isQuizLoading } = useGetQuizQuery(activeQuizId, { skip: !activeQuizId });
  const { data: attemptsData, isLoading: isAttemptsLoading } = useListMyAttemptsQuery(undefined, { skip: activeQuizId });

  const [summarize, { isLoading: isSummarizing }] = useSummarizeMaterialMutation();
  const [startAttempt, { isLoading: isStarting }] = useStartAttemptMutation();
  const [submitAttempt, { isLoading: isSubmitting }] = useSubmitAttemptMutation();

  const materials = materialsData?.materials || [];
  const quizzes = quizzesData?.quizzes || [];
  const attempts = attemptsData?.attempts || [];
  const activeQuiz = quizData?.quiz;

  useEffect(() => {
    if (!deadline) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(deadline).getTime() - now;
      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft("00:00");
        toast.error("Time is up! Auto-submitting...");
        handleSubmitQuiz(true);
      } else {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  const handleSummarize = async (material) => {
    setSummaryMaterial(material);
    setAiSummary(null);
    try {
      const res = await summarize({ materialId: material.id }).unwrap();
      setAiSummary(res.summary);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to generate summary");
      setSummaryMaterial(null);
    }
  };

  const handleStartQuiz = async (quizId) => {
    try {
      const res = await startAttempt(quizId).unwrap();
      toast.success(res.message === "Resuming your attempt" ? "Resuming quiz..." : "Quiz started!");
      setActiveQuizId(quizId);
      setDeadline(res.attempt.deadlineAt);
      const initialAnswers = {};
      res.attempt.answers?.forEach(a => { if (a.answer) initialAnswers[a.questionId] = a.answer; });
      setAnswers(initialAnswers);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to start quiz");
    }
  };

  const handleSubmitQuiz = async (isAuto = false) => {
    if (!isAuto && !window.confirm("Submit quiz? You cannot change answers after.")) return;
    try {
      const payloadAnswers = Object.entries(answers).map(([qId, val]) => ({ questionId: qId, answer: val }));
      await submitAttempt({ quizId: activeQuizId, answers: payloadAnswers }).unwrap();
      toast.success(isAuto ? "Quiz auto-submitted." : "Quiz submitted successfully!");
      setActiveQuizId(null);
      setDeadline(null);
      setAnswers({});
      setActiveTab('quizzes');
    } catch (err) {
      toast.error(err?.data?.message || "Failed to submit quiz.");
    }
  };

  /* =========================================
     ACTIVE QUIZ
     ========================================= */
  if (activeQuizId) {
    if (isQuizLoading) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-yellow-500" />
          <p className="text-[12px] text-zinc-400">Loading quiz...</p>
        </div>
      );
    }
    if (!activeQuiz) return null;

    return (
      <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-zinc-950 animate-in fade-in">
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-[14px] font-semibold text-white md:text-[15px]">{activeQuiz.title}</h1>
            <p className="mt-0.5 truncate text-[10.5px] text-zinc-400">
              {activeQuiz.course?.code} <span className="mx-1 text-zinc-600">•</span> {activeQuiz.questions.length} Qs <span className="mx-1 text-zinc-600">•</span> {activeQuiz.totalMarks} Marks
            </p>
          </div>
          {deadline && (
            <div className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[13px] font-bold ${
              timeLeft === '00:00' ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800 text-yellow-500'
            }`}>
              <Timer className="h-3.5 w-3.5" strokeWidth={2} /> {timeLeft}
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-3 custom-scrollbar md:p-6">
          <div className="mx-auto max-w-2xl space-y-3 pb-24">
            {activeQuiz.questions.map((q, index) => (
              <div key={q.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 md:p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="text-[13px] font-medium leading-snug text-white md:text-[13.5px]">
                    <span className="mr-1.5 font-bold text-yellow-500">{index + 1}.</span> {q.question}
                  </h3>
                  <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                    {q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}
                  </span>
                </div>
                {q.type === 'mcq' ? (
                  <div className="mt-2 space-y-1.5">
                    {q.options.map((opt, i) => (
                      <label key={i} className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 transition-all ${
                        answers[q.id] === opt
                          ? 'border-yellow-500/50 bg-yellow-500/10'
                          : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                      }`}>
                        <input
                          type="radio"
                          name={`q_${q.id}`}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                          className="h-3.5 w-3.5 border-zinc-700 bg-zinc-900 text-yellow-500 focus:ring-yellow-500 focus:ring-offset-zinc-900"
                        />
                        <span className={`text-[12px] ${answers[q.id] === opt ? 'font-medium text-white' : 'text-zinc-300'}`}>{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    rows="3"
                    placeholder="Type your answer here..."
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-[12px] text-white focus:border-yellow-500/50 focus:outline-none"
                  />
                )}
              </div>
            ))}
          </div>
        </main>

        <footer className="shrink-0 border-t border-zinc-800 bg-zinc-900 p-3">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <p className="hidden text-[11px] text-zinc-500 sm:block">
              Answered {Object.keys(answers).length} of {activeQuiz.questions.length}
            </p>
            <button
              onClick={() => handleSubmitQuiz(false)}
              disabled={isSubmitting || timeLeft === '00:00'}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-yellow-500 px-6 py-2 text-[12px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400 disabled:opacity-50 sm:w-auto"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          </div>
        </footer>
      </div>
    );
  }

  /* =========================================
     STUDY HUB
     ========================================= */
  return (
    <div className="-mx-4 min-h-screen bg-zinc-950 px-4 pb-8 pt-4 animate-in fade-in duration-500 md:mx-0 md:bg-transparent md:px-0 md:pt-0">
      <div className="mx-auto max-w-5xl space-y-4 md:space-y-5">

        {/* HEADER */}
        <div>
          <h1 className="flex items-center gap-2 text-xl font-serif tracking-tight text-white md:text-2xl">
            <BookOpen className="h-5 w-5 text-yellow-500 md:h-6 md:w-6" strokeWidth={2} />
            Study Hub
          </h1>
          <p className="mt-0.5 text-[11.5px] text-zinc-500">
            Access materials, study with AI, and take quizzes.
          </p>
        </div>

        {/* TABS */}
        <div className="flex w-full max-w-[260px] rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
          <button
            onClick={() => setActiveTab('materials')}
            className={`flex-1 rounded py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'materials' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Materials
          </button>
          <button
            onClick={() => setActiveTab('quizzes')}
            className={`flex-1 rounded py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'quizzes' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Quizzes
          </button>
        </div>

        {/* MATERIALS TAB */}
        {activeTab === 'materials' && (
          <div className="space-y-3">
            {/* TOOLBAR */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 py-1.5 pl-8 pr-3 text-[12px] text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30"
                />
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-0.5 rounded-md border border-zinc-800 bg-zinc-900 p-0.5">
                <button
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                  className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
                    viewMode === 'list'
                      ? 'bg-zinc-800 text-yellow-500'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <List className="h-3.5 w-3.5" strokeWidth={2.2} />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                  className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-zinc-800 text-yellow-500'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" strokeWidth={2.2} />
                </button>
              </div>
            </div>

            {/* CONTENT */}
            {isMaterialsLoading ? (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              )
            ) : materials.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
                <BookOpen className="mx-auto mb-2.5 h-8 w-8 text-zinc-700" strokeWidth={1.5} />
                <h3 className="text-[13px] font-medium text-white">No materials found</h3>
                <p className="mt-0.5 text-[11px] text-zinc-500">Check back later when your lecturers upload new materials.</p>
              </div>
            ) : viewMode === 'grid' ? (
              /* GRID VIEW */
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {materials.map((material) => (
                  <div key={material.id} className="group flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700">
                    <div className="flex-1 p-3.5">
                      <div className="mb-2.5 flex items-start justify-between gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 transition-colors group-hover:text-yellow-500">
                          {getFileIcon(material.type)}
                        </div>
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                          {material.type.replace('_', ' ')}
                        </span>
                      </div>
                      <h3 className="mb-1 line-clamp-2 text-[13px] font-semibold leading-snug text-white">
                        {material.title}
                      </h3>
                      <p className="line-clamp-2 text-[11px] text-zinc-400">
                        {material.description || 'No description.'}
                      </p>
                      <div className="mt-3">
                        <span className="rounded bg-yellow-500/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-yellow-500">
                          {material.course?.code || 'Course'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 border-t border-zinc-800 bg-zinc-950/50 p-2">
                      <button
                        onClick={() => setViewerMaterial(material)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-zinc-800 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-zinc-700"
                      >
                        <Eye className="h-3 w-3" strokeWidth={2.2} /> View
                      </button>
                      <button
                        onClick={() => handleSummarize(material)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-yellow-500 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400"
                      >
                        <Sparkles className="h-3 w-3" strokeWidth={2.2} /> Summary
                      </button>
                      <button
                        onClick={() => setChatMaterial(material)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-zinc-300 transition-colors hover:bg-zinc-700"
                      >
                        <MessageSquare className="h-3.5 w-3.5" strokeWidth={2.2} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* LIST VIEW */
              <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800/60">
                {materials.map((material) => (
                  <div key={material.id} className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-zinc-800/30">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-zinc-800 text-zinc-400 transition-colors group-hover:text-yellow-500">
                      {getFileIcon(material.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[12.5px] font-medium text-white">
                        {material.title}
                      </h3>
                      <p className="mt-0.5 truncate text-[10.5px] text-zinc-500">
                        <span className="font-mono text-yellow-500">{material.course?.code || 'Course'}</span>
                        {' '}·{' '}
                        <span className="capitalize">{material.type.replace('_', ' ')}</span>
                        {material.description && (
                          <>
                            {' '}·{' '}
                            <span className="text-zinc-600">{material.description}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => setViewerMaterial(material)}
                        className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
                        title="View"
                      >
                        <Eye className="h-3 w-3" strokeWidth={2.2} />
                        <span className="hidden sm:inline">View</span>
                      </button>
                      <button
                        onClick={() => handleSummarize(material)}
                        className="flex items-center gap-1 rounded-md bg-yellow-500 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400"
                        title="AI Summary"
                      >
                        <Sparkles className="h-3 w-3" strokeWidth={2.2} />
                        <span className="hidden sm:inline">Summary</span>
                      </button>
                      <button
                        onClick={() => setChatMaterial(material)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 text-zinc-300 transition-colors hover:border-zinc-700 hover:text-yellow-500"
                        title="Chat"
                      >
                        <MessageSquare className="h-3 w-3" strokeWidth={2.2} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* QUIZZES TAB */}
        {activeTab === 'quizzes' && (
          <div className="space-y-5">
            <div className="space-y-2.5">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Available Quizzes</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {isQuizzesLoading ? (
                  [1, 2, 3].map(i => <Skeleton key={i} className="h-44 w-full" />)
                ) : quizzes.length === 0 ? (
                  <div className="col-span-full rounded-xl border border-dashed border-zinc-800 p-6 text-center text-[11.5px] text-zinc-500">
                    No quizzes available right now.
                  </div>
                ) : (
                  quizzes.map((quiz) => (
                    <div key={quiz.id} className="flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700">
                      <div className="flex-1 p-3.5">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-300">
                            {quiz.course?.code}
                          </span>
                          <span className="text-[9.5px] font-bold uppercase tracking-wider text-yellow-500">
                            {quiz.totalMarks} Marks
                          </span>
                        </div>
                        <h3 className="mb-1 line-clamp-1 text-[13px] font-semibold text-white">
                          {quiz.title}
                        </h3>
                        <p className="line-clamp-2 text-[11px] text-zinc-400">
                          {quiz.description || 'No description.'}
                        </p>
                        <div className="mt-3 flex items-center gap-3 text-[10.5px] text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" strokeWidth={2} /> {quiz.durationMinutes ? `${quiz.durationMinutes}m` : 'No limit'}
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" strokeWidth={2} /> {quiz.questions.length} Qs
                          </span>
                        </div>
                      </div>
                      <div className="border-t border-zinc-800 bg-zinc-950/50 p-2.5">
                        <button
                          onClick={() => handleStartQuiz(quiz.id)}
                          disabled={isStarting}
                          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-zinc-100 py-2 text-[10.5px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-white disabled:opacity-50"
                        >
                          {isStarting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" strokeWidth={2.2} />}
                          Start Quiz
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2.5">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">My Attempts</h2>
              <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                {isAttemptsLoading ? (
                  <div className="space-y-2 p-3">
                    {[1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : attempts.length === 0 ? (
                  <div className="p-6 text-center text-[11.5px] text-zinc-500">
                    You haven't taken any quizzes yet.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/60">
                    {attempts.map((attempt) => {
                      const isGraded = attempt.status === 'graded';
                      return (
                        <div key={attempt.id} className="flex flex-col justify-between gap-2 p-3 sm:flex-row sm:items-center">
                          <div className="min-w-0">
                            <h3 className="truncate text-[12px] font-medium text-white">
                              {attempt.quiz?.title || 'Unknown Quiz'}
                            </h3>
                            <p className="mt-0.5 truncate text-[10px] text-zinc-500">
                              {attempt.quiz?.course?.code} <span className="mx-0.5">•</span> {new Date(attempt.submittedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            {isGraded ? (
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <p className="text-[12px] font-bold text-white">{attempt.score} / {attempt.totalMarks}</p>
                                  <p className="text-[9px] uppercase tracking-wider text-zinc-500">Score</p>
                                </div>
                                <div className={`flex h-7 w-7 items-center justify-center rounded-full ${
                                  (attempt.score / attempt.totalMarks) >= 0.5
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-red-500/10 text-red-500'
                                }`}>
                                  {(attempt.score / attempt.totalMarks) >= 0.5
                                    ? <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                                    : <XCircle className="h-3.5 w-3.5" strokeWidth={2.2} />}
                                </div>
                              </div>
                            ) : attempt.status === 'submitted' ? (
                              <div className="flex items-center gap-1.5 rounded bg-yellow-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-yellow-500">
                                <Clock className="h-3 w-3" strokeWidth={2.2} /> Pending
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 rounded bg-zinc-800 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.2} /> In Progress
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODALS */}
      <PdfBookViewer
        isOpen={!!viewerMaterial}
        onClose={() => setViewerMaterial(null)}
        material={viewerMaterial}
      />
      <SummaryModal
        isOpen={!!summaryMaterial}
        onClose={() => setSummaryMaterial(null)}
        material={summaryMaterial}
        summary={aiSummary}
        isLoading={isSummarizing}
      />
      <ChatModal
        isOpen={!!chatMaterial}
        onClose={() => setChatMaterial(null)}
        material={chatMaterial}
      />
    </div>
  );
};

export default Study;