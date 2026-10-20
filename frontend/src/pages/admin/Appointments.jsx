// src/pages/admin/Appointments.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  BookOpen, 
  GraduationCap, 
  AlertCircle,
  ChevronDown,
  Check,
  Trash2,
  UserX
} from 'lucide-react';
import { useToast } from '../../components/Toast';

// API Hooks
import { 
  useListUsersQuery, 
  useListDepartmentsQuery,
  useAppointCourseRepMutation,
  useRevokeCourseRepMutation,
  useAppointStudentAdminMutation,
  useRevokeStudentAdminMutation,
  useAppointHodMutation,
  useRevokeHodMutation
} from '../../features/adminApiSlice';
import { useListOfferingsQuery } from '../../features/academicApiSlice';

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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="space-y-1.5 relative" ref={dropdownRef}>
      {label && (
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          {label}
        </label>
      )}
      
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
        <ChevronDown
          className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          strokeWidth={1.5}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <ul className="max-h-60 overflow-y-auto py-1 text-sm text-zinc-200 custom-scrollbar">
            {options.length === 0 ? (
              <li className="px-4 py-3 text-zinc-500 text-center text-xs">No options available</li>
            ) : (
              options.map((option) => (
                <li
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
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
   MAIN COMPONENT
   ========================================= */
const Appointments = () => {
  const [activeTab, setActiveTab] = useState('course_rep');

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl md:text-3xl font-serif text-white tracking-tight">Appointments</h1>
        <p className="text-zinc-400 text-sm mt-1">Delegate responsibilities to students and lecturers.</p>
      </div>

      {/* TABS */}
      <div className="flex overflow-x-auto border-b border-zinc-800 custom-scrollbar hide-scrollbar">
        <button
          onClick={() => setActiveTab('course_rep')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'course_rep' ? 'border-yellow-500 text-yellow-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <BookOpen className="w-4 h-4" strokeWidth={1.5} /> Course Reps
        </button>
        <button
          onClick={() => setActiveTab('student_admin')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'student_admin' ? 'border-yellow-500 text-yellow-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <GraduationCap className="w-4 h-4" strokeWidth={1.5} /> Student Admins
        </button>
        <button
          onClick={() => setActiveTab('hod')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'hod' ? 'border-yellow-500 text-yellow-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" strokeWidth={1.5} /> Heads of Dept (HOD)
        </button>
      </div>

      <div className="mt-6">
        {activeTab === 'course_rep' && <CourseRepTab />}
        {activeTab === 'student_admin' && <StudentAdminTab />}
        {activeTab === 'hod' && <HodTab />}
      </div>
    </div>
  );
};

/* =========================================
   TAB 1: COURSE REPS
   ========================================= */
const CourseRepTab = () => {
  const toast = useToast();
  const [userId, setUserId] = useState('');
  const [offeringId, setOfferingId] = useState('');

  const { data: usersData } = useListUsersQuery({ role: 'student', limit: 100 });
  const { data: offeringsData } = useListOfferingsQuery({ limit: 100 });
  
  const [appointRep, { isLoading: isAppointing }] = useAppointCourseRepMutation();

  const studentOptions = (usersData?.users || []).map(u => ({ value: u.id, label: `${u.name} (${u.matricNumber})` }));
  const offeringOptions = (offeringsData?.offerings || []).map(o => ({ value: o.id, label: `${o.course?.code} - ${o.course?.title} (${o.level}L)` }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId || !offeringId) return toast.error("Select a student and a course offering");
    
    try {
      await appointRep({ userId, courseOfferingId: offeringId }).unwrap();
      toast.success("Course rep appointed successfully");
      setUserId('');
      setOfferingId('');
    } catch (err) {
      toast.error(err?.data?.message || "Failed to appoint rep");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-fit sticky top-24">
        <h3 className="text-lg font-bold text-white mb-4">Appoint Course Rep</h3>
        <form onSubmit={handleSubmit} className="space-y-5">
          <CustomSelect label="Select Student" placeholder="Choose student..." options={studentOptions} value={userId} onChange={setUserId} />
          <CustomSelect label="Select Course Offering" placeholder="Choose offering..." options={offeringOptions} value={offeringId} onChange={setOfferingId} />
          <button type="submit" disabled={isAppointing} className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 text-sm font-bold uppercase tracking-wider rounded-lg transition-colors">
            {isAppointing ? 'Appointing...' : 'Appoint Rep'}
          </button>
        </form>
      </div>

      <div className="md:col-span-2 space-y-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-2">How it works</h3>
          <p className="text-sm text-zinc-400 leading-relaxed mb-6">
            Course reps are granted special access to upload study materials and create quizzes for their specific courses. They can also view the class roster and set exam windows.
          </p>

          {/* 👇 Display Current Course Reps (For visual proof) */}
          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Users with Course Rep Role</h4>
          <div className="bg-zinc-950 rounded-lg border border-zinc-800 divide-y divide-zinc-800/50">
            {usersData?.users?.filter(u => u.extraRoles?.includes('course_rep')).length === 0 ? (
              <p className="p-4 text-sm text-zinc-500">No course reps appointed yet.</p>
            ) : (
              usersData?.users?.filter(u => u.extraRoles?.includes('course_rep')).map(u => (
                <div key={u.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{u.name}</p>
                    <p className="text-xs text-zinc-500">{u.matricNumber}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">Course Rep</span>
                </div>
              ))
            )}
          </div>
        </div>
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

  // Fetch all students to populate form
  const { data: usersData } = useListUsersQuery({ role: 'student', limit: 100 });
  const { data: deptsData } = useListDepartmentsQuery();
  
  // 👇 Fetch users who are CURRENTLY Student Admins
  const { data: adminsData, isLoading: isLoadingAdmins } = useListUsersQuery({ extraRole: 'student_admin', limit: 100 });

  const [appointAdmin, { isLoading: isAppointing }] = useAppointStudentAdminMutation();
  const [revokeAdmin, { isLoading: isRevoking }] = useRevokeStudentAdminMutation();

  const studentOptions = (usersData?.users || []).map(u => ({ value: u.id, label: `${u.name} (${u.level}L)` }));
  const deptOptions = (deptsData?.departments || []).map(d => ({ value: d._id, label: d.name }));

  const handleLevelToggle = (level) => {
    setLevels(prev => prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId || !departmentId || levels.length === 0) {
      return toast.error("Select a student, department, and at least one level");
    }
    
    try {
      await appointAdmin({ userId, departmentId, levels }).unwrap();
      toast.success("Student Admin appointed successfully");
      setUserId(''); setDepartmentId(''); setLevels([]);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to appoint student admin");
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm("Are you sure you want to revoke this student's admin privileges?")) return;
    try {
      await revokeAdmin(id).unwrap();
      toast.success("Student admin revoked");
    } catch (err) {
      toast.error("Failed to revoke admin");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-fit sticky top-24">
        <h3 className="text-lg font-bold text-white mb-4">Appoint Student Admin</h3>
        <form onSubmit={handleSubmit} className="space-y-5">
          <CustomSelect label="Select Student" placeholder="Choose student..." options={studentOptions} value={userId} onChange={setUserId} />
          <CustomSelect label="Select Department" placeholder="Choose department..." options={deptOptions} value={departmentId} onChange={setDepartmentId} />
          
          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2 block">Scope: Select Levels</label>
            <div className="flex flex-wrap gap-2">
              {[100, 200, 300, 400, 500].map(lvl => (
                <button key={lvl} type="button" onClick={() => handleLevelToggle(lvl)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border ${levels.includes(lvl) ? 'bg-yellow-500 border-yellow-500 text-zinc-950' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}>
                  {lvl}L
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={isAppointing} className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 text-sm font-bold uppercase tracking-wider rounded-lg transition-colors">
            {isAppointing ? 'Appointing...' : 'Appoint Admin'}
          </button>
        </form>
      </div>

      <div className="md:col-span-2 space-y-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-2">Student Admin Privileges</h3>
          <p className="text-sm text-zinc-400 leading-relaxed mb-6">
            Student Admins are allowed to add courses to the catalog for their specific department and assigned levels.
          </p>

          {/* 👇 Display Current Student Admins */}
          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Active Student Admins</h4>
          <div className="bg-zinc-950 rounded-lg border border-zinc-800 divide-y divide-zinc-800/50">
            {isLoadingAdmins ? (
              <div className="p-4"><Skeleton className="h-10 w-full" /></div>
            ) : adminsData?.users?.length === 0 ? (
              <p className="p-4 text-sm text-zinc-500">No student admins appointed yet.</p>
            ) : (
              adminsData?.users?.map(u => (
                <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{u.name}</p>
                    <p className="text-xs text-zinc-500">
                      Scope: Levels {u.scope?.levels?.join(', ') || 'None'} • {u.department?.name || 'No Dept'}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleRevoke(u.id)}
                    disabled={isRevoking}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-xs font-bold transition-colors"
                  >
                    <UserX className="w-3.5 h-3.5" /> Revoke
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
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
  
  // 👇 Fetch users who are CURRENTLY HODs
  const { data: hodsData, isLoading: isLoadingHods } = useListUsersQuery({ extraRole: 'hod', limit: 100 });

  const [appointHod, { isLoading: isAppointing }] = useAppointHodMutation();
  const [revokeHod, { isLoading: isRevoking }] = useRevokeHodMutation();

  const lecturerOptions = (usersData?.users || []).map(u => ({ value: u.id, label: `${u.name} (${u.staffId || 'No Staff ID'})` }));
  const deptOptions = (deptsData?.departments || []).map(d => ({ value: d._id, label: d.name }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId || !departmentId) return toast.error("Select a lecturer and a department");
    
    try {
      await appointHod({ userId, departmentId }).unwrap();
      toast.success("HOD appointed successfully");
      setUserId(''); setDepartmentId('');
    } catch (err) {
      toast.error(err?.data?.message || "Failed to appoint HOD");
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm("Are you sure you want to revoke this HOD?")) return;
    try {
      await revokeHod(id).unwrap();
      toast.success("HOD revoked");
    } catch (err) {
      toast.error("Failed to revoke HOD");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-fit sticky top-24">
        <h3 className="text-lg font-bold text-white mb-4">Appoint HOD</h3>
        <form onSubmit={handleSubmit} className="space-y-5">
          <CustomSelect label="Select Lecturer" placeholder="Choose lecturer..." options={lecturerOptions} value={userId} onChange={setUserId} />
          <CustomSelect label="Select Department" placeholder="Choose department..." options={deptOptions} value={departmentId} onChange={setDepartmentId} />
          <button type="submit" disabled={isAppointing} className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 text-sm font-bold uppercase tracking-wider rounded-lg transition-colors">
            {isAppointing ? 'Appointing...' : 'Appoint HOD'}
          </button>
        </form>
      </div>

      <div className="md:col-span-2 space-y-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 border-l-2 border-l-red-500">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h3 className="text-sm font-bold text-white">Important Restriction</h3>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed mb-6">
            A department can only have <strong>one active HOD</strong>. HODs can approve results and manage all course offerings within their department.
          </p>

          {/* 👇 Display Current HODs */}
          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Active HODs</h4>
          <div className="bg-zinc-950 rounded-lg border border-zinc-800 divide-y divide-zinc-800/50">
            {isLoadingHods ? (
              <div className="p-4"><Skeleton className="h-10 w-full" /></div>
            ) : hodsData?.users?.length === 0 ? (
              <p className="p-4 text-sm text-zinc-500">No HODs appointed yet.</p>
            ) : (
              hodsData?.users?.map(u => (
                <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{u.name}</p>
                    <p className="text-xs text-zinc-500">
                      {u.department?.name || 'No Dept'} • {u.staffId || 'No Staff ID'}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleRevoke(u.id)}
                    disabled={isRevoking}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-xs font-bold transition-colors"
                  >
                    <UserX className="w-3.5 h-3.5" /> Revoke
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Appointments;