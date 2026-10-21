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
  Check,
  Search,
} from 'lucide-react';
import { useToast } from '../../components/Toast';

// API Hooks
import { 
  useListTeamsQuery, 
  useCreateTeamMutation, 
  useDeleteTeamMutation,
  useAddTeamMemberMutation,
  useRemoveTeamMemberMutation,
  useListUsersQuery,
} from '../../features/adminApiSlice';

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
// MODAL SHELL (bottom sheet on mobile, centered on desktop)
// =========================================
const ModalShell = ({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) => {
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
// CREATE TEAM MODAL
// =========================================
const CreateTeamModal = ({ isOpen, onClose }) => {
  const toast = useToast();
  const [createTeam, { isLoading }] = useCreateTeamMutation();
  const [formData, setFormData] = useState({ name: '', description: '', permissions: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions.split(',').map(p => p.trim()).filter(Boolean),
      };
      await createTeam(payload).unwrap();
      toast.success('Team created successfully');
      setFormData({ name: '', description: '', permissions: '' });
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to create team');
    }
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Create New Team">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">
            Team Name
          </label>
          <input 
            required 
            type="text" 
            value={formData.name} 
            onChange={e => setFormData({ ...formData, name: e.target.value })} 
            placeholder="e.g. CSC Course Helpers" 
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[12px] text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-yellow-500/50" 
          />
        </div>
        <div>
          <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">
            Description (Optional)
          </label>
          <textarea 
            rows="2" 
            value={formData.description} 
            onChange={e => setFormData({ ...formData, description: e.target.value })} 
            placeholder="What does this team do?" 
            className="w-full resize-none rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[12px] text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-yellow-500/50" 
          />
        </div>
        <div>
          <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">
            Permissions (comma separated)
          </label>
          <input 
            type="text" 
            value={formData.permissions} 
            onChange={e => setFormData({ ...formData, permissions: e.target.value })} 
            placeholder="e.g. add_courses, edit_courses" 
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[12px] text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-yellow-500/50" 
          />
        </div>

        <div className="pt-2">
          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full rounded-md bg-yellow-500 py-2 text-[11.5px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400 disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Team'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

// =========================================
// ADD MEMBER MODAL
// =========================================
const AddMemberModal = ({ isOpen, onClose, team }) => {
  const toast = useToast();
  const [userId, setUserId] = useState('');
  const [addMember, { isLoading }] = useAddTeamMemberMutation();
  const { data: usersData } = useListUsersQuery({ limit: 100 });

  // Reset selection each time it opens
  useEffect(() => {
    if (isOpen) setUserId('');
  }, [isOpen]);

  const existingIds = new Set((team?.members || []).map(m => String(m._id)));

  const userOptions = (usersData?.users || [])
    .filter(u => !existingIds.has(String(u.id)))
    .map(u => ({
      value: u.id,
      label: `${u.name}${u.matricNumber ? ` (${u.matricNumber})` : ` (${u.role})`}`,
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) return toast.error('Select a user to add');
    try {
      await addMember({ teamId: team._id, userId }).unwrap();
      toast.success('Member added to team');
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to add member');
    }
  };

  return (
    <ModalShell 
      isOpen={isOpen && !!team} 
      onClose={onClose} 
      title={team ? `Add to ${team.name}` : 'Add Member'}
      maxWidth="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <CustomSelect 
          label="Select User"
          placeholder="Choose user..."
          options={userOptions}
          value={userId}
          onChange={setUserId}
          searchable
        />

        <div className="pt-2">
          <button 
            type="submit" 
            disabled={isLoading || !userId} 
            className="w-full rounded-md bg-yellow-500 py-2 text-[11.5px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400 disabled:opacity-50"
          >
            {isLoading ? 'Adding...' : 'Add Member'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

// =========================================
// TEAM CARD
// =========================================
const TeamCard = ({ team, onAddMember, onDeleteTeam, onRemoveMember }) => {
  const memberCount = team.members?.length || 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700">

      {/* HEADER */}
      <div className="border-b border-zinc-800/60 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-semibold leading-tight text-white">
              {team.name}
            </h3>
            <p className="mt-0.5 line-clamp-2 text-[10.5px] text-zinc-500">
              {team.description || 'No description provided.'}
            </p>
          </div>
          <button 
            onClick={() => onDeleteTeam(team._id)} 
            className="shrink-0 rounded p-1 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
            title="Delete Team"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>

        {/* Permissions */}
        <div className="mt-2.5 flex flex-wrap gap-1">
          {team.permissions?.length > 0 ? (
            team.permissions.map(p => (
              <span 
                key={p} 
                className="inline-flex items-center gap-1 rounded border border-yellow-500/30 bg-yellow-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-500"
              >
                <ShieldCheck className="h-2.5 w-2.5" strokeWidth={2.6} /> 
                {p.replace(/_/g, ' ')}
              </span>
            ))
          ) : (
            <span className="text-[9.5px] uppercase tracking-wider text-zinc-600">
              No permissions
            </span>
          )}
        </div>
      </div>

      {/* MEMBERS */}
      <div className="flex-1 bg-zinc-950/40 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">
            Members ({memberCount})
          </h4>
          <button 
            onClick={() => onAddMember(team)}
            className="flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-yellow-500 transition-colors hover:bg-zinc-800"
          >
            <UserPlus className="h-2.5 w-2.5" strokeWidth={2.4} /> Add
          </button>
        </div>

        {memberCount === 0 ? (
          <p className="py-2 text-center text-[10.5px] italic text-zinc-600">
            No members in this team yet.
          </p>
        ) : (
          <div className="space-y-1.5">
            {team.members.map((member) => (
              <div 
                key={member._id} 
                className="group flex items-center justify-between gap-2 rounded-md px-1 py-0.5 transition-colors hover:bg-zinc-800/30"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-[9px] font-bold text-yellow-500">
                    {member.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <span className="truncate text-[11.5px] text-zinc-300">{member.name}</span>
                </div>
                <button 
                  onClick={() => onRemoveMember(team._id, member._id)}
                  className="shrink-0 rounded p-1 text-zinc-600 transition-all hover:bg-red-500/10 hover:text-red-400 md:opacity-0 md:group-hover:opacity-100"
                  title="Remove member"
                >
                  <X className="h-3 w-3" strokeWidth={2.4} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// =========================================
// MAIN COMPONENT
// =========================================
const Teams = () => {
  const toast = useToast();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTeamForMember, setSelectedTeamForMember] = useState(null);

  const { data: teamsData, isLoading } = useListTeamsQuery();
  const [deleteTeam] = useDeleteTeamMutation();
  const [removeMember] = useRemoveTeamMemberMutation();

  const teams = teamsData?.teams || [];

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleDeleteTeam = async (id) => {
    if (!window.confirm('Delete this team? Members will lose these permissions.')) return;
    try {
      await deleteTeam(id).unwrap();
      toast.success('Team deleted');
    } catch {
      toast.error('Failed to delete team');
    }
  };

  const handleRemoveMember = async (teamId, userId) => {
    if (!window.confirm('Remove this member from the team?')) return;
    try {
      await removeMember({ teamId, userId }).unwrap();
      toast.success('Member removed');
    } catch {
      toast.error('Failed to remove member');
    }
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
              Teams &{' '}
              <span className="bg-gradient-to-r from-yellow-200 to-yellow-500 bg-clip-text text-transparent">
                Permissions
              </span>
            </h1>
            <p className="mt-0.5 text-[11.5px] text-zinc-500">
              Group users to help manage courses and system tasks.
            </p>
          </div>

          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-yellow-500 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            Create Team
          </button>
        </div>

        {/* TEAMS GRID */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-56 w-full" />)}
          </div>
        ) : teams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
            <Users className="mx-auto mb-2 h-8 w-8 text-zinc-700" strokeWidth={1.5} />
            <h3 className="text-[13px] font-semibold text-white">No teams yet</h3>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Create a team to start delegating permissions to users.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <TeamCard
                key={team._id}
                team={team}
                onAddMember={setSelectedTeamForMember}
                onDeleteTeam={handleDeleteTeam}
                onRemoveMember={handleRemoveMember}
              />
            ))}
          </div>
        )}

      </div>

      {/* MODALS */}
      <CreateTeamModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
      <AddMemberModal 
        isOpen={!!selectedTeamForMember} 
        team={selectedTeamForMember} 
        onClose={() => setSelectedTeamForMember(null)} 
      />
    </div>
  );
};

export default Teams;