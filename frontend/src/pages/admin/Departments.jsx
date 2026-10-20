// src/pages/admin/Departments.jsx
import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Pencil, 
  Trash2, 
  X,
  Search
} from 'lucide-react';
import { useToast } from '../../components/Toast';

// API Hooks
import { 
  useListDepartmentsQuery, 
  useCreateDepartmentMutation, 
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation
} from '../../features/adminApiSlice';

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-zinc-800 rounded-lg ${className}`}></div>
);

/* =========================================
   DEPARTMENT MODAL (Create & Edit)
   ========================================= */
const DepartmentModal = ({ isOpen, onClose, initialData }) => {
  const toast = useToast();
  const isEditing = !!initialData;

  const [createDepartment, { isLoading: isCreating }] = useCreateDepartmentMutation();
  const [updateDepartment, { isLoading: isUpdating }] = useUpdateDepartmentMutation();

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    code: initialData?.code || ''
  });

  // Reset form when modal opens/closes or changes state
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        name: initialData?.name || '',
        code: initialData?.code || ''
      });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await updateDepartment({ id: initialData._id, ...formData }).unwrap();
        toast.success("Department updated successfully");
      } else {
        await createDepartment(formData).unwrap();
        toast.success("Department created successfully");
      }
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save department");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-serif text-white tracking-tight">
            {isEditing ? 'Edit Department' : 'Add Department'}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1 block">Department Name</label>
            <input 
              required 
              type="text" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              placeholder="e.g. Computer Science"
              className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 focus:border-yellow-500/50 focus:outline-none" 
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1 block">Department Code</label>
            <input 
              required 
              type="text" 
              value={formData.code} 
              onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} 
              placeholder="e.g. CSC"
              maxLength={5}
              className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 focus:border-yellow-500/50 focus:outline-none uppercase font-mono" 
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={isCreating || isUpdating} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 text-sm font-bold uppercase tracking-wider rounded-lg transition-colors disabled:opacity-50">
              {isCreating || isUpdating ? 'Saving...' : 'Save Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================
   MAIN DEPARTMENTS COMPONENT
   ========================================= */
const Departments = () => {
  const toast = useToast();
  
  // State
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);

  // API
  const { data: deptsData, isLoading } = useListDepartmentsQuery();
  const [deleteDepartment] = useDeleteDepartmentMutation();

  const departments = deptsData?.departments || [];
  
  // Client-side search filter
  const filteredDepts = departments.filter(dept => 
    dept.name.toLowerCase().includes(search.toLowerCase()) || 
    dept.code.toLowerCase().includes(search.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingDept(null);
    setIsModalOpen(true);
  };

  const openEditModal = (dept) => {
    setEditingDept(dept);
    setIsModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the ${name} department?`)) return;
    try {
      await deleteDepartment(id).unwrap();
      toast.success("Department deleted");
    } catch (err) {
      // The backend returns an error if users are still attached
      toast.error(err?.data?.message || "Failed to delete department. It may have users attached.");
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500 max-w-5xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif text-white tracking-tight">Departments</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage the academic departments in the university.</p>
        </div>

        <button 
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 px-4 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Add Department
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
        
        {/* TOOLBAR */}
        <div className="p-4 border-b border-zinc-800">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" strokeWidth={1.5} />
            <input 
              type="text" 
              placeholder="Search departments..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg pl-9 pr-4 py-2.5 focus:border-yellow-500/50 focus:outline-none"
            />
          </div>
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950/50 text-[10px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-5 py-3 font-medium">Department</th>
                <th className="px-5 py-3 font-medium">Code</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {isLoading ? (
                [1, 2, 3].map(i => (
                  <tr key={i}>
                    <td className="px-5 py-4"><Skeleton className="h-6 w-48" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-6 w-16" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-6 w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredDepts.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-5 py-12 text-center text-zinc-500">
                    No departments found.
                  </td>
                </tr>
              ) : (
                filteredDepts.map((dept) => (
                  <tr key={dept._id} className="hover:bg-zinc-800/20 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                          <Building2 className="w-4 h-4" strokeWidth={1.5} />
                        </div>
                        <p className="font-medium text-white">{dept.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-zinc-800 text-zinc-300 font-mono text-xs font-bold tracking-wider">
                        {dept.code}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditModal(dept)} className="p-1.5 rounded-lg text-zinc-500 hover:text-yellow-500 hover:bg-zinc-800 transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                        <button onClick={() => handleDelete(dept._id, dept.name)} className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </div>
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
             [1, 2, 3].map(i => <div key={i} className="p-4"><Skeleton className="h-12 w-full" /></div>)
          ) : filteredDepts.length === 0 ? (
             <div className="p-8 text-center text-zinc-500 text-sm">No departments found.</div>
          ) : (
            filteredDepts.map((dept) => (
              <div key={dept._id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                    <Building2 className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">{dept.name}</p>
                    <p className="text-[10px] text-zinc-500 font-mono tracking-wider">{dept.code}</p>
                  </div>
                </div>
                
                <div className="flex gap-1">
                  <button onClick={() => openEditModal(dept)} className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-yellow-500">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(dept._id, dept.name)} className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* MODAL */}
      <DepartmentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialData={editingDept}
      />
    </div>
  );
};

export default Departments;