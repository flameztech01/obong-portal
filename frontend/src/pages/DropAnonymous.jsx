// src/pages/DropAnonymous.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router';
import {
  Ghost, Send, ImagePlus, X, Loader2, AlertTriangle,
  CheckCircle2, MessageSquare,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import {
  useGetPublicLinkInfoQuery,
  useSubmitPostMutation,
} from '../features/postApiSlice';

const MAX_CONTENT = 1000;
const MAX_IMAGES = 2;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const DropAnonymous = () => {
  const { token } = useParams();
  const toast = useToast();

  const {
    data: info,
    isLoading,
    isError,
  } = useGetPublicLinkInfoQuery(token, { skip: !token });

  const [submit, { isLoading: isSubmitting }] = useSubmitPostMutation();

  const [text, setText] = useState('');
  const [images, setImages] = useState([]); // [{ file, preview }]
  const [sent, setSent] = useState(false);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const objectUrlsRef = useRef(new Set());

  /* ---- auto-focus textarea once the link resolves ---- */
  useEffect(() => {
    if (!isLoading && info && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading, info]);

  /* ---- auto-resize the textarea with content ---- */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [text]);

  /* ---- clean up every object URL when the page unmounts ---- */
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      for (const u of urls) URL.revokeObjectURL(u);
      urls.clear();
    };
  }, []);

  /* ---- image selection ---- */
  const handleFilesSelected = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = ''; // allow re-selecting the same file later
    if (picked.length === 0) return;

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast.error(`You can attach up to ${MAX_IMAGES} images`);
      return;
    }

    const accepted = [];
    for (const file of picked) {
      if (accepted.length >= remaining) {
        toast.error(`Only ${MAX_IMAGES} images allowed`);
        break;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Only image files are allowed');
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(`"${file.name}" is over 5MB`);
        continue;
      }
      const duplicate =
        images.some((i) => i.file.name === file.name && i.file.size === file.size) ||
        accepted.some((i) => i.file.name === file.name && i.file.size === file.size);
      if (duplicate) continue;

      const preview = URL.createObjectURL(file);
      objectUrlsRef.current.add(preview);
      accepted.push({ file, preview });
    }

    if (accepted.length) {
      setImages((prev) => [...prev, ...accepted]);
    }
  };

  const removeImage = (idx) => {
    setImages((prev) => {
      const next = [...prev];
      const [removed] = next.splice(idx, 1);
      if (removed) {
        URL.revokeObjectURL(removed.preview);
        objectUrlsRef.current.delete(removed.preview);
      }
      return next;
    });
  };

  const resetForm = () => {
    for (const { preview } of images) {
      URL.revokeObjectURL(preview);
      objectUrlsRef.current.delete(preview);
    }
    setImages([]);
    setText('');
  };

  /* ---- submit ---- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();

    if (!trimmed && images.length === 0) {
      toast.error('Write a message or attach an image');
      return;
    }
    if (trimmed.length > MAX_CONTENT) {
      toast.error(`Message is too long (max ${MAX_CONTENT} chars)`);
      return;
    }

    try {
      const fd = new FormData();
      if (trimmed) fd.append('content', trimmed);
      images.forEach(({ file }) => fd.append('images', file));

      await submit({ token, formData: fd }).unwrap();
      resetForm();
      setSent(true);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to send message');
    }
  };

  /* =========================================
     LOADING
     ========================================= */
  if (isLoading) {
    return (
      <div className="-mx-4 min-h-screen bg-zinc-950 px-4 pb-8 pt-6 md:mx-0 md:flex md:items-center md:justify-center md:bg-transparent md:px-0 md:pb-0 md:pt-0">
        <div className="mx-auto w-full max-w-md animate-pulse space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mx-auto mb-3 h-16 w-16 rounded-full bg-zinc-800" />
            <div className="mx-auto h-3 w-32 rounded bg-zinc-800" />
            <div className="mx-auto mt-2 h-5 w-40 rounded bg-zinc-800" />
          </div>
          <div className="h-40 w-full rounded-2xl bg-zinc-900" />
        </div>
      </div>
    );
  }

  /* =========================================
     INVALID / DISABLED LINK
     ========================================= */
  if (isError || !info) {
    return (
      <div className="-mx-4 flex min-h-screen items-center justify-center bg-zinc-950 px-4 md:mx-0 md:bg-transparent md:px-0">
        <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-red-500/20 bg-red-500/5 text-red-400">
            <AlertTriangle className="h-7 w-7" strokeWidth={1.8} />
          </div>
          <h1 className="text-lg font-serif text-white">Link unavailable</h1>
          <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-500">
            This link is invalid or no longer accepting messages. Ask the
            person who sent it to share a fresh one.
          </p>
        </div>
      </div>
    );
  }

  /* =========================================
     SUCCESS
     ========================================= */
  if (sent) {
    return (
      <div className="-mx-4 flex min-h-screen items-center justify-center bg-zinc-950 px-4 md:mx-0 md:bg-transparent md:px-0">
        <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 ring-4 ring-yellow-500/5">
            <CheckCircle2
              className="h-8 w-8 text-yellow-500"
              strokeWidth={2}
            />
          </div>
          <h1 className="text-xl font-serif text-white">Message sent</h1>
          <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-500">
            Your message was delivered to{' '}
            <span className="text-zinc-300">{info.owner.name}</span>{' '}
            anonymously.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="mt-6 inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-950 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
          >
            <MessageSquare className="h-3.5 w-3.5" strokeWidth={2.2} />
            Send another
          </button>
        </div>
      </div>
    );
  }

  /* =========================================
     FORM
     ========================================= */
  const initial = info.owner.name?.charAt(0)?.toUpperCase() || '?';
  const charsLeft = MAX_CONTENT - text.length;
  const imagesLeft = MAX_IMAGES - images.length;

  return (
    <div className="-mx-4 min-h-screen bg-zinc-950 px-4 pb-8 pt-6 md:mx-0 md:flex md:items-center md:justify-center md:bg-transparent md:px-0 md:pb-0 md:pt-0">
      <div className="mx-auto w-full max-w-md space-y-4 animate-in fade-in duration-500">

        {/* =========================================
            OWNER HEADER
            ========================================= */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
          <div className="relative mx-auto mb-3 inline-block">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-800 ring-4 ring-yellow-500/10">
              {info.owner.profilePicture ? (
                <img
                  src={info.owner.profilePicture}
                  alt={info.owner.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-yellow-500">
                  {initial}
                </span>
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-zinc-950 ring-4 ring-zinc-900">
              <Ghost className="h-3 w-3" strokeWidth={2.4} />
            </span>
          </div>

          <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">
            Send a message to
          </p>
          <h1 className="mt-1 truncate text-xl font-serif tracking-tight text-white md:text-2xl">
            {info.owner.name}
          </h1>
          <p className="mt-1 text-[11px] text-zinc-500">
            Your message will be sent anonymously
          </p>
        </div>

        {/* =========================================
            FORM CARD
            ========================================= */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 md:p-5"
        >
          {/* textarea */}
          <div className="relative">
            <label htmlFor="drop-content" className="sr-only">
              Your message
            </label>
            <textarea
              id="drop-content"
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={MAX_CONTENT}
              rows={4}
              placeholder="Say anything…"
              className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-[13px] leading-relaxed text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 custom-scrollbar"
            />
            <div className="pointer-events-none absolute bottom-2 right-3 flex items-center gap-1.5">
              <span
                className={`text-[10px] font-mono tabular-nums ${
                  charsLeft < 100 ? 'text-yellow-500' : 'text-zinc-600'
                }`}
              >
                {text.length}/{MAX_CONTENT}
              </span>
            </div>
          </div>

          {/* image attachments */}
          {info.acceptsImages && (
            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                  Photos {images.length > 0 && `(${images.length}/${MAX_IMAGES})`}
                </span>
                {imagesLeft > 0 && (
                  <span className="text-[10px] text-zinc-600">
                    {imagesLeft} more allowed
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {images.map((img, i) => (
                  <div
                    key={i}
                    className="group relative h-20 w-20 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 animate-in fade-in"
                  >
                    <img
                      src={img.preview}
                      alt={`Attachment ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      aria-label="Remove image"
                      className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white/90 transition-colors hover:bg-red-500/90"
                    >
                      <X className="h-3 w-3" strokeWidth={2.6} />
                    </button>
                  </div>
                ))}

                {imagesLeft > 0 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-700 text-zinc-500 transition-colors hover:border-yellow-500/40 hover:text-yellow-500"
                  >
                    <ImagePlus className="h-4 w-4" strokeWidth={2} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">
                      Add
                    </span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesSelected}
                className="hidden"
              />
            </div>
          )}

          {/* submit */}
          <button
            type="submit"
            disabled={
              isSubmitting ||
              (!text.trim() && images.length === 0)
            }
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md bg-yellow-500 py-2.5 text-[12px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.99]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" strokeWidth={2.4} />
                Send message
              </>
            )}
          </button>
        </form>

        {/* =========================================
            ANONYMITY NOTE
            ========================================= */}
        <p className="px-2 text-center text-[10.5px] leading-relaxed text-zinc-600">
          Your name is never shown to {info.owner.name?.split(' ')[0] || 'the receiver'}.
          If you're signed in, they'll see that you're a member — but not who.
        </p>
      </div>
    </div>
  );
};

export default DropAnonymous;