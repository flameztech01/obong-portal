// src/pages/admin/SessionsPromotions.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  Megaphone, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronDown,
  Check,
  X,
  Search,
} from 'lucide-react';
import { useToast } from '../../components/Toast';

// API Hooks
import { 
  useListSessionsQuery, 
  useCreateSessionMutation,
  useSetCurrentSessionMutation,
  usePromoteStudentsMutation,
  useListDepartmentsQuery,
} from '../../features/adminApiSlice';

// =========================================
// SKELETON
// =========================================
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-zinc-800 ${className}`} />
);

// =========================================
// CUSTOM DROPDOWN (searchable)
// =========================================
const CustomSelect = ({ 
  label, 
  options, 
  value, 
  onChange, 
  placeholder, 
  searchable = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable) {
      const t = setTimeout(() => searchRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [isOpen, searchable]);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions =
    searchable && query.trim()
      ? options.filter((o) =>
          o.label.toLowerCase().includes(query.trim().toLowerCase())
        )
      : options;

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className="relative w-full space-y-1" ref={dropdownRef}>
      {label && (
        <label className="block text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 text-left text-[12px] transition-colors ${
          isOpen 
            ? 'border-yellow-500/50 bg-zinc-950 text-zinc-100 ring-1 ring-yellow-500/30' 
            : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700'
        }`}
      >
        <span className={`truncate ${!selectedOption ? 'text-zinc-600' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          className={`h-3 w-3 shrink-0 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          strokeWidth={2} 
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-md border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/60 animate-in fade-in">
          {searchable && (
            <div className="border-b border-zinc-800 p-1.5">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-500" strokeWidth={2} />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type to search..."
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 py-1.5 pl-7 pr-2 text-[11.5px] text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-yellow-500/50"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') { setIsOpen(false); setQuery(''); }
                    if (e.key === 'Enter' && filteredOptions.length > 0) {
                      e.preventDefault();
                      handleSelect(filteredOptions[0].value);
                    }
                  }}
                />
              </div>
            </div>
          )}

          <ul className="max-h-48 overflow-y-auto py-0.5 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2.5 text-[11px] italic text-zinc-500">No matches found</li>
            ) : (
              filteredOptions.map((option) => {
                const active = value === option.value;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      onClick={() => handleSelect(option.value)}
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
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

// =========================================
// MODAL SHELL
// =========================================
const ModalShell = ({ isOpen, onClose, title, children, maxWidth = 'max-w-sm' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className={`relative z-10 flex max-h-[90dvh] w-full ${maxWidth} flex-col overflow-hidden rounded-t-2xl border-t border-zinc-800 bg-zinc-900 animate-in slide-in-from-bottom duration-300 sm:rounded-2xl sm:border`}>
        <div 
          className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 pb-3"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)' }}
        >
          <h2 className="text-[14.5px] font-semibold tracking-tight text-white">{title}</h2>
          <button 
            onClick={onClose} 
            className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800 text-zinc-400 transition-colors hover:text-white"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.2} />
          </button>
        </div>
        <div 
          className="flex-1 overflow-y-auto p-4"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

// =========================================
// MAIN COMPONENT
// =========================================
const SessionsPromotions = () => {
  const [activeTab, setActiveTab] = useState('sessions');

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const tabs = [
    { id: 'sessions',   label: 'Sessions',   short: 'Sessions',   icon: Calendar },
    { id: 'promotions', label: 'Promotions', short: 'Promote',    icon: Megaphone },
  ];

  return (
    <div className="-mx-4 min-h-screen bg-zinc-950 px-4 pb-8 pt-4 animate-in fade-in duration-500 md:mx-0 md:bg-transparent md:px-0 md:pt-0">
      <div className="mx-auto max-w-5xl space-y-4 md:space-y-5">

        {/* HEADER */}
        <div>
          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {today}
          </p>
          <h1 className="text-xl font-serif tracking-tight text-white md:text-2xl">
            Academic{' '}
            <span className="bg-gradient-to-r from-yellow-200 to-yellow-500 bg-clip-text text-transparent">
              Calendar
            </span>
          </h1>
          <p className="mt-0.5 text-[11.5px] text-zinc-500">
            Manage sessions and promote students to the next level.
          </p>
        </div>

        {/* TABS */}
        <div className="flex w-full gap-2">
          {tabs.map(({ id, label, short, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors md:text-[11px] ${
                  isActive
                    ? 'border-yellow-500 bg-yellow-500 text-zinc-950 shadow-sm shadow-yellow-500/20'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
                <span className="hidden sm:inline truncate">{label}</span>
                <span className="sm:hidden truncate">{short}</span>
              </button>
            );
          })}
        </div>

        {/* CONTENT */}
        <div>
          {activeTab === 'sessions' && <SessionsTab />}
          {activeTab === 'promotions' && <PromotionsTab />}
        </div>

      </div>
    </div>
  );
};

/* =========================================
   TAB 1: SESSIONS
   ========================================= */
const SessionsTab = () => {
  const toast = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', startDate: '', endDate: '' });

  const { data: sessionsData, isLoading } = useListSessionsQuery();
  const [createSession, { isLoading: isCreating }] = useCreateSessionMutation();
  const [setCurrentSession, { isLoading: isSettingCurrent }] = useSetCurrentSessionMutation();

  const sessions = sessionsData?.sessions || [];

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createSession(formData).unwrap();
      toast.success('Session created successfully');
      setIsCreateOpen(false);
      setFormData({ name: '', startDate: '', endDate: '' });
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to create session');
    }
  };

  const handleSetCurrent = async (id) => {
    try {
      await setCurrentSession(id).unwrap();
      toast.success('Current session updated');
    } catch {
      toast.error('Failed to set current session');
    }
  };

  return (
    <div className="space-y-3">
      {/* ACTION BAR */}
      <div className="flex justify-end">
        <button 
          onClick={() => setIsCreateOpen(true)} 
          className="flex items-center justify-center gap-1.5 rounded-md bg-yellow-500 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          New Session
        </button>
      </div>

      {/* SESSIONS LIST */}
      {isLoading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
          <Calendar className="mx-auto mb-2 h-8 w-8 text-zinc-700" strokeWidth={1.5} />
          <h3 className="text-[13px] font-semibold text-white">No sessions yet</h3>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            Create a session to start managing academic terms.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800/60">
          {sessions.map((session) => (
            <div 
              key={session._id} 
              className="flex flex-col gap-2 px-3 py-2.5 transition-colors hover:bg-zinc-800/30 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-zinc-800 text-zinc-400">
                  <Calendar className="h-3.5 w-3.5" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-mono text-[12.5px] font-bold text-white">
                      {session.name}
                    </p>
                    {session.isCurrent && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded border border-green-500/20 bg-green-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-500">
                        <CheckCircle2 className="h-2.5 w-2.5" strokeWidth={2.6} />
                        Active
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[10.5px] text-zinc-500">
                    {new Date(session.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' '}—{' '}
                    {new Date(session.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {!session.isCurrent && (
                <button 
                  onClick={() => handleSetCurrent(session._id)}
                  disabled={isSettingCurrent}
                  className="shrink-0 self-start rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-yellow-500 transition-colors hover:border-yellow-500/50 hover:bg-yellow-500/5 disabled:opacity-50 sm:self-auto"
                >
                  Set as Current
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      <ModalShell 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        title="Create Session"
      >
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">
              Session Name
            </label>
            <input 
              required 
              type="text" 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })} 
              placeholder="e.g. 2025/2026" 
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[12px] text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-yellow-500/50" 
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                Start Date
              </label>
              <input 
                required 
                type="date" 
                value={formData.startDate} 
                onChange={e => setFormData({ ...formData, startDate: e.target.value })} 
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[12px] text-white outline-none transition-colors focus:border-yellow-500/50 [color-scheme:dark]" 
              />
            </div>
            <div>
              <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                End Date
              </label>
              <input 
                required 
                type="date" 
                value={formData.endDate} 
                onChange={e => setFormData({ ...formData, endDate: e.target.value })} 
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[12px] text-white outline-none transition-colors focus:border-yellow-500/50 [color-scheme:dark]" 
              />
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={isCreating} 
              className="w-full rounded-md bg-yellow-500 py-2 text-[11.5px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400 disabled:opacity-50"
            >
              {isCreating ? 'Saving...' : 'Create Session'}
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
};

/* =========================================
   TAB 2: PROMOTIONS
   ========================================= */
const PromotionsTab = () => {
  const toast = useToast();
  
  const [fromLevel, setFromLevel] = useState('');
  const [toLevel, setToLevel] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { data: deptsData } = useListDepartmentsQuery();
  const [promoteStudents, { isLoading }] = usePromoteStudentsMutation();

  const levelOptions = [
    { value: '100', label: '100 Level' },
    { value: '200', label: '200 Level' },
    { value: '300', label: '300 Level' },
    { value: '400', label: '400 Level' },
  ];

  const toLevelOptions = [
    { value: '200', label: '200 Level' },
    { value: '300', label: '300 Level' },
    { value: '400', label: '400 Level' },
    { value: '500', label: '500 Level' },
  ];

  const deptOptions = [
    { value: '', label: 'All Departments (Global)' },
    ...(deptsData?.departments || []).map(d => ({ value: d._id, label: d.name })),
  ];

  const handlePromote = async () => {
    try {
      const result = await promoteStudents({ fromLevel, toLevel, departmentId }).unwrap();
      toast.success(`Successfully promoted ${result.modified} students!`);
      setIsConfirmOpen(false);
      setFromLevel('');
      setToLevel('');
      setDepartmentId('');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to promote students');
    }
  };

  const deptLabel = departmentId
    ? deptOptions.find(d => d.value === departmentId)?.label
    : 'all departments';

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

      {/* FORM */}
      <div className="lg:col-span-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3.5">
          <h2 className="mb-1 text-[13px] font-semibold text-white">Promote Students</h2>
          <p className="mb-3 text-[10.5px] text-zinc-500">
            Move students from one level to the next. This updates their profile instantly.
          </p>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <CustomSelect 
                label="From Level"
                placeholder="Select..."
                options={levelOptions}
                value={fromLevel}
                onChange={setFromLevel}
              />
              <CustomSelect 
                label="To Level"
                placeholder="Select..."
                options={toLevelOptions}
                value={toLevel}
                onChange={setToLevel}
              />
            </div>

            <CustomSelect 
              label="Scope (Department)"
              placeholder="All departments"
              options={deptOptions}
              value={departmentId}
              onChange={setDepartmentId}
              searchable
            />

            <button 
              onClick={() => {
                if (!fromLevel || !toLevel) return toast.error('Select both from and to levels');
                setIsConfirmOpen(true);
              }}
              className="w-full rounded-md bg-yellow-500 py-2 text-[11.5px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400"
            >
              Execute Promotion
            </button>
          </div>
        </div>
      </div>

      {/* WARNING */}
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3.5">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-red-500/10 text-red-500">
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.2} />
            </div>
            <h3 className="text-[12.5px] font-semibold text-white">Destructive Action</h3>
          </div>
          <p className="text-[10.5px] leading-relaxed text-zinc-400">
            Promotions will permanently change the level of all matched students.{' '}
            <strong className="text-white">This cannot be undone.</strong>{' '}
            Ensure results for the session have been fully uploaded and published before promoting.
          </p>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      <ModalShell 
        isOpen={isConfirmOpen} 
        onClose={() => setIsConfirmOpen(false)} 
        title="Confirm Promotion"
        maxWidth="max-w-md"
      >
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle className="h-7 w-7 text-red-500" strokeWidth={2} />
          </div>
          <p className="mb-4 text-[12px] leading-relaxed text-zinc-300">
            Are you sure you want to promote all{' '}
            <strong className="text-white">{fromLevel} Level</strong> students to{' '}
            <strong className="text-white">{toLevel} Level</strong>{' '}
            {departmentId ? (
              <>in <strong className="text-white">{deptLabel}</strong></>
            ) : (
              <>across <strong className="text-white">ALL departments</strong></>
            )}?
          </p>

          <div className="flex gap-2">
            <button 
              onClick={() => setIsConfirmOpen(false)} 
              className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
            >
              Cancel
            </button>
            <button 
              onClick={handlePromote} 
              disabled={isLoading} 
              className="flex-1 rounded-md bg-red-600 py-2 text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-red-500 disabled:opacity-50"
            >
              {isLoading ? 'Promoting...' : 'Yes, Promote'}
            </button>
          </div>
        </div>
      </ModalShell>
    </div>
  );
};

export default SessionsPromotions;