// src/pages/ManageMaterials.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  FolderUp, UploadCloud, X, Loader2, Trash2, Search, ChevronDown, Check,
  FileText, FileSpreadsheet, FileImage, File as FileIcon, ExternalLink
} from 'lucide-react';
import { useToast } from '../components/Toast';

// APIs
import { useGetMeQuery } from '../features/authApiSlice';
import { useListCoursesQuery } from '../features/academicApiSlice';
import {
  useListMaterialsQuery,
  useUploadMaterialMutation,
  useDeleteMaterialMutation
} from '../features/studyApiSlice';

const MAX_FILES = 10;
const MAX_SIZE = 25 * 1024 * 1024;
const ACCEPT =
  '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.rtf,image/*';

const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-zinc-800 ${className}`} />
);

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getExt = (name = '') => {
  const i = String(name).lastIndexOf('.');
  return i === -1 ? '' : String(name).slice(i + 1).toLowerCase();
};

const FileTypeIcon = ({ name, mime }) => {
  const ext = getExt(name);
  const cls = 'h-4 w-4';
  if ((mime || '').startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
    return <FileImage className={cls} strokeWidth={2} />;
  }
  if (['xls', 'xlsx'].includes(ext)) return <FileSpreadsheet className={cls} strokeWidth={2} />;
  if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'rtf'].includes(ext)) {
    return <FileText className={cls} strokeWidth={2} />;
  }
  return <FileIcon className={cls} strokeWidth={2} />;
};

const typeLabel = {
  lecture_note: 'Lecture Note',
  slide: 'Slides',
  past_question: 'Past Question',
  textbook: 'Textbook',
  other: 'Other',
};

const typeOptions = Object.entries(typeLabel).map(([value, label]) => ({ value, label }));
const semesterOptions = [
  { value: 'first', label: 'First Semester' },
  { value: 'second', label: 'Second Semester' },
];

/* =========================================
   CUSTOM DROPDOWN COMPONENT
   ========================================= */
const CustomSelect = ({ label, options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

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
        <ChevronDown className={`h-3 w-3 shrink-0 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} strokeWidth={2} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-md border border-zinc-700 bg-zinc-900 py-0.5 shadow-2xl shadow-black/60 animate-in fade-in">
          <ul className="max-h-56 overflow-y-auto custom-scrollbar">
            {options.length === 0 && (
              <li className="px-3 py-2 text-[11px] text-zinc-500">No options</li>
            )}
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

/* =========================================
   MAIN COMPONENT
   ========================================= */
const ManageMaterials = () => {
  const toast = useToast();

  const { data: userData, isLoading: isUserLoading } = useGetMeQuery();
  const user = userData?.user;
  const userDepartmentId = user?.department?._id || user?.department;

  const currentLevel = Number(user?.level) || 400;
  const scopeLevels = (user?.scope?.levels || []).map(Number);
  const validLevels = [100, 200, 300, 400, 500].filter(
    (l) => l <= currentLevel && (user?.role === 'admin' || scopeLevels.includes(l))
  );

  const [activeTab, setActiveTab] = useState(null);
  const [search, setSearch] = useState('');

  const [courseId, setCourseId] = useState('');
  const [semester, setSemester] = useState('first');
  const [type, setType] = useState('lecture_note');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (activeTab === null && validLevels.length > 0) {
      setActiveTab(validLevels.includes(currentLevel) ? currentLevel : validLevels[validLevels.length - 1]);
    }
  }, [validLevels.join(','), currentLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Courses for the active level (backend already limits to your set's session)
  const { data: coursesData, isLoading: isCoursesLoading } = useListCoursesQuery(
    { department: userDepartmentId, level: activeTab, limit: 100 },
    { skip: !userDepartmentId || !activeTab }
  );
  const levelCourses = coursesData?.courses || [];

  // Materials for the active level
  const { data: materialsData, isLoading: isMaterialsLoading } = useListMaterialsQuery(
    { level: activeTab, limit: 100 },
    { skip: !activeTab }
  );
  const allMaterials = materialsData?.materials || [];

  const [uploadMaterial, { isLoading: isUploading }] = useUploadMaterialMutation();
  const [deleteMaterial] = useDeleteMaterialMutation();

  // Reset course selection when level changes
  useEffect(() => {
    setCourseId('');
    setSearch('');
  }, [activeTab]);

  const courseOptions = levelCourses.map((c) => ({
    value: c.id,
    label: `${c.code} — ${c.title}`,
  }));

  const handleCourseChange = (id) => {
    setCourseId(id);
    const c = levelCourses.find((x) => x.id === id);
    if (c?.semester === 'first' || c?.semester === 'second') setSemester(c.semester);
  };

  const handleFilesPicked = (e) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length === 0) return;

    const merged = [...files];
    for (const f of picked) {
      if (f.size > MAX_SIZE) {
        toast.error(`"${f.name}" is over 25MB`);
        continue;
      }
      if (merged.length >= MAX_FILES) {
        toast.error(`You can upload up to ${MAX_FILES} files at once`);
        break;
      }
      if (!merged.some((m) => m.name === f.name && m.size === f.size)) merged.push(f);
    }
    setFiles(merged);

    if (!title.trim() && merged.length === 1) {
      setTitle(merged[0].name.replace(/\.[^.]+$/, ''));
    }
    e.target.value = '';
  };

  const removeFile = (index) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!courseId) return toast.error('Select a course');
    if (!title.trim()) return toast.error('Enter a title');
    if (files.length === 0) return toast.error('Select at least one file');

    try {
      const fd = new FormData();
      fd.append('courseId', courseId);
      fd.append('semester', semester);
      fd.append('type', type);
      fd.append('title', title.trim());
      if (description.trim()) fd.append('description', description.trim());
      files.forEach((f) => fd.append('document', f));

      const res = await uploadMaterial(fd).unwrap();
      toast.success(res?.message || 'Material uploaded');

      setFiles([]);
      setTitle('');
      setDescription('');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to upload material');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this material?')) return;
    setDeletingId(id);
    try {
      await deleteMaterial(id).unwrap();
      toast.success('Material deleted');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete material');
    } finally {
      setDeletingId(null);
    }
  };

  if (isUserLoading || activeTab === null) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const q = search.trim().toLowerCase();
  const materials = allMaterials.filter((m) => {
    if (!q) return true;
    return (
      (m.title || '').toLowerCase().includes(q) ||
      (m.course?.code || '').toLowerCase().includes(q) ||
      (m.course?.title || '').toLowerCase().includes(q)
    );
  });

  // Group by course code
  const grouped = materials.reduce((acc, m) => {
    const key = m.course?.code || 'OTHER';
    if (!acc[key]) acc[key] = { title: m.course?.title || '', items: [] };
    acc[key].items.push(m);
    return acc;
  }, {});
  const groupKeys = Object.keys(grouped).sort();

  const isMine = (m) => {
    const uid = m.uploadedBy?._id || m.uploadedBy;
    return String(uid) === String(user?.id);
  };

  return (
    <div className="-mx-4 min-h-screen bg-zinc-950 px-4 pb-8 pt-4 animate-in fade-in duration-500 md:mx-0 md:bg-transparent md:px-0 md:pt-0">
      <div className="mx-auto max-w-5xl space-y-4 md:space-y-5">

        {/* HEADER */}
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-serif tracking-tight text-white md:text-2xl">
            <FolderUp className="h-5 w-5 text-yellow-500 md:h-6 md:w-6" strokeWidth={2} />
            Manage Materials
          </h1>
          <p className="mt-0.5 text-[11.5px] text-zinc-500">
            Upload the PDFs, Word files and slides your set used, from 100 level till now.
          </p>
        </div>

        {/* LEVEL TABS */}
        <div className="flex w-full gap-2">
          {validLevels.map((level) => (
            <button
              key={level}
              onClick={() => setActiveTab(level)}
              className={`flex-1 whitespace-nowrap rounded-md border px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                activeTab === level
                  ? 'border-yellow-500 bg-yellow-500 text-zinc-950 shadow-sm shadow-yellow-500/20'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              {level}L
            </button>
          ))}
        </div>

        {/* UPLOAD FORM */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 md:p-4">
          <h3 className="mb-3 text-[13px] font-semibold text-white">
            Upload to {activeTab} Level
          </h3>

          <form onSubmit={handleUpload} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="md:col-span-1">
                <CustomSelect
                  label="Course"
                  placeholder={isCoursesLoading ? 'Loading...' : `Select ${activeTab}L course`}
                  options={courseOptions}
                  value={courseId}
                  onChange={handleCourseChange}
                />
              </div>
              <CustomSelect
                label="Semester"
                placeholder="Select..."
                options={semesterOptions}
                value={semester}
                onChange={setSemester}
              />
              <CustomSelect
                label="Type"
                placeholder="Select..."
                options={typeOptions}
                value={type}
                onChange={setType}
              />
            </div>

            {!isCoursesLoading && levelCourses.length === 0 && (
              <p className="rounded-md border border-dashed border-zinc-800 p-3 text-[11px] text-zinc-500">
                No {activeTab}L courses yet. Add them in Manage Courses first, then come back here.
              </p>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Week 1 Lecture Notes"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[12px] text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-yellow-500/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">Description (optional)</label>
                <input
                  type="text"
                  placeholder="Short note about this material"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[12px] text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-yellow-500/50"
                />
              </div>
            </div>

            {/* DROP ZONE */}
            <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 px-4 py-6 text-center transition-colors hover:border-yellow-500/50">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPT}
                onChange={handleFilesPicked}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <UploadCloud className="mb-2 h-8 w-8 text-zinc-500" strokeWidth={1.5} />
              <p className="text-[12px] font-medium text-white">Click to choose files</p>
              <p className="mt-0.5 text-[10px] text-zinc-500">
                PDF, Word, PowerPoint, Excel, text or images. Up to {MAX_FILES} files, 25MB each.
              </p>
            </div>

            {files.length > 0 && (
              <div className="divide-y divide-zinc-800/60 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/30">
                {files.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2 text-zinc-300">
                      <span className="text-zinc-500"><FileTypeIcon name={f.name} mime={f.type} /></span>
                      <p className="truncate text-[11.5px]">{f.name}</p>
                      <span className="shrink-0 text-[10px] text-zinc-500">{formatSize(f.size)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="rounded p-1 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={isUploading}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-yellow-500 py-2 text-[12px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400 disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" strokeWidth={2.4} />}
              {isUploading ? 'Uploading...' : `Upload ${files.length > 1 ? `${files.length} files` : 'material'}`}
            </button>
          </form>
        </div>

        {/* SEARCH */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" strokeWidth={2} />
          <input
            type="text"
            placeholder={`Search ${activeTab}L materials...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 py-1.5 pl-8 pr-3 text-[12px] text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30"
          />
        </div>

        {/* MATERIALS LIST */}
        {isMaterialsLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : groupKeys.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-[11.5px] text-zinc-500">
            No materials for {activeTab} Level yet.
          </div>
        ) : (
          <div className="space-y-4">
            {groupKeys.map((code) => (
              <div key={code}>
                <h3 className="mb-2 flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                  <span className="font-mono text-zinc-300">{code}</span>
                  {grouped[code].title && <span className="truncate normal-case tracking-normal text-zinc-600">{grouped[code].title}</span>}
                </h3>
                <div className="divide-y divide-zinc-800/60 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
                  {grouped[code].items.map((m) => (
                    <div key={m.id} className="group flex items-center justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-zinc-800/30">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-zinc-800 text-zinc-400">
                          <FileTypeIcon name={m.originalName} mime={m.mimeType} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[12.5px] font-semibold text-white">{m.title}</p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10.5px] text-zinc-500">
                            <span className="rounded border border-zinc-700/50 bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                              {typeLabel[m.type] || m.type}
                            </span>
                            {m.sizeBytes ? <span>{formatSize(m.sizeBytes)}</span> : null}
                            {m.uploadedBy?.name ? <span>by {m.uploadedBy.name}</span> : null}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <a
                          href={m.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
                          title="Open"
                        >
                          <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
                        </a>
                        {isMine(m) && (
                          <button
                            onClick={() => handleDelete(m.id)}
                            disabled={deletingId === m.id}
                            className="rounded p-1.5 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === m.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default ManageMaterials;