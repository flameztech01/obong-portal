// src/pages/Anonymous.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Link2, Copy, RefreshCw, Ghost, UserCheck, Trash2,
  Loader2, Check, AlertTriangle, ExternalLink,
  MessageSquare, Share2, Download, Image as ImageIcon,
  X,
} from 'lucide-react';
import { toCanvas } from 'html-to-image';
import { useToast } from '../components/Toast';
import {
  useGetMyLinkQuery,
  useRegenerateMyLinkMutation,
  useGetMyPostsQuery,
  useDeleteMyPostMutation,
} from '../features/postApiSlice';

/* =========================================
   CONSTANTS
   ========================================= */
const BRAND = 'OU SOCIAL';
const WHATSAPP_GROUP_URL = '';

/* =========================================
   HELPERS
   ========================================= */
const formatRelative = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatPostDateTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/* =========================================
   SKELETON
   ========================================= */
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-zinc-800 ${className}`} />
);

/* =========================================
   SENDER BADGE
   ========================================= */
const SenderBadge = ({ type }) => {
  if (type === 'user') {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-yellow-500/25 bg-yellow-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-500">
        <UserCheck className="h-2.5 w-2.5" strokeWidth={2.4} />
        Signed in
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded border border-zinc-700/60 bg-zinc-800/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
      <Ghost className="h-2.5 w-2.5" strokeWidth={2.4} />
      Guest
    </span>
  );
};

/* =========================================
   EXPORT CARD
   ========================================= */
const ExportPostCard = ({ post }) => {
  const images = post.images || [];
  const initial = 'A';

  return (
    <div
      style={{
        width: 380,
        background: '#ffffff',
        borderRadius: 20,
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
      }}
    >
      <div
        style={{
          padding: '16px 18px',
          borderBottom: '1px solid #f0f0f2',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #d4911f, #f4a825)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {initial}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111114', lineHeight: 1.2 }}>
            Anonymous User
          </p>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: '#8a8a8f', lineHeight: 1.2 }}>
            {formatPostDateTime(post.createdAt)}
          </p>
        </div>
      </div>

      <div style={{ padding: '18px' }}>
        {post.content && (
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.55,
              color: '#25252a',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {post.content}
          </p>
        )}

        {images.length === 1 && (
          <div style={{ marginTop: post.content ? 14 : 0, borderRadius: 14, overflow: 'hidden', background: '#f6f6f8' }}>
            <img
              src={images[0].url}
              alt="Post attachment"
              crossOrigin="anonymous"
              style={{ display: 'block', width: '100%', maxHeight: 320, objectFit: 'contain' }}
            />
          </div>
        )}

        {images.length === 2 && (
          <div style={{ marginTop: post.content ? 14 : 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {images.map((img, i) => (
              <div key={i} style={{ borderRadius: 12, overflow: 'hidden', background: '#f6f6f8', aspectRatio: '1 / 1' }}>
                <img
                  src={img.url}
                  alt={`Post attachment ${i + 1}`}
                  crossOrigin="anonymous"
                  style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          padding: '12px 18px',
          borderTop: '1px solid #f0f0f2',
          background: '#fafafb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img
            src="/logo.png"
            alt={BRAND}
            crossOrigin="anonymous"
            style={{ height: 22, width: 'auto', objectFit: 'contain' }}
          />
          <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.6, color: '#25252a' }}>
            {BRAND}
          </span>
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#d4911f' }}>
          Anonymous Post
        </span>
      </div>
    </div>
  );
};

/* =========================================
   SHARE MODAL
   ========================================= */
const ShareModal = ({ post, onClose }) => {
  const [status, setStatus] = useState('generating');
  const [file, setFile] = useState(null);
  const [canvas, setCanvas] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [copyState, setCopyState] = useState('idle');
  const [shareState, setShareState] = useState('idle');

  const clipboardSupported =
    typeof navigator !== 'undefined' &&
    !!navigator.clipboard &&
    typeof window !== 'undefined' &&
    'ClipboardItem' in window;

  const nativeShareSupported =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function';

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';

    const generate = async () => {
      const node = document.getElementById(`post-export-${post.id}`);
      if (!node) {
        if (!cancelled) setStatus('error');
        return;
      }
      try {
        await new Promise((r) => setTimeout(r, 30));
        const c = await toCanvas(node, { cacheBust: true, pixelRatio: 2, backgroundColor: '#ffffff' });
        const jpegBlob = await new Promise((resolve, reject) => {
          c.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas produced no image data'))), 'image/jpeg', 0.92);
        });
        if (cancelled) return;

        const generatedFile = new File([jpegBlob], `ou-social-anonymous-${post.id}.jpg`, { type: 'image/jpeg' });
        objectUrl = URL.createObjectURL(jpegBlob);
        setFile(generatedFile);
        setCanvas(c);
        setPreviewUrl(objectUrl);
        setStatus('ready');
      } catch (err) {
        console.error('Error generating share image:', err);
        if (!cancelled) setStatus('error');
      }
    };

    generate();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [post.id]);

  const handleNativeShare = async () => {
    if (!file) return;
    try {
      const payload = { files: [file], title: `${BRAND} · Anonymous Post` };
      if (!navigator.canShare(payload)) {
        handleDownloadImage();
        return;
      }
      await navigator.share(payload);
      setShareState('shared');
      setTimeout(() => setShareState('idle'), 2500);
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error('Native share failed:', err);
        setShareState('error');
      }
    }
  };

  const handleCopyImage = async () => {
    if (!canvas) return;
    if (!clipboardSupported) {
      setCopyState('unsupported');
      return;
    }
    try {
      const pngBlob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas produced no image data'))), 'image/png');
      });
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': pngBlob })]);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2500);
    } catch (err) {
      console.error('Copy to clipboard failed:', err);
      setCopyState('error');
    }
  };

  const handleDownloadImage = () => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.download = file.name;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-zinc-800 bg-zinc-900 animate-in slide-in-from-bottom duration-300 md:inset-0 md:m-auto md:h-fit md:max-h-[80vh] md:max-w-md md:rounded-2xl md:border">
        <div className="flex shrink-0 flex-col border-b border-zinc-800">
          <div className="flex justify-center pb-1.5 pt-2.5 md:hidden">
            <div className="h-1 w-9 rounded-full bg-zinc-700" />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-yellow-500" strokeWidth={2} />
              <h3 className="text-[14px] font-semibold text-white">Share this post</h3>
            </div>
            <button onClick={onClose} aria-label="Close" className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800 text-zinc-400 transition-transform active:scale-95">
              <X className="h-3.5 w-3.5" strokeWidth={2.2} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {status === 'generating' && (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="mb-2 h-7 w-7 animate-spin text-yellow-500" />
              <p className="text-[12px] text-zinc-500">Preparing your share image…</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <AlertTriangle className="mb-2 h-8 w-8 text-red-500" strokeWidth={1.8} />
              <p className="text-[13px] font-semibold text-white">Couldn't generate the image</p>
              <p className="mt-1 text-[11px] text-zinc-500">Close this and try again in a moment.</p>
            </div>
          )}

          {status === 'ready' && (
            <>
              {previewUrl && (
                <div className="mb-4 overflow-hidden rounded-xl border border-zinc-800 bg-white">
                  <img src={previewUrl} alt="Post preview" className="block h-auto max-h-64 w-full object-contain" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <button onClick={handleCopyImage} className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 py-3.5 text-center transition-colors hover:border-zinc-700 active:scale-[0.99]">
                  {copyState === 'copied' ? <Check className="h-5 w-5 text-emerald-400" strokeWidth={2.4} /> : <Copy className="h-5 w-5 text-yellow-500" strokeWidth={2.2} />}
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                    {copyState === 'copied' ? 'Copied!' : 'Copy image'}
                  </span>
                </button>

                <button onClick={handleDownloadImage} className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 py-3.5 text-center transition-colors hover:border-zinc-700 active:scale-[0.99]">
                  <Download className="h-5 w-5 text-yellow-500" strokeWidth={2.2} />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white">Download</span>
                </button>
              </div>

              {nativeShareSupported && (
                <button onClick={handleNativeShare} className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-md bg-yellow-500 py-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400 active:scale-[0.99]">
                  {shareState === 'shared' ? <><Check className="h-3.5 w-3.5" strokeWidth={2.6} /> Shared</> : <><Share2 className="h-3.5 w-3.5" strokeWidth={2.2} /> Share to…</>}
                </button>
              )}

              {WHATSAPP_GROUP_URL && (
                <a href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer" className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-md bg-[#25D366] py-2.5 text-[11px] font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90">
                  <MessageSquare className="h-3.5 w-3.5" strokeWidth={2.4} /> Open WhatsApp group
                </a>
              )}

              {copyState === 'copied' && <p className="mt-2 text-center text-[10.5px] text-emerald-400">Image copied — paste it anywhere.</p>}
              {copyState === 'unsupported' && <p className="mt-2 text-center text-[10.5px] text-zinc-500">Copying images isn't supported here — use Download instead.</p>}
              {copyState === 'error' && <p className="mt-2 text-center text-[10.5px] text-red-400">Couldn't copy the image — try Download instead.</p>}
              {shareState === 'error' && <p className="mt-2 text-center text-[10.5px] text-red-400">Sharing failed — try Copy or Download.</p>}

              <p className="mt-3 text-center text-[10px] leading-relaxed text-zinc-600">
                The receiver's name and the sender's identity are never shown in the shared image.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
};

/* =========================================
   MAIN PAGE
   ========================================= */
const Anonymous = () => {
  const toast = useToast();

  const [tab, setTab] = useState('active');
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);

  const { data: link, isLoading: isLinkLoading, isError: isLinkError } = useGetMyLinkQuery();
  const [regenerate, { isLoading: isRegenerating }] = useRegenerateMyLinkMutation();

  const { data: postsData, isLoading: isPostsLoading } = useGetMyPostsQuery(
    { status: tab, limit: 50 },
    { skip: !link }
  );
  const [deletePost] = useDeleteMyPostMutation();

  const posts = postsData?.posts || [];
  const shareablePosts = posts.filter((p) => !p.isDeleted);

  /* ---- actions ---- */
  const handleCopy = async () => {
    if (!link?.url) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy — copy manually');
    }
  };

  const handleRegenerate = async () => {
    if (!window.confirm("Regenerate your link? The old link will stop working immediately — anyone who has it won't be able to send new messages. Existing messages are kept.")) return;

    try {
      await regenerate().unwrap();
      toast.success('New link generated');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to regenerate link');
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this message?')) return;
    setDeletingId(postId);
    try {
      await deletePost(postId).unwrap();
      toast.success('Message deleted');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  /* ---- loading / error ---- */
  if (isLinkLoading) {
    return (
      <div className="-mx-4 min-h-screen bg-zinc-950 px-4 pb-8 pt-4 md:mx-0 md:bg-transparent md:px-0 md:pt-0">
        <div className="mx-auto max-w-5xl space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (isLinkError) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-zinc-900 text-red-400">
          <AlertTriangle className="h-7 w-7" strokeWidth={1.8} />
        </div>
        <h2 className="mb-1 text-lg font-serif text-white">Couldn't load your link</h2>
        <p className="text-[12px] text-zinc-500">Try refreshing the page in a moment.</p>
      </div>
    );
  }

  return (
    <div className="-mx-4 min-h-screen bg-zinc-950 px-4 pb-8 pt-4 animate-in fade-in duration-500 md:mx-0 md:bg-transparent md:px-0 md:pt-0">
      <div className="mx-auto max-w-5xl space-y-4 md:space-y-5">
        
        {/* HEADER */}
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-serif tracking-tight text-white md:text-2xl">
            <Ghost className="h-5 w-5 text-yellow-500 md:h-6 md:w-6" strokeWidth={2} />
            Anonymous
          </h1>
          <p className="mt-0.5 text-[11.5px] text-zinc-500">
            Share a link and receive anonymous messages and photos.
          </p>
        </div>

        {/* =========================================
            CONSOLIDATED SLIM CARD (Link + Stats + Tabs)
            ========================================= */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 md:p-4 flex flex-col gap-2.5">
          
          {/* Link Row */}
          <div className="flex items-center gap-2.5">
            <div className="flex shrink-0 items-center justify-center rounded-md bg-yellow-500/10 h-8 w-8 text-yellow-500">
              <Link2 className="h-3.5 w-3.5" strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500 leading-none mb-1">
                Your share link
              </p>
              <p className="truncate font-mono text-[11px] text-zinc-300 leading-tight">
                {link?.url || '—'}
              </p>
            </div>
            <button
              onClick={handleCopy}
              className="flex h-7 shrink-0 items-center justify-center gap-1.5 rounded bg-yellow-500 px-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400 active:scale-95"
            >
              {copied ? <Check className="h-3 w-3" strokeWidth={2.6} /> : <Copy className="h-3 w-3" strokeWidth={2.2} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          {/* Stats + Reset Row */}
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-t border-zinc-800/60 pt-2">
            <div className="flex items-center gap-2 text-[10px] text-zinc-400">
              <span className="flex items-center gap-1">
                <span className="font-bold text-white">{link?.postCount ?? 0}</span> received
              </span>
              <span className="text-zinc-700">•</span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="font-bold text-emerald-400 uppercase tracking-wider text-[9px]">Active</span>
              </span>
              <span className="text-zinc-700">•</span>
              <span className="truncate">
                Reset: <span className="font-medium text-zinc-300">{link?.regeneratedAt ? formatRelative(link.regeneratedAt) : 'Never'}</span>
              </span>
            </div>
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="flex shrink-0 items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500 transition-colors hover:text-red-400 disabled:opacity-50"
            >
              {isRegenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" strokeWidth={2.2} />}
              Reset
            </button>
          </div>

          {/* Tabs Row */}
          <div className="flex gap-1 rounded-md bg-zinc-950/50 p-0.5 border border-zinc-800/60">
            {[
              { key: 'active', label: 'Inbox' },
              { key: 'deleted', label: 'Deleted' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 rounded py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  tab === t.key
                    ? 'bg-yellow-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tiny disclaimer */}
          <p className="text-[9px] leading-tight text-zinc-500/80 text-center flex items-center justify-center gap-1">
            <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
            Anyone with this link can send a message.
          </p>
        </div>

        {/* POST FEED */}
        {isPostsLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-600">
              {tab === 'active' ? <MessageSquare className="h-6 w-6" strokeWidth={1.6} /> : <Trash2 className="h-6 w-6" strokeWidth={1.6} />}
            </div>
            <p className="text-[13px] font-semibold text-white">
              {tab === 'active' ? 'No messages yet' : 'Nothing deleted'}
            </p>
            <p className="mt-1 text-[11.5px] text-zinc-500">
              {tab === 'active' ? 'Share your link to start receiving anonymous messages.' : 'Messages you delete will show up here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {posts.map((post) => {
              const images = post.images || [];
              return (
                <div key={post.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 md:p-3.5 animate-in fade-in">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <SenderBadge type={post.senderType} />
                      <span className="truncate text-[10.5px] text-zinc-500">{formatRelative(post.createdAt)}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {!post.isDeleted && (
                        <button onClick={() => setShareTarget(post)} aria-label="Share post" className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-yellow-500/10 hover:text-yellow-500">
                          <Share2 className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      )}
                      {!post.isDeleted && (
                        <button onClick={() => handleDelete(post.id)} disabled={deletingId === post.id} aria-label="Delete message" className="rounded p-1.5 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50">
                          {deletingId === post.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {post.content && (
                    <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-zinc-200">
                      {post.content}
                    </p>
                  )}

                  {images.length > 0 && (
                    <div className={`mt-2.5 grid gap-1.5 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {images.map((img, i) => (
                        <a key={i} href={img.url} target="_blank" rel="noreferrer noopener" className="group relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                          <img src={img.url} alt={`Attachment ${i + 1}`} loading="lazy" className={`w-full object-cover transition-opacity group-hover:opacity-90 ${images.length === 1 ? 'max-h-72' : 'aspect-square'}`} />
                          <div className="pointer-events-none absolute right-1.5 top-1.5 rounded bg-black/60 p-1 text-white/80 opacity-0 transition-opacity group-hover:opacity-100">
                            <ExternalLink className="h-3 w-3" strokeWidth={2.2} />
                          </div>
                        </a>
                      ))}
                    </div>
                  )}

                  {post.isDeleted && (
                    <div className="mt-2 flex items-center gap-1.5 rounded-md border border-red-500/20 bg-red-500/5 px-2 py-1.5">
                      <AlertTriangle className="h-3 w-3 shrink-0 text-red-400" strokeWidth={2.2} />
                      <span className="text-[10.5px] font-medium text-red-400">Deleted</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODALS */}
      {shareTarget && <ShareModal post={shareTarget} onClose={() => setShareTarget(null)} />}

      {/* HIDDEN EXPORT ELEMENTS */}
      <div aria-hidden style={{ position: 'fixed', left: -99999, top: 0, pointerEvents: 'none' }}>
        {shareablePosts.map((post) => (
          <div key={`export-${post.id}`} id={`post-export-${post.id}`}>
            <ExportPostCard post={post} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Anonymous;