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
  X
} from 'lucide-react';
import { useToast } from '../../components/Toast';

// API Hooks
import { 
  useListSessionsQuery, 
  useCreateSessionMutation,
  useSetCurrentSessionMutation,
  usePromoteStudentsMutation,
  useListDepartmentsQuery
} from '../../features/adminApiSlice';

/* =========================================
   CUSTOM DROPDOWN
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
                <span>{option.label}</span>
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
const SessionsPromotions = () => {
  const [activeTab, setActiveTab] = useState('sessions');

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500 max-w-5xl mx-auto">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl md:text-3xl font-serif text-white tracking-tight">Academic Calendar</h1>
        <p className="text-zinc-400 text-sm mt-1">Manage sessions and promote students to the next level.</p>
      </div>

      {/* TABS */}
      <div className="flex overflow-x-auto border-b border-zinc-800 custom-scrollbar hide-scrollbar">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'sessions' 
              ? 'border-yellow-500 text-yellow-500' 
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Calendar className="w-4 h-4" strokeWidth={1.5} />
          Sessions
        </button>
        <button
          onClick={() => setActiveTab('promotions')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'promotions' 
              ? 'border-yellow-500 text-yellow-500' 
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Megaphone className="w-4 h-4" strokeWidth={1.5} />
          Promotions
        </button>
      </div>

      <div className="mt-6">
        {activeTab === 'sessions' && <SessionsTab />}
        {activeTab === 'promotions' && <PromotionsTab />}
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
      toast.success("Session created successfully");
      setIsCreateOpen(false);
      setFormData({ name: '', startDate: '', endDate: '' });
    } catch (err) {
      toast.error(err?.data?.message || "Failed to create session");
    }
  };

  const handleSetCurrent = async (id) => {
    try {
      await setCurrentSession(id).unwrap();
      toast.success("Current session updated");
    } catch (err) {
      toast.error("Failed to set current session");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors">
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          New Session
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-zinc-500">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm">No sessions created yet. Click "New Session" to start.</div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {sessions.map((session) => (
              <div key={session._id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-800/20 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{session.name}</h3>
                    {session.isCurrent && (
                      <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    {new Date(session.startDate).toLocaleDateString()} — {new Date(session.endDate).toLocaleDateString()}
                  </p>
                </div>

                {!session.isCurrent && (
                  <button 
                    onClick={() => handleSetCurrent(session._id)}
                    disabled={isSettingCurrent}
                    className="text-xs font-bold uppercase tracking-wider text-yellow-500 hover:text-yellow-400 border border-yellow-500/20 hover:border-yellow-500/50 bg-yellow-500/5 px-4 py-2 rounded-lg transition-all"
                  >
                    Set as Current
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCreateOpen(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-lg font-serif text-white tracking-tight">Create Session</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" strokeWidth={1.5} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1 block">Session Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. 2025/2026" className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 focus:border-yellow-500/50 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1 block">Start Date</label>
                  <input required type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 focus:border-yellow-500/50 focus:outline-none [color-scheme:dark]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1 block">End Date</label>
                  <input required type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 focus:border-yellow-500/50 focus:outline-none [color-scheme:dark]" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancel</button>
                <button type="submit" disabled={isCreating} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 text-sm font-bold uppercase tracking-wider rounded-lg disabled:opacity-50">
                  {isCreating ? 'Saving...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
    ...(deptsData?.departments || []).map(d => ({ value: d._id, label: d.name }))
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
      toast.error(err?.data?.message || "Failed to promote students");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* FORM */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-2">Promote Students</h3>
        <p className="text-sm text-zinc-400 mb-6">Move students from one level to the next. This updates their profile instantly.</p>

        <div className="space-y-4">
          <CustomSelect 
            label="From Level"
            placeholder="Select starting level..."
            options={levelOptions}
            value={fromLevel}
            onChange={setFromLevel}
          />

          <CustomSelect 
            label="To Level"
            placeholder="Select destination level..."
            options={toLevelOptions}
            value={toLevel}
            onChange={setToLevel}
          />

          <CustomSelect 
            label="Scope (Department)"
            placeholder="All departments"
            options={deptOptions}
            value={departmentId}
            onChange={setDepartmentId}
          />

          <button 
            onClick={() => {
              if (!fromLevel || !toLevel) return toast.error("Select both from and to levels");
              setIsConfirmOpen(true);
            }}
            className="w-full py-3 mt-2 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 text-sm font-bold uppercase tracking-wider rounded-lg transition-colors"
          >
            Execute Promotion
          </button>
        </div>
      </div>

      {/* WARNING INFO */}
      <div className="space-y-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="text-sm font-bold text-white">Destructive Action</h3>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Promotions will permanently change the level of all matched students. 
            <strong> This cannot be undone.</strong> Ensure that the session results have been fully uploaded and published before promoting.
          </p>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsConfirmOpen(false)} />
          <div className="relative bg-zinc-900 border border-red-500/30 rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 shadow-[0_0_50px_rgba(239,68,68,0.1)]">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-serif text-white mb-2">Confirm Promotion</h2>
              <p className="text-sm text-zinc-400 mb-6">
                Are you absolutely sure you want to promote all <strong className="text-white">{fromLevel} Level</strong> students 
                to <strong className="text-white">{toLevel} Level</strong> 
                {departmentId ? ` in ${deptOptions.find(d => d.value === departmentId)?.label}` : ' across ALL departments'}?
              </p>
              
              <div className="flex gap-3">
                <button onClick={() => setIsConfirmOpen(false)} className="flex-1 py-2.5 border border-zinc-700 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors">
                  Cancel
                </button>
                <button onClick={handlePromote} disabled={isLoading} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-bold uppercase tracking-wider rounded-lg transition-colors disabled:opacity-50">
                  {isLoading ? 'Promoting...' : 'Yes, Promote'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionsPromotions;