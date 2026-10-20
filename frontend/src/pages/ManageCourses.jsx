// src/pages/ManageCourses.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Loader2,
  Trash2,
  UploadCloud,
  X,
  CheckCircle2,
  ChevronDown,
  Check,
  CalendarDays
} from 'lucide-react';
import { useToast } from '../components/Toast';

// APIs
import { useGetMeQuery } from '../features/authApiSlice';
import { 
  useListCoursesQuery, 
  useCreateCourseMutation, 
  useDeleteCourseMutation,
  useBulkCreateCoursesMutation 
} from '../features/academicApiSlice';
import { useParseCourseDocumentMutation } from '../features/aiApiSlice';

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-zinc-800 rounded-lg ${className}`}></div>
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
    <div className="space-y-1.5 relative w-full" ref={dropdownRef}>
      {label && <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-zinc-950 border ${
          isOpen ? 'border-yellow-500/50 ring-1 ring-yellow-500/50' : 'border-zinc-800'
        } text-zinc-100 text-sm rounded-lg px-3 py-2.5 transition-all`}
      >
        <span className={!selectedOption ? 'text-zinc-600' : ''}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
          <ul className="max-h-60 overflow-y-auto py-1 text-sm text-zinc-200 custom-scrollbar">
            {options.map((option) => (
              <li
                key={option.value}
                onClick={() => { onChange(option.value); setIsOpen(false); }}
                className={`px-4 py-2.5 cursor-pointer hover:bg-zinc-800 transition-colors flex items-center justify-between ${
                  value === option.value ? 'bg-zinc-800/50 text-yellow-500 font-medium' : ''
                }`}
              >
                <span className="truncate pr-2">{option.label}</span>
                {value === option.value && <Check className="w-4 h-4 flex-shrink-0" strokeWidth={2} />}
              </li>
            ))}
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
  
  // 1. Get User Data
  const { data: userData, isLoading: isUserLoading } = useGetMeQuery();
  const user = userData?.user;
  const userDepartmentId = user?.department?._id || user?.department;

  // 2. Fetch Courses
  const { data: coursesData, isLoading: isCoursesLoading } = useListCoursesQuery({ 
    department: userDepartmentId,
    limit: 100 
  });
  const allCourses = coursesData?.courses || [];

  // 3. Mutations
  const [createCourse, { isLoading: isCreating }] = useCreateCourseMutation();
  const [deleteCourse] = useDeleteCourseMutation();
  const [parseCourseDoc, { isLoading: isParsingDoc }] = useParseCourseDocumentMutation();
  const [bulkCreate, { isLoading: isBulkCreating }] = useBulkCreateCoursesMutation();

  // State
  const [activeTab, setActiveTab] = useState(100); 
  const [search, setSearch] = useState('');
  
  // Inline form state
  const [formData, setFormData] = useState({ 
    code: '', 
    title: '', 
    units: '', 
    semester: 'first',
    session: '2024/2025' 
  });

  // Upload State
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

  if (isUserLoading) return <div className="p-8 text-center text-zinc-500">Loading...</div>;

  // Filter by active tab and search
  const activeCourses = allCourses
    .filter(c => c.level === activeTab)
    .filter(c => 
      c.code.toLowerCase().includes(search.toLowerCase()) || 
      c.title.toLowerCase().includes(search.toLowerCase())
    );

  // Separate by semester
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
    } catch (err) {
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
      console.error(err);
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

  // Helper component to render a course list for a specific semester
  const CourseList = ({ title, courses }) => {
    if (courses.length === 0) return null;
    return (
      <div className="mb-8 last:mb-0">
        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
          <CalendarDays className="w-4 h-4" /> {title}
        </h3>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800/50">
          {courses.map((course) => (
            <div key={course.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/20 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold font-mono text-xs">
                  {course.code.substring(0, 3)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-bold text-white">{course.code}</p>
                    {/* 👇 Display the Session (e.g., 2024/2025) */}
                    {course.session && (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700/50">
                        {course.session}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">{course.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm font-bold text-white">{course.units} Units</p>
                <button onClick={() => handleDelete(course.id)} className="p-1.5 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500 max-w-5xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif text-white tracking-tight flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-yellow-500" strokeWidth={1.5} />
            Manage Courses
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Add historical or current courses for {user?.department?.name || 'your department'}.
          </p>
        </div>

        <button 
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors shrink-0"
        >
          <UploadCloud className="w-4 h-4" />
          Upload PDF List
        </button>
      </div>

      {/* LEVEL TABS */}
      <div className="flex overflow-x-auto border-b border-zinc-800 custom-scrollbar hide-scrollbar">
        {validLevels.map(level => (
          <button
            key={level}
            onClick={() => setActiveTab(level)}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${
              activeTab === level 
                ? 'border-yellow-500 text-yellow-500 bg-zinc-900/50' 
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {level} Level
          </button>
        ))}
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="space-y-6">
        
        {/* SEARCH BAR */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" strokeWidth={1.5} />
          <input 
            type="text" 
            placeholder={`Search ${activeTab}L courses...`} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg pl-9 pr-4 py-2.5 focus:border-yellow-500/50 focus:outline-none"
          />
        </div>

        {/* COURSE LISTS */}
        {isCoursesLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : activeCourses.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 text-sm">
            No courses found for {activeTab} Level. Add one below.
          </div>
        ) : (
          <div>
            <CourseList title="First Semester Courses" courses={firstSemCourses} />
            <CourseList title="Second Semester Courses" courses={secondSemCourses} />
          </div>
        )}

        {/* INLINE ADD COURSE FORM */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-5">
          <h3 className="text-sm font-bold text-white mb-4">Add Single Course manually</h3>
          <form onSubmit={handleAddCourse} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-28">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Code</label>
              <input required type="text" placeholder="CSC101" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 focus:border-yellow-500/50 focus:outline-none font-mono uppercase" />
            </div>
            <div className="flex-[2] w-full">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Title</label>
              <input required type="text" placeholder="Intro to Programming" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 focus:border-yellow-500/50 focus:outline-none" />
            </div>
            <div className="w-20">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Units</label>
              <input required type="number" min="1" max="12" placeholder="3" value={formData.units} onChange={e => setFormData({...formData, units: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 focus:border-yellow-500/50 focus:outline-none text-center" />
            </div>
            <div className="w-full md:w-28">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Session</label>
              <input required type="text" placeholder="2024/2025" value={formData.session} onChange={e => setFormData({...formData, session: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 focus:border-yellow-500/50 focus:outline-none text-center" />
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
            <button type="submit" disabled={isCreating} className="bg-yellow-500 hover:bg-yellow-400 text-zinc-950 px-6 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shrink-0 h-[42px] disabled:opacity-50 w-full md:w-auto">
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" strokeWidth={3} />}
              Add Course
            </button>
          </form>
        </div>

      </div>

      {/* =========================================
          UPLOAD PDF MODAL
          ========================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsUploadModalOpen(false)} />
          
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-lg font-serif text-white tracking-tight">Import Course Allocation PDF</h2>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 space-y-5">
              {parsedCourses.length === 0 ? (
                <form onSubmit={handleDocumentUpload} className="space-y-4">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1 block">Session</label>
                      <input type="text" value={session} onChange={e => setSession(e.target.value)} placeholder="e.g. 2024/2025" className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 focus:border-yellow-500/50 focus:outline-none" />
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

                  <div className="border-2 border-dashed border-zinc-700 hover:border-yellow-500/50 rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors relative">
                    <input type="file" accept="image/*,application/pdf" onChange={(e) => setUploadFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <UploadCloud className="w-10 h-10 text-zinc-500 mb-3" />
                    <p className="text-white font-medium mb-1">{uploadFile ? uploadFile.name : "Click to upload Course Allocation PDF"}</p>
                    <p className="text-zinc-500 text-xs">PDF or Image up to 15MB</p>
                  </div>

                  <button type="submit" disabled={isParsingDoc || !uploadFile} className="w-full py-3 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    {isParsingDoc ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    {isParsingDoc ? 'AI is reading the document...' : 'Extract Courses'}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-300">
                      Found <strong className="text-white">{parsedCourses.length}</strong> courses for <strong className="text-yellow-500">{targetLevel} Level</strong> ({session}).
                    </p>
                    <button onClick={() => setParsedCourses([])} className="text-xs text-yellow-500 hover:underline">Re-upload</button>
                  </div>

                  <div className="max-h-64 overflow-y-auto border border-zinc-800 rounded-lg divide-y divide-zinc-800/50 custom-scrollbar">
                    {parsedCourses.map((c, i) => (
                      <div key={i} className="p-3 flex justify-between items-center bg-zinc-950/50">
                        <div>
                          <p className="font-mono text-sm font-bold text-white">
                            {c.code} 
                            <span className="text-zinc-500 text-[10px] font-normal ml-2 uppercase tracking-wider">
                              {c.semester === 'first' ? '1st Sem' : '2nd Sem'}
                            </span>
                          </p>
                          <p className="text-xs text-zinc-400">{c.title}</p>
                        </div>
                        <p className="text-sm font-bold text-white">{c.units} Units</p>
                      </div>
                    ))}
                  </div>

                  <button onClick={handleBulkImport} disabled={isBulkCreating} className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    {isBulkCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    {isBulkCreating ? 'Importing...' : 'Confirm Import'}
                  </button>
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