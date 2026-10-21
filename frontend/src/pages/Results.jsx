// src/pages/Results.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router';
import {
  Plus, ChevronDown, AlertTriangle, FileText, Award, BookOpen,
  TrendingUp, GraduationCap, Layers, X, ChevronRight,
} from 'lucide-react';
import { useGetMyResultsQuery, useGetMyGpaQuery } from '../features/resultApiSlice';

// =========================================
// SKELETON
// =========================================
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-zinc-800 ${className}`} />
);

// =========================================
// STAT MODAL
// =========================================
const StatModal = ({ open, onClose, title, icon: Icon, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden
      />

      {/* Mobile: bottom sheet */}
      <div className="md:hidden absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-zinc-800 bg-zinc-900 animate-in slide-in-from-bottom duration-300">
        <div className="flex shrink-0 justify-center pb-1.5 pt-2.5">
          <div className="h-1 w-9 rounded-full bg-zinc-700" />
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-4 pb-3">
          <div className="flex min-w-0 items-center gap-2">
            {Icon && <Icon className="h-4 w-4 shrink-0 text-yellow-500" strokeWidth={2} />}
            <h3 className="truncate text-[14px] font-semibold text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-zinc-400 transition-transform active:scale-95"
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

      {/* Desktop: centered modal */}
      <div
        className="hidden md:flex absolute inset-0 items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-zinc-800 bg-zinc-900 animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              {Icon && <Icon className="h-4 w-4 shrink-0 text-yellow-500" strokeWidth={2} />}
              <h3 className="truncate text-[15px] font-semibold text-white">{title}</h3>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800 text-zinc-400 transition-colors hover:text-white"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.2} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
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
  const [activeModal, setActiveModal] = useState(null);

  const results = resultsData?.results || [];
  const carryovers = gpaData?.carryovers || [];
  const sessionBreakdown = gpaData?.sessionBreakdown || [];

  const cgpa = gpaData?.cumulative?.gpa ?? 0;
  const totalCredits = gpaData?.cumulative?.units ?? 0;
  const totalCourses = gpaData?.totalCourses ?? results.length ?? 0;
  const carryoverCount = carryovers.length;

  const groupedResults = useMemo(() => {
    const groups = {};
    results.forEach((result) => {
      const sessionName = result.session?.name || 'Unknown Session';
      const key = `${sessionName} - ${result.semester}`;
      if (!groups[key]) {
        groups[key] = { key, sessionName, semester: result.semester, courses: [] };
      }
      groups[key].courses.push(result);
    });
    return Object.values(groups).sort(
      (a, b) =>
        b.sessionName.localeCompare(a.sessionName) ||
        b.semester.localeCompare(a.semester)
    );
  }, [results]);

  const semesterCount = groupedResults.length;
  const toggleSemester = (key) =>
    setExpandedSemester((prev) => (prev === key ? null : key));
  const closeModal = () => setActiveModal(null);

  if (isGpaLoading || isResultsLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-3 md:p-6">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="grid grid-cols-5 gap-2.5">
          <Skeleton className="col-span-2 h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  /* ── EMPTY ── */
  if (results.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center px-6 text-center animate-in fade-in">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-500">
          <FileText className="h-8 w-8" strokeWidth={1.5} />
        </div>
        <h2 className="mb-1.5 text-xl font-serif text-white">No Results Found</h2>
        <p className="mb-5 max-w-md text-[12.5px] leading-relaxed text-zinc-400">
          You don't have any published results yet. If you are an old or transfer
          student, upload your historical results to generate your CGPA.
        </p>
        <Link
          to="/upload-results"
          className="rounded-md bg-yellow-500 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400"
        >
          Upload Historical Results
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-8 animate-in fade-in duration-500">
      {/* ── HEADER ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-serif tracking-tight text-white md:text-2xl">
            Academic Results
          </h1>
          <p className="mt-0.5 text-[11.5px] text-zinc-500">
            View your grades, GPA, and carryovers.
          </p>
        </div>

        <Link
          to="/upload-results"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-zinc-700 md:px-3 md:py-2 md:text-[12px]"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          <span className="hidden sm:inline">Add More</span>
          <span className="sm:hidden">Add</span>
        </Link>
      </div>

      {/* ── STATS: DESKTOP (CGPA dominant) ── */}
      <div className="hidden grid-cols-5 gap-2.5 md:grid">
        {/* CGPA — hero (spans 2 cols) */}
        <button
          onClick={() => setActiveModal('cgpa')}
          className="col-span-2 relative overflow-hidden rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 p-3.5 text-left text-zinc-950 transition-opacity hover:opacity-95"
        >
          <Award
            className="absolute -right-3 -top-3 h-20 w-20 text-zinc-950/10"
            strokeWidth={1.5}
          />
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-950/70">
            Cumulative GPA
          </p>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-4xl font-bold leading-none tracking-tight">
              {cgpa.toFixed(2)}
            </span>
            <span className="text-[11px] font-medium text-zinc-950/60">/ 5.00</span>
          </div>
          <p className="mt-2 text-[10px] font-medium text-zinc-950/60">
            {semesterCount} {semesterCount === 1 ? 'semester' : 'semesters'} ·{' '}
            {totalCourses} courses
          </p>
        </button>

        {/* Credits */}
        <button
          onClick={() => setActiveModal('credits')}
          className="rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 text-left transition-colors hover:border-yellow-500/50"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            <Layers className="h-3 w-3 text-zinc-400" strokeWidth={2.4} />
            <span>Credits</span>
          </div>
          <p className="mt-1.5 text-2xl font-bold text-white">{totalCredits}</p>
        </button>

        {/* Courses */}
        <button
          onClick={() => setActiveModal('courses')}
          className="rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 text-left transition-colors hover:border-yellow-500/50"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            <BookOpen className="h-3 w-3 text-zinc-400" strokeWidth={2.4} />
            <span>Courses</span>
          </div>
          <p className="mt-1.5 text-2xl font-bold text-white">{totalCourses}</p>
        </button>

        {/* Carryovers */}
        <button
          onClick={() => setActiveModal('carryovers')}
          className={`rounded-xl border bg-zinc-900 p-3.5 text-left transition-colors ${
            carryoverCount > 0
              ? 'border-red-500/30 hover:border-red-500/50'
              : 'border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            <AlertTriangle
              className={`h-3 w-3 ${carryoverCount > 0 ? 'text-red-500' : 'text-zinc-400'}`}
              strokeWidth={2.4}
            />
            <span>Carryovers</span>
          </div>
          <p
            className={`mt-1.5 text-2xl font-bold ${
              carryoverCount > 0 ? 'text-red-500' : 'text-white'
            }`}
          >
            {carryoverCount}
          </p>
        </button>
      </div>

      {/* ── STATS: MOBILE (CGPA hero + 3 compact) ── */}
      <div className="space-y-2 md:hidden">
        {/* CGPA hero */}
        <button
          onClick={() => setActiveModal('cgpa')}
          className="relative w-full overflow-hidden rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 p-3 text-left text-zinc-950 transition-opacity active:opacity-95"
        >
          <Award
            className="absolute -right-3 -top-3 h-20 w-20 text-zinc-950/10"
            strokeWidth={1.5}
          />
          <div className="relative flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-950/70">
                Cumulative GPA
              </p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-3xl font-bold leading-none tracking-tight">
                  {cgpa.toFixed(2)}
                </span>
                <span className="text-[11px] font-medium text-zinc-950/60">
                  / 5.00
                </span>
              </div>
              <p className="mt-1 text-[10px] font-medium text-zinc-950/60">
                {semesterCount} {semesterCount === 1 ? 'semester' : 'semesters'} ·{' '}
                {totalCourses} courses
              </p>
            </div>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-zinc-950/60"
              strokeWidth={2.5}
            />
          </div>
        </button>

        {/* Three compact stats */}
        <div className="grid grid-cols-3 divide-x divide-zinc-800/80 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <button
            onClick={() => setActiveModal('credits')}
            className="flex min-w-0 flex-col items-center justify-center px-1 py-2.5 transition-colors active:bg-zinc-800/60"
          >
            <span className="w-full truncate text-center text-[13px] font-bold leading-none text-white">
              {totalCredits}
            </span>
            <span className="mt-1 w-full truncate text-center text-[9px] uppercase tracking-wider text-zinc-500">
              Credits
            </span>
          </button>

          <button
            onClick={() => setActiveModal('courses')}
            className="flex min-w-0 flex-col items-center justify-center px-1 py-2.5 transition-colors active:bg-zinc-800/60"
          >
            <span className="w-full truncate text-center text-[13px] font-bold leading-none text-white">
              {totalCourses}
            </span>
            <span className="mt-1 w-full truncate text-center text-[9px] uppercase tracking-wider text-zinc-500">
              Courses
            </span>
          </button>

          <button
            onClick={() => setActiveModal('carryovers')}
            className="flex min-w-0 flex-col items-center justify-center px-1 py-2.5 transition-colors active:bg-zinc-800/60"
          >
            <span
              className={`w-full truncate text-center text-[13px] font-bold leading-none ${
                carryoverCount > 0 ? 'text-red-500' : 'text-white'
              }`}
            >
              {carryoverCount}
            </span>
            <span className="mt-1 w-full truncate text-center text-[9px] uppercase tracking-wider text-zinc-500">
              Carryovers
            </span>
          </button>
        </div>
      </div>

      {/* ── TRANSFER INFO ── */}
      {gpaData?.transferData?.cgpa && (
        <div className="flex items-start gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2.5">
          <div className="shrink-0 rounded-md bg-yellow-500/10 p-1.5 text-yellow-500">
            <TrendingUp className="h-3.5 w-3.5" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-white">Transfer credits included</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
              Overall CGPA includes{' '}
              <strong className="text-zinc-200">
                {gpaData.transferData.credits} credits
              </strong>{' '}
              from a previous institution ({gpaData.transferData.cgpa.toFixed(2)} GPA).
            </p>
          </div>
        </div>
      )}

      {/* ── CARRYOVERS ALERT ── */}
      {carryoverCount > 0 && (
        <div className="relative overflow-hidden rounded-lg border border-red-500/30 bg-zinc-900 px-3 py-3">
          <div className="absolute inset-y-0 left-0 w-0.5 bg-red-500" />
          <div className="mb-2.5 flex items-center gap-1.5 pl-1">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" strokeWidth={2} />
            <h3 className="text-[12.5px] font-semibold text-white">
              Carryover courses
              <span className="ml-1.5 rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
                {carryoverCount}
              </span>
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
            {carryovers.map((co, i) => (
              <div
                key={i}
                className="min-w-0 rounded-md border border-zinc-800 bg-zinc-950/50 px-2.5 py-2"
              >
                <p className="truncate font-mono text-[12px] font-bold text-white">
                  {co.courseCode}
                </p>
                <p className="mt-0.5 truncate text-[10.5px] text-zinc-400">
                  {co.courseTitle || 'Unknown title'}
                </p>
                <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-zinc-800/60 pt-1.5">
                  <span className="shrink-0 text-[9.5px] uppercase tracking-wider text-zinc-500">
                    {co.units} units
                  </span>
                  <span className="shrink-0 rounded bg-red-500/10 px-1.5 py-0.5 text-[9.5px] font-bold text-red-400">
                    {co.latestGrade}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DETAILED RESULTS ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-serif tracking-tight text-white">
            Detailed Course Results
          </h2>
          <span className="text-[10.5px] font-medium uppercase tracking-wider text-zinc-500">
            {semesterCount} {semesterCount === 1 ? 'semester' : 'semesters'}
          </span>
        </div>

        {groupedResults.map((group) => {
          const isExpanded = expandedSemester === group.key;
          const semGpa = sessionBreakdown.find(
            (s) =>
              s.session?.name === group.sessionName &&
              s.semester === group.semester
          )?.gpa;

          return (
            <div
              key={group.key}
              className={`overflow-hidden rounded-lg border bg-zinc-900 transition-colors ${
                isExpanded
                  ? 'border-yellow-500/50'
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <button
                onClick={() => toggleSemester(group.key)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left focus:outline-none md:px-4 md:py-3"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[12.5px] font-bold uppercase tracking-wide text-white md:text-[13px]">
                    {group.sessionName}{' '}
                    <span className="font-normal lowercase text-zinc-500">•</span>{' '}
                    {group.semester}
                  </span>
                  <span className="mt-0.5 text-[10.5px] text-zinc-500">
                    {group.courses.length} course{group.courses.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {/* Always-visible GPA pill */}
                  <div className="flex items-center gap-1.5 rounded-md border border-yellow-500/25 bg-yellow-500/5 px-2 py-1">
                    <span className="text-[8.5px] font-bold uppercase tracking-wider text-yellow-500/60">
                      GPA
                    </span>
                    <span className="text-[12.5px] font-bold leading-none text-yellow-500">
                      {semGpa ? semGpa.toFixed(2) : '0.00'}
                    </span>
                  </div>

                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-md transition-transform duration-300 ${
                      isExpanded
                        ? 'rotate-180 bg-zinc-800 text-white'
                        : 'bg-zinc-800/60 text-zinc-400'
                    }`}
                  >
                    <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-zinc-800/60">
                  {/* Desktop table */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-left text-[12.5px] text-zinc-300">
                      <thead className="bg-zinc-950/50 text-[9.5px] uppercase tracking-[0.14em] text-zinc-500">
                        <tr>
                          <th className="px-3.5 py-2 font-semibold">Code</th>
                          <th className="px-3.5 py-2 font-semibold">Title</th>
                          <th className="px-3.5 py-2 text-center font-semibold">Units</th>
                          <th className="px-3.5 py-2 text-center font-semibold">Score</th>
                          <th className="px-3.5 py-2 text-right font-semibold">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60">
                        {group.courses.map((course) => (
                          <tr
                            key={course.id}
                            className="transition-colors hover:bg-zinc-800/30"
                          >
                            <td className="px-3.5 py-2.5 font-mono font-medium text-white">
                              {course.courseCode}
                            </td>
                            <td className="px-3.5 py-2.5">
                              {course.courseTitle || '—'}
                            </td>
                            <td className="px-3.5 py-2.5 text-center">
                              {course.units}
                            </td>
                            <td className="px-3.5 py-2.5 text-center">
                              {course.score !== null ? course.score : '—'}
                            </td>
                            <td className="px-3.5 py-2.5 text-right">
                              <GradeBadge grade={course.grade} size="sm" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile list */}
                  <div className="divide-y divide-zinc-800/60 bg-zinc-950/20 md:hidden">
                    {group.courses.map((course) => (
                      <div
                        key={course.id}
                        className="flex items-center justify-between gap-3 px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono text-[12px] font-bold text-white">
                            {course.courseCode}
                          </p>
                          <p className="mt-0.5 truncate text-[10.5px] text-zinc-400">
                            {course.courseTitle || '—'}
                          </p>
                          <p className="mt-0.5 truncate text-[9.5px] uppercase tracking-wider text-zinc-500">
                            {course.units} units
                            {course.score !== null ? ` · Score ${course.score}` : ''}
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
        <div className="mb-4 text-center">
          <p className="text-4xl font-bold leading-none text-white">
            {cgpa.toFixed(2)}
            <span className="text-base font-normal text-zinc-500"> / 5.00</span>
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-wider text-zinc-500">
            Cumulative GPA
          </p>
        </div>

        {sessionBreakdown.length > 0 ? (
          <>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Semester breakdown
            </h4>
            <div className="space-y-1.5">
              {sessionBreakdown.map((sem, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-950/50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold text-white">
                      {sem.session?.name || 'Session'}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] capitalize text-zinc-500">
                      {sem.semester} semester · {sem.units} units
                    </p>
                  </div>
                  <p className="shrink-0 text-[14px] font-bold text-yellow-500">
                    {sem.gpa.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="py-6 text-center text-[11.5px] text-zinc-500">
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
        <div className="mb-4 text-center">
          <p className="text-4xl font-bold leading-none text-white">{totalCredits}</p>
          <p className="mt-2 text-[10px] uppercase tracking-wider text-zinc-500">
            Total credit units
          </p>
        </div>

        {sessionBreakdown.length > 0 && (
          <>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Units by semester
            </h4>
            <div className="space-y-1.5">
              {sessionBreakdown.map((sem, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-950/50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold text-white">
                      {sem.session?.name || 'Session'}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] capitalize text-zinc-500">
                      {sem.semester} semester
                    </p>
                  </div>
                  <p className="shrink-0 text-[12px] font-bold text-white">
                    {sem.units} units
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {gpaData?.transferData?.credits > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-yellow-500/20 bg-yellow-500/5 px-2.5 py-2">
            <GraduationCap
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-500"
              strokeWidth={2}
            />
            <p className="text-[11px] leading-relaxed text-zinc-300">
              Includes{' '}
              <strong className="text-white">
                {gpaData.transferData.credits} transfer credits
              </strong>{' '}
              from previous institution ({gpaData.transferData.cgpa?.toFixed(2)} GPA).
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
        <div className="mb-4 text-center">
          <p className="text-4xl font-bold leading-none text-white">{totalCourses}</p>
          <p className="mt-2 text-[10px] uppercase tracking-wider text-zinc-500">
            Total courses
          </p>
        </div>

        {groupedResults.length > 0 ? (
          <div className="space-y-3">
            {groupedResults.map((group) => (
              <div key={group.key}>
                <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  {group.sessionName} · {group.semester}
                </h4>
                <div className="space-y-1">
                  {group.courses.map((course) => (
                    <div
                      key={course.id}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-950/50 px-2.5 py-1.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[11.5px] font-bold text-white">
                          {course.courseCode}
                        </p>
                        <p className="truncate text-[10.5px] text-zinc-500">
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
          <p className="py-6 text-center text-[11.5px] text-zinc-500">
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
            <div className="mb-4 text-center">
              <p className="text-4xl font-bold leading-none text-red-500">
                {carryoverCount}
              </p>
              <p className="mt-2 text-[10px] uppercase tracking-wider text-zinc-500">
                Carryover {carryoverCount === 1 ? 'course' : 'courses'}
              </p>
            </div>
            <div className="space-y-1.5">
              {carryovers.map((co, i) => (
                <div
                  key={i}
                  className="min-w-0 rounded-md border border-red-500/20 bg-zinc-950/50 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-mono text-[12px] font-bold text-white">
                      {co.courseCode}
                    </p>
                    <span className="shrink-0 rounded bg-red-500/10 px-1.5 py-0.5 text-[9.5px] font-bold text-red-400">
                      Grade {co.latestGrade}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[10.5px] text-zinc-400">
                    {co.courseTitle || 'Unknown title'}
                  </p>
                  <p className="mt-1 text-[9.5px] uppercase tracking-wider text-zinc-500">
                    {co.units} units
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-6 text-center">
            <div className="mb-2.5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <Award className="h-5 w-5" strokeWidth={2} />
            </div>
            <p className="text-[12.5px] font-medium text-white">
              No carryover courses
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500">You're on track.</p>
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
      ? 'h-6 w-6 rounded text-[10px]'
      : size === 'lg'
      ? 'h-9 w-9 rounded-lg text-[13px]'
      : 'h-7 w-7 rounded-md text-[11px]';

  const colorClass =
    grade === 'A'
      ? 'bg-emerald-500/10 text-emerald-400'
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
      className={`inline-flex shrink-0 items-center justify-center font-bold ${sizeClass} ${colorClass}`}
    >
      {grade}
    </span>
  );
};

export default Results;