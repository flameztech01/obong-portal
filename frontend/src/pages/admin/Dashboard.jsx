// src/pages/admin/Dashboard.jsx
import React from 'react';
import { Link } from 'react-router';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  UploadCloud, 
  Activity, 
  PlusCircle, 
  ShieldCheck, 
  Settings,
  ChevronRight
} from 'lucide-react';

import { useListUsersQuery } from '../../features/adminApiSlice';
import { useListCoursesQuery } from '../../features/academicApiSlice';
import { useListAuditLogsQuery, useGetSettingsQuery } from '../../features/adminApiSlice';

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-zinc-800 rounded-lg ${className}`}></div>
);

// ─── Metric Card ──────────────
const MetricCard = ({ icon: Icon, label, value, subtitle, subtitleColor, to }) => {
  const inner = (
    <div className="group relative bg-zinc-900 rounded-2xl border border-zinc-800 p-2.5 sm:p-3 md:p-4 flex flex-col items-start gap-0.5 sm:gap-1 hover:border-yellow-500/40 hover:shadow-[0_0_20px_rgba(234,179,8,0.08)] active:scale-[0.97] transition-all duration-300 overflow-hidden">
      <div className="flex items-center justify-between w-full">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center bg-yellow-500/10 text-yellow-500 group-hover:scale-105 transition-transform">
          {/* Using Lucide Icon with custom stroke width */}
          <Icon className="w-4 h-4 md:w-5 md:h-5" strokeWidth={1.5} />
        </div>
        <span className="hidden md:inline text-xs font-mono text-zinc-600 group-hover:text-zinc-400 transition">
          →
        </span>
      </div>
      <p className="text-base sm:text-lg md:text-xl font-bold text-white tracking-tight mt-0.5 md:mt-1 leading-none">
        {value}
      </p>
      <p className="text-[9px] sm:text-[10px] md:text-[11px] text-zinc-500 uppercase tracking-wider leading-tight">
        {label}
      </p>
      {subtitle && (
        <p className={`text-[9px] md:text-[10px] font-medium leading-tight truncate w-full ${subtitleColor || 'text-zinc-500'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );

  return to ? <Link to={to}>{inner}</Link> : inner;
};

const AdminDashboard = () => {
  // Fetch platform stats
  const { data: studentsData, isLoading: isStudentsLoading } = useListUsersQuery({ role: 'student', limit: 1 });
  const { data: lecturersData, isLoading: isLecturersLoading } = useListUsersQuery({ role: 'lecturer', limit: 1 });
  const { data: coursesData, isLoading: isCoursesLoading } = useListCoursesQuery({ limit: 1 });
  
  // Fetch recent activity & system settings
  const { data: auditData, isLoading: isAuditLoading } = useListAuditLogsQuery({ limit: 6 });
  const { data: settingsData, isLoading: isSettingsLoading } = useGetSettingsQuery();

  const settings = settingsData?.settings;
  const recentLogs = auditData?.logs || [];

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  return (
    <div className="space-y-4 md:space-y-6 pb-24 md:pb-12 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      {/* DESKTOP HEADER */}
      <div className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-zinc-500 text-sm font-medium tracking-wide uppercase mb-1">
            {today}
          </p>
          <h1 className="text-3xl lg:text-4xl font-serif text-white tracking-tight">
            System <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">Overview</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-zinc-400 bg-zinc-900 px-4 py-2 rounded-xl border border-zinc-800">
          <ShieldCheck className="w-4 h-4 text-yellow-500" strokeWidth={1.5} />
          Admin Access
        </div>
      </div>

      {/* MOBILE HERO CARD */}
      <div className="md:hidden bg-zinc-900 border border-zinc-800 rounded-2xl p-4 relative overflow-hidden">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700 overflow-hidden p-2">
               <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                System Portal
              </span>
              <h2 className="text-base font-bold text-white leading-tight">Admin Dashboard</h2>
            </div>
          </div>
          <Link to="/superuser/settings" className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-yellow-500 transition-colors">
            <Settings className="w-4 h-4" strokeWidth={1.5} />
          </Link>
        </div>
        
        <div className="flex items-center justify-between bg-zinc-950/50 rounded-xl px-3 py-2 border border-zinc-800/50">
          <span className="text-[11px] text-zinc-400">{today}</span>
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-6">
        <MetricCard 
          icon={GraduationCap} 
          label="Students"
          value={isStudentsLoading ? '...' : studentsData?.total || 0}
          subtitle="Enrolled"
          subtitleColor="text-zinc-500"
          to="/superuser/users"
        />

        <MetricCard 
          icon={Users} 
          label="Lecturers"
          value={isLecturersLoading ? '...' : lecturersData?.total || 0}
          subtitle="Staff members"
          subtitleColor="text-zinc-500"
          to="/superuser/users"
        />

        <MetricCard 
          icon={BookOpen} 
          label="Courses"
          value={isCoursesLoading ? '...' : coursesData?.total || 0}
          subtitle="Course catalog"
          subtitleColor="text-zinc-500"
          to="/superuser/courses"
        />

        <MetricCard 
          icon={UploadCloud} 
          label="Uploads"
          value={isSettingsLoading ? '...' : (settings?.allowStudentResultUpload ? 'On' : 'Off')}
          subtitle="Student uploads"
          subtitleColor={settings?.allowStudentResultUpload ? "text-green-500" : "text-red-500"}
          to="/superuser/settings"
        />
      </div>

      {/* LOWER CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-6">
        
        {/* RECENT ACTIVITY */}
        <div className="lg:col-span-3 bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col overflow-hidden">
          <div className="px-3 sm:px-5 py-3 flex items-center justify-between border-b border-zinc-800/60">
            <h2 className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-yellow-500" strokeWidth={1.5} />
              Recent Activity
            </h2>
            <Link to="/superuser/audit-logs" className="text-[10px] font-medium uppercase tracking-wider text-yellow-500 hover:text-yellow-400 transition-colors">
              View All Logs
            </Link>
          </div>
          
          <div className="flex-1 p-2">
            {isAuditLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : recentLogs.length > 0 ? (
              <div className="divide-y divide-zinc-800/40">
                {recentLogs.map((log) => (
                  <div key={log._id} className="p-3 sm:p-4 flex items-start gap-3 sm:gap-4 hover:bg-zinc-800/20 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5 text-zinc-400">
                      <Activity className="w-4 h-4" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] sm:text-sm text-zinc-300">
                        <span className="font-semibold text-white">{log.actor?.name || 'Admin'}</span> 
                        {' '}{log.action}d{' '} 
                        <span className="font-mono text-yellow-500">{log.resource}</span>
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-zinc-500 mt-1 truncate">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-500 text-sm">
                No recent activity found.
              </div>
            )}
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="lg:col-span-1 bg-zinc-900 rounded-2xl border border-zinc-800 p-3 sm:p-4">
          <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-2 pt-1.5 pb-2">Quick Actions</h2>
          
          <div className="flex flex-col gap-1">
            <Link to="/superuser/users" className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800/50 transition group">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 group-hover:text-yellow-500 flex items-center justify-center flex-shrink-0 transition-colors">
                <PlusCircle className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition text-left">Create Lecturer</span>
              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 ml-auto transition-colors" strokeWidth={1.5} />
            </Link>

            <Link to="/superuser/appointments" className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800/50 transition group">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 group-hover:text-yellow-500 flex items-center justify-center flex-shrink-0 transition-colors">
                <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition text-left">Appoint Roles</span>
              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 ml-auto transition-colors" strokeWidth={1.5} />
            </Link>

            <Link to="/superuser/settings" className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800/50 transition group">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 group-hover:text-yellow-500 flex items-center justify-center flex-shrink-0 transition-colors">
                <Settings className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition text-left">Settings</span>
              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 ml-auto transition-colors" strokeWidth={1.5} />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;