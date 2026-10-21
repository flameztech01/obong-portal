// src/pages/Dashboard.jsx
import React from 'react';
import { Link } from 'react-router';
import {
  GraduationCap, Calendar, BookOpen, Upload, TrendingUp, Settings,
  AlertTriangle, FileText, ChevronRight, PlaySquare
} from 'lucide-react';
import { useGetMeQuery } from '../features/authApiSlice';
import { useGetMyGpaQuery } from '../features/resultApiSlice';
import { useListExamWindowsQuery } from '../features/academicApiSlice';
import { useListMaterialsQuery } from '../features/studyApiSlice';

// =========================================
// SKELETON
// =========================================
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-zinc-800 ${className}`} />
);

// =========================================
// MAIN DASHBOARD COMPONENT
// =========================================
const Dashboard = () => {
  const { data: userData, isLoading: isUserLoading } = useGetMeQuery();
  const user = userData?.user;

  const { data: gpaData, isLoading: isGpaLoading } = useGetMyGpaQuery(undefined, {
    skip: user?.role !== 'student',
  });
  const { data: examsData, isLoading: isExamsLoading } = useListExamWindowsQuery({
    activeOnly: true,
  });
  const { data: materialsData, isLoading: isMaterialsLoading } = useListMaterialsQuery({
    limit: 3,
  });

  const needsUpload =
    user?.role === 'student' &&
    (user?.isTransferStudent || user?.level > 100) &&
    !user?.hasUploadedHistoricalResults;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (isUserLoading) {
    return (
      <div className="-mx-4 min-h-screen bg-zinc-950 px-4 pb-8 pt-4 md:mx-0 md:bg-transparent md:px-0 md:pt-0">
        <div className="mx-auto max-w-7xl space-y-4">
          <Skeleton className="h-16 w-full md:w-1/3" />
          <Skeleton className="h-28 w-full" />
          <div className="grid grid-cols-2 gap-2.5">
            <Skeleton className="col-span-2 h-24 w-full" />
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
        
        {/* =========================================
            HEADER
            ========================================= */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {today}
            </p>
            <h1 className="truncate text-xl font-serif tracking-tight text-white md:text-2xl">
              Welcome back,{' '}
              <span className="bg-gradient-to-r from-yellow-200 to-yellow-500 bg-clip-text text-transparent">
                {user?.name?.split(' ')[0]}
              </span>
            </h1>
          </div>

          {/* Desktop Identity Badge */}
          {user?.role === 'student' && (
            <div className="hidden shrink-0 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[11.5px] text-zinc-300 md:flex">
              <GraduationCap className="h-3.5 w-3.5 text-yellow-500" strokeWidth={2} />
              <span className="truncate">
                {user.level} Level <span className="mx-1 text-zinc-600">•</span> {user.matricNumber}
              </span>
            </div>
          )}
        </div>

        {/* =========================================
            MOBILE IDENTITY STRIP
            ========================================= */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 md:hidden">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-800">
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[14px] font-bold text-yellow-500">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white leading-tight">
                {user?.name}
              </p>
              <p className="mt-0.5 truncate text-[11px] font-mono text-zinc-400 tracking-wider">
                {user?.matricNumber} · {user?.level}L
              </p>
            </div>
          </div>
          <Link
            to="/settings"
            aria-label="Settings"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-zinc-400 transition-colors hover:text-white"
          >
            <Settings className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>

        {/* =========================================
            SLIM ALERT BANNER
            ========================================= */}
        {needsUpload && (
          <div className="relative flex items-center justify-between gap-3 overflow-hidden rounded-lg border border-yellow-500/30 bg-zinc-900 p-3">
            <div className="absolute inset-y-0 left-0 w-0.5 bg-yellow-500" />
            <div className="flex min-w-0 flex-1 items-center gap-2.5 pl-1">
              <AlertTriangle className="hidden h-4 w-4 shrink-0 text-yellow-500 sm:block" strokeWidth={2} />
              <div className="min-w-0">
                <h3 className="truncate text-[12.5px] font-semibold text-white">
                  Complete your profile
                </h3>
                <p className="mt-0.5 truncate text-[11px] text-zinc-400">
                  {user?.isTransferStudent
                    ? 'Upload your previous transcript to calculate accurate CGPA.'
                    : 'Upload past results to generate your accurate CGPA.'}
                </p>
              </div>
            </div>
            <Link
              to="/upload-results"
              className="shrink-0 rounded-md bg-yellow-500 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400"
            >
              Upload
            </Link>
          </div>
        )}

        {/* =========================================
            METRIC CARDS (Mobile: 2 Cols, Desktop: 3 Cols)
            ========================================= */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3">
          
          {/* CGPA Hero Card (Takes full width on mobile) */}
          <Link
            to="/results"
            className="group relative col-span-2 flex min-w-0 flex-col items-start overflow-hidden rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 p-3.5 text-zinc-950 transition-opacity hover:opacity-95 md:col-span-1"
          >
            <div className="mb-1.5 flex w-full items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-950/70">
                Cumulative GPA
              </span>
              <TrendingUp className="h-3.5 w-3.5 text-zinc-950/50" strokeWidth={2.5} />
            </div>
            {isGpaLoading ? (
              <div className="mt-1 h-8 w-20 animate-pulse rounded bg-zinc-950/20" />
            ) : (
              <h4 className="mt-0.5 w-full truncate text-3xl font-bold leading-none tracking-tight">
                {gpaData?.cumulative?.gpa?.toFixed(2) || '0.00'}
              </h4>
            )}
            <span className="mt-1 w-full truncate text-[10px] font-medium text-zinc-950/60">
              out of 5.00
            </span>
          </Link>

          {/* Next Exam Card */}
          <div className="flex min-w-0 flex-col items-start rounded-xl border border-zinc-800 bg-zinc-900 p-3.5">
            <div className="mb-1.5 flex w-full items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                Next Exam
              </span>
              <Calendar className="h-3.5 w-3.5 text-zinc-500" strokeWidth={2.5} />
            </div>
            {isExamsLoading ? (
              <Skeleton className="mt-1 h-6 w-16" />
            ) : examsData?.examWindows?.length > 0 ? (
              <h4 className="mt-0.5 w-full truncate text-[14px] font-bold leading-tight text-white">
                {examsData.examWindows[0].course?.code || 'Exam'}
              </h4>
            ) : (
              <h4 className="mt-0.5 w-full truncate text-[14px] font-bold leading-tight text-zinc-600">
                None
              </h4>
            )}
            <span className="mt-1 w-full truncate text-[10px] font-medium text-zinc-500">
              {examsData?.examWindows?.length > 0
                ? new Date(examsData.examWindows[0].startTime).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })
                : 'No Upcoming'}
            </span>
          </div>

          {/* Study Hub Card */}
          <Link
            to="/study"
            className="group flex min-w-0 flex-col items-start rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 transition-colors hover:border-yellow-500/50"
          >
            <div className="mb-1.5 flex w-full items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                Study
              </span>
              <BookOpen className="h-3.5 w-3.5 text-zinc-500 transition-colors group-hover:text-yellow-500" strokeWidth={2.5} />
            </div>
            <h4 className="mt-0.5 w-full truncate text-[14px] font-bold leading-tight text-white">
              Hub
            </h4>
            <span className="mt-1 w-full truncate text-[10px] font-medium text-zinc-500">
              Materials
            </span>
          </Link>
        </div>

        {/* =========================================
            QUICK ACTIONS (Slim text-only cards on mobile)
            ========================================= */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 md:gap-2.5">
          <Link
            to="/study"
            className="group flex items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 px-1 py-2.5 transition-colors hover:border-yellow-500/50 md:justify-start md:gap-2.5 md:px-3 md:py-2.5"
          >
            <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded bg-zinc-800 text-zinc-400 transition-colors group-hover:text-yellow-500 md:flex">
              <BookOpen className="h-4 w-4" strokeWidth={2} />
            </div>
            <span className="w-full truncate text-center text-[10px] font-semibold text-zinc-300 transition-colors group-hover:text-white md:w-auto md:text-left md:text-[12.5px] md:font-medium">
              Study
            </span>
          </Link>

          <Link
            to="/quizzes"
            className="group flex items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 px-1 py-2.5 transition-colors hover:border-yellow-500/50 md:justify-start md:gap-2.5 md:px-3 md:py-2.5"
          >
            <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded bg-zinc-800 text-zinc-400 transition-colors group-hover:text-yellow-500 md:flex">
              <PlaySquare className="h-4 w-4" strokeWidth={2} />
            </div>
            <span className="w-full truncate text-center text-[10px] font-semibold text-zinc-300 transition-colors group-hover:text-white md:w-auto md:text-left md:text-[12.5px] md:font-medium">
              Quiz
            </span>
          </Link>

          <Link
            to="/results"
            className="group flex items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 px-1 py-2.5 transition-colors hover:border-yellow-500/50 md:justify-start md:gap-2.5 md:px-3 md:py-2.5"
          >
            <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded bg-zinc-800 text-zinc-400 transition-colors group-hover:text-yellow-500 md:flex">
              <FileText className="h-4 w-4" strokeWidth={2} />
            </div>
            <span className="w-full truncate text-center text-[10px] font-semibold text-zinc-300 transition-colors group-hover:text-white md:w-auto md:text-left md:text-[12.5px] md:font-medium">
              Results
            </span>
          </Link>

          <Link
            to="/upload-results"
            className="group flex items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 px-1 py-2.5 transition-colors hover:border-yellow-500/50 md:justify-start md:gap-2.5 md:px-3 md:py-2.5"
          >
            <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded bg-zinc-800 text-zinc-400 transition-colors group-hover:text-yellow-500 md:flex">
              <Upload className="h-4 w-4" strokeWidth={2} />
            </div>
            <span className="w-full truncate text-center text-[10px] font-semibold text-zinc-300 transition-colors group-hover:text-white md:w-auto md:text-left md:text-[12.5px] md:font-medium">
              Upload
            </span>
          </Link>
        </div>

        {/* =========================================
            RECENT MATERIALS
            ========================================= */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1 md:px-0">
            <h2 className="truncate text-[14.5px] font-serif tracking-tight text-white">
              Recently Added
            </h2>
            <Link
              to="/study"
              className="shrink-0 text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:text-yellow-500"
            >
              View All
            </Link>
          </div>

          {isMaterialsLoading ? (
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : materialsData?.materials?.length > 0 ? (
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
              {materialsData.materials.map((material) => (
                <Link
                  to="/study"
                  key={material.id}
                  className="group flex min-w-0 items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3 transition-colors hover:border-yellow-500/50"
                >
                  <div className="shrink-0 rounded-md bg-zinc-800 p-2 text-zinc-400 transition-colors group-hover:text-yellow-500">
                    <FileText className="h-4 w-4" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-[12.5px] font-medium text-white">
                      {material.title}
                    </h4>
                    <p className="mt-0.5 truncate text-[10.5px] text-zinc-500">
                      {material.course?.code} <span className="mx-0.5 text-zinc-600">•</span>{' '}
                      <span className="capitalize">{material.type.replace('_', ' ')}</span>
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" strokeWidth={2} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-800 p-5 text-center">
              <p className="text-[11.5px] text-zinc-500">No materials uploaded yet. Check back later.</p>
            </div>
          )}
        </div>

        {/* =========================================
            FLOATING ACTION BUTTON (Mobile Only)
            ========================================= */}
        <Link
          to="/study"
          aria-label="Open Study Materials"
          className="fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500 text-zinc-950 shadow-[0_4px_20px_rgba(234,179,8,0.3)] transition-transform active:scale-95 md:hidden"
        >
          <BookOpen className="h-5 w-5" strokeWidth={2.2} />
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;