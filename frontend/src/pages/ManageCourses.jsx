// src/pages/ManageCourses.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Plus, Search, Loader2, Trash2, UploadCloud, X, 
  CheckCircle2, ChevronDown, Check, CalendarDays
} from 'lucide-react';
import { useToast } from '../components/Toast';

// APIs
import { useGetMeQuery } from '../features/authApiSlice';
import { 
  useListCoursesQuery, useCreateCourseMutation, useDeleteCourseMutation,
  useBulkCreateCoursesMutation 
} from '../features/academicApiSlice';
import { useParseCourseDocumentMutation } from '../features/aiApiSlice';

const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-zinc-800 ${className}`} />
);

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
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
          <ul className="max-h-48 overflow-y-auto custom-scrollbar">
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
const ManageCourses = () => {
  const toast = useToast();
  
  const { data: userData, isLoading: isUserLoading } = useGetMeQuery();
  const user = userData?.user;
  const userDepartmentId = user?.department?._id || user?.department;

  const { data: coursesData, isLoading: isCoursesLoading } = useListCoursesQuery({ 
    department: userDepartmentId,
    limit: 100 
  });
  const allCourses = coursesData?.courses || [];

  const [createCourse, { isLoading: isCreating }] = useCreateCourseMutation();
  const [deleteCourse] = useDeleteCourseMutation();
  const [parseCourseDoc, { isLoading: isParsingDoc }] = useParseCourseDocumentMutation();
  const [bulkCreate, { isLoading: isBulkCreating }] = useBulkCreateCoursesMutation();

  const [activeTab, setActiveTab] = useState(100); 
  const [search, setSearch] = useState('');
  
  const [formData, setFormData] = useState({ 
    code: '', title: '', units: '', semester: 'first', session: '2024/2025' 
  });

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [session, setSession] = useState('2024/2025');
  const [semester, setSemester] = useState('first');
  const [targetLevel, setTargetLevel] = useState(user?.level || 200); 
  const [parsedCourses, setParsedCourses] = useState([]);

  const currentLevel = user?.level || 400;
  const validLevels = [100, 200, 300, 400, 500].filter(l => l <= currentLevel);

  const levelOptions = [100, 200, 300, 400, 500].map(l => ({ value: l.toString(), label: `${l} Level` }));
  const semesterOptions = [
    { value: 'first', label: 'First Semester' },
    { value: 'second', label: 'Second Semester' }
  ];

  useEffect(() => {
    if (user?.level) {
      setActiveTab(user.level);
      setTargetLevel(user.level);
    }
  }, [user?.level]);

  if (isUserLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const activeCourses = allCourses
    .filter(c => c.level === activeTab)
    .filter(c => 
      c.code.toLowerCase().includes(search.toLowerCase()) || 
      c.title.toLowerCase().includes(search.toLowerCase())
    );

  const firstSemCourses = activeCourses.filter(c => c.semester === 'first' || !c.semester);
  const secondSemCourses = activeCourses.filter(c => c.semester === 'second');

  const handleAddCourse = async (e) => {
    e.preventDefault();
    try {
      await createCourse({
        code: formData.code.toUpperCase(),
        title: formData.title,
        units: Number(formData.units),
        department: userDepartmentId,
        level: activeTab,
        semester: formData.semester,
        session: formData.session
      }).unwrap();
      
      toast.success(`Course added to ${activeTab} Level`);
      setFormData({ ...formData, code: '', title: '', units: '' });
    } catch (err) {
      toast.error(err?.data?.message || "Failed to add course.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this course?")) return;
    try {
      await deleteCourse(id).unwrap();
      toast.success("Course deleted");
    } catch {
      toast.error("Failed to delete course");
    }
  };

  const handleDocumentUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return toast.error("Select a file first");

    try {
      const fd = new FormData();
      fd.append("document", uploadFile);
      fd.append("session", session);
      fd.append("semester", semester);

      const res = await parseCourseDoc(fd).unwrap();
      const allowedLevels = user?.scope?.levels || [];
      
      const allowedCourses = res.courses.filter(c => {
        if (c.level !== Number(targetLevel)) return false;
        if (user.role !== 'admin' && !allowedLevels.includes(c.level)) return false;
        return true;
      }).map(c => ({ ...c, semester, session }));

      setParsedCourses(allowedCourses);
      
      if (allowedCourses.length === 0) {
        toast.error(`No ${targetLevel}L courses found in the document.`);
      } else {
        toast.success(`Found ${allowedCourses.length} courses for ${targetLevel} Level`);
      }
    } catch (err) {
      toast.error(err?.data?.message || "Failed to read document");
    }
  };

  const handleBulkImport = async () => {
    try {
      const res = await bulkCreate({ 
        courses: parsedCourses,
        departmentId: userDepartmentId 
      }).unwrap();
      
      toast.success(`Imported ${res.added.length} courses. Skipped ${res.skipped.length}.`);
      setIsUploadModalOpen(false);
      setParsedCourses([]);
      setUploadFile(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to import courses");
    }
  };

  const CourseList = ({ title, courses }) => {
    if (courses.length === 0) return null;
    return (
      <div className="mb-4 last:mb-0">
        <h3 className="mb-2 flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
          <CalendarDays className="h-3 w-3" strokeWidth={2.2} /> {title}
        </h3>
        <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800/60">
          {courses.map((course) => (
            <div key={course.id} className="group flex items-center justify-between px-3 py-2.5 transition-colors hover:bg-zinc-800/30">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-zinc-800 font-mono text-[10px] font-bold text-zinc-400">
                  {course.code.substring(0, 3)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-mono text-[12.5px] font-bold text-white">
                      {course.code}
                    </p>
                    {course.session && (
                      <span className="shrink-0 rounded border border-zinc-700/50 bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                        {course.session}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[10.5px] text-zinc-400">{course.title}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                <p className="text-[11.5px] font-bold text-white">{course.units} <span className="text-[10px] font-normal text-zinc-500">Units</span></p>
                <button 
                  onClick={() => handleDelete(course.id)} 
                  className="rounded p-1 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400 md:opacity-0 md:group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="-mx-4 min-h-screen bg-zinc-950 px-4 pb-8 pt-4 animate-in fade-in duration-500 md:mx-0 md:bg-transparent md:px-0 md:pt-0">
      <div className="mx-auto max-w-5xl space-y-4 md:space-y-5">
        
        {/* HEADER */}
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-xl font-serif tracking-tight text-white md:text-2xl">
              <BookOpen className="h-5 w-5 text-yellow-500 md:h-6 md:w-6" strokeWidth={2} />
              Manage Courses
            </h1>
            <p className="mt-0.5 text-[11.5px] text-zinc-500">
              Add historical or current courses for {user?.department?.name || 'your department'}.
            </p>
          </div>

          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-zinc-700 md:py-2 md:text-[12px]"
          >
            <UploadCloud className="h-3.5 w-3.5" strokeWidth={2.2} />
            <span className="hidden sm:inline">Upload PDF List</span>
            <span className="sm:hidden">Upload</span>
          </button>
        </div>

        {/* LEVEL TABS — horizontal buttons, no scroll */}
        <div className="flex w-full gap-2">
          {validLevels.map(level => (
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

        {/* MAIN CONTENT */}
        <div className="space-y-4">
          
          {/* SEARCH */}
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" strokeWidth={2} />
            <input 
              type="text" 
              placeholder={`Search ${activeTab}L courses...`} 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 py-1.5 pl-8 pr-3 text-[12px] text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30"
            />
          </div>

          {/* LISTS */}
          {isCoursesLoading ? (
            <div className="space-y-2.5">
              {[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : activeCourses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-[11.5px] text-zinc-500">
              No courses found for {activeTab} Level. Add one below.
            </div>
          ) : (
            <div>
              <CourseList title="First Semester" courses={firstSemCourses} />
              <CourseList title="Second Semester" courses={secondSemCourses} />
            </div>
          )}

          {/* INLINE ADD FORM */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 md:p-4">
            <h3 className="mb-3 text-[13px] font-semibold text-white">Add Single Course</h3>
            <form onSubmit={handleAddCourse} className="flex flex-col gap-2.5 md:flex-row md:items-end">
              <div className="w-full md:w-24">
                <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">Code</label>
                <input required type="text" placeholder="CSC101" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 font-mono text-[12px] uppercase text-white outline-none transition-colors focus:border-yellow-500/50" />
              </div>
              <div className="w-full md:flex-1">
                <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">Title</label>
                <input required type="text" placeholder="Intro to Programming" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[12px] text-white outline-none transition-colors focus:border-yellow-500/50" />
              </div>
              <div className="w-full md:w-20">
                <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">Units</label>
                <input required type="number" min="1" max="12" placeholder="3" value={formData.units} onChange={e => setFormData({...formData, units: e.target.value})} className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-center text-[12px] text-white outline-none transition-colors focus:border-yellow-500/50" />
              </div>
              <div className="w-full md:w-28">
                <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">Session</label>
                <input required type="text" placeholder="2024/2025" value={formData.session} onChange={e => setFormData({...formData, session: e.target.value})} className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-center text-[12px] text-white outline-none transition-colors focus:border-yellow-500/50" />
              </div>
              <div className="w-full md:w-36">
                <CustomSelect 
                  label="Semester"
                  placeholder="Select..."
                  options={semesterOptions}
                  value={formData.semester}
                  onChange={(val) => setFormData({...formData, semester: val})}
                />
              </div>
              <button type="submit" disabled={isCreating} className="mt-1 flex h-8 w-full shrink-0 items-center justify-center gap-1.5 rounded-md bg-yellow-500 px-4 text-[11.5px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400 disabled:opacity-50 md:mt-0 md:w-auto">
                {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />}
                Add
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* =========================================
          UPLOAD PDF MODAL (Bottom sheet on mobile)
          ========================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="absolute inset-0" onClick={() => setIsUploadModalOpen(false)} />
          
          <div className="relative z-10 flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border-t border-zinc-800 bg-zinc-900 animate-in slide-in-from-bottom duration-300 sm:rounded-2xl sm:border">
            <div 
              className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 pb-3"
              style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)' }}
            >
              <h2 className="text-[14.5px] font-semibold tracking-tight text-white">Import Course Allocation PDF</h2>
              <button onClick={() => setIsUploadModalOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800 text-zinc-400 hover:text-white">
                <X className="h-3.5 w-3.5" strokeWidth={2.2} />
              </button>
            </div>
            
            <div className="flex-1 space-y-4 overflow-y-auto p-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}>
              {parsedCourses.length === 0 ? (
                <form onSubmit={handleDocumentUpload} className="space-y-4">
                  
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">Session</label>
                      <input type="text" value={session} onChange={e => setSession(e.target.value)} placeholder="e.g. 2024/2025" className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[12px] text-white outline-none transition-colors focus:border-yellow-500/50" />
                    </div>
                    
                    <CustomSelect 
                      label="Semester"
                      placeholder="Select..."
                      options={semesterOptions}
                      value={semester}
                      onChange={setSemester}
                    />
                    
                    <CustomSelect 
                      label="Target Level"
                      placeholder="Select..."
                      options={levelOptions}
                      value={targetLevel.toString()}
                      onChange={(val) => setTargetLevel(val)}
                    />
                  </div>

                  <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 px-4 py-6 text-center transition-colors hover:border-yellow-500/50">
                    <input type="file" accept="image/*,application/pdf" onChange={(e) => setUploadFile(e.target.files[0])} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                    <UploadCloud className="mb-2 h-8 w-8 text-zinc-500" strokeWidth={1.5} />
                    <p className="text-[12px] font-medium text-white">{uploadFile ? uploadFile.name : "Click to upload Course Allocation PDF"}</p>
                    <p className="mt-0.5 text-[10px] text-zinc-500">PDF or Image up to 15MB</p>
                  </div>

                  <div className="pt-2">
                    <button type="submit" disabled={isParsingDoc || !uploadFile} className="flex w-full items-center justify-center gap-1.5 rounded-md bg-zinc-100 py-2 text-[12px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-white disabled:opacity-50">
                      {isParsingDoc && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {isParsingDoc ? 'AI is reading...' : 'Extract Courses'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11.5px] text-zinc-300">
                      Found <strong className="text-white">{parsedCourses.length}</strong> courses for <strong className="text-yellow-500">{targetLevel} Level</strong> ({session}).
                    </p>
                    <button onClick={() => setParsedCourses([])} className="text-[11px] font-semibold text-yellow-500 hover:underline">Re-upload</button>
                  </div>

                  <div className="max-h-56 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/30 divide-y divide-zinc-800/60 custom-scrollbar">
                    {parsedCourses.map((c, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2">
                        <div className="min-w-0">
                          <p className="font-mono text-[12px] font-bold text-white">
                            {c.code} 
                            <span className="ml-1.5 text-[9px] font-normal uppercase tracking-wider text-zinc-500">
                              {c.semester === 'first' ? '1st Sem' : '2nd Sem'}
                            </span>
                          </p>
                          <p className="mt-0.5 truncate text-[10.5px] text-zinc-400">{c.title}</p>
                        </div>
                        <p className="shrink-0 text-[11.5px] font-bold text-white">{c.units} Units</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <button onClick={handleBulkImport} disabled={isBulkCreating} className="flex w-full items-center justify-center gap-1.5 rounded-md bg-yellow-500 py-2 text-[12px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400 disabled:opacity-50">
                      {isBulkCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.2} />}
                      {isBulkCreating ? 'Importing...' : 'Confirm Import'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCourses;