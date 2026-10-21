// src/pages/admin/Appointments.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  BookOpen, 
  GraduationCap, 
  AlertCircle,
  ChevronDown,
  Check,
  UserX,
  Search,
} from 'lucide-react';
import { useToast } from '../../components/Toast';

// API Hooks
import { 
  useListUsersQuery, 
  useListDepartmentsQuery,
  useAppointCourseRepMutation,
  useAppointStudentAdminMutation,
  useRevokeStudentAdminMutation,
  useAppointHodMutation,
  useRevokeHodMutation,
} from '../../features/adminApiSlice';
import { useListOfferingsQuery } from '../../features/academicApiSlice';

// =========================================
// SKELETON
// =========================================
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-zinc-800 ${className}`} />
);

// =========================================
// CUSTOM DROPDOWN (optionally searchable)
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

          <ul className="max-h-48 overflow-y-auto custom-scrollbar py-0.5">
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
// MAIN COMPONENT
// =========================================
const Appointments = () => {
  const [activeTab, setActiveTab] = useState('course_rep');

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const tabs = [
    { id: 'course_rep',    label: 'Course Reps',    short: 'Reps',   icon: BookOpen },
    { id: 'student_admin', label: 'Student Admins', short: 'Admins', icon: GraduationCap },
    { id: 'hod',           label: 'HODs',           short: 'HODs',   icon: ShieldCheck },
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
            Role{' '}
            <span className="bg-gradient-to-r from-yellow-200 to-yellow-500 bg-clip-text text-transparent">
              Appointments
            </span>
          </h1>
          <p className="mt-0.5 text-[11.5px] text-zinc-500">
            Delegate responsibilities to students and lecturers.
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

        {/* TAB CONTENT */}
        <div>
          {activeTab === 'course_rep' && <CourseRepTab />}
          {activeTab === 'student_admin' && <StudentAdminTab />}
          {activeTab === 'hod' && <HodTab />}
        </div>

      </div>
    </div>
  );
};

/* =========================================
   SHARED: LIST CONTAINER
   ========================================= */
const ListShell = ({ title, count, subtitle, children }) => (
  <div>
    <div className="mb-2 flex items-end justify-between px-1">
      <div className="min-w-0">
        <h2 className="truncate text-[14.5px] font-serif tracking-tight text-white">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 truncate text-[10.5px] text-zinc-500">{subtitle}</p>
        )}
      </div>
      {typeof count === 'number' && (
        <span className="shrink-0 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          {count}
        </span>
      )}
    </div>
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800/60">
      {children}
    </div>
  </div>
);

const EmptyRow = ({ message }) => (
  <div className="px-3 py-6 text-center text-[11.5px] text-zinc-500">{message}</div>
);

/* =========================================
   TAB 1: COURSE REPS
   ========================================= */
const CourseRepTab = () => {
  const toast = useToast();
  const [userId, setUserId] = useState('');
  const [offeringId, setOfferingId] = useState('');

  const { data: usersData } = useListUsersQuery({ role: 'student', limit: 100 });
  const { data: offeringsData } = useListOfferingsQuery({ limit: 100 });
  const { data: repsData, isLoading: isRepsLoading } = useListUsersQuery({ extraRole: 'course_rep', limit: 100 });

  const [appointRep, { isLoading: isAppointing }] = useAppointCourseRepMutation();

  const studentOptions = (usersData?.users || []).map(u => ({
    value: u.id,
    label: `${u.name}${u.matricNumber ? ` (${u.matricNumber})` : ''}`,
  }));
  const offeringOptions = (offeringsData?.offerings || []).map(o => ({
    value: o.id,
    label: `${o.course?.code || '?'} - ${o.course?.title || 'Unknown'} (${o.level}L)`,
  }));

  const reps = repsData?.users || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId || !offeringId) return toast.error('Select a student and a course offering');
    try {
      await appointRep({ userId, courseOfferingId: offeringId }).unwrap();
      toast.success('Course rep appointed successfully');
      setUserId('');
      setOfferingId('');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to appoint rep');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* FORM */}
      <div className="lg:col-span-1">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 lg:sticky lg:top-24">
          <h2 className="mb-3 text-[13px] font-semibold text-white">Appoint Course Rep</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <CustomSelect 
              label="Student" 
              placeholder="Choose student..." 
              options={studentOptions} 
              value={userId} 
              onChange={setUserId} 
              searchable 
            />
            <CustomSelect 
              label="Course Offering" 
              placeholder="Choose offering..." 
              options={offeringOptions} 
              value={offeringId} 
              onChange={setOfferingId} 
              searchable 
            />
            <button 
              type="submit" 
              disabled={isAppointing} 
              className="w-full rounded-md bg-yellow-500 py-2 text-[11.5px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400 disabled:opacity-50"
            >
              {isAppointing ? 'Appointing...' : 'Appoint Rep'}
            </button>
          </form>
        </div>
      </div>

      {/* LIST */}
      <div className="lg:col-span-2">
        <ListShell 
          title="Active Course Reps" 
          count={reps.length}
          subtitle="Can upload materials, create quizzes, and set exam windows for their courses."
        >
          {isRepsLoading ? (
            <div className="space-y-2 p-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : reps.length === 0 ? (
            <EmptyRow message="No course reps appointed yet." />
          ) : (
            reps.map((u) => (
              <div 
                key={u.id} 
                className="flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-zinc-800/30"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-zinc-800 font-mono text-[10px] font-bold text-zinc-400">
                    {u.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-white">{u.name}</p>
                    <p className="truncate text-[10.5px] font-mono text-zinc-500">
                      {u.matricNumber || 'No matric'} · {u.level}L
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded border border-yellow-500/30 bg-yellow-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-500">
                  Rep
                </span>
              </div>
            ))
          )}
        </ListShell>
      </div>
    </div>
  );
};

/* =========================================
   TAB 2: STUDENT ADMINS
   ========================================= */
const StudentAdminTab = () => {
  const toast = useToast();
  const [userId, setUserId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [levels, setLevels] = useState([]);

  const { data: usersData } = useListUsersQuery({ role: 'student', limit: 100 });
  const { data: deptsData } = useListDepartmentsQuery();
  const { data: adminsData, isLoading: isLoadingAdmins } = useListUsersQuery({ extraRole: 'student_admin', limit: 100 });

  const [appointAdmin, { isLoading: isAppointing }] = useAppointStudentAdminMutation();
  const [revokeAdmin, { isLoading: isRevoking }] = useRevokeStudentAdminMutation();

  const studentOptions = (usersData?.users || []).map(u => ({
    value: u.id,
    label: `${u.name} (${u.level}L)`,
  }));
  const deptOptions = (deptsData?.departments || []).map(d => ({
    value: d._id,
    label: d.name,
  }));

  const admins = adminsData?.users || [];
  const allLevels = [100, 200, 300, 400, 500];

  const handleLevelToggle = (level) => {
    setLevels(prev => prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId || !departmentId || levels.length === 0) {
      return toast.error('Select a student, department, and at least one level');
    }
    try {
      await appointAdmin({ userId, departmentId, levels }).unwrap();
      toast.success('Student Admin appointed successfully');
      setUserId(''); setDepartmentId(''); setLevels([]);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to appoint student admin');
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm("Revoke this student's admin privileges?")) return;
    try {
      await revokeAdmin(id).unwrap();
      toast.success('Student admin revoked');
    } catch {
      toast.error('Failed to revoke admin');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* FORM */}
      <div className="lg:col-span-1">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 lg:sticky lg:top-24">
          <h2 className="mb-3 text-[13px] font-semibold text-white">Appoint Student Admin</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <CustomSelect 
              label="Student" 
              placeholder="Choose student..." 
              options={studentOptions} 
              value={userId} 
              onChange={setUserId} 
              searchable 
            />
            <CustomSelect 
              label="Department" 
              placeholder="Choose department..." 
              options={deptOptions} 
              value={departmentId} 
              onChange={setDepartmentId} 
              searchable 
            />

            <div>
              <label className="mb-1.5 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                Scope: Levels
              </label>
              <div className="flex gap-1.5">
                {allLevels.map(lvl => {
                  const active = levels.includes(lvl);
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => handleLevelToggle(lvl)}
                      className={`flex-1 rounded-md border py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        active
                          ? 'border-yellow-500 bg-yellow-500 text-zinc-950'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      {lvl}L
                    </button>
                  );
                })}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isAppointing} 
              className="w-full rounded-md bg-yellow-500 py-2 text-[11.5px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400 disabled:opacity-50"
            >
              {isAppointing ? 'Appointing...' : 'Appoint Admin'}
            </button>
          </form>
        </div>
      </div>

      {/* LIST */}
      <div className="lg:col-span-2">
        <ListShell 
          title="Active Student Admins" 
          count={admins.length}
          subtitle="Can add courses to the catalog for their assigned department and levels."
        >
          {isLoadingAdmins ? (
            <div className="space-y-2 p-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : admins.length === 0 ? (
            <EmptyRow message="No student admins appointed yet." />
          ) : (
            admins.map((u) => (
              <div 
                key={u.id} 
                className="flex flex-col gap-2 px-3 py-2.5 transition-colors hover:bg-zinc-800/30 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-zinc-800 font-mono text-[10px] font-bold text-zinc-400">
                    {u.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-white">{u.name}</p>
                    <p className="truncate text-[10.5px] text-zinc-500">
                      {u.department?.name || 'No dept'} · Levels{' '}
                      {u.scope?.levels?.length ? u.scope.levels.join(', ') : '—'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => handleRevoke(u.id)}
                  disabled={isRevoking}
                  className="flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                >
                  <UserX className="h-3 w-3" strokeWidth={2.2} /> Revoke
                </button>
              </div>
            ))
          )}
        </ListShell>
      </div>
    </div>
  );
};

/* =========================================
   TAB 3: HOD
   ========================================= */
const HodTab = () => {
  const toast = useToast();
  const [userId, setUserId] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  const { data: usersData } = useListUsersQuery({ role: 'lecturer', limit: 100 });
  const { data: deptsData } = useListDepartmentsQuery();
  const { data: hodsData, isLoading: isLoadingHods } = useListUsersQuery({ extraRole: 'hod', limit: 100 });

  const [appointHod, { isLoading: isAppointing }] = useAppointHodMutation();
  const [revokeHod, { isLoading: isRevoking }] = useRevokeHodMutation();

  const lecturerOptions = (usersData?.users || []).map(u => ({
    value: u.id,
    label: `${u.name}${u.staffId ? ` (${u.staffId})` : ''}`,
  }));
  const deptOptions = (deptsData?.departments || []).map(d => ({
    value: d._id,
    label: d.name,
  }));

  const hods = hodsData?.users || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId || !departmentId) return toast.error('Select a lecturer and a department');
    try {
      await appointHod({ userId, departmentId }).unwrap();
      toast.success('HOD appointed successfully');
      setUserId(''); setDepartmentId('');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to appoint HOD');
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm('Revoke this HOD?')) return;
    try {
      await revokeHod(id).unwrap();
      toast.success('HOD revoked');
    } catch {
      toast.error('Failed to revoke HOD');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* FORM */}
      <div className="lg:col-span-1">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 lg:sticky lg:top-24">
          <h2 className="mb-3 text-[13px] font-semibold text-white">Appoint HOD</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <CustomSelect 
              label="Lecturer" 
              placeholder="Choose lecturer..." 
              options={lecturerOptions} 
              value={userId} 
              onChange={setUserId} 
              searchable 
            />
            <CustomSelect 
              label="Department" 
              placeholder="Choose department..." 
              options={deptOptions} 
              value={departmentId} 
              onChange={setDepartmentId} 
              searchable 
            />
            <button 
              type="submit" 
              disabled={isAppointing} 
              className="w-full rounded-md bg-yellow-500 py-2 text-[11.5px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400 disabled:opacity-50"
            >
              {isAppointing ? 'Appointing...' : 'Appoint HOD'}
            </button>
          </form>
        </div>
      </div>

      {/* LIST */}
      <div className="lg:col-span-2 space-y-3">
        {/* Inline warning */}
        <div className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" strokeWidth={2.2} />
          <p className="text-[11px] leading-relaxed text-zinc-300">
            Only <strong className="text-white">one active HOD</strong> per department. HODs can approve results and manage offerings within their department.
          </p>
        </div>

        <ListShell 
          title="Active HODs" 
          count={hods.length}
          subtitle="Heads of Department across all faculties."
        >
          {isLoadingHods ? (
            <div className="space-y-2 p-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : hods.length === 0 ? (
            <EmptyRow message="No HODs appointed yet." />
          ) : (
            hods.map((u) => (
              <div 
                key={u.id} 
                className="flex flex-col gap-2 px-3 py-2.5 transition-colors hover:bg-zinc-800/30 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-zinc-800 font-mono text-[10px] font-bold text-zinc-400">
                    {u.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-white">{u.name}</p>
                    <p className="truncate text-[10.5px] text-zinc-500">
                      {u.department?.name || 'No dept'} · {u.staffId || 'No staff ID'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => handleRevoke(u.id)}
                  disabled={isRevoking}
                  className="flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                >
                  <UserX className="h-3 w-3" strokeWidth={2.2} /> Revoke
                </button>
              </div>
            ))
          )}
        </ListShell>
      </div>
    </div>
  );
};

export default Appointments;