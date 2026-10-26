// src/pages/admin/AdminAnonymous.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Users, Search, Trash2, Ghost, ShieldAlert,
  Link2, ExternalLink, X, UserCheck, ArrowRight,
  ChevronLeft, ChevronRight, MessageSquare, List, LayoutGrid,
  Calendar
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import {
  useAdminGetAllPostsQuery,
  useAdminGetUsersWithPostStatsQuery,
  useAdminDeletePostMutation,
} from '../../features/postApiSlice';

/* =========================================
   HELPERS
   ========================================= */
const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-zinc-800 ${className}`} />
);

const toYYYYMMDD = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/* =========================================
   CUSTOM CALENDAR COMPONENT
   ========================================= */
const CustomCalendar = ({ isOpen, selectedDate, onSelect, onClose }) => {
  const [viewDate, setViewDate] = useState(selectedDate ? new Date(selectedDate) : new Date());

  // 👇 This prevents the calendar from showing when opening the inbox
  if (!isOpen) return null;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[70] flex flex-col rounded-t-3xl border-t border-zinc-800 bg-zinc-900 p-5 animate-in slide-in-from-bottom duration-300 md:inset-0 md:m-auto md:h-fit md:max-w-sm md:rounded-2xl md:border md:zoom-in-95">
        
        <div className="flex items-center justify-between mb-4">
          <button onClick={handlePrevMonth} className="p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white"><ChevronLeft className="h-4 w-4" /></button>
          <h3 className="text-[14px] font-bold text-white">{monthNames[month]} {year}</h3>
          <button onClick={handleNextMonth} className="p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white"><ChevronRight className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {days.map((date, i) => {
            if (!date) return <div key={i} />;
            
            const dateStr = toYYYYMMDD(date);
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === toYYYYMMDD(new Date());

            return (
              <button
                key={i}
                onClick={() => { onSelect(dateStr); onClose(); }}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-[13px] transition-colors mx-auto
                  ${isSelected ? 'bg-yellow-500 text-zinc-950 font-bold' : 
                    isToday ? 'border border-yellow-500/50 text-yellow-500' : 
                    'text-zinc-300 hover:bg-zinc-800'}
                `}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        <button onClick={onClose} className="mt-5 w-full rounded-xl bg-zinc-800 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-zinc-700">
          Cancel
        </button>
      </div>
    </>
  );
};

/* =========================================
   MODAL: User's Received Posts
   ========================================= */
const UserPostsModal = ({ user, onClose }) => {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('active');
  
  // Date Filter State
  const [dateFilter, setDateFilter] = useState('all');
  const [customDate, setCustomDate] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // 👇 Fetch posts (increased limit so frontend can filter everything)
  const { data: postsData, isLoading } = useAdminGetAllPostsQuery({
    ownerId: user.id,
    limit: 200, 
  });

  const [deletePost] = useAdminDeletePostMutation();

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this anonymous post? The user will no longer see it in their inbox.')) return;
    try {
      await deletePost(postId).unwrap();
      toast.success('Post deleted');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete');
    }
  };

  // 👇 FRONTEND FILTERING LOGIC
  const filteredPosts = useMemo(() => {
    if (!postsData?.posts) return [];
    let result = postsData.posts;

    // 1. Status Filter (Active/Deleted)
    if (status === 'active') {
      result = result.filter(p => !p.isDeleted);
    } else if (status === 'deleted') {
      result = result.filter(p => p.isDeleted);
    }

    // 2. Date Filter
    const now = new Date();
    let start = null, end = null;

    if (dateFilter === 'today') {
      start = toYYYYMMDD(now); end = start;
    } else if (dateFilter === 'yesterday') {
      const yest = new Date(now); yest.setDate(now.getDate() - 1);
      start = toYYYYMMDD(yest); end = start;
    } else if (dateFilter === 'last_week') {
      const lw = new Date(now); lw.setDate(now.getDate() - 7);
      start = toYYYYMMDD(lw); end = toYYYYMMDD(now);
    } else if (dateFilter === 'custom' && customDate) {
      start = customDate; end = customDate;
    }

    if (start) {
      result = result.filter(p => {
        const postDate = toYYYYMMDD(p.createdAt);
        return postDate >= start && postDate <= end;
      });
    }

    return result;
  }, [postsData?.posts, status, dateFilter, customDate]);

  // 👇 FRONTEND PAGINATION
  const totalPages = Math.ceil(filteredPosts.length / 20) || 1;
  const paginatedPosts = filteredPosts.slice((page - 1) * 20, page * 20);

  const handleFilterChange = (f) => {
    setDateFilter(f);
    setPage(1);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-in fade-in" onClick={onClose} aria-hidden />

      <div className="fixed inset-x-0 bottom-0 z-50 flex h-[90dvh] flex-col rounded-t-3xl border-t border-zinc-800 bg-zinc-950 animate-in slide-in-from-bottom duration-300 md:inset-0 md:m-auto md:h-[85vh] md:max-w-2xl md:rounded-2xl md:border">
        
        {/* Header */}
        <div className="flex shrink-0 flex-col border-b border-zinc-800 bg-zinc-900 rounded-t-3xl md:rounded-t-2xl">
          <div className="flex justify-center pb-1.5 pt-2.5 md:hidden">
            <div className="h-1 w-9 rounded-full bg-zinc-700" />
          </div>
          
          <div className="flex items-start justify-between gap-3 px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[14px] font-bold text-yellow-500 border border-zinc-700">
                {user.profilePicture ? (
                  <img src={user.profilePicture} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  user.name?.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-white">{user.name}'s Inbox</h2>
                <p className="text-[11px] text-zinc-400">
                  {filteredPosts.length} messages {dateFilter !== 'all' ? 'in range' : 'total'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 transition-transform active:scale-95 hover:text-white">
              <X className="h-4 w-4" strokeWidth={2.2} />
            </button>
          </div>

          {/* Active / Deleted Tabs */}
          <div className="flex border-t border-zinc-800/60 px-2">
            {['active', 'deleted'].map(s => (
              <button
                key={s}
                onClick={() => { setStatus(s); setPage(1); }}
                className={`flex-1 border-b-2 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  status === s ? 'border-yellow-500 text-yellow-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Date Filters */}
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-zinc-800/60 bg-zinc-900/50 px-4 py-2.5 custom-scrollbar">
          {[
            { key: 'all', label: 'All Time' },
            { key: 'today', label: 'Today' },
            { key: 'yesterday', label: 'Yesterday' },
            { key: 'last_week', label: 'Last 7 Days' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => handleFilterChange(f.key)}
              className={`shrink-0 rounded-full px-3 py-1 text-[10.5px] font-semibold transition-colors ${
                dateFilter === f.key ? 'bg-yellow-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
          
          <button
            onClick={() => setIsCalendarOpen(true)}
            className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-semibold transition-colors ${
              dateFilter === 'custom' ? 'bg-yellow-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <Calendar className="h-3 w-3" />
            {dateFilter === 'custom' && customDate ? customDate : 'Custom'}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar bg-zinc-950/50 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
            </div>
          ) : paginatedPosts.length === 0 ? (
            <div className="py-12 text-center">
              <MessageSquare className="mx-auto mb-3 h-10 w-10 text-zinc-600" />
              <p className="text-[14px] font-medium text-zinc-400">No messages found for this filter</p>
            </div>
          ) : (
            paginatedPosts.map(post => {
              const images = post.images || [];
              
              return (
                <div key={post.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 sm:p-4 animate-in fade-in">
                  
                  {/* FROM -> TO Admin Meta Row */}
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/60 pb-3">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">From</span>
                        {post.sender ? (
                          <span className="flex items-center gap-1 font-semibold text-yellow-500" title={post.sender.email}>
                            <UserCheck className="h-3 w-3" />
                            {post.sender.name}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 font-medium text-zinc-400">
                            <Ghost className="h-3 w-3" />
                            Guest
                          </span>
                        )}
                      </div>
                      
                      <ArrowRight className="h-3 w-3 text-zinc-600" />
                      
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">To</span>
                        <span className="font-semibold text-zinc-200">{user.name}</span>
                      </div>
                    </div>

                    <span className="font-mono text-[10px] text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                      IP: {post.senderIp || 'Unknown'}
                    </span>
                  </div>

                  {/* Content & Images */}
                  <div className={post.isDeleted ? 'opacity-50' : ''}>
                    {post.content && (
                      <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-zinc-200 mb-3">
                        {post.content}
                      </p>
                    )}

                    {images.length > 0 && (
                      <div className={`grid gap-2 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {images.map((img, i) => (
                          <a key={i} href={img.url} target="_blank" rel="noreferrer noopener" className="group relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                            <img
                              src={img.url}
                              alt={`Attachment ${i + 1}`}
                              loading="lazy"
                              className={`w-full object-cover transition-opacity group-hover:opacity-90 ${images.length === 1 ? 'max-h-80' : 'aspect-square'}`}
                            />
                            <div className="pointer-events-none absolute right-2 top-2 rounded bg-black/60 p-1.5 text-white/90 opacity-0 transition-opacity group-hover:opacity-100 backdrop-blur-sm">
                              <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.2} />
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer (Time & Delete) */}
                  <div className="mt-3 flex items-center justify-between border-t border-zinc-800/60 pt-2.5">
                    <span className="text-[10.5px] text-zinc-500">{formatDate(post.createdAt)}</span>
                    
                    {!post.isDeleted ? (
                      <button onClick={() => handleDelete(post.id)} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Deleted by Admin</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex shrink-0 items-center justify-between border-t border-zinc-800 bg-zinc-900 p-3 sm:px-5">
            <span className="text-[11.5px] text-zinc-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-md border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-300 hover:text-white disabled:opacity-40 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-md border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-300 hover:text-white disabled:opacity-40 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Calendar Modal (Hidden unless clicked) */}
      <CustomCalendar 
        isOpen={isCalendarOpen}
        selectedDate={customDate}
        onSelect={(date) => { setCustomDate(date); handleFilterChange('custom'); }}
        onClose={() => setIsCalendarOpen(false)}
      />
    </>
  );
};

/* =========================================
   SEARCH MODAL
   ========================================= */
const SearchModal = ({ isOpen, onClose, search, setSearch }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm animate-in fade-in" onClick={onClose} aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-[60] rounded-t-2xl border-t border-zinc-800 bg-zinc-900 p-4 animate-in slide-in-from-bottom duration-300 md:inset-0 md:m-auto md:h-fit md:max-w-md md:rounded-2xl md:border md:zoom-in-95">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-bold text-white">Search Users</h3>
          <button onClick={onClose} className="rounded-full bg-zinc-800 p-1.5 text-zinc-400 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Name, email, or matric number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-3 pl-10 pr-10 text-[14px] text-white outline-none placeholder:text-zinc-600 focus:border-yellow-500/50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button onClick={onClose} className="mt-4 w-full rounded-xl bg-yellow-500 py-3 text-[12px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400 md:hidden">
          Done
        </button>
      </div>
    </>
  );
};

/* =========================================
   MAIN COMPONENT
   ========================================= */
const AdminAnonymous = () => {
  const toast = useToast();
  const [userPage, setUserPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const { data: usersData, isLoading } = useAdminGetUsersWithPostStatsQuery({
    page: userPage,
    limit: 20,
    search: userSearch,
    onlyWithLinks: true,
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copied to clipboard');
  };

  return (
    <div className="w-full max-w-full pb-10">
      
      {/* SLIM HEADER */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <h1 className="flex items-center gap-2 text-[15px] font-serif font-bold tracking-tight text-white truncate">
          <ShieldAlert className="h-4 w-4 shrink-0 text-yellow-500" strokeWidth={2.2} />
          Anonymous Links
        </h1>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setIsSearchOpen(true)}
            className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
              userSearch 
                ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-500' 
                : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
            title="Search Users"
          >
            <Search className="h-4 w-4" />
          </button>

          <div className="flex h-8 items-center gap-0.5 rounded-md border border-zinc-800 bg-zinc-900 p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`flex h-full w-7 items-center justify-center rounded transition-colors ${viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex h-full w-7 items-center justify-center rounded transition-colors ${viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      {isLoading ? (
        <div className={viewMode === 'grid' ? 'px-4 sm:px-6 pt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3' : 'space-y-0 pt-0'}>
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className={viewMode === 'grid' ? 'h-32 rounded-xl' : 'h-20 w-full rounded-none border-b border-zinc-800/50'} />
          ))}
        </div>
      ) : !usersData?.users?.length ? (
        <div className="mx-4 sm:mx-6 mt-6 rounded-xl border border-dashed border-zinc-800 p-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-zinc-600" />
          <p className="text-[14px] font-medium text-zinc-400">No users found</p>
        </div>
      ) : viewMode === 'list' ? (
        
        /* LIST VIEW - ABSOLUTE FULL WIDTH */
        <div className="w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] md:w-[calc(100%+4rem)] -ml-4 sm:-ml-6 md:-ml-8 flex flex-col bg-transparent">
          {usersData.users.map((row) => (
            <div 
              key={row.user.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-4 sm:px-6 md:px-8 border-b border-zinc-800/80 transition-colors hover:bg-zinc-900/30"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[12px] font-bold text-yellow-500 border border-zinc-700">
                  {row.user.profilePicture ? (
                    <img src={row.user.profilePicture} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    row.user.name?.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-white">{row.user.name}</p>
                  <p className="truncate text-[11px] text-zinc-500">{row.user.email}</p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-zinc-800/60">
                <div className="flex items-center gap-3 text-[11px]">
                  <span className={row.linkActive ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
                    {row.linkActive ? 'Active' : 'Disabled'}
                  </span>
                  <span className="text-zinc-500 border-l border-zinc-700 pl-3">
                    <span className="text-white font-bold">{row.postCount}</span> posts
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedUser(row.user)}
                    className="flex items-center justify-center gap-1.5 rounded bg-yellow-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-yellow-500 transition-colors hover:bg-yellow-500/20"
                  >
                    View Inbox
                  </button>
                  {row.hasLink && (
                    <>
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/drop/${row.linkToken}`)}
                        className="rounded bg-zinc-800 p-1.5 text-zinc-400 hover:text-white transition-colors"
                        title="Copy Link"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                      </button>
                      <a
                        href={`/drop/${row.linkToken}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded bg-zinc-800 p-1.5 text-zinc-400 hover:text-white transition-colors"
                        title="Open Link"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

      ) : (
        
        /* GRID VIEW */
        <div className="px-4 sm:px-6 pt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {usersData.users.map((row) => (
            <div key={row.user.id} className="group relative flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-3 md:p-4 transition-all hover:border-zinc-700">
              <div className="flex flex-col items-center text-center gap-2 mb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[13px] font-bold text-yellow-500 border border-zinc-700">
                  {row.user.profilePicture ? (
                    <img src={row.user.profilePicture} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    row.user.name?.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 w-full">
                  <p className="truncate text-[12px] font-bold text-white">{row.user.name}</p>
                  <p className="truncate text-[10px] text-zinc-500">{row.user.email}</p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded bg-zinc-950/50 px-2 py-1.5 mb-2.5">
                <span className={`text-[9px] font-bold uppercase tracking-wider ${row.linkActive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {row.linkActive ? 'Active' : 'Off'}
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">
                  {row.postCount} <span className="text-zinc-600">posts</span>
                </span>
              </div>

              <div className="flex items-center gap-1 mt-auto">
                <button onClick={() => setSelectedUser(row.user)} className="flex-1 flex items-center justify-center gap-1 rounded bg-yellow-500/10 py-1.5 text-[10px] font-bold uppercase tracking-wider text-yellow-500 transition-colors hover:bg-yellow-500/20">
                  View
                </button>
                {row.hasLink && (
                  <button onClick={() => copyToClipboard(`${window.location.origin}/drop/${row.linkToken}`)} className="rounded bg-zinc-800 p-1.5 text-zinc-400 hover:text-white transition-colors" title="Copy Link">
                    <Link2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PAGINATION */}
      {usersData?.pagination?.pages > 1 && (
        <div className="px-4 sm:px-6 flex items-center justify-between pt-4">
          <span className="text-[11px] text-zinc-500">Page {usersData.pagination.page} of {usersData.pagination.pages}</span>
          <div className="flex gap-1">
            <button onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={userPage === 1} className="rounded border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 hover:text-white disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => setUserPage(p => Math.min(usersData.pagination.pages, p + 1))} disabled={userPage === usersData.pagination.pages} className="rounded border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 hover:text-white disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODALS */}
      <SearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        search={userSearch} 
        setSearch={(val) => { setUserSearch(val); setUserPage(1); }} 
      />
      
      {selectedUser && <UserPostsModal user={selectedUser} onClose={() => setSelectedUser(null)} />}
    </div>
  );
};

export default AdminAnonymous;