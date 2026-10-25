// src/pages/DropAnonymous.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router';
import {
  Ghost, Send, ImagePlus, X, Loader2, AlertTriangle,
  CheckCircle2, MessageSquare, ShieldCheck
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
  const [images, setImages] = useState([]);
  const [sent, setSent] = useState(false);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const objectUrlsRef = useRef(new Set());

  /* ---- auto-focus textarea once the link resolves ---- */
  useEffect(() => {
    if (!isLoading && info && textareaRef.current && window.innerWidth > 768) {
      textareaRef.current.focus();
    }
  }, [isLoading, info]);

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
    e.target.value = '';
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
      <div className="h-[100dvh] bg-zinc-950 flex flex-col justify-center px-4 md:px-12 overflow-hidden">
        <div className="mx-auto w-full max-w-5xl grid md:grid-cols-2 gap-12 items-center animate-pulse">
          <div className="space-y-4 hidden md:block">
            <div className="h-16 w-16 rounded-full bg-zinc-900" />
            <div className="h-10 w-3/4 rounded bg-zinc-900" />
            <div className="h-4 w-1/2 rounded bg-zinc-900" />
          </div>
          <div className="h-[400px] rounded-3xl bg-zinc-900" />
        </div>
      </div>
    );
  }

  /* =========================================
     INVALID / DISABLED LINK
     ========================================= */
  if (isError || !info) {
    return (
      <div className="h-[100dvh] bg-zinc-950 flex items-center justify-center p-4 overflow-hidden">
        <div className="w-full max-w-sm rounded-3xl border border-zinc-800/80 bg-zinc-900/50 p-8 text-center backdrop-blur-xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400">
            <AlertTriangle className="h-8 w-8" strokeWidth={1.8} />
          </div>
          <h1 className="text-xl font-serif text-white">Link unavailable</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
            This link is invalid, disabled, or no longer accepting messages.
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
      <div className="h-[100dvh] bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative w-full max-w-md rounded-3xl border border-zinc-800/80 bg-zinc-900/60 p-10 text-center backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-500 shadow-2xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/10 ring-8 ring-yellow-500/5">
            <CheckCircle2 className="h-10 w-10 text-yellow-500" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-serif text-white tracking-tight">Message sent</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-zinc-400">
            Your message has been delivered safely and completely anonymously.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-800/50 px-6 py-3 text-[12px] font-bold uppercase tracking-wider text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <MessageSquare className="h-4 w-4" strokeWidth={2.2} />
            Send another
          </button>
        </div>
      </div>
    );
  }

  /* =========================================
     MAIN FORM
     ========================================= */
  const charsLeft = MAX_CONTENT - text.length;
  const imagesLeft = MAX_IMAGES - images.length;

  return (
    // 👇 h-[100dvh] and overflow-hidden lock the screen height completely
    <div className="h-[100dvh] bg-zinc-950 text-zinc-100 flex flex-col relative overflow-hidden">
      
      {/* Ambient Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-yellow-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[0%] right-[0%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center p-4 md:p-8 min-h-0">
        <div className="w-full max-w-5xl h-full md:h-auto grid md:grid-cols-2 gap-6 md:gap-20 items-center">
          
          {/* LEFT: BRANDING & WRITE-UP (Desktop only) */}
          <div className="hidden md:flex flex-col items-start space-y-6 animate-in fade-in slide-in-from-left-8 duration-700">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl shadow-black/50">
              <Ghost className="h-7 w-7 text-yellow-500" strokeWidth={2} />
            </div>
            
            <div>
              <h1 className="text-4xl lg:text-5xl font-serif text-white leading-[1.15] tracking-tight">
                Drop a message.<br />
                <span className="text-zinc-500">Stay a mystery.</span>
              </h1>
              <p className="mt-4 text-[14px] leading-relaxed text-zinc-400 max-w-sm">
                Say whatever is on your mind. No names, no tracking, no judgement. 
                Just pure, unfiltered thoughts delivered straight to their inbox.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-zinc-800/80 w-full max-w-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                <ShieldCheck className="h-4 w-4 text-emerald-400" strokeWidth={2.2} />
              </div>
              <p className="text-[11.5px] text-zinc-500 font-medium">
                100% Anonymous. Your identity is protected.
              </p>
            </div>
          </div>

          {/* RIGHT: FORM CARD */}
          {/* 👇 flex-1 on mobile makes this form stretch to fill available screen space */}
          <div className="w-full relative flex flex-col h-full md:h-auto animate-in fade-in slide-in-from-bottom-8 md:slide-in-from-right-8 duration-700 delay-150 fill-mode-both min-h-0">
            
            {/* Mobile-only header (Made smaller to save vertical space) */}
            <div className="md:hidden text-center mb-4 space-y-1 shrink-0">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 mb-2 shadow-lg">
                <Ghost className="h-5 w-5 text-yellow-500" strokeWidth={2} />
              </div>
              <h1 className="text-xl font-serif text-white tracking-tight">Drop a message.</h1>
              <p className="text-[11px] text-zinc-500">Completely anonymous.</p>
            </div>

            {/* 👇 flex-1 and min-h-0 allow the textarea to consume the leftover space */}
            <form
              onSubmit={handleSubmit}
              className="flex-1 flex flex-col min-h-0 rounded-[2rem] border border-zinc-800/80 bg-zinc-900/40 p-4 md:p-6 backdrop-blur-2xl shadow-2xl shadow-black/50 overflow-hidden relative"
            >
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              {/* Textarea Container */}
              <div className="relative flex-1 flex flex-col min-h-0">
                <label htmlFor="drop-content" className="sr-only">Your message</label>
                <textarea
                  id="drop-content"
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={MAX_CONTENT}
                  placeholder="Write your anonymous message here..."
                  className="w-full flex-1 min-h-[80px] resize-none bg-transparent px-1 py-2 text-[15px] leading-relaxed text-white outline-none placeholder:text-zinc-600 custom-scrollbar"
                />
                
                {/* Character Count */}
                <div className="flex justify-end mt-1 shrink-0">
                  <span
                    className={`text-[10px] font-mono tabular-nums tracking-wider px-2 py-1 rounded-md transition-colors ${
                      charsLeft < 100 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-zinc-900/50 text-zinc-600'
                    }`}
                  >
                    {text.length} / {MAX_CONTENT}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px w-full bg-zinc-800/60 my-1 shrink-0" />

              {/* Image Attachments */}
              {info.acceptsImages && (
                <div className="py-2 shrink-0">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                      Attachments
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      Max {MAX_IMAGES}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {images.map((img, i) => (
                      <div
                        key={i}
                        className="group relative h-[60px] w-[60px] overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-950 animate-in fade-in zoom-in-75"
                      >
                        <img
                          src={img.preview}
                          alt={`Attachment ${i + 1}`}
                          className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          aria-label="Remove image"
                          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-transform hover:bg-red-500 hover:scale-110"
                        >
                          <X className="h-3 w-3" strokeWidth={2.6} />
                        </button>
                      </div>
                    ))}

                    {imagesLeft > 0 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex h-[60px] w-[60px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-zinc-700/80 bg-zinc-900/30 text-zinc-500 transition-all hover:border-yellow-500/50 hover:bg-yellow-500/5 hover:text-yellow-500"
                      >
                        <ImagePlus className="h-4 w-4" strokeWidth={1.8} />
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

              {/* Submit Button */}
              <div className="mt-2 shrink-0">
                <button
                  type="submit"
                  disabled={isSubmitting || (!text.trim() && images.length === 0)}
                  className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-500 py-3.5 text-[12px] font-bold uppercase tracking-widest text-zinc-950 transition-all hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-40 overflow-hidden active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" strokeWidth={2.4} />
                      Send Anonymously
                    </>
                  )}
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shimmer" />
                </button>
              </div>
            </form>
            
            {/* Mobile Disclaimer */}
            <p className="md:hidden mt-3 shrink-0 text-center text-[10px] leading-relaxed text-zinc-500/80 px-4">
              Your identity is hidden. They will not know who sent this.
            </p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .group-hover\\:animate-shimmer {
          animation: shimmer 1.2s infinite;
        }
      `}} />
    </div>
  );
};

export default DropAnonymous;