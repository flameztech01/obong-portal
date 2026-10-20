import React from 'react';
import { Link } from 'react-router';
import { useGetMeQuery } from '../features/authApiSlice';
import { useGetMyGpaQuery } from '../features/resultApiSlice';
import { useListExamWindowsQuery } from '../features/academicApiSlice';
import { useListMaterialsQuery } from '../features/studyApiSlice';

// =========================================
// HELPERS & SKELETONS
// =========================================
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-zinc-800 rounded-lg ${className}`}></div>
);

// =========================================
// MAIN DASHBOARD COMPONENT
// =========================================
const Dashboard = () => {
  // 1. Fetch data
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

  // Check if upload is needed
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
      <div className="space-y-4 p-4 md:p-8 max-w-7xl mx-auto">
        <Skeleton className="h-20 w-full md:w-1/3" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-24 md:pb-12 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* =========================================
          DESKTOP HEADER
          ========================================= */}
      <div className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-zinc-500 text-sm font-medium tracking-wide uppercase mb-1">
            {today}
          </p>
          <h1 className="text-3xl lg:text-4xl font-serif text-white tracking-tight truncate">
            Welcome back,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">
              {user?.name?.split(' ')[0]}
            </span>
          </h1>
        </div>

        {user?.role === 'student' && (
          <div className="flex items-center gap-2 text-sm text-zinc-400 bg-zinc-900 px-4 py-2 rounded-xl border border-zinc-800 shrink-0">
            <svg
              className="w-4 h-4 text-yellow-500 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <span className="truncate">
              {user.level} Level • {user.matricNumber}
            </span>
          </div>
        )}
      </div>

      {/* =========================================
          MOBILE HERO CARD
          ========================================= */}
      <div className="md:hidden bg-zinc-900 border border-zinc-800 rounded-2xl p-4 relative overflow-hidden">
        <div className="flex items-center justify-between gap-3 mb-3">
          {/* Avatar + name — shrinkable */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-12 h-12 shrink-0 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700 overflow-hidden">
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-yellow-500 font-bold text-lg">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                Student Profile
              </p>
              <h2 className="text-base font-bold text-white leading-tight truncate">
                {user?.name}
              </h2>
            </div>
          </div>

          {/* Settings icon — fixed size, never compressed */}
          <Link
            to="/settings"
            aria-label="Settings"
            className="w-8 h-8 shrink-0 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-yellow-500 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
            </svg>
          </Link>
        </div>

        {/* Level + matric — matric truncates if long */}
        <div className="flex items-center justify-between gap-2 bg-zinc-950/50 rounded-xl px-3 py-2 border border-zinc-800/50">
          <span className="text-[11px] text-zinc-400 shrink-0">
            {user?.level} Level
          </span>
          <span className="text-[11px] font-mono text-yellow-500 tracking-wider font-bold truncate min-w-0">
            {user?.matricNumber}
          </span>
        </div>
      </div>

      {/* =========================================
          SLIM ALERT BANNER
          ========================================= */}
      {needsUpload && (
        <div className="bg-zinc-900 border border-yellow-500/30 rounded-xl p-3 flex items-center justify-between gap-3 relative overflow-hidden shadow-[0_0_15px_rgba(234,179,8,0.05)]">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500" />
          <div className="flex items-center gap-3 pl-1 min-w-0 flex-1">
            <div className="hidden sm:block text-yellow-500 shrink-0">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-white text-xs md:text-sm font-medium truncate">
                Complete your profile
              </h3>
              <p className="text-zinc-400 text-[10px] md:text-xs mt-0.5 max-w-xl">
                {user?.isTransferStudent
                  ? 'Upload your previous transcript to calculate your accurate CGPA.'
                  : 'Upload your past results (100L - present) to generate your accurate CGPA.'}
              </p>
            </div>
          </div>
          <Link
            to="/upload-results"
            className="shrink-0 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 text-[10px] md:text-xs font-bold uppercase tracking-wider px-3 py-2 md:px-5 md:py-2.5 rounded-lg transition-colors"
          >
            Upload
          </Link>
        </div>
      )}

      {/* =========================================
          METRIC CARDS (Mobile Grid)
          ========================================= */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* CGPA Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-2.5 sm:p-4 flex flex-col items-start min-w-0 hover:border-yellow-500/50 transition-colors">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-yellow-500/10 text-yellow-500 flex items-center justify-center mb-2 shrink-0">
            <svg
              className="w-3 h-3 sm:w-4 sm:h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          {isGpaLoading ? (
            <Skeleton className="h-6 w-12 mt-1" />
          ) : (
            <h4 className="text-lg sm:text-2xl font-bold text-white mt-0.5 leading-none truncate w-full">
              {gpaData?.cumulative?.gpa?.toFixed(2) || '0.00'}
            </h4>
          )}
          <p className="text-[9px] sm:text-[11px] text-zinc-500 uppercase tracking-wider mt-1 truncate w-full">
            CGPA
          </p>
        </div>

        {/* Next Exam Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-2.5 sm:p-4 flex flex-col items-start min-w-0 hover:border-yellow-500/50 transition-colors">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center mb-2 shrink-0">
            <svg
              className="w-3 h-3 sm:w-4 sm:h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          {isExamsLoading ? (
            <Skeleton className="h-6 w-16 mt-1" />
          ) : examsData?.examWindows?.length > 0 ? (
            <h4 className="text-sm sm:text-lg font-bold text-white mt-0.5 leading-tight truncate w-full">
              {examsData.examWindows[0].course?.code || 'Exam'}
            </h4>
          ) : (
            <h4 className="text-sm sm:text-lg font-bold text-zinc-500 mt-0.5 leading-tight truncate w-full">
              None
            </h4>
          )}
          <p className="text-[9px] sm:text-[11px] text-zinc-500 uppercase tracking-wider mt-1 truncate w-full">
            {examsData?.examWindows?.length > 0
              ? new Date(examsData.examWindows[0].startTime).toLocaleDateString(
                  undefined,
                  { month: 'short', day: 'numeric' }
                )
              : 'No Upcoming'}
          </p>
        </div>

        {/* Study Hub Card */}
        <Link
          to="/study"
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-2.5 sm:p-4 flex flex-col items-start min-w-0 hover:border-yellow-500/50 transition-colors group"
        >
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center mb-2 shrink-0 group-hover:text-yellow-500 transition-colors">
            <svg
              className="w-3 h-3 sm:w-4 sm:h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h4 className="text-xs sm:text-base font-bold text-white mt-0.5 leading-tight truncate w-full">
            Study
          </h4>
          <p className="text-[9px] sm:text-[11px] text-zinc-500 uppercase tracking-wider mt-1 truncate w-full">
            Materials
          </p>
        </Link>
      </div>

      {/* =========================================
          DESKTOP: QUICK ACTIONS ROW
          ========================================= */}
      <div className="hidden md:grid grid-cols-4 gap-4">
        <Link
          to="/study"
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3 min-w-0 hover:border-yellow-500/50 transition-colors group"
        >
          <div className="w-10 h-10 shrink-0 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-yellow-500 transition-colors">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors truncate">
            Study Materials
          </span>
        </Link>

        <Link
          to="/quizzes"
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3 min-w-0 hover:border-yellow-500/50 transition-colors group"
        >
          <div className="w-10 h-10 shrink-0 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-yellow-500 transition-colors">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
          <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors truncate">
            Take a Quiz
          </span>
        </Link>

        <Link
          to="/results"
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3 min-w-0 hover:border-yellow-500/50 transition-colors group"
        >
          <div className="w-10 h-10 shrink-0 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-yellow-500 transition-colors">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors truncate">
            My Results
          </span>
        </Link>

        <Link
          to="/upload-results"
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3 min-w-0 hover:border-yellow-500/50 transition-colors group"
        >
          <div className="w-10 h-10 shrink-0 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-yellow-500 transition-colors">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </div>
          <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors truncate">
            Upload Results
          </span>
        </Link>
      </div>

      {/* =========================================
          RECENT MATERIALS
          ========================================= */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3 md:mb-4 px-1 md:px-0">
          <h2 className="text-base md:text-lg font-serif text-white tracking-tight truncate min-w-0">
            Recently Added
          </h2>
          <Link
            to="/study"
            className="shrink-0 text-[10px] md:text-xs font-semibold text-zinc-400 hover:text-yellow-500 uppercase tracking-wider transition-colors"
          >
            View All
          </Link>
        </div>

        {isMaterialsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : materialsData?.materials?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {materialsData.materials.map((material) => (
              <Link
                to="/study"
                key={material.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 min-w-0 hover:border-yellow-500/50 transition-colors group flex items-start gap-3"
              >
                <div className="bg-zinc-800 p-2 rounded-lg text-zinc-400 group-hover:text-yellow-500 transition-colors shrink-0">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <h4 className="text-sm font-medium text-white truncate">
                    {material.title}
                  </h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                    {material.course?.code} • {material.type.replace('_', ' ')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-xl p-6 text-center">
            <p className="text-zinc-500 text-xs">
              No materials uploaded yet. Check back later.
            </p>
          </div>
        )}
      </div>

      {/* =========================================
          FLOATING ACTION BUTTON (Mobile Only)
          ========================================= */}
      <Link
        to="/study"
        aria-label="Open Study Materials"
        className="md:hidden fixed bottom-24 right-4 z-40 w-12 h-12 rounded-xl bg-yellow-500 text-zinc-950 flex items-center justify-center shadow-[0_4px_20px_rgba(234,179,8,0.4)] active:scale-95 transition-transform"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      </Link>
    </div>
  );
};

export default Dashboard;