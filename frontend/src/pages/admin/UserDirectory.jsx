// src/pages/admin/UserDirectory.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Plus, MoreVertical, ShieldAlert, UserCheck, UserX, Trash2,
  ChevronLeft, ChevronRight, GraduationCap, Users as UsersIcon, X, Award,
  AlertTriangle, Loader2, ChevronDown, Check, Building2,
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import {
  useListUsersQuery, useSetUserStatusMutation, useDeleteUserMutation,
  useCreateLecturerMutation, useListDepartmentsQuery,
} from '../../features/adminApiSlice';
import { useGetStudentResultsQuery } from '../../features/resultApiSlice';

/* ───────────────────────────────────────────── */
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-zinc-800 ${className}`} />
);

/* ─── Select ─────────────────────────────────── */
const Select = ({ options, value, onChange, placeholder }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative w-full min-w-0 sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-1 rounded-md border px-2.5 py-1.5 text-left text-[11.5px] font-medium transition-colors sm:w-auto ${
          open
            ? 'border-yellow-500/50 bg-zinc-950 text-zinc-100 ring-1 ring-yellow-500/30'
            : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700'
        }`}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 text-zinc-500 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          strokeWidth={2}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-zinc-700 bg-zinc-900 py-0.5 shadow-2xl shadow-black/60 sm:left-auto sm:right-0 sm:min-w-full">
          <ul className="max-h-60 overflow-y-auto">
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[11.5px] transition-colors ${
                      active
                        ? 'bg-yellow-500/10 font-semibold text-yellow-500'
                        : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {active && (
                      <Check className="h-3 w-3 shrink-0" strokeWidth={2.6} />
                    )}
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

/* ─── Role tabs (Students first by default) ── */
const RoleTabs = ({ value, onChange }) => {
  const tabs = [
    { value: 'student', label: 'Students' },
    { value: 'lecturer', label: 'Lecturers' },
    { value: 'admin', label: 'Admins' },
    { value: '', label: 'All' },
  ];
  return (
    <div className="grid grid-cols-4 gap-0.5 rounded-md border border-zinc-800 bg-zinc-950 p-0.5 sm:flex sm:items-center">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`whitespace-nowrap rounded px-1 py-1 text-center text-[10px] font-semibold transition-colors sm:px-2 sm:text-[11px] ${
            value === t.value
              ? 'bg-yellow-500 text-zinc-950'
              : 'text-zinc-400 hover:text-zinc-100'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
};

/* ─── Badges & dots ─────────────────────────── */
const RoleBadge = ({ role }) => {
  const styles =
    role === 'admin'
      ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-500'
      : role === 'lecturer'
      ? 'border-sky-500/30 bg-sky-500/10 text-sky-400'
      : 'border-zinc-700 bg-zinc-800 text-zinc-400';
  const Icon =
    role === 'admin'
      ? ShieldAlert
      : role === 'lecturer'
      ? UsersIcon
      : GraduationCap;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${styles}`}
    >
      <Icon className="h-2.5 w-2.5" strokeWidth={2.4} />
      {role}
    </span>
  );
};

const StatusDot = ({ active }) => (
  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium">
    <span
      className={`h-1.5 w-1.5 rounded-full ${
        active
          ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]'
          : 'bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.15)]'
      }`}
    />
    <span className={active ? 'text-emerald-400' : 'text-red-400'}>
      {active ? 'Active' : 'Suspended'}
    </span>
  </span>
);

/* ─── Field ─────────────────────────────────── */
const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
      {label}
    </span>
    {children}
  </label>
);

/* ─── Create lecturer modal ─────────────────── */
const CreateLecturerModal = ({ isOpen, onClose }) => {
  const toast = useToast();
  const [createLecturer, { isLoading }] = useCreateLecturerMutation();
  const { data: deptsData } = useListDepartmentsQuery();
  const [formData, setFormData] = useState({
    name: '', email: '', staffId: '', department: '',
  });

  useEffect(() => {
    if (!isOpen) setFormData({ name: '', email: '', staffId: '', department: '' });
  }, [isOpen]);

  if (!isOpen) return null;

  const set = (k, v) => setFormData((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createLecturer(formData).unwrap();
      toast.success('Lecturer account created successfully');
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to create lecturer');
    }
  };

  const inputCls =
    'w-full rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-[12.5px] text-zinc-100 outline-none transition-colors focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 placeholder:text-zinc-600';

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border-t border-zinc-800 bg-zinc-900 shadow-2xl sm:rounded-2xl sm:border"
      >
        <div
          className="flex items-start justify-between gap-3 border-b border-zinc-800 px-4 pb-3"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)' }}
        >
          <div>
            <h2 className="text-[14.5px] font-semibold tracking-tight text-white">
              Add a lecturer
            </h2>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              A staff account and temporary password will be created.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          <Field label="Full name">
            <input required value={formData.name} onChange={(e) => set('name', e.target.value)} className={inputCls} placeholder="Dr. Jane Doe" />
          </Field>
          <Field label="Email address">
            <input required type="email" value={formData.email} onChange={(e) => set('email', e.target.value)} className={inputCls} placeholder="jane@university.edu" />
          </Field>
          <Field label="Staff ID">
            <input required value={formData.staffId} onChange={(e) => set('staffId', e.target.value)} className={`${inputCls} uppercase`} placeholder="STF-001" />
          </Field>
          <Field label="Department">
            <select required value={formData.department} onChange={(e) => set('department', e.target.value)} className={`${inputCls} appearance-none`}>
              <option value="" disabled>Select department</option>
              {deptsData?.departments?.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <div
          className="flex items-center justify-end gap-2 border-t border-zinc-800 bg-zinc-950/40 px-4 py-3"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
        >
          <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-[12px] font-semibold text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white">
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className="inline-flex items-center gap-1.5 rounded-md bg-yellow-500 px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400 disabled:opacity-60">
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isLoading ? 'Creating…' : 'Create account'}
          </button>
        </div>
      </form>
    </div>
  );
};

/* ─── User details panel ────────────────────── */
const UserDetailsPanel = ({ user, onClose, onToggleStatus, onDelete }) => {
  const { data: resultData, isLoading } = useGetStudentResultsQuery(user?.id, {
    skip: !user || user.role !== 'student',
  });
  if (!user) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={onClose} />
      <aside
        className="
          fixed inset-x-0 bottom-0 z-50 flex h-[85dvh] flex-col overflow-hidden rounded-t-2xl border-t border-zinc-800 bg-zinc-950 shadow-2xl
          lg:inset-y-0 lg:left-auto lg:right-0 lg:h-full lg:w-[380px] lg:rounded-none lg:border-l lg:border-t-0
          animate-in slide-in-from-bottom-10 duration-200 lg:slide-in-from-right-10
        "
      >
        <div
          className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-4 pb-3"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)' }}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-800 text-[12px] font-bold text-yellow-500">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt="" className="h-full w-full object-cover" />
              ) : (
                user.name.charAt(0)
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-white">{user.name}</p>
              <p className="truncate text-[10.5px] text-zinc-500">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white">
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
            <MetaBox label="Role" value={user.role} capitalize />
            <MetaBox
              label={user.role === 'student' ? 'Level' : 'Staff ID'}
              value={user.role === 'student' ? `${user.level || '—'} Level` : user.staffId || '—'}
            />
            <MetaBox label="Department" value={user.department?.name || '—'} colSpan={2} icon={<Building2 className="h-3 w-3" strokeWidth={1.9} />} />
          </div>

          {user.role === 'student' &&
            (isLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-zinc-500">
                <Loader2 className="h-6 w-6 animate-spin text-yellow-500" />
                <p className="text-[11px]">Fetching academic records…</p>
              </div>
            ) : !resultData ? (
              <div className="rounded-lg border border-dashed border-zinc-800 py-8 text-center text-[11px] text-zinc-500">
                No results on record
              </div>
            ) : (
              <>
                <div className="relative overflow-hidden rounded-lg border border-zinc-800 bg-gradient-to-br from-yellow-500 to-yellow-600 p-3.5 text-zinc-950">
                  <Award className="absolute -right-3 -top-3 h-16 w-16 text-zinc-950/10" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-950/70">Cumulative GPA</p>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold tracking-tight">{resultData.cumulative?.gpa?.toFixed(2) || '0.00'}</span>
                    <span className="text-[11px] text-zinc-950/60">/ 5.00</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-950/15 pt-2.5">
                    <div>
                      <p className="text-[9.5px] font-semibold uppercase tracking-wider text-zinc-950/60">Credits</p>
                      <p className="text-[12.5px] font-bold">{resultData.cumulative?.units || 0}</p>
                    </div>
                    <div>
                      <p className="text-[9.5px] font-semibold uppercase tracking-wider text-zinc-950/60">Courses</p>
                      <p className="text-[12.5px] font-bold">{resultData.results?.length || 0}</p>
                    </div>
                  </div>
                </div>

                {resultData.carryovers?.length > 0 && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-red-400">
                      <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
                      Carryovers ({resultData.carryovers.length})
                    </p>
                    <div className="space-y-1">
                      {resultData.carryovers.map((co, i) => (
                        <div key={i} className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1.5">
                          <span className="font-mono text-[11.5px] text-zinc-200">{co.courseCode}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">{co.latestGrade}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ))}

          {user.role !== 'student' && (
            <div className="rounded-lg border border-dashed border-zinc-800 py-8 text-center text-[11px] text-zinc-500">
              No academic records for {user.role} accounts.
            </div>
          )}
        </div>

        <div
          className="shrink-0 border-t border-zinc-800 bg-zinc-950 px-4 py-3"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
        >
          <div className="flex gap-2">
            <button
              onClick={() => onToggleStatus(user.id, user.isActive)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-[11.5px] font-bold uppercase tracking-wider transition-colors ${
                user.isActive
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              {user.isActive ? <UserX className="h-3.5 w-3.5" strokeWidth={2} /> : <UserCheck className="h-3.5 w-3.5" strokeWidth={2} />}
              {user.isActive ? 'Suspend' : 'Activate'}
            </button>
            <button
              onClick={() => onDelete(user.id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11.5px] font-bold uppercase tracking-wider text-red-400 transition-colors hover:bg-red-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              Delete
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

const MetaBox = ({ label, value, colSpan = 1, capitalize, icon }) => (
  <div className={`rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-2 ${colSpan === 2 ? 'col-span-2' : ''}`}>
    <p className="mb-0.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</p>
    <p className={`flex items-center gap-1 text-[12px] font-medium text-white ${capitalize ? 'capitalize' : ''}`}>
      {icon}
      <span className="truncate">{value}</span>
    </p>
  </div>
);

/* ───────────────────────────────────────────── */
/* MAIN                                         */
/* ───────────────────────────────────────────── */
const UserDirectory = () => {
  const toast = useToast();

  // ⬇ default is 'student'
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('student');
  const [deptFilter, setDeptFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [page, setPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const { data: deptsData } = useListDepartmentsQuery();
  const { data: usersData, isLoading } = useListUsersQuery({
    search, role: roleFilter, department: deptFilter, level: levelFilter, page, limit: 10,
  });

  const [setUserStatus] = useSetUserStatusMutation();
  const [deleteUser] = useDeleteUserMutation();

  const users = usersData?.users || [];
  const totalPages = usersData?.pages || 1;
  const totalUsers = usersData?.total || 0;

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await setUserStatus({ id, isActive: !currentStatus }).unwrap();
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'}`);
      setActiveDropdown(null);
      if (selectedUser?.id === id) setSelectedUser((p) => ({ ...p, isActive: !currentStatus }));
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure? This action cannot be undone.')) return;
    try {
      await deleteUser(id).unwrap();
      toast.success('User deleted permanently');
      setActiveDropdown(null);
      setSelectedUser(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete user');
    }
  };

  const deptOptions = [
    { value: '', label: 'All depts' },
    ...(deptsData?.departments || []).map((d) => ({ value: d._id, label: d.name })),
  ];
  const levelOptions = [
    { value: '', label: 'All levels' },
    ...[100, 200, 300, 400, 500].map((l) => ({ value: l, label: `${l}L` })),
  ];

  return (
    // ⬇ full-width container: no px, no mx (only -mx-4 on mobile to break out of parent padding)
    <div
      className={`-mx-4 min-h-screen bg-zinc-950 pb-8 transition-all duration-200 md:mx-0 md:bg-transparent ${
        selectedUser ? 'lg:mr-[380px]' : ''
      }`}
    >
      {/* HEADER — has its own px-4 so text isn't jammed against the edge */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 md:pt-0">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-serif tracking-tight text-white md:text-2xl">
            User Directory
          </h1>
          <p className="mt-0.5 text-[11.5px] text-zinc-500">
            <span className="font-semibold text-zinc-300">{totalUsers}</span>{' '}
            {totalUsers === 1 ? 'account' : 'accounts'} · Manage students, lecturers &amp; staff
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-yellow-500 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400 md:px-3 md:py-2 md:text-[12px]"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          <span className="hidden sm:inline">Add Lecturer</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* PANEL — edge to edge on mobile; cells have their own internal padding */}
      <div className="mt-3 overflow-hidden border-y border-zinc-800 bg-zinc-900 md:rounded-2xl md:border">
        {/* TOOLBAR — search row, tabs row, selects row (stacked on mobile) */}
        <div className="space-y-2 border-b border-zinc-800 p-2.5 sm:flex sm:items-center sm:gap-2 sm:space-y-0">
          <div className="relative w-full min-w-0 sm:flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" strokeWidth={2} />
            <input
              type="text"
              placeholder="Search by name, email, or ID…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 py-1.5 pl-8 pr-3 text-[12px] text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30"
            />
          </div>

          <div className="space-y-2 sm:flex sm:items-center sm:gap-1.5 sm:space-y-0">
            <RoleTabs
              value={roleFilter}
              onChange={(v) => { setRoleFilter(v); setPage(1); }}
            />
            <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-1.5">
              <Select
                options={deptOptions}
                value={deptFilter}
                onChange={(v) => { setDeptFilter(v); setPage(1); }}
              />
              <Select
                options={levelOptions}
                value={levelFilter}
                onChange={(v) => { setLevelFilter(v); setPage(1); }}
              />
            </div>
          </div>
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block">
          <table className="w-full text-left text-[12.5px] text-zinc-300">
            <thead className="bg-zinc-950/60 text-[9.5px] uppercase tracking-[0.14em] text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-semibold">User</th>
                <th className="px-4 py-2 font-semibold">Role</th>
                <th className="px-4 py-2 font-semibold">Level / Dept</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {isLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-3 w-32" />
                          <Skeleton className="h-2.5 w-40" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-2.5"><Skeleton className="h-3 w-24" /></td>
                    <td className="px-4 py-2.5"><Skeleton className="h-3 w-16" /></td>
                    <td className="px-2 py-2.5" />
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center text-[12px] text-zinc-500">
                    No users match your filters.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`cursor-pointer transition-colors hover:bg-zinc-800/40 ${
                      selectedUser?.id === user.id ? 'bg-zinc-800/50' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-800">
                          {user.profilePicture ? (
                            <img src={user.profilePicture} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[11px] font-bold text-yellow-500">{user.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[12.5px] font-medium text-white">{user.name}</p>
                          <p className="truncate text-[10.5px] text-zinc-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5"><RoleBadge role={user.role} /></td>
                    <td className="px-4 py-2.5">
                      <p className="text-[12px] text-zinc-300">
                        {user.role === 'student' ? `${user.level} Level` : user.staffId || '—'}
                      </p>
                      <p className="truncate text-[10.5px] text-zinc-500">{user.department?.name || 'No Dept'}</p>
                    </td>
                    <td className="px-4 py-2.5"><StatusDot active={user.isActive} /></td>
                    <td className="relative px-2 py-2.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(activeDropdown === user.id ? null : user.id);
                        }}
                        className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
                      >
                        <MoreVertical className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>

                      {activeDropdown === user.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); }} />
                          <div className="absolute right-2 top-9 z-20 w-44 overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 py-0.5 shadow-2xl shadow-black/60">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleStatus(user.id, user.isActive); }}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11.5px] text-zinc-300 transition-colors hover:bg-zinc-800"
                            >
                              {user.isActive ? <UserX className="h-3.5 w-3.5" strokeWidth={2} /> : <UserCheck className="h-3.5 w-3.5" strokeWidth={2} />}
                              {user.isActive ? 'Suspend account' : 'Activate account'}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(user.id); }}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11.5px] text-red-400 transition-colors hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                              Delete permanently
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE LIST — full width, edge to edge */}
        <div className="divide-y divide-zinc-800/70 md:hidden">
          {isLoading ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2.5">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2.5 w-48" />
                </div>
              </div>
            ))
          ) : users.length === 0 ? (
            <div className="px-4 py-12 text-center text-[12px] text-zinc-500">
              No users match your filters.
            </div>
          ) : (
            users.map((user) => (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors active:bg-zinc-800/60"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-800">
                  {user.profilePicture ? (
                    <img src={user.profilePicture} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[11px] font-bold text-yellow-500">{user.name.charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[12.5px] font-medium text-white">{user.name}</p>
                    <RoleBadge role={user.role} />
                  </div>
                  <p className="mt-0.5 truncate text-[10.5px] text-zinc-500">
                    {user.email}
                    {user.department?.name && (
                      <>
                        {' · '}
                        <span className="text-zinc-600">{user.department.name}</span>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-600" strokeWidth={2} />
                </div>
              </button>
            ))
          )}
        </div>

        {/* PAGINATION */}
        <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950/40 px-3 py-2">
          <span className="text-[11px] text-zinc-500">
            Showing <strong className="text-zinc-200">{users.length}</strong> of {totalUsers}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-6 w-6 items-center justify-center rounded border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
            </button>
            <span className="px-1.5 text-[11px] font-medium text-zinc-300">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-6 w-6 items-center justify-center rounded border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </div>

      <CreateLecturerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      {selectedUser && (
        <UserDetailsPanel
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};

export default UserDirectory;