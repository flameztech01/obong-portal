// src/pages/admin/AuditLogs.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Search, 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Filter,
  Database,
} from 'lucide-react';
import { useListAuditLogsQuery } from '../../features/adminApiSlice';

// =========================================
// SKELETON
// =========================================
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-zinc-800 ${className}`} />
);

// =========================================
// COMPACT CUSTOM SELECT (matches other admin pages)
// =========================================
const CompactSelect = ({ options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 text-left text-[12px] transition-colors ${
          isOpen 
            ? 'border-yellow-500/50 bg-zinc-950 text-zinc-100 ring-1 ring-yellow-500/30' 
            : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700'
        }`}
      >
        <span className={`truncate ${!selected ? 'text-zinc-600' : ''}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown 
          className={`h-3 w-3 shrink-0 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          strokeWidth={2} 
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-md border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/60 animate-in fade-in">
          <ul className="max-h-48 overflow-y-auto py-0.5 custom-scrollbar">
            {options.map((option) => {
              const active = value === option.value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => { onChange(option.value); setIsOpen(false); }}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[11.5px] transition-colors ${
                      active 
                        ? 'bg-yellow-500/10 font-semibold text-yellow-500' 
                        : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <span className="truncate pr-2">{option.label}</span>
                    {active && <Check className="h-3 w-3 shrink-0" strokeWidth={2.6} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

// =========================================
// HELPERS
// =========================================
const getActionColor = (action) => {
  const act = action?.toLowerCase() || '';
  if (act.includes('create') || act.includes('add')) 
    return 'bg-green-500/10 text-green-500 border-green-500/20';
  if (act.includes('delete') || act.includes('revoke') || act.includes('suspend')) 
    return 'bg-red-500/10 text-red-500 border-red-500/20';
  if (act.includes('update') || act.includes('edit') || act.includes('status')) 
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  if (act.includes('publish') || act.includes('approve') || act.includes('promote')) 
    return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
  if (act.includes('ai_') || act.includes('parse')) 
    return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  return 'bg-zinc-800 text-zinc-300 border-zinc-700';
};

const getInitials = (name) => {
  if (!name) return 'SA';
  return name
    .split(' ')
    .map(n => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

const formatMeta = (meta) => {
  if (!meta || Object.keys(meta).length === 0) return null;
  try {
    if (Array.isArray(meta.changed)) return `Fields: ${meta.changed.join(', ')}`;
    const entries = Object.entries(meta);
    if (entries.length === 0) return null;
    return entries.map(([k, v]) => `${k}: ${v}`).join(' • ');
  } catch {
    return null;
  }
};

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// =========================================
// MAIN COMPONENT
// =========================================
const AuditLogs = () => {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');

  const { data: logsData, isLoading } = useListAuditLogsQuery({ 
    page, 
    limit: 15, 
    action: actionFilter,
    resource: resourceFilter,
  });

  const logs = logsData?.logs || [];
  const totalPages = logsData?.pages || 1;
  const totalLogs = logsData?.total || 0;
  const hasActiveFilter = actionFilter || resourceFilter;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const actionOptions = [
    { value: '',          label: 'All Actions' },
    { value: 'create',    label: 'Create' },
    { value: 'update',    label: 'Update' },
    { value: 'delete',    label: 'Delete' },
    { value: 'login',     label: 'Login' },
    { value: 'publish',   label: 'Publish' },
    { value: 'appoint',   label: 'Appoint' },
    { value: 'revoke',    label: 'Revoke' },
    { value: 'promote',   label: 'Promote' },
    { value: 'ai_parse',  label: 'AI Parse' },
  ];

  const resourceOptions = [
    { value: '',                 label: 'All Resources' },
    { value: 'user',             label: 'User' },
    { value: 'course',           label: 'Course' },
    { value: 'result',           label: 'Result' },
    { value: 'calendar',         label: 'Calendar' },
    { value: 'department',       label: 'Department' },
    { value: 'result_upload',    label: 'Result Upload' },
    { value: 'settings',         label: 'Settings' },
    { value: 'session',          label: 'Academic Session' },
  ];

  return (
    <div className="-mx-4 min-h-screen bg-zinc-950 px-4 pb-8 pt-4 animate-in fade-in duration-500 md:mx-0 md:bg-transparent md:px-0 md:pt-0">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-5">

        {/* HEADER */}
        <div>
          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {today}
          </p>
          <h1 className="text-xl font-serif tracking-tight text-white md:text-2xl">
            System{' '}
            <span className="bg-gradient-to-r from-yellow-200 to-yellow-500 bg-clip-text text-transparent">
              Audit Logs
            </span>
          </h1>
          <p className="mt-0.5 text-[11.5px] text-zinc-500">
            Immutable record of every action taken within the platform.
          </p>
        </div>

        {/* FILTERS */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-zinc-500">
            <Filter className="h-3 w-3" strokeWidth={2.2} />
            Filters
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex-1 sm:max-w-md">
            <CompactSelect 
              options={actionOptions}
              value={actionFilter}
              onChange={(val) => { setActionFilter(val); setPage(1); }}
              placeholder="All Actions"
            />
            <CompactSelect 
              options={resourceOptions}
              value={resourceFilter}
              onChange={(val) => { setResourceFilter(val); setPage(1); }}
              placeholder="All Resources"
            />
          </div>
        </div>

        {/* LOGS LIST */}
        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
            <Database className="mx-auto mb-2 h-8 w-8 text-zinc-700" strokeWidth={1.5} />
            <h3 className="text-[13px] font-semibold text-white">
              {hasActiveFilter ? 'No matching logs' : 'No activity yet'}
            </h3>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {hasActiveFilter 
                ? 'Try adjusting or clearing your filters.' 
                : 'Actions taken on the platform will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800/60">
            {logs.map((log) => {
              const metaStr = formatMeta(log.meta);
              const actorName = log.actor?.name || 'System Admin';
              const actorRole = log.actorRole || log.actor?.role || 'admin';

              return (
                <div 
                  key={log._id} 
                  className="flex items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-zinc-800/30"
                >
                  {/* AVATAR */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-[10px] font-bold text-yellow-500">
                    {getInitials(actorName)}
                  </div>

                  {/* BODY */}
                  <div className="min-w-0 flex-1">
                    {/* Name + role */}
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[12.5px] font-medium text-white">
                        {actorName}
                      </span>
                      <span className="shrink-0 rounded border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                        {actorRole}
                      </span>
                    </div>

                    {/* Action + resource */}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      <span className="text-[10.5px] text-zinc-500">
                        on <span className="font-mono text-yellow-500">{log.resource}</span>
                      </span>
                    </div>

                    {/* Meta details */}
                    {metaStr && (
                      <p className="mt-1 truncate text-[10px] text-zinc-500">
                        {metaStr}
                      </p>
                    )}
                  </div>

                  {/* TIME */}
                  <div className="shrink-0 text-right">
                    <p className="text-[10.5px] font-medium text-zinc-400">
                      {formatDate(log.createdAt)}
                    </p>
                    <p className="mt-0.5 text-[9.5px] text-zinc-600">
                      {formatTime(log.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PAGINATION */}
        {!isLoading && totalLogs > 0 && (
          <div className="flex flex-col items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 sm:flex-row">
            <span className="text-[10.5px] text-zinc-500">
              Showing <strong className="text-white">{logs.length}</strong> of {totalLogs} logs
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
              </button>
              <span className="min-w-[80px] text-center text-[10.5px] font-semibold uppercase tracking-wider text-zinc-300">
                {page} / {totalPages}
              </span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.2} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AuditLogs;