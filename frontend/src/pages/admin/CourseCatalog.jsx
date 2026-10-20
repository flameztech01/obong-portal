// src/pages/admin/CourseCatalog.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  MoreVertical, 
  Pencil, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  CalendarDays
} from 'lucide-react';
import { useToast } from '../../components/Toast';

// API Hooks
import { useListDepartmentsQuery } from '../../features/adminApiSlice';
import { 
  useListCoursesQuery, 
  useCreateCourseMutation, 
  useUpdateCourseMutation,
  useDeleteCourseMutation
} from '../../features/academicApiSlice';

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-zinc-800 rounded-lg ${className}`}></div>
);

/* =========================================
   CUSTOM DROPDOWN COMPONENT
   ========================================= */
const CustomSelect = ({ label, options, value, onChange, placeholder, className }) => {
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
    <div className={`space-y-1.5 relative ${className || ''}`} ref={dropdownRef}>
      {label && <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</label>}
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
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
          <ul className="max-h-60 overflow-y-auto py-1 text-sm text-zinc-200 custom-scrollbar">
            {options.length === 0 ? (
              <li className="px-4 py-3 text-zinc-500 text-center text-xs">No options available</li>
            ) : (
              options.map((option) => (
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
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

/* =========================================
   COURSE MODAL (Create & Edit)
   ========================================= */
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
    description: ''
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
        description: initialData?.description || ''
      });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const deptOptions = (deptsData?.departments || []).map(d => ({ value: d._id, label: d.name }));
  const levelOptions = [100, 200, 300, 400, 500].map(l => ({ value: l.toString(), label: `${l} Level` }));
  const semesterOptions = [
    { value: 'first', label: 'First Semester' },
    { value: 'second', label: 'Second Semester' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        units: Number(formData.units),
        level: Number(formData.level)
      };

      if (isEditing) {
        await updateCourse({ id: initialData.id, ...payload }).unwrap();
        toast.success("Course updated successfully");
      } else {
        await createCourse(payload).unwrap();
        toast.success("Course created successfully");
      }
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save course");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-serif text-white tracking-tight">
            {isEditing ? 'Edit Course' : 'Add New Course'}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1 block">Course Code</label>
              <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} placeholder="e.g. CSC211" className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 focus:border-yellow-500/50 focus:outline-none uppercase font-mono" />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1 block">Units</label>
              <input required type="number" min="1" max="12" value={formData.units} onChange={e => setFormData({...formData, units: e.target.value})} placeholder="e.g. 3" className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 focus:border-yellow-500/50 focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1 block">Course Title</label>
            <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Introduction to Programming" className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 focus:border-yellow-500/50 focus:outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <CustomSelect 
              label="Department"
              placeholder="Select dept..."
              options={deptOptions}
              value={formData.department}
              onChange={(val) => setFormData({...formData, department: val})}
            />
            <CustomSelect 
              label="Level"
              placeholder="Select level..."
              options={levelOptions}
              value={formData.level}
              onChange={(val) => setFormData({...formData, level: val})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1 block">Session</label>
              <input required type="text" value={formData.session} onChange={e => setFormData({...formData, session: e.target.value})} placeholder="e.g. 2024/2025" className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 focus:border-yellow-500/50 focus:outline-none text-center" />
            </div>
            <CustomSelect 
              label="Semester"
              placeholder="Select..."
              options={semesterOptions}
              value={formData.semester}
              onChange={(val) => setFormData({...formData, semester: val})}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={isCreating || isUpdating} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 text-sm font-bold uppercase tracking-wider rounded-lg transition-colors disabled:opacity-50">
              {isCreating || isUpdating ? 'Saving...' : 'Save Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================
   MAIN COURSE CATALOG COMPONENT
   ========================================= */
const CourseCatalog = () => {
  const toast = useToast();
  
  // State
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);

  // API
  const { data: deptsData } = useListDepartmentsQuery();
  const { data: coursesData, isLoading } = useListCoursesQuery({ 
    search, 
    department: deptFilter, 
    level: levelFilter, 
    session: sessionFilter,
    page, 
    limit: 10 
  });
  
  const [deleteCourse] = useDeleteCourseMutation();

  const courses = coursesData?.courses || [];
  const totalPages = coursesData?.pages || 1;
  const totalCourses = coursesData?.total || 0;

  // Format options for filters
  const deptOptions = [
    { value: '', label: 'All Departments' },
    ...(deptsData?.departments || []).map(d => ({ value: d._id, label: d.name }))
  ];

  const levelOptions = [
    { value: '', label: 'All Levels' },
    ...[100, 200, 300, 400, 500].map(l => ({ value: l.toString(), label: `${l} Level` }))
  ];

  const sessionOptions = [
    { value: '', label: 'All Sessions' },
    { value: '2025/2026', label: '2025/2026' },
    { value: '2024/2025', label: '2024/2025' },
    { value: '2023/2024', label: '2023/2024' },
    { value: '2022/2023', label: '2022/2023' },
    { value: '2021/2022', label: '2021/2022' },
  ];

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this course?")) return;
    try {
      await deleteCourse(id).unwrap();
      toast.success("Course deleted permanently");
      setActiveDropdown(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete course. It may have offerings attached.");
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
    <div className="space-y-6 pb-24 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif text-white tracking-tight">Course Catalog</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage all courses across departments, sessions, and levels.</p>
        </div>

        <button 
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 px-4 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Add Course
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
        
        {/* TOOLBAR WITH CUSTOM DROPDOWNS */}
        <div className="p-4 border-b border-zinc-800 flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" strokeWidth={1.5} />
            <input 
              type="text" 
              placeholder="Search by course code or title..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg pl-9 pr-4 py-2.5 focus:border-yellow-500/50 focus:outline-none h-[42px]"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto">
            <CustomSelect 
              options={sessionOptions}
              value={sessionFilter}
              onChange={(val) => { setSessionFilter(val); setPage(1); }}
            />
            <CustomSelect 
              options={deptOptions}
              value={deptFilter}
              onChange={(val) => { setDeptFilter(val); setPage(1); }}
            />
            <CustomSelect 
              options={levelOptions}
              value={levelFilter}
              onChange={(val) => { setLevelFilter(val); setPage(1); }}
            />
          </div>
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950/50 text-[10px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-5 py-3 font-medium w-1/3">Course</th>
                <th className="px-5 py-3 font-medium">Session & Level</th>
                <th className="px-5 py-3 font-medium text-center">Units</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {isLoading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i}>
                    <td className="px-5 py-4"><Skeleton className="h-10 w-full" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-6 w-32" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-6 w-8 mx-auto" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-6 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : courses.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-5 py-12 text-center text-zinc-500">
                    No courses found matching your filters.
                  </td>
                </tr>
              ) : (
                courses.map((course) => (
                  <tr key={course.id} className="hover:bg-zinc-800/20 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                          <BookOpen className="w-4 h-4" strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="font-bold text-white font-mono">{course.code}</p>
                          <p className="text-xs text-zinc-400 truncate max-w-[250px]">{course.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 text-yellow-500" />
                          {course.session || 'No Session'}
                        </span>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">
                          {course.level} Level • {course.semester || 'N/A'} Sem
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800 text-zinc-300 font-bold text-xs">
                        {course.units}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right relative">
                      <button 
                        onClick={() => setActiveDropdown(activeDropdown === course.id ? null : course.id)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                      
                      {activeDropdown === course.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                          <div className="absolute right-8 top-10 w-40 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-20 overflow-hidden py-1">
                            <button onClick={() => { openEditModal(course); setActiveDropdown(null); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
                              <Pencil className="w-4 h-4" /> Edit Course
                            </button>
                            <button onClick={() => handleDelete(course.id)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                              <Trash2 className="w-4 h-4" /> Delete
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

        {/* MOBILE LIST */}
        <div className="md:hidden divide-y divide-zinc-800/50">
          {isLoading ? (
             [1, 2, 3].map(i => <div key={i} className="p-4"><Skeleton className="h-16 w-full" /></div>)
          ) : courses.length === 0 ? (
             <div className="p-8 text-center text-zinc-500 text-sm">No courses found.</div>
          ) : (
            courses.map((course) => (
              <div key={course.id} className="p-4 flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0 mt-0.5">
                    <BookOpen className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-bold text-white font-mono text-sm">{course.code}</p>
                    <p className="text-[11px] text-zinc-400 truncate max-w-[180px]">{course.title}</p>
                    
                    <div className="flex flex-col gap-1 mt-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-zinc-800 text-yellow-500 px-1.5 py-0.5 rounded w-fit flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" /> {course.session || 'No Session'}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {course.level} Level • {course.semester || 'N/A'} Sem • {course.units} Units
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                   <div className="flex gap-1">
                    <button onClick={() => openEditModal(course)} className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-yellow-500">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(course.id)} className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* PAGINATION */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 mt-auto">
          <span>Showing <strong className="text-white">{courses.length}</strong> of {totalCourses} courses</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-white">Page {page} of {totalPages}</span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

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