// src/pages/admin/CourseCatalog.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Pencil, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  CalendarDays,
} from 'lucide-react';
import { useToast } from '../../components/Toast';

// API Hooks
import { useListDepartmentsQuery } from '../../features/adminApiSlice';
import { 
  useListCoursesQuery, 
  useCreateCourseMutation, 
  useUpdateCourseMutation,
  useDeleteCourseMutation,
} from '../../features/academicApiSlice';

// =========================================
// SKELETON
// =========================================
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-zinc-800 ${className}`} />
);

// =========================================
// CUSTOM DROPDOWN (searchable + compact)
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
const ModalShell = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
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
// COURSE MODAL (Create & Edit)
// =========================================
const CourseModal = ({ isOpen, onClose, initialData }) => {
  const toast = useToast();
  const isEditing = !!initialData;

  const { data: deptsData } = useListDepartmentsQuery();
  const [createCourse, { isLoading: isCreating }] = useCreateCourseMutation();
  const [updateCourse, { isLoading: isUpdating }] = useUpdateCourseMutation();

  const [formData, setFormData] = useState({
    code: '',
    title: '',
    units: '',
    department: '',
    level: '100',
    session: '2024/2025',
    semester: 'first',
    description: '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        code: initialData?.code || '',
        title: initialData?.title || '',
        units: initialData?.units || '',
        department: initialData?.department?._id || initialData?.department || '',
        level: initialData?.level?.toString() || '100',
        session: initialData?.session || '2024/2025',
        semester: initialData?.semester || 'first',
        description: initialData?.description || '',
      });
    }
  }, [isOpen, initialData]);

  const deptOptions = (deptsData?.departments || []).map(d => ({ value: d._id, label: d.name }));
  const levelOptions = [100, 200, 300, 400, 500].map(l => ({ value: l.toString(), label: `${l} Level` }));
  const semesterOptions = [
    { value: 'first', label: 'First Semester' },
    { value: 'second', label: 'Second Semester' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        units: Number(formData.units),
        level: Number(formData.level),
      };

      if (isEditing) {
        await updateCourse({ id: initialData.id, ...payload }).unwrap();
        toast.success('Course updated successfully');
      } else {
        await createCourse(payload).unwrap();
        toast.success('Course created successfully');
      }
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save course');
    }
  };

  return (
    <ModalShell 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEditing ? 'Edit Course' : 'Add New Course'}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">
              Course Code
            </label>
            <input 
              required 
              type="text" 
              value={formData.code} 
              onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} 
              placeholder="CSC211" 
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 font-mono text-[12px] uppercase text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-yellow-500/50" 
            />
          </div>
          <div>
            <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">
              Units
            </label>
            <input 
              required 
              type="number" 
              min="1" 
              max="12" 
              value={formData.units} 
              onChange={e => setFormData({ ...formData, units: e.target.value })} 
              placeholder="3" 
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-center text-[12px] text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-yellow-500/50" 
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">
            Course Title
          </label>
          <input 
            required 
            type="text" 
            value={formData.title} 
            onChange={e => setFormData({ ...formData, title: e.target.value })} 
            placeholder="Introduction to Programming" 
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[12px] text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-yellow-500/50" 
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <CustomSelect 
            label="Department"
            placeholder="Select..."
            options={deptOptions}
            value={formData.department}
            onChange={(val) => setFormData({ ...formData, department: val })}
            searchable
          />
          <CustomSelect 
            label="Level"
            placeholder="Select..."
            options={levelOptions}
            value={formData.level}
            onChange={(val) => setFormData({ ...formData, level: val })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">
              Session
            </label>
            <input 
              required 
              type="text" 
              value={formData.session} 
              onChange={e => setFormData({ ...formData, session: e.target.value })} 
              placeholder="2024/2025" 
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-center text-[12px] text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-yellow-500/50" 
            />
          </div>
          <CustomSelect 
            label="Semester"
            placeholder="Select..."
            options={semesterOptions}
            value={formData.semester}
            onChange={(val) => setFormData({ ...formData, semester: val })}
          />
        </div>

        <div className="pt-2">
          <button 
            type="submit" 
            disabled={isCreating || isUpdating} 
            className="w-full rounded-md bg-yellow-500 py-2 text-[11.5px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400 disabled:opacity-50"
          >
            {isCreating || isUpdating ? 'Saving...' : 'Save Course'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

// =========================================
// MAIN COMPONENT
// =========================================
const CourseCatalog = () => {
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');

  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  const { data: deptsData } = useListDepartmentsQuery();
  const { data: coursesData, isLoading } = useListCoursesQuery({
    search,
    department: deptFilter,
    level: levelFilter,
    session: sessionFilter,
    page,
    limit: 10,
  });

  const [deleteCourse] = useDeleteCourseMutation();

  const courses = coursesData?.courses || [];
  const totalPages = coursesData?.pages || 1;
  const totalCourses = coursesData?.total || 0;

  const deptOptions = [
    { value: '', label: 'All Departments' },
    ...(deptsData?.departments || []).map(d => ({ value: d._id, label: d.name })),
  ];

  const levelOptions = [
    { value: '', label: 'All Levels' },
    ...[100, 200, 300, 400, 500].map(l => ({ value: l.toString(), label: `${l} Level` })),
  ];

  const sessionOptions = [
    { value: '', label: 'All Sessions' },
    { value: '2025/2026', label: '2025/2026' },
    { value: '2024/2025', label: '2024/2025' },
    { value: '2023/2024', label: '2023/2024' },
    { value: '2022/2023', label: '2022/2023' },
    { value: '2021/2022', label: '2021/2022' },
  ];

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this course permanently?')) return;
    try {
      await deleteCourse(id).unwrap();
      toast.success('Course deleted permanently');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete course. It may have offerings attached.');
    }
  };

  const openEditModal = (course) => {
    setEditingCourse(course);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingCourse(null);
    setIsModalOpen(true);
  };

  return (
    <div className="-mx-4 min-h-screen bg-zinc-950 px-4 pb-8 pt-4 animate-in fade-in duration-500 md:mx-0 md:bg-transparent md:px-0 md:pt-0">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-5">

        {/* HEADER */}
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div className="min-w-0">
            <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {today}
            </p>
            <h1 className="text-xl font-serif tracking-tight text-white md:text-2xl">
              Course{' '}
              <span className="bg-gradient-to-r from-yellow-200 to-yellow-500 bg-clip-text text-transparent">
                Catalog
              </span>
            </h1>
            <p className="mt-0.5 text-[11.5px] text-zinc-500">
              All courses across departments, sessions, and levels.
            </p>
          </div>

          <button 
            onClick={openCreateModal}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-yellow-500 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            Add Course
          </button>
        </div>

        {/* FILTERS */}
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" strokeWidth={2} />
            <input 
              type="text" 
              placeholder="Search by code or title..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 py-1.5 pl-8 pr-3 text-[12px] text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 lg:w-auto lg:min-w-[420px]">
            <CustomSelect 
              options={sessionOptions}
              value={sessionFilter}
              onChange={(val) => { setSessionFilter(val); setPage(1); }}
            />
            <CustomSelect 
              options={deptOptions}
              value={deptFilter}
              onChange={(val) => { setDeptFilter(val); setPage(1); }}
              searchable
            />
            <CustomSelect 
              options={levelOptions}
              value={levelFilter}
              onChange={(val) => { setLevelFilter(val); setPage(1); }}
            />
          </div>
        </div>

        {/* LIST */}
        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
            <BookOpen className="mx-auto mb-2 h-8 w-8 text-zinc-700" strokeWidth={1.5} />
            <h3 className="text-[13px] font-semibold text-white">
              {search || deptFilter || levelFilter || sessionFilter ? 'No matches found' : 'No courses yet'}
            </h3>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {search || deptFilter || levelFilter || sessionFilter
                ? 'Try adjusting your filters.'
                : 'Add a course to get started.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800/60">
            {courses.map((course) => (
              <div 
                key={course.id} 
                className="group flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-zinc-800/30"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-zinc-800 font-mono text-[10px] font-bold text-zinc-400">
                    {course.code?.substring(0, 3) || 'CRS'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-mono text-[12.5px] font-bold text-white">
                        {course.code}
                      </p>
                      <span className="shrink-0 rounded border border-zinc-700/50 bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                        {course.units}U
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[10.5px] text-zinc-400">
                      {course.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded border border-yellow-500/20 bg-yellow-500/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-500">
                        <CalendarDays className="h-2.5 w-2.5" strokeWidth={2.6} />
                        {course.session || 'No Session'}
                      </span>
                      <span className="text-[9.5px] uppercase tracking-wider text-zinc-500">
                        {course.level}L · {course.semester === 'second' ? '2nd' : '1st'} Sem
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button 
                    onClick={() => openEditModal(course)} 
                    className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-yellow-500/10 hover:text-yellow-500"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                  <button 
                    onClick={() => handleDelete(course.id)} 
                    className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PAGINATION */}
        {!isLoading && totalCourses > 0 && (
          <div className="flex flex-col items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 sm:flex-row">
            <span className="text-[10.5px] text-zinc-500">
              Showing <strong className="text-white">{courses.length}</strong> of {totalCourses} courses
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

      {/* MODAL */}
      <CourseModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialData={editingCourse}
      />
    </div>
  );
};

export default CourseCatalog;