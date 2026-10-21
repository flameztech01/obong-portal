// src/pages/admin/Departments.jsx
import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Pencil, 
  Trash2, 
  X,
  Search,
} from 'lucide-react';
import { useToast } from '../../components/Toast';

// API Hooks
import { 
  useListDepartmentsQuery, 
  useCreateDepartmentMutation, 
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
} from '../../features/adminApiSlice';

// =========================================
// SKELETON
// =========================================
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-zinc-800 ${className}`} />
);

// =========================================
// MODAL SHELL (bottom sheet on mobile)
// =========================================
const ModalShell = ({ isOpen, onClose, title, children, maxWidth = 'max-w-sm' }) => {
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
// DEPARTMENT MODAL (Create & Edit)
// =========================================
const DepartmentModal = ({ isOpen, onClose, initialData }) => {
  const toast = useToast();
  const isEditing = !!initialData;

  const [createDepartment, { isLoading: isCreating }] = useCreateDepartmentMutation();
  const [updateDepartment, { isLoading: isUpdating }] = useUpdateDepartmentMutation();

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    code: initialData?.code || '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: initialData?.name || '',
        code: initialData?.code || '',
      });
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await updateDepartment({ id: initialData._id, ...formData }).unwrap();
        toast.success('Department updated successfully');
      } else {
        await createDepartment(formData).unwrap();
        toast.success('Department created successfully');
      }
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save department');
    }
  };

  return (
    <ModalShell 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEditing ? 'Edit Department' : 'Add Department'}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">
            Department Name
          </label>
          <input 
            required 
            type="text" 
            value={formData.name} 
            onChange={e => setFormData({ ...formData, name: e.target.value })} 
            placeholder="e.g. Computer Science"
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[12px] text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-yellow-500/50" 
          />
        </div>
        <div>
          <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">
            Department Code
          </label>
          <input 
            required 
            type="text" 
            value={formData.code} 
            onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} 
            placeholder="e.g. CSC"
            maxLength={5}
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 font-mono text-[12px] uppercase text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-yellow-500/50" 
          />
        </div>

        <div className="pt-2">
          <button 
            type="submit" 
            disabled={isCreating || isUpdating} 
            className="w-full rounded-md bg-yellow-500 py-2 text-[11.5px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400 disabled:opacity-50"
          >
            {isCreating || isUpdating ? 'Saving...' : 'Save Department'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

// =========================================
// MAIN COMPONENT
// =========================================
const Departments = () => {
  const toast = useToast();
  
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);

  const { data: deptsData, isLoading } = useListDepartmentsQuery();
  const [deleteDepartment] = useDeleteDepartmentMutation();

  const departments = deptsData?.departments || [];
  
  const filteredDepts = departments.filter(dept => 
    dept.name.toLowerCase().includes(search.toLowerCase()) || 
    dept.code.toLowerCase().includes(search.toLowerCase())
  );

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const openCreateModal = () => {
    setEditingDept(null);
    setIsModalOpen(true);
  };

  const openEditModal = (dept) => {
    setEditingDept(dept);
    setIsModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete the ${name} department?`)) return;
    try {
      await deleteDepartment(id).unwrap();
      toast.success('Department deleted');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to delete department. It may have users attached.');
    }
  };

  return (
    <div className="-mx-4 min-h-screen bg-zinc-950 px-4 pb-8 pt-4 animate-in fade-in duration-500 md:mx-0 md:bg-transparent md:px-0 md:pt-0">
      <div className="mx-auto max-w-5xl space-y-4 md:space-y-5">

        {/* HEADER */}
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div className="min-w-0">
            <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {today}
            </p>
            <h1 className="text-xl font-serif tracking-tight text-white md:text-2xl">
              Academic{' '}
              <span className="bg-gradient-to-r from-yellow-200 to-yellow-500 bg-clip-text text-transparent">
                Departments
              </span>
            </h1>
            <p className="mt-0.5 text-[11.5px] text-zinc-500">
              Manage the departments offered across the university.
            </p>
          </div>

          <button 
            onClick={openCreateModal}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-yellow-500 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            Add Department
          </button>
        </div>

        {/* SEARCH */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" strokeWidth={2} />
          <input 
            type="text" 
            placeholder="Search by name or code..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 py-1.5 pl-8 pr-3 text-[12px] text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30"
          />
        </div>

        {/* LIST */}
        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : filteredDepts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
            <Building2 className="mx-auto mb-2 h-8 w-8 text-zinc-700" strokeWidth={1.5} />
            <h3 className="text-[13px] font-semibold text-white">
              {search ? 'No matches found' : 'No departments yet'}
            </h3>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {search ? 'Try a different search term.' : 'Add a department to get started.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800/60">
            {filteredDepts.map((dept) => (
              <div 
                key={dept._id} 
                className="group flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-zinc-800/30"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-zinc-800 text-zinc-400">
                    <Building2 className="h-3.5 w-3.5" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-white">{dept.name}</p>
                    <p className="mt-0.5 truncate font-mono text-[10.5px] font-bold tracking-wider text-zinc-500">
                      {dept.code}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button 
                    onClick={() => openEditModal(dept)} 
                    className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-yellow-500/10 hover:text-yellow-500"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                  <button 
                    onClick={() => handleDelete(dept._id, dept.name)} 
                    className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

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