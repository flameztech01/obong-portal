// src/pages/admin/UserDirectory.jsx
import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  ShieldAlert, 
  UserCheck, 
  UserX, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Users as UsersIcon,
  X
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { 
  useListUsersQuery, 
  useSetUserStatusMutation, 
  useDeleteUserMutation,
  useCreateLecturerMutation,
  useListDepartmentsQuery
} from '../../features/adminApiSlice';

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-zinc-800 rounded-lg ${className}`}></div>
);

/* =========================================
   CREATE LECTURER MODAL
   ========================================= */
const CreateLecturerModal = ({ isOpen, onClose }) => {
  const toast = useToast();
  const [createLecturer, { isLoading }] = useCreateLecturerMutation();
  const { data: deptsData } = useListDepartmentsQuery();
  
  const [formData, setFormData] = useState({
    name: '', email: '', staffId: '', department: '', phone: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createLecturer(formData).unwrap();
      toast.success("Lecturer account created successfully");
      setFormData({ name: '', email: '', staffId: '', department: '', phone: '' });
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to create lecturer");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-serif text-white tracking-tight">Add New Lecturer</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1 block">Full Name</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 focus:border-yellow-500/50 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1 block">Email Address</label>
            <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 focus:border-yellow-500/50 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1 block">Staff ID</label>
            <input required type="text" value={formData.staffId} onChange={e => setFormData({...formData, staffId: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 focus:border-yellow-500/50 focus:outline-none uppercase" />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1 block">Department</label>
            <select required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 focus:border-yellow-500/50 focus:outline-none appearance-none">
              <option value="" disabled>Select Department</option>
              {deptsData?.departments?.map(d => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 text-sm font-bold uppercase tracking-wider rounded-lg transition-colors disabled:opacity-50">
              {isLoading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================
   MAIN USER DIRECTORY COMPONENT
   ========================================= */
const UserDirectory = () => {
  const toast = useToast();
  
  // State
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  // API
  const { data: usersData, isLoading } = useListUsersQuery({ 
    search, 
    role: roleFilter, 
    page, 
    limit: 10 
  });
  
  const [setUserStatus] = useSetUserStatusMutation();
  const [deleteUser] = useDeleteUserMutation();

  const users = usersData?.users || [];
  const totalPages = usersData?.pages || 1;
  const totalUsers = usersData?.total || 0;

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await setUserStatus({ id, isActive: !currentStatus }).unwrap();
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'}`);
      setActiveDropdown(null);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure? This action cannot be undone.")) return;
    try {
      await deleteUser(id).unwrap();
      toast.success("User deleted permanently");
      setActiveDropdown(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete user");
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif text-white tracking-tight">User Directory</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage all students, lecturers, and staff accounts.</p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 px-4 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Add Lecturer
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
        
        {/* TOOLBAR */}
        <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" strokeWidth={1.5} />
            <input 
              type="text" 
              placeholder="Search by name, email, or matric no..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg pl-9 pr-4 py-2.5 focus:border-yellow-500/50 focus:outline-none"
            />
          </div>
          <select 
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 focus:border-yellow-500/50 focus:outline-none sm:w-40 appearance-none"
          >
            <option value="">All Roles</option>
            <option value="student">Students</option>
            <option value="lecturer">Lecturers</option>
            <option value="admin">Admins</option>
          </select>
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950/50 text-[10px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Level / Dept</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {isLoading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i}>
                    <td className="px-5 py-4"><Skeleton className="h-10 w-48" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-6 w-20" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-6 w-32" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-6 w-16" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-6 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-12 text-center text-zinc-500">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-800/20 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700 shrink-0">
                          {user.profilePicture ? (
                            <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-yellow-500 font-bold text-sm">{user.name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white">{user.name}</p>
                          <p className="text-xs text-zinc-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        user.role === 'admin' ? 'bg-yellow-500/10 text-yellow-500' :
                        user.role === 'lecturer' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-zinc-800 text-zinc-400'
                      }`}>
                        {user.role === 'student' && <GraduationCap className="w-3 h-3" />}
                        {user.role === 'lecturer' && <UsersIcon className="w-3 h-3" />}
                        {user.role === 'admin' && <ShieldAlert className="w-3 h-3" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-zinc-300">
                        {user.role === 'student' ? `${user.level} Level` : user.staffId || '—'}
                      </p>
                      <p className="text-xs text-zinc-500">{user.department?.name || 'No Dept'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${user.isActive ? 'text-green-500' : 'text-red-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {user.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right relative">
                      <button 
                        onClick={() => setActiveDropdown(activeDropdown === user.id ? null : user.id)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                      
                      {/* Dropdown Menu */}
                      {activeDropdown === user.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                          <div className="absolute right-8 top-10 w-48 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-20 overflow-hidden py-1">
                            <button onClick={() => handleToggleStatus(user.id, user.isActive)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
                              {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              {user.isActive ? 'Suspend Account' : 'Activate Account'}
                            </button>
                            <button onClick={() => handleDelete(user.id)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                              <Trash2 className="w-4 h-4" /> Delete Permanently
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
          ) : users.length === 0 ? (
             <div className="p-8 text-center text-zinc-500 text-sm">No users found.</div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="p-4 flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700 shrink-0 mt-0.5">
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-yellow-500 font-bold text-sm">{user.name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">{user.name}</p>
                    <p className="text-[11px] text-zinc-500 truncate max-w-[180px]">{user.email}</p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        user.role === 'admin' ? 'bg-yellow-500/10 text-yellow-500' :
                        user.role === 'lecturer' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-zinc-800 text-zinc-400'
                      }`}>
                        {user.role}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {user.role === 'student' ? `${user.level} Level` : user.staffId || 'Staff'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${user.isActive ? 'text-green-500' : 'text-red-500'}`}>
                    {user.isActive ? 'Active' : 'Suspended'}
                  </span>
                  
                  {/* Mobile Actions */}
                  <div className="flex gap-1">
                    <button onClick={() => handleToggleStatus(user.id, user.isActive)} className={`p-1.5 rounded-lg border ${user.isActive ? 'border-red-500/20 text-red-400' : 'border-green-500/20 text-green-400'}`}>
                      {user.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => handleDelete(user.id)} className="p-1.5 rounded-lg border border-zinc-800 text-zinc-500 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* PAGINATION */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <span>Showing <strong className="text-white">{users.length}</strong> of {totalUsers} users</span>
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
      <CreateLecturerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default UserDirectory;