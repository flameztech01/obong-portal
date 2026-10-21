// src/pages/admin/Dashboard.jsx
import React from 'react';
import { Link } from 'react-router';
import { 
  Users, GraduationCap, BookOpen, UploadCloud, Activity, 
  PlusCircle, ShieldCheck, Settings, ChevronRight, Clock
} from 'lucide-react';

import { useListUsersQuery, useListAuditLogsQuery, useGetSettingsQuery } from '../../features/adminApiSlice';
import { useListCoursesQuery } from '../../features/academicApiSlice';

const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-zinc-800 ${className}`} />
);

// Metric card
const MetricCard = ({ icon: Icon, label, value, subtitle, subtitleColor, to }) => {
  const inner = (
    <div className="group flex min-w-0 flex-col items-start rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 transition-colors hover:border-yellow-500/50">
      <div className="mb-1.5 flex w-full items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
          {label}
        </span>
        <Icon className="h-3.5 w-3.5 text-zinc-500 transition-colors group-hover:text-yellow-500" strokeWidth={2.5} />
      </div>
      <h4 className="mt-0.5 w-full truncate text-[18px] font-bold leading-none tracking-tight text-white">
        {value}
      </h4>
      {subtitle && (
        <span className={`mt-1.5 w-full truncate text-[10px] font-medium ${subtitleColor || 'text-zinc-500'}`}>
          {subtitle}
        </span>
      )}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
};

// Quick action (matches student's style)
const QuickAction = ({ to, label, icon: Icon }) => (
  <Link
    to={to}
    className="group flex items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 px-1 py-2.5 transition-colors hover:border-yellow-500/50 md:justify-start md:gap-2.5 md:px-3 md:py-2.5"
  >
    <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded bg-zinc-800 text-zinc-400 transition-colors group-hover:text-yellow-500 md:flex">
      <Icon className="h-4 w-4" strokeWidth={2} />
    </div>
    <span className="w-full truncate text-center text-[10px] font-semibold text-zinc-300 transition-colors group-hover:text-white md:w-auto md:text-left md:text-[12.5px] md:font-medium">
      {label}
    </span>
  </Link>
);

const AdminDashboard = () => {
  // Fetch platform stats
  const { data: studentsData, isLoading: isStudentsLoading } = useListUsersQuery({ role: 'student', limit: 1 });
  const { data: lecturersData, isLoading: isLecturersLoading } = useListUsersQuery({ role: 'lecturer', limit: 1 });
  const { data: coursesData, isLoading: isCoursesLoading } = useListCoursesQuery({ limit: 1 });
  const { data: auditData, isLoading: isAuditLoading } = useListAuditLogsQuery({ limit: 5 });
  const { data: settingsData, isLoading: isSettingsLoading } = useGetSettingsQuery();

  const settings = settingsData?.settings;
  const recentLogs = auditData?.logs || [];
  const uploadsOn = !!settings?.allowStudentResultUpload;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // Loading skeleton
  if (isStudentsLoading && isCoursesLoading && isSettingsLoading) {
    return (
      <div className="-mx-4 min-h-screen bg-zinc-950 px-4 pb-8 pt-4 md:mx-0 md:bg-transparent md:px-0 md:pt-0">
        <div className="mx-auto max-w-7xl space-y-4">
          <Skeleton className="h-16 w-full md:w-1/3" />
          <div className="grid grid-cols-2 gap-2.5">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-4 min-h-screen bg-zinc-950 px-4 pb-8 pt-4 animate-in fade-in duration-500 md:mx-0 md:bg-transparent md:px-0 md:pt-0">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-5">

        {/* HEADER */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {today}
            </p>
            <h1 className="truncate text-xl font-serif tracking-tight text-white md:text-2xl">
              System{' '}
              <span className="bg-gradient-to-r from-yellow-200 to-yellow-500 bg-clip-text text-transparent">
                Overview
              </span>
            </h1>
          </div>

          <div className="hidden shrink-0 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[11.5px] text-zinc-300 md:flex">
            <ShieldCheck className="h-3.5 w-3.5 text-yellow-500" strokeWidth={2} />
            <span className="truncate">Admin Access</span>
          </div>
        </div>

        {/* MOBILE IDENTITY STRIP */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 md:hidden">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-800">
              <ShieldCheck className="h-4 w-4 text-yellow-500" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold leading-tight text-white">
                Admin Console
              </p>
              <p className="mt-0.5 truncate text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                System Access
              </p>
            </div>
          </div>
          <Link
            to="/superuser/settings"
            aria-label="Settings"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-zinc-400 transition-colors hover:text-white"
          >
            <Settings className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>

        {/* STATUS BANNER */}
        <div className="relative flex items-center justify-between gap-3 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <div className={`absolute inset-y-0 left-0 w-0.5 ${uploadsOn ? 'bg-green-500' : 'bg-red-500'}`} />
          <div className="flex min-w-0 flex-1 items-center gap-2.5 pl-1">
            <UploadCloud className={`hidden h-4 w-4 shrink-0 sm:block ${uploadsOn ? 'text-green-500' : 'text-red-500'}`} strokeWidth={2} />
            <div className="min-w-0">
              <h3 className="truncate text-[12.5px] font-semibold text-white">
                Student uploads {uploadsOn ? 'enabled' : 'disabled'}
              </h3>
              <p className="mt-0.5 truncate text-[11px] text-zinc-400">
                {uploadsOn
                  ? 'Students can upload historical results.'
                  : 'Students cannot upload results right now.'}
              </p>
            </div>
          </div>
          <Link
            to="/superuser/settings"
            className="shrink-0 rounded-md bg-zinc-800 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-zinc-700"
          >
            Manage
          </Link>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4">
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
            value={isSettingsLoading ? '...' : (uploadsOn ? 'On' : 'Off')}
            subtitle="Student uploads"
            subtitleColor={uploadsOn ? 'text-green-500' : 'text-red-500'}
            to="/superuser/settings"
          />
        </div>

        {/* QUICK ACTIONS */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1 md:px-0">
            <h2 className="truncate text-[14.5px] font-serif tracking-tight text-white">
              Quick Actions
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 md:gap-2.5">
            <QuickAction to="/superuser/users" label="Create Lecturer" icon={PlusCircle} />
            <QuickAction to="/superuser/appointments" label="Appoint Roles" icon={ShieldCheck} />
            <QuickAction to="/superuser/settings" label="Settings" icon={Settings} />
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1 md:px-0">
            <h2 className="truncate text-[14.5px] font-serif tracking-tight text-white">
              Recent Activity
            </h2>
            <Link
              to="/superuser/audit-logs"
              className="shrink-0 text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:text-yellow-500"
            >
              View All
            </Link>
          </div>

          {isAuditLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : recentLogs.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800/60">
              {recentLogs.map((log) => (
                <div key={log._id} className="flex items-start gap-3 px-3.5 py-3 transition-colors hover:bg-zinc-800/30">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-zinc-400">
                    <Activity className="h-3.5 w-3.5" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] text-zinc-300">
                      <span className="font-semibold text-white">{log.actor?.name || 'Admin'}</span>{' '}
                      {log.action}d{' '}
                      <span className="font-mono text-[11.5px] text-yellow-500">{log.resource}</span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-zinc-500">
                      <Clock className="h-2.5 w-2.5" strokeWidth={2} />
                      {new Date(log.createdAt).toLocaleString(undefined, {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-800 p-5 text-center">
              <p className="text-[11.5px] text-zinc-500">No recent activity yet.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;