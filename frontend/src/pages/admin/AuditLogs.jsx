// src/pages/admin/AuditLogs.jsx
import React, { useState } from 'react';
import { 
  Activity, 
  ShieldCheck, 
  Search, 
  ChevronLeft,
  ChevronRight,
  Filter,
  User,
  Database
} from 'lucide-react';
import { useListAuditLogsQuery } from '../../features/adminApiSlice';

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-zinc-800 rounded-lg ${className}`}></div>
);

/* =========================================
   HELPERS
   ========================================= */
// Assigns a color to the action badge based on what happened
const getActionColor = (action) => {
  const act = action?.toLowerCase() || '';
  if (act.includes('create') || act.includes('add')) return 'bg-green-500/10 text-green-500 border-green-500/20';
  if (act.includes('delete') || act.includes('revoke') || act.includes('suspend')) return 'bg-red-500/10 text-red-500 border-red-500/20';
  if (act.includes('update') || act.includes('edit') || act.includes('status')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  if (act.includes('publish') || act.includes('approve') || act.includes('promote')) return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
  if (act.includes('ai_') || act.includes('parse')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  return 'bg-zinc-800 text-zinc-300 border-zinc-700';
};

// Safely formats the JSON meta object into a readable string
const formatMeta = (meta) => {
  if (!meta || Object.keys(meta).length === 0) return '—';
  try {
    // If it has a 'changed' array, show that. Otherwise stringify.
    if (meta.changed) return `Fields: ${meta.changed.join(', ')}`;
    return Object.entries(meta)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' • ');
  } catch {
    return '—';
  }
};

const AuditLogs = () => {
  // State
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');

  // API
  const { data: logsData, isLoading } = useListAuditLogsQuery({ 
    page, 
    limit: 15, 
    action: actionFilter,
    resource: resourceFilter 
  });

  const logs = logsData?.logs || [];
  const totalPages = logsData?.pages || 1;
  const totalLogs = logsData?.total || 0;

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif text-white tracking-tight">System Audit Logs</h1>
          <p className="text-zinc-400 text-sm mt-1">Immutable record of all actions taken within the platform.</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
        
        {/* TOOLBAR */}
        <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 text-zinc-400 bg-zinc-950 border border-zinc-800 px-3 py-2.5 rounded-lg text-sm flex-1">
            <Filter className="w-4 h-4 text-zinc-500" strokeWidth={1.5} />
            <span className="text-zinc-500 font-medium">Filters:</span>
          </div>
          
          <select 
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 focus:border-yellow-500/50 focus:outline-none sm:w-40 appearance-none"
          >
            <option value="">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="login">Login</option>
            <option value="publish">Publish</option>
            <option value="appoint">Appoint</option>
            <option value="promote">Promote</option>
            <option value="ai_parse">AI Parse</option>
          </select>

          <select 
            value={resourceFilter}
            onChange={(e) => { setResourceFilter(e.target.value); setPage(1); }}
            className="bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 focus:border-yellow-500/50 focus:outline-none sm:w-40 appearance-none"
          >
            <option value="">All Resources</option>
            <option value="user">User</option>
            <option value="course">Course</option>
            <option value="result">Result</option>
            <option value="calendar">Calendar</option>
            <option value="department">Department</option>
            <option value="result_upload">Result Upload</option>
          </select>
        </div>

        {/* LOGS LIST */}
        <div className="flex-1">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <Activity className="w-12 h-12 text-zinc-700 mb-4" strokeWidth={1} />
              <h3 className="text-lg font-medium text-white mb-1">No activity found</h3>
              <p className="text-zinc-500 text-sm">There are no logs matching your current filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {logs.map((log) => (
                <div key={log._id} className="p-4 hover:bg-zinc-800/20 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Left Side: Actor & Action */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
                    </div>
                    
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-white text-sm">{log.actor?.name || 'System Admin'}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                          {log.actorRole || log.actor?.role || 'admin'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                        <span className="text-sm text-zinc-300">
                          <span className="text-zinc-500 lowercase">on</span> <span className="font-mono text-yellow-500">{log.resource}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Meta data (Desktop only to save space) */}
                  <div className="hidden md:flex flex-1 flex-col items-start px-4">
                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Details</span>
                    <p className="text-xs text-zinc-400 truncate max-w-xs">
                      {formatMeta(log.meta)}
                    </p>
                  </div>

                  {/* Right Side: Date & IP */}
                  <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 shrink-0 md:w-48 text-right">
                    <div>
                      <p className="text-xs font-medium text-zinc-300">
                        {new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {log.ip && (
                      <p className="text-[10px] font-mono text-zinc-600 bg-zinc-950 px-1.5 py-0.5 rounded hidden md:block">
                        IP: {log.ip}
                      </p>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

        {/* PAGINATION */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 mt-auto">
          <span>Showing <strong className="text-white">{logs.length}</strong> of {totalLogs} logs</span>
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
    </div>
  );
};

export default AuditLogs;