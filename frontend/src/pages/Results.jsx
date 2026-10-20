// src/pages/Results.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router';
import {
  Plus,
  ChevronDown,
  AlertTriangle,
  FileText,
  Award,
  BookOpen,
  TrendingUp,
  GraduationCap,
  Layers,
  X,
} from 'lucide-react';
import { useGetMyResultsQuery, useGetMyGpaQuery } from '../features/resultApiSlice';

// =========================================
// SKELETONS
// =========================================
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-zinc-800 rounded-lg ${className}`}></div>
);

// =========================================
// STAT MODAL (bottom sheet on mobile / centered on desktop)
// =========================================
const StatModal = ({ open, onClose, title, icon: Icon, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Mobile: slide-up bottom sheet */}
      <div className="md:hidden absolute bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 rounded-t-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>
        <div className="flex items-center justify-between px-5 pb-4 shrink-0 border-b border-zinc-800">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && <Icon className="w-5 h-5 text-yellow-500 shrink-0" />}
            <h3 className="text-base font-bold text-white truncate">{title}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 shrink-0 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 active:scale-95 transition-transform"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 pb-8">{children}</div>
      </div>

      {/* Desktop: centered modal */}
      <div
        className="hidden md:flex absolute inset-0 items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {Icon && <Icon className="w-5 h-5 text-yellow-500 shrink-0" />}
              <h3 className="text-lg font-bold text-white truncate">{title}</h3>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 p-6">{children}</div>
        </div>
      </div>
    </div>
  );
};

// =========================================
// MAIN PAGE
// =========================================
const Results = () => {
  const { data: gpaData, isLoading: isGpaLoading } = useGetMyGpaQuery();
  const { data: resultsData, isLoading: isResultsLoading } = useGetMyResultsQuery();

  const [expandedSemester, setExpandedSemester] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'cgpa' | 'credits' | 'courses' | 'carryovers' | null

  const results = resultsData?.results || [];
  const carryovers = gpaData?.carryovers || [];
  const sessionBreakdown = gpaData?.sessionBreakdown || [];

  const cgpa = gpaData?.cumulative?.gpa ?? 0;
  const totalCredits = gpaData?.cumulative?.units ?? 0;
  const totalCourses = gpaData?.totalCourses ?? results.length ?? 0;
  const carryoverCount = carryovers.length;

  // Group detailed courses by session + semester
  const groupedResults = useMemo(() => {
    const groups = {};
    results.forEach((result) => {
      const sessionName = result.session?.name || 'Unknown Session';
      const key = `${sessionName} - ${result.semester}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          sessionName,
          semester: result.semester,
          courses: [],
        };
      }
      groups[key].courses.push(result);
    });
    return Object.values(groups).sort((a, b) => {
      return (
        b.sessionName.localeCompare(a.sessionName) ||
        b.semester.localeCompare(a.semester)
      );
    });
  }, [results]);

  const toggleSemester = (key) => {
    setExpandedSemester((prev) => (prev === key ? null : key));
  };

  const closeModal = () => setActiveModal(null);

  if (isGpaLoading || isResultsLoading) {
    return (
      <div className="space-y-6 p-4 md:p-8 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-14 w-full md:hidden" />
        <div className="hidden md:grid grid-cols-4 gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // Empty state
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] px-6 text-center animate-in fade-in max-w-4xl mx-auto">
        <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-6 text-zinc-500">
          <FileText className="w-10 h-10" strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl font-serif text-white mb-2">No Results Found</h2>
        <p className="text-zinc-400 text-sm max-w-md mb-6">
          You don't have any published results yet. If you are an old or transfer
          student, you need to upload your historical results to generate your CGPA.
        </p>
        <Link
          to="/upload-results"
          className="bg-yellow-500 hover:bg-yellow-400 text-zinc-950 text-sm font-bold uppercase tracking-wider px-6 py-3 rounded-lg transition-colors"
        >
          Upload Historical Results
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500 max-w-5xl mx-auto">
      {/* =========================================
          HEADER
          ========================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-serif text-white tracking-tight truncate">
            Academic Results
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            View your grades, GPA, and carryovers.
          </p>
        </div>

        <Link
          to="/upload-results"
          className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border border-zinc-700 shrink-0"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          Add More Results
        </Link>
      </div>

      {/* =========================================
          STATS — Desktop (4 clickable cards)
          ========================================= */}
      <div className="hidden md:grid grid-cols-4 gap-4">
        {/* CGPA */}
        <button
          onClick={() => setActiveModal('cgpa')}
          className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-left hover:border-yellow-500/50 transition-colors overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Award className="w-16 h-16 text-yellow-500" />
          </div>
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">
            Cumulative GPA
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-bold text-white">{cgpa.toFixed(2)}</span>
            <span className="text-zinc-500 text-xs">/ 5.00</span>
          </div>
        </button>

        {/* Credits */}
        <button
          onClick={() => setActiveModal('credits')}
          className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-left hover:border-yellow-500/50 transition-colors overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Layers className="w-16 h-16 text-zinc-300" />
          </div>
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">
            Total Credits
          </p>
          <span className="text-3xl font-bold text-white mt-1 block">
            {totalCredits}
          </span>
        </button>

        {/* Courses */}
        <button
          onClick={() => setActiveModal('courses')}
          className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-left hover:border-yellow-500/50 transition-colors overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <BookOpen className="w-16 h-16 text-zinc-300" />
          </div>
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">
            Courses Taken
          </p>
          <span className="text-3xl font-bold text-white mt-1 block">
            {totalCourses}
          </span>
        </button>

        {/* Carryovers */}
        <button
          onClick={() => setActiveModal('carryovers')}
          className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-left hover:border-red-500/50 transition-colors overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertTriangle
              className={`w-16 h-16 ${carryoverCount > 0 ? 'text-red-500' : 'text-zinc-300'}`}
            />
          </div>
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">
            Carryovers
          </p>
          <span
            className={`text-3xl font-bold mt-1 block ${
              carryoverCount > 0 ? 'text-red-500' : 'text-white'
            }`}
          >
            {carryoverCount}
          </span>
        </button>
      </div>

      {/* =========================================
          STATS — Mobile (compact 4-cell strip)
          ========================================= */}
      <div className="md:hidden bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-4 divide-x divide-zinc-800/80">
          {/* CGPA */}
          <button
            onClick={() => setActiveModal('cgpa')}
            className="flex flex-col items-center justify-center px-1 py-2.5 min-w-0 active:bg-zinc-800/60 transition-colors"
          >
            <span className="text-sm font-bold text-yellow-500 leading-none truncate w-full text-center">
              {cgpa.toFixed(2)}
            </span>
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider mt-1 truncate w-full text-center">
              CGPA
            </span>
          </button>

          {/* Credits */}
          <button
            onClick={() => setActiveModal('credits')}
            className="flex flex-col items-center justify-center px-1 py-2.5 min-w-0 active:bg-zinc-800/60 transition-colors"
          >
            <span className="text-sm font-bold text-white leading-none truncate w-full text-center">
              {totalCredits}
            </span>
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider mt-1 truncate w-full text-center">
              Credits
            </span>
          </button>

          {/* Courses */}
          <button
            onClick={() => setActiveModal('courses')}
            className="flex flex-col items-center justify-center px-1 py-2.5 min-w-0 active:bg-zinc-800/60 transition-colors"
          >
            <span className="text-sm font-bold text-white leading-none truncate w-full text-center">
              {totalCourses}
            </span>
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider mt-1 truncate w-full text-center">
              Courses
            </span>
          </button>

          {/* Carryovers */}
          <button
            onClick={() => setActiveModal('carryovers')}
            className="flex flex-col items-center justify-center px-1 py-2.5 min-w-0 active:bg-zinc-800/60 transition-colors"
          >
            <span
              className={`text-sm font-bold leading-none truncate w-full text-center ${
                carryoverCount > 0 ? 'text-red-500' : 'text-white'
              }`}
            >
              {carryoverCount}
            </span>
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider mt-1 truncate w-full text-center">
              Carryovers
            </span>
          </button>
        </div>
      </div>

      {/* =========================================
          TRANSFER STUDENT INFO
          ========================================= */}
      {gpaData?.transferData?.cgpa && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-start gap-3 md:gap-4">
          <div className="bg-yellow-500/10 p-2 rounded-lg text-yellow-500 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-medium text-white">
              Transfer Credits Included
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Your overall CGPA includes{' '}
              <strong className="text-white">
                {gpaData.transferData.credits} credits
              </strong>{' '}
              from your previous institution with a{' '}
              <strong className="text-white">
                {gpaData.transferData.cgpa.toFixed(2)} GPA
              </strong>
              .
            </p>
          </div>
        </div>
      )}

      {/* =========================================
          CARRYOVERS ALERT
          ========================================= */}
      {carryoverCount > 0 && (
        <div className="bg-zinc-900 border border-red-500/30 rounded-xl p-4 md:p-5 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
          <h3 className="text-white font-medium flex items-center gap-2 mb-3 pl-1">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            Carryover Courses
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {carryovers.map((co, i) => (
              <div
                key={i}
                className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3 min-w-0"
              >
                <p className="text-sm font-bold text-white truncate">
                  {co.courseCode}
                </p>
                <p className="text-xs text-zinc-400 truncate mt-0.5">
                  {co.courseTitle || 'Unknown Title'}
                </p>
                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-zinc-800/50">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider shrink-0">
                    {co.units} Units
                  </span>
                  <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded shrink-0">
                    Grade {co.latestGrade}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================
          DETAILED COURSE RESULTS (Accordion)
          ========================================= */}
      <div className="space-y-3">
        <h2 className="text-lg font-serif text-white tracking-tight">
          Detailed Course Results
        </h2>

        {groupedResults.map((group) => {
          const isExpanded = expandedSemester === group.key;
          const semGpa = gpaData?.sessionBreakdown?.find(
            (s) =>
              s.session?.name === group.sessionName &&
              s.semester === group.semester
          )?.gpa;

          return (
            <div
              key={group.key}
              className={`bg-zinc-900 border transition-colors duration-200 rounded-xl overflow-hidden ${
                isExpanded
                  ? 'border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.05)]'
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <button
                onClick={() => toggleSemester(group.key)}
                className="w-full flex items-center justify-between gap-3 p-4 md:p-5 text-left focus:outline-none"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm md:text-base font-bold text-white uppercase tracking-wide truncate">
                    {group.sessionName}{' '}
                    <span className="text-zinc-500 font-normal lowercase">•</span>{' '}
                    {group.semester} semester
                  </span>
                  <span className="text-xs text-zinc-500 mt-1">
                    {group.courses.length} courses
                  </span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                      GPA
                    </p>
                    <p className="text-sm font-bold text-yellow-500">
                      {semGpa ? semGpa.toFixed(2) : '0.00'}
                    </p>
                  </div>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${
                      isExpanded
                        ? 'rotate-180 bg-zinc-800 text-white'
                        : 'bg-zinc-800/50 text-zinc-400'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" strokeWidth={2} />
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-zinc-800/50">
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm text-zinc-300">
                      <thead className="bg-zinc-950/50 text-[10px] uppercase tracking-wider text-zinc-500">
                        <tr>
                          <th className="px-5 py-3 font-medium">Course Code</th>
                          <th className="px-5 py-3 font-medium">Course Title</th>
                          <th className="px-5 py-3 font-medium text-center">Units</th>
                          <th className="px-5 py-3 font-medium text-center">Score</th>
                          <th className="px-5 py-3 font-medium text-right">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {group.courses.map((course) => (
                          <tr
                            key={course.id}
                            className="hover:bg-zinc-800/20 transition-colors"
                          >
                            <td className="px-5 py-3 font-mono font-medium text-white">
                              {course.courseCode}
                            </td>
                            <td className="px-5 py-3">
                              {course.courseTitle || '—'}
                            </td>
                            <td className="px-5 py-3 text-center">{course.units}</td>
                            <td className="px-5 py-3 text-center">
                              {course.score !== null ? course.score : '—'}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <GradeBadge grade={course.grade} size="sm" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile list */}
                  <div className="md:hidden divide-y divide-zinc-800/50 bg-zinc-950/20">
                    {group.courses.map((course) => (
                      <div
                        key={course.id}
                        className="p-4 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-mono font-bold text-white text-sm truncate">
                            {course.courseCode}
                          </p>
                          <p className="text-zinc-400 text-xs mt-0.5 truncate">
                            {course.courseTitle || '—'}
                          </p>
                          <p className="text-zinc-500 text-[10px] mt-1 truncate">
                            {course.units} Units
                            {course.score !== null ? ` • Score: ${course.score}` : ''}
                          </p>
                        </div>
                        <GradeBadge grade={course.grade} size="lg" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* =========================================
          MODALS
          ========================================= */}
      <StatModal
        open={activeModal === 'cgpa'}
        onClose={closeModal}
        title="Cumulative GPA"
        icon={Award}
      >
        <div className="text-center mb-6">
          <p className="text-5xl font-bold text-white leading-none">
            {cgpa.toFixed(2)}
            <span className="text-xl text-zinc-500 font-normal"> / 5.00</span>
          </p>
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider mt-3">
            Cumulative GPA
          </p>
        </div>

        {sessionBreakdown.length > 0 ? (
          <>
            <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Semester Breakdown
            </h4>
            <div className="space-y-2">
              {sessionBreakdown.map((sem, idx) => (
                <div
                  key={idx}
                  className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {sem.session?.name || 'Session'}
                    </p>
                    <p className="text-[11px] text-zinc-500 capitalize mt-0.5">
                      {sem.semester} Semester • {sem.units} units
                    </p>
                  </div>
                  <p className="text-lg font-bold text-yellow-500 shrink-0">
                    {sem.gpa.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-center text-zinc-500 text-sm py-6">
            No semester breakdown available yet.
          </p>
        )}
      </StatModal>

      <StatModal
        open={activeModal === 'credits'}
        onClose={closeModal}
        title="Total Credits"
        icon={Layers}
      >
        <div className="text-center mb-6">
          <p className="text-5xl font-bold text-white leading-none">
            {totalCredits}
          </p>
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider mt-3">
            Total Credit Units
          </p>
        </div>

        {sessionBreakdown.length > 0 && (
          <>
            <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Units by Semester
            </h4>
            <div className="space-y-2">
              {sessionBreakdown.map((sem, idx) => (
                <div
                  key={idx}
                  className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {sem.session?.name || 'Session'}
                    </p>
                    <p className="text-[11px] text-zinc-500 capitalize mt-0.5">
                      {sem.semester} Semester
                    </p>
                  </div>
                  <p className="text-sm font-bold text-white shrink-0">
                    {sem.units} units
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {gpaData?.transferData?.credits > 0 && (
          <div className="mt-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 flex items-start gap-2">
            <GraduationCap className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-300">
              Includes{' '}
              <strong className="text-white">
                {gpaData.transferData.credits} transfer credits
              </strong>{' '}
              from previous institution with a{' '}
              <strong className="text-white">
                {gpaData.transferData.cgpa?.toFixed(2)} GPA
              </strong>
              .
            </p>
          </div>
        )}
      </StatModal>

      <StatModal
        open={activeModal === 'courses'}
        onClose={closeModal}
        title="Courses Taken"
        icon={BookOpen}
      >
        <div className="text-center mb-6">
          <p className="text-5xl font-bold text-white leading-none">{totalCourses}</p>
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider mt-3">
            Total Courses
          </p>
        </div>

        {groupedResults.length > 0 ? (
          <div className="space-y-4">
            {groupedResults.map((group) => (
              <div key={group.key}>
                <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  {group.sessionName} • {group.semester}
                </h4>
                <div className="space-y-1.5">
                  {group.courses.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center justify-between gap-3 bg-zinc-950/50 border border-zinc-800 rounded-lg px-3 py-2 min-w-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono font-bold text-white truncate">
                          {course.courseCode}
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate">
                          {course.courseTitle || '—'}
                        </p>
                      </div>
                      <GradeBadge grade={course.grade} size="xs" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-zinc-500 text-sm py-6">
            No courses recorded yet.
          </p>
        )}
      </StatModal>

      <StatModal
        open={activeModal === 'carryovers'}
        onClose={closeModal}
        title="Carryover Courses"
        icon={AlertTriangle}
      >
        {carryoverCount > 0 ? (
          <>
            <div className="text-center mb-6">
              <p className="text-5xl font-bold text-red-500 leading-none">
                {carryoverCount}
              </p>
              <p className="text-[11px] text-zinc-500 uppercase tracking-wider mt-3">
                Carryover {carryoverCount === 1 ? 'Course' : 'Courses'}
              </p>
            </div>
            <div className="space-y-2">
              {carryovers.map((co, i) => (
                <div
                  key={i}
                  className="bg-zinc-950/50 border border-red-500/20 rounded-lg p-3 min-w-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-white truncate">
                      {co.courseCode}
                    </p>
                    <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded shrink-0">
                      Grade {co.latestGrade}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 truncate mt-1">
                    {co.courseTitle || 'Unknown Title'}
                  </p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">
                    {co.units} Units
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 text-green-400 mb-3">
              <Award className="w-6 h-6" />
            </div>
            <p className="text-white font-medium">No carryover courses</p>
            <p className="text-zinc-500 text-xs mt-1">
              You're on track. Keep it up! 🎉
            </p>
          </div>
        )}
      </StatModal>
    </div>
  );
};

// =========================================
// GRADE BADGE
// =========================================
const GradeBadge = ({ grade, size = 'sm' }) => {
  const sizeClass =
    size === 'xs'
      ? 'w-7 h-7 text-[11px] rounded-md'
      : size === 'lg'
        ? 'w-10 h-10 text-sm rounded-xl'
        : 'w-8 h-8 text-xs rounded-lg';

  const colorClass =
    grade === 'A'
      ? 'bg-green-500/10 text-green-400'
      : grade === 'B'
        ? 'bg-blue-500/10 text-blue-400'
        : grade === 'C'
          ? 'bg-yellow-500/10 text-yellow-400'
          : grade === 'D'
            ? 'bg-orange-500/10 text-orange-400'
            : grade === 'E'
              ? 'bg-zinc-500/20 text-zinc-400'
              : 'bg-red-500/10 text-red-500';

  return (
    <span
      className={`shrink-0 inline-flex items-center justify-center font-bold ${sizeClass} ${colorClass}`}
    >
      {grade}
    </span>
  );
};

export default Results;