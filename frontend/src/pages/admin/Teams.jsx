// src/pages/admin/Teams.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  UserPlus, 
  X, 
  ChevronDown, 
  ShieldCheck,
  Check
} from 'lucide-react';
import { useToast } from '../../components/Toast';

// API Hooks
import { 
  useListTeamsQuery, 
  useCreateTeamMutation, 
  useDeleteTeamMutation,
  useAddTeamMemberMutation,
  useRemoveTeamMemberMutation,
  useListUsersQuery
} from '../../features/adminApiSlice';

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-zinc-800 rounded-lg ${className}`}></div>
);

/* =========================================
   CUSTOM DROPDOWN (For Add Member Modal)
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
   CREATE TEAM MODAL
   ========================================= */
const CreateTeamModal = ({ isOpen, onClose }) => {
  const toast = useToast();
  const [createTeam, { isLoading }] = useCreateTeamMutation();
  const [formData, setFormData] = useState({ name: '', description: '', permissions: '' });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions.split(',').map(p => p.trim()).filter(Boolean)
      };
      await createTeam(payload).unwrap();
      toast.success("Team created successfully");
      setFormData({ name: '', description: '', permissions: '' });
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to create team");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-serif text-white tracking-tight">Create New Team</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1 block">Team Name</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. CSC Course Helpers" className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 focus:border-yellow-500/50 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1 block">Description (Optional)</label>
            <textarea rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="What does this team do?" className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 focus:border-yellow-500/50 focus:outline-none resize-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1 block">Permissions (Comma separated)</label>
            <input type="text" value={formData.permissions} onChange={e => setFormData({...formData, permissions: e.target.value})} placeholder="e.g. add_courses, edit_courses" className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 focus:border-yellow-500/50 focus:outline-none" />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 text-sm font-bold uppercase tracking-wider rounded-lg transition-colors disabled:opacity-50">
              {isLoading ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================
   ADD MEMBER MODAL
   ========================================= */
const AddMemberModal = ({ isOpen, onClose, team }) => {
  const toast = useToast();
  const [userId, setUserId] = useState('');
  const [addMember, { isLoading }] = useAddTeamMemberMutation();
  
  // Fetch users (students and lecturers) to choose from
  const { data: usersData } = useListUsersQuery({ limit: 100 });

  if (!isOpen || !team) return null;

  const userOptions = (usersData?.users || []).map(u => ({
    value: u.id,
    label: `${u.name} (${u.role})`
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) return toast.error("Select a user to add");
    
    try {
      await addMember({ teamId: team._id, userId }).unwrap();
      toast.success("Member added to team");
      setUserId('');
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to add member");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-base font-serif text-white tracking-tight">Add to {team.name}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <CustomSelect 
            label="Select User"
            placeholder="Choose user..."
            options={userOptions}
            value={userId}
            onChange={setUserId}
          />

          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 text-sm font-bold uppercase tracking-wider rounded-lg transition-colors disabled:opacity-50">
              {isLoading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================
   MAIN TEAMS COMPONENT
   ========================================= */
const Teams = () => {
  const toast = useToast();
  
  // State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTeamForMember, setSelectedTeamForMember] = useState(null);

  // API
  const { data: teamsData, isLoading } = useListTeamsQuery();
  const [deleteTeam] = useDeleteTeamMutation();
  const [removeMember] = useRemoveTeamMemberMutation();

  const teams = teamsData?.teams || [];

  const handleDeleteTeam = async (id) => {
    if (!window.confirm("Are you sure you want to delete this team? Members will lose these permissions.")) return;
    try {
      await deleteTeam(id).unwrap();
      toast.success("Team deleted");
    } catch (err) {
      toast.error("Failed to delete team");
    }
  };

  const handleRemoveMember = async (teamId, userId) => {
    if (!window.confirm("Remove this member from the team?")) return;
    try {
      await removeMember({ teamId, userId }).unwrap();
      toast.success("Member removed");
    } catch (err) {
      toast.error("Failed to remove member");
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif text-white tracking-tight">Teams & Permissions</h1>
          <p className="text-zinc-400 text-sm mt-1">Group users to help manage courses and system tasks.</p>
        </div>

        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 px-4 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Create Team
        </button>
      </div>

      {/* TEAMS GRID */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-zinc-700 mx-auto mb-4" strokeWidth={1} />
          <h3 className="text-lg font-medium text-white mb-1">No teams yet</h3>
          <p className="text-zinc-500 text-sm">Create a team to start delegating permissions to users.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <div key={team._id} className="bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden hover:border-zinc-700 transition-colors">
              
              {/* Card Header */}
              <div className="p-5 border-b border-zinc-800/50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">{team.name}</h3>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{team.description || 'No description provided.'}</p>
                  </div>
                  <button onClick={() => handleDeleteTeam(team._id)} className="text-zinc-500 hover:text-red-400 transition-colors p-1" title="Delete Team">
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>

                {/* Permissions */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {team.permissions?.length > 0 ? (
                    team.permissions.map(p => (
                      <span key={p} className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded">
                        <ShieldCheck className="w-3 h-3" /> {p.replace('_', ' ')}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider">No special permissions</span>
                  )}
                </div>
              </div>

              {/* Members List */}
              <div className="flex-1 p-5 bg-zinc-950/30">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Members ({team.members?.length || 0})</h4>
                  <button 
                    onClick={() => setSelectedTeamForMember(team)}
                    className="text-[10px] font-bold text-yellow-500 hover:text-yellow-400 uppercase tracking-wider flex items-center gap-1"
                  >
                    <UserPlus className="w-3 h-3" /> Add
                  </button>
                </div>

                {team.members?.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic">No members in this team yet.</p>
                ) : (
                  <div className="space-y-2">
                    {team.members.map((member) => (
                      <div key={member._id} className="flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-yellow-500 text-[10px] font-bold border border-zinc-700">
                            {member.name.charAt(0)}
                          </div>
                          <span className="text-sm text-zinc-300">{member.name}</span>
                        </div>
                        <button 
                          onClick={() => handleRemoveMember(team._id, member._id)}
                          className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                          title="Remove member"
                        >
                          <X className="w-3.5 h-3.5" strokeWidth={2} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODALS */}
      <CreateTeamModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      <AddMemberModal 
        isOpen={!!selectedTeamForMember} 
        team={selectedTeamForMember} 
        onClose={() => setSelectedTeamForMember(null)} 
      />
    </div>
  );
};

export default Teams;