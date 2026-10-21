// src/pages/UploadResults.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  PenTool, ChevronLeft, AlertCircle, Loader2, FileSearch,
  Trash2, Save, CalendarDays, Files,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import {
  useGetHistoricalCoursesQuery, useCreateSelfUploadMutation,
  useGetUploadQuery, usePublishUploadMutation, useDeleteUploadMutation,
  useEditUploadRowsMutation,
} from '../features/resultApiSlice';
import { useParseResultMutation } from '../features/aiApiSlice';

const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-zinc-800 ${className}`} />
);

const SEMESTER_LABEL = { first: '1st Semester', second: '2nd Semester' };
const SEMESTER_ORDER = { first: 0, second: 1 };

const normalizeSessionInput = (value) => {
  const m = String(value || '').match(/(\d{4})\s*[\/\\-]\s*(\d{2,4})/);
  if (!m) return null;
  const start = m[1];
  let end = m[2];
  if (end.length === 2) end = `${start.slice(0, 2)}${end}`;
  if (Number(end) !== Number(start) + 1) return null;
  return `${start}/${end}`;
};

const groupKeyOf = (row) => {
  const semester = row.semester || 'unknown';
  return row.level
    ? `L${row.level}__${semester}`
    : `S${row.session || 'none'}__${semester}`;
};

/* ─── Session input ──────────────────────────── */
const SessionInput = ({ value, onCommit, invalid }) => {
  const [text, setText] = useState(value || '');

  useEffect(() => {
    setText(value || '');
  }, [value]);

  const commit = () => {
    if (text.trim() !== (value || '')) onCommit(text.trim());
  };

  return (
    <input
      type="text"
      value={text}
      placeholder="2022/2023"
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
      className={`w-32 sm:w-40 rounded border bg-zinc-950 px-2 py-1 font-mono text-[11px] text-white outline-none ${
        invalid
          ? 'border-red-500/60 focus:border-red-400'
          : 'border-zinc-700 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30'
      }`}
    />
  );
};

/* ───────────────────────────────────────────── */
const UploadResults = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const { data: coursesData, isLoading: isCoursesLoading } = useGetHistoricalCoursesQuery();
  const [createSelfUpload, { isLoading: isCreating }] = useCreateSelfUploadMutation();
  const [parseResult, { isLoading: isParsing }] = useParseResultMutation();
  const [publishUpload, { isLoading: isPublishing }] = usePublishUploadMutation();
  const [deleteUpload, { isLoading: isDeleting }] = useDeleteUploadMutation();
  const [editUploadRows, { isLoading: isSavingEdits }] = useEditUploadRowsMutation();

  const [step, setStep] = useState('select');
  const [transferData, setTransferData] = useState({ cgpa: '', credits: '' });
  const [selectedGrades, setSelectedGrades] = useState({});
  const [files, setFiles] = useState([]);
  const [uploadId, setUploadId] = useState(null);
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [editableRows, setEditableRows] = useState([]);
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);

  const { data: reviewData, isLoading: isReviewLoading } = useGetUploadQuery(uploadId, { skip: !uploadId });

  const isTransfer = coursesData?.isTransferStudent;
  const courses = coursesData?.courses || {};

  useEffect(() => {
    if (reviewData?.upload?.parsedRows) {
      setEditableRows(reviewData.upload.parsedRows.map((row) => ({ ...row })));
      setHasUnsavedEdits(false);
    }
  }, [reviewData]);

  useEffect(() => {
    if (isTransfer && coursesData) {
      setTransferData({
        cgpa: coursesData.transferCgpa || '',
        credits: coursesData.transferCredits || '',
      });
    }
  }, [isTransfer, coursesData]);

  const groupedRows = useMemo(() => {
    const map = new Map();
    editableRows.forEach((row, index) => {
      const key = groupKeyOf(row);
      if (!map.has(key)) {
        map.set(key, {
          key,
          level: row.level ? Number(row.level) : null,
          session: row.session || '',
          semester: row.semester || 'unknown',
          items: [],
        });
      }
      const group = map.get(key);
      if (!group.session && row.session) group.session = row.session;
      group.items.push({ row, index });
    });

    return [...map.values()].sort((a, b) => {
      const aLevel = a.level ?? 9999;
      const bLevel = b.level ?? 9999;
      if (aLevel !== bLevel) return aLevel - bLevel;
      const aHas = !!a.session;
      const bHas = !!b.session;
      if (aHas !== bHas) return aHas ? -1 : 1;
      const bySession = a.session.localeCompare(b.session);
      if (bySession !== 0) return bySession;
      return (SEMESTER_ORDER[a.semester] ?? 9) - (SEMESTER_ORDER[b.semester] ?? 9);
    });
  }, [editableRows]);

  const hasIncompleteRows = editableRows.some(
    (r) => !r.session || !['first', 'second'].includes(r.semester)
  );

  const handleGradeSelect = (level, session, courseCode, grade) => {
    const key = `${level}-${session}-${courseCode}`;
    setSelectedGrades((prev) => {
      const next = { ...prev };
      if (next[key] === grade) delete next[key];
      else next[key] = grade;
      return next;
    });
  };

  const handleDiscard = async () => {
    try {
      if (uploadId) await deleteUpload(uploadId).unwrap();
      setUploadId(null);
      setFiles([]);
      setSelectedGrades({});
      setEditableRows([]);
      setHasUnsavedEdits(false);
      setStep('select');
      toast.success('Draft discarded successfully');
    } catch {
      toast.error('Failed to discard upload');
    }
  };

  const handleManualSubmit = async () => {
    const rows = [];
    Object.keys(courses).forEach((level) => {
      const sessions = courses[level];
      Object.keys(sessions).forEach((sessionName) => {
        sessions[sessionName].forEach((course) => {
          const key = `${level}-${sessionName}-${course.courseCode}`;
          const grade = selectedGrades[key];
          if (grade) {
            rows.push({
              session: sessionName,
              semester: course.semester,
              courseCode: course.courseCode,
              courseTitle: course.courseTitle,
              units: course.units,
              grade,
            });
          }
        });
      });
    });

    if (rows.length === 0) return toast.error('Please select at least one grade.');

    try {
      const payload = { rows };
      if (isTransfer) {
        payload.transferCgpa = Number(transferData.cgpa);
        payload.transferCredits = Number(transferData.credits);
      }
      const result = await createSelfUpload(payload).unwrap();
      setUploadId(result.upload.id);
      setStep('review');
      toast.success(`${rows.length} grades saved.`);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save grades.');
    }
  };

  const handleDocumentSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) return toast.error('Please select at least one file.');
    const totalSize = files.reduce((acc, file) => acc + file.size, 0);
    if (totalSize > 15 * 1024 * 1024) return toast.error('Total file size is too large. Maximum is 15MB.');

    try {
      const fd = new FormData();
      files.forEach((file) => fd.append('documents', file));
      if (isTransfer) {
        fd.append('transferCgpa', transferData.cgpa);
        fd.append('transferCredits', transferData.credits);
      }
      const uploadRes = await createSelfUpload(fd).unwrap();
      const newUploadId = uploadRes.upload.id;

      toast.success(`${files.length} file(s) uploaded! AI is reading them...`);
      try {
        await parseResult({ uploadId: newUploadId }).unwrap();
        setUploadId(newUploadId);
        setStep('review');
        toast.success('Document parsed successfully!');
      } catch (aiErr) {
        toast.error(aiErr?.data?.error || 'AI failed to read the document.');
        setUploadId(newUploadId);
        setStep('review');
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to upload document.');
    }
  };

  const handleRowChange = (index, field, value) => {
    const newRows = [...editableRows];
    const updated = { ...newRows[index] };
    updated[field] = field === 'units' ? Number(value) : value;
    newRows[index] = updated;
    setEditableRows(newRows);
    setHasUnsavedEdits(true);
  };

  const handleRemoveRow = (index) => {
    setEditableRows(editableRows.filter((_, i) => i !== index));
    setHasUnsavedEdits(true);
  };

  const handleSessionCommit = (group, text) => {
    const normalized = text ? normalizeSessionInput(text) : null;
    if (text && !normalized) return toast.error('Invalid session. Use 2022/2023.');
    setEditableRows((prev) =>
      prev.map((row) => {
        const matches = group.level
          ? Number(row.level) === group.level
          : groupKeyOf(row) === group.key;
        return matches ? { ...row, session: normalized } : row;
      })
    );
    setHasUnsavedEdits(true);
  };

  const handleSaveEdits = async () => {
    try {
      await editUploadRows({ id: uploadId, rows: editableRows }).unwrap();
      toast.success('Edits saved successfully!');
      setHasUnsavedEdits(false);
    } catch {
      toast.error('Failed to save edits.');
    }
  };

  const handlePublish = async () => {
    if (hasUnsavedEdits) return toast.error('Please save your edits first.');
    if (hasIncompleteRows) return toast.error('Every group needs a session and semester.');
    try {
      await publishUpload(uploadId).unwrap();
      toast.success('Results published successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to publish results.');
    }
  };

  if (isCoursesLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-3 md:p-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const selectedCount = Object.keys(selectedGrades).length;

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-8 animate-in fade-in duration-500">
      {/* ── HEADER ── */}
      <div>
        <button
          onClick={() => (step === 'select' ? navigate('/dashboard') : handleDiscard())}
          className="mb-3 flex items-center gap-1.5 text-[11.5px] font-medium text-zinc-400 transition-colors hover:text-white"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
          {step === 'select' ? 'Back to Dashboard' : 'Cancel & go back'}
        </button>
        <h1 className="text-xl font-serif tracking-tight text-white md:text-2xl">
          Upload Historical Results
        </h1>
        <p className="mt-0.5 text-[11.5px] text-zinc-500">
          {isTransfer
            ? 'Enter your previous grades and transfer credits to generate your accurate CGPA.'
            : 'Select the grades you got in your previous levels.'}
        </p>
      </div>

      {/* ── STEP 1: SELECT METHOD ── */}
      {step === 'select' && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <button
            onClick={() => setStep('manual')}
            className="group flex flex-col items-start rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left transition-colors hover:border-yellow-500/50 md:p-5"
          >
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-yellow-500 transition-transform group-hover:scale-105">
              <PenTool className="h-4 w-4" strokeWidth={2} />
            </div>
            <h3 className="text-[13.5px] font-semibold text-white">Manual entry</h3>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-zinc-400">
              Pick your grades from a list of courses.
            </p>
          </button>

          <button
            onClick={() => setStep('document')}
            className="group flex flex-col items-start rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left transition-colors hover:border-yellow-500/50 md:p-5"
          >
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-yellow-500 transition-transform group-hover:scale-105">
              <FileSearch className="h-4 w-4" strokeWidth={2} />
            </div>
            <h3 className="text-[13.5px] font-semibold text-white">Upload transcript</h3>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-zinc-400">
              Upload images or PDFs. Our AI will read them.
            </p>
          </button>
        </div>
      )}

      {/* ── STEP 2A: MANUAL ENTRY ── */}
      {step === 'manual' && (
        <div className="space-y-4">
          {/* Semester filter */}
          <div className="mx-auto flex w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
            {['all', 'first', 'second'].map((sem) => (
              <button
                key={sem}
                onClick={() => setSemesterFilter(sem)}
                className={`flex-1 rounded py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                  semesterFilter === sem
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {sem === 'all' ? 'All' : `${sem === 'first' ? '1st' : '2nd'} Sem`}
              </button>
            ))}
          </div>

          {/* Sessions — no level headers, just session cards in level order */}
          <div className="space-y-2.5">
            {[100, 200, 300, 400, 500].map((level) => {
              const sessions = courses[level] || {};
              const sessionKeys = Object.keys(sessions);

              if (sessionKeys.length === 0) {
                if (level <= 400) {
                  return (
                    <div
                      key={`empty-${level}`}
                      className="rounded-xl border border-yellow-500/20 bg-zinc-900 p-4 text-center"
                    >
                      <AlertCircle className="mx-auto mb-2 h-6 w-6 text-yellow-500/60" strokeWidth={1.8} />
                      <h3 className="text-[12.5px] font-semibold text-white">
                        Courses not available
                      </h3>
                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        Contact your course rep or admin.
                      </p>
                    </div>
                  );
                }
                return null;
              }

              return sessionKeys.map((sessionName) => {
                const filteredCourses = sessions[sessionName].filter(
                  (course) => semesterFilter === 'all' || course.semester === semesterFilter
                );
                if (filteredCourses.length === 0) return null;

                return (
                  <div
                    key={`${level}-${sessionName}`}
                    className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900"
                  >
                    <div className="flex items-center gap-1.5 border-b border-zinc-800 bg-zinc-950/50 px-3 py-2">
                      <CalendarDays className="h-3.5 w-3.5 text-yellow-500" strokeWidth={2} />
                      <h3 className="text-[11.5px] font-bold uppercase tracking-wider text-yellow-500">
                        {sessionName} session
                      </h3>
                    </div>
                    <div className="divide-y divide-zinc-800/70">
                      {filteredCourses.map((course) => {
                        const gradeKey = `${level}-${sessionName}-${course.courseCode}`;
                        const currentGrade = selectedGrades[gradeKey];
                        return (
                          <div
                            key={gradeKey}
                            className="flex flex-col justify-between gap-2 px-3 py-2.5 sm:flex-row sm:items-center"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-mono text-[12px] font-bold text-white">
                                {course.courseCode}
                              </p>
                              <p className="mt-0.5 truncate text-[10.5px] text-zinc-400">
                                {course.courseTitle}
                                <span className="mx-1 text-zinc-600">•</span>
                                {course.units} units
                                <span className="ml-1.5 capitalize text-zinc-500">
                                  ({course.semester})
                                </span>
                              </p>
                            </div>
                            <div className="flex gap-1">
                              {['A', 'B', 'C', 'D', 'E', 'F'].map((grade) => (
                                <button
                                  key={grade}
                                  onClick={() =>
                                    handleGradeSelect(level, sessionName, course.courseCode, grade)
                                  }
                                  className={`h-7 w-7 rounded text-[11px] font-bold transition-all ${
                                    currentGrade === grade
                                      ? grade === 'F'
                                        ? 'scale-110 bg-red-500 text-white'
                                        : 'scale-110 bg-yellow-500 text-zinc-950'
                                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                  }`}
                                >
                                  {grade}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })}
          </div>

          <div className="flex flex-col items-center justify-end gap-3 border-t border-zinc-800 pt-3 sm:flex-row">
            <p className="text-[11.5px] text-zinc-400">
              {selectedCount === 0
                ? 'No grades selected.'
                : `${selectedCount} course${selectedCount === 1 ? '' : 's'} selected.`}
            </p>
            <button
              onClick={handleManualSubmit}
              disabled={isCreating || selectedCount === 0}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-yellow-500 px-4 py-2 text-[12px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400 disabled:opacity-50 sm:w-auto"
            >
              {isCreating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save {selectedCount} course{selectedCount === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2B: DOCUMENT UPLOAD ── */}
      {step === 'document' && (
        <form onSubmit={handleDocumentSubmit} className="space-y-4">
          {isTransfer && (
            <div className="rounded-xl border border-yellow-500/30 bg-zinc-900 p-3.5">
              <h3 className="mb-2.5 text-[12px] font-semibold text-white">
                Transfer summary <span className="font-normal text-zinc-500">(optional)</span>
              </h3>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[9.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Previous CGPA
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    max="5"
                    value={transferData.cgpa}
                    onChange={(e) => setTransferData({ ...transferData, cgpa: e.target.value })}
                    placeholder="e.g. 3.50"
                    className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[12px] text-white outline-none transition-colors focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 placeholder:text-zinc-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[9.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Previous total credits
                  </label>
                  <input
                    type="number"
                    value={transferData.credits}
                    onChange={(e) => setTransferData({ ...transferData, credits: e.target.value })}
                    placeholder="e.g. 45"
                    className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[12px] text-white outline-none transition-colors focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 placeholder:text-zinc-600"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 px-4 py-8 text-center transition-colors hover:border-yellow-500/50 md:py-10">
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files))}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-zinc-400">
              <Files className="h-6 w-6" strokeWidth={1.6} />
            </div>
            <p className="text-[12.5px] font-medium text-white">
              {files.length > 0
                ? `${files.length} file${files.length === 1 ? '' : 's'} selected`
                : 'Click to upload or drag and drop'}
            </p>
            <p className="mt-0.5 text-[10.5px] text-zinc-500">
              Up to 5 images or PDFs · total max 15MB
            </p>
            {files.length > 0 && (
              <div className="mx-auto mt-3 w-full max-w-xs space-y-1">
                {files.map((f, i) => (
                  <p
                    key={i}
                    className="truncate rounded border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-[10px] text-zinc-400"
                  >
                    {f.name}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-zinc-800 pt-3">
            <button
              type="submit"
              disabled={isCreating || isParsing || files.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-yellow-500 px-4 py-2 text-[12px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400 disabled:opacity-50"
            >
              {(isCreating || isParsing) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isParsing ? 'AI is reading…' : 'Process documents'}
            </button>
          </div>
        </form>
      )}

      {/* ── STEP 3: REVIEW & EDIT ── */}
      {step === 'review' && (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
            <div className="flex flex-col justify-between gap-1.5 border-b border-zinc-800 bg-zinc-950/30 px-3 py-2.5 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-[13px] font-semibold text-white">Review &amp; edit results</h3>
                <p className="mt-0.5 text-[10.5px] text-zinc-500">
                  Fix any wrong units, grades, or semesters before publishing.
                </p>
              </div>
              <span
                className={`whitespace-nowrap text-[11px] font-bold ${
                  editableRows.length === 0 ? 'text-red-500' : 'text-zinc-400'
                }`}
              >
                {editableRows.length} course{editableRows.length === 1 ? '' : 's'} found
              </span>
            </div>

            {isReviewLoading ? (
              <div className="flex justify-center p-10">
                <Loader2 className="h-7 w-7 animate-spin text-yellow-500" />
              </div>
            ) : editableRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <AlertCircle className="mb-2.5 h-8 w-8 text-red-500" strokeWidth={1.8} />
                <h4 className="text-[12.5px] font-semibold text-white">No courses found</h4>
                <p className="mt-0.5 max-w-md text-[11px] text-zinc-500">
                  No courses were provided. Try a clearer image.
                </p>
              </div>
            ) : (
              <div className="space-y-4 p-3">
                {groupedRows.map((group) => {
                  const totalUnits = group.items.reduce(
                    (sum, { row }) => sum + (Number(row.units) || 0),
                    0
                  );
                  const missingSession = !group.session;
                  const missingSemester = !SEMESTER_LABEL[group.semester];
                  const isProblem = missingSession || missingSemester;

                  return (
                    <div
                      key={group.key}
                      className={`overflow-hidden rounded-lg border ${
                        isProblem ? 'border-red-500/30' : 'border-zinc-800'
                      }`}
                    >
                      <div
                        className={`flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 ${
                          isProblem
                            ? 'border-red-500/30 bg-red-500/5'
                            : 'border-zinc-800 bg-zinc-950/50'
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <CalendarDays
                              className={`h-3.5 w-3.5 ${
                                isProblem ? 'text-red-400' : 'text-yellow-500'
                              }`}
                              strokeWidth={2}
                            />
                            <h4
                              className={`text-[11.5px] font-bold uppercase tracking-wider ${
                                isProblem ? 'text-red-400' : 'text-yellow-500'
                              }`}
                            >
                              {SEMESTER_LABEL[group.semester] || 'Unknown Semester'}
                            </h4>
                          </div>
                          <SessionInput
                            value={group.session}
                            invalid={missingSession}
                            onCommit={(text) => handleSessionCommit(group, text)}
                          />
                        </div>
                        <span className="text-[9.5px] uppercase tracking-wider text-zinc-500">
                          {group.items.length} course{group.items.length === 1 ? '' : 's'} ·{' '}
                          {totalUnits} units
                        </span>
                      </div>

                      {/* Desktop table */}
                      <div className="hidden md:block">
                        <table className="w-full text-left text-[12px] text-zinc-300">
                          <thead className="border-b border-zinc-800 bg-zinc-950/30 text-[9.5px] uppercase tracking-[0.14em] text-zinc-500">
                            <tr>
                              <th className="px-3 py-2 font-semibold">Code</th>
                              <th className="px-3 py-2 font-semibold">Title</th>
                              <th className="w-16 px-3 py-2 font-semibold">Units</th>
                              <th className="w-20 px-3 py-2 font-semibold">Grade</th>
                              <th className="w-28 px-3 py-2 font-semibold">Semester</th>
                              <th className="w-10 px-2 py-2" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/60">
                            {group.items.map(({ row, index }) => (
                              <tr key={index} className="transition-colors hover:bg-zinc-800/30">
                                <td className="px-3 py-1.5">
                                  <input
                                    type="text"
                                    value={row.courseCode || ''}
                                    onChange={(e) => handleRowChange(index, 'courseCode', e.target.value)}
                                    className="w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-[11.5px] uppercase text-white outline-none focus:border-yellow-500/50"
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <input
                                    type="text"
                                    value={row.courseTitle || ''}
                                    onChange={(e) => handleRowChange(index, 'courseTitle', e.target.value)}
                                    className="w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11.5px] text-zinc-200 outline-none focus:border-yellow-500/50"
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <input
                                    type="number"
                                    value={row.units || ''}
                                    onChange={(e) => handleRowChange(index, 'units', e.target.value)}
                                    className="w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-center text-[11.5px] font-bold text-white outline-none focus:border-yellow-500/50"
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <select
                                    value={row.grade || ''}
                                    onChange={(e) => handleRowChange(index, 'grade', e.target.value)}
                                    className="w-full appearance-none rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-center text-[11.5px] font-bold text-white outline-none focus:border-yellow-500/50"
                                  >
                                    <option value="">N/A</option>
                                    {['A', 'B', 'C', 'D', 'E', 'F'].map((g) => (
                                      <option key={g} value={g}>{g}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-3 py-1.5">
                                  <select
                                    value={row.semester || ''}
                                    onChange={(e) => handleRowChange(index, 'semester', e.target.value)}
                                    className="w-full rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-white outline-none focus:border-yellow-500/50"
                                  >
                                    <option value="">Select</option>
                                    <option value="first">1st Sem</option>
                                    <option value="second">2nd Sem</option>
                                  </select>
                                </td>
                                <td className="px-2 py-1.5 text-right">
                                  <button
                                    onClick={() => handleRemoveRow(index)}
                                    className="rounded p-1 text-zinc-500 transition-colors hover:text-red-400"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile cards */}
                      <div className="divide-y divide-zinc-800/60 bg-zinc-950/10 md:hidden">
                        {group.items.map(({ row, index }) => (
                          <div key={index} className="flex flex-col gap-2 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <input
                                  type="text"
                                  value={row.courseCode || ''}
                                  onChange={(e) => handleRowChange(index, 'courseCode', e.target.value)}
                                  placeholder="Code"
                                  className="w-full bg-transparent font-mono text-[12px] font-bold uppercase text-white outline-none placeholder:text-zinc-600"
                                />
                                <input
                                  type="text"
                                  value={row.courseTitle || ''}
                                  onChange={(e) => handleRowChange(index, 'courseTitle', e.target.value)}
                                  placeholder="Course title"
                                  className="mt-0.5 w-full bg-transparent text-[11px] text-zinc-400 outline-none placeholder:text-zinc-600"
                                />
                              </div>
                              <button
                                onClick={() => handleRemoveRow(index)}
                                className="shrink-0 rounded p-1 text-zinc-500 transition-colors hover:text-red-400"
                              >
                                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="mb-0.5 block text-[9px] uppercase tracking-wider text-zinc-500">
                                  Units
                                </label>
                                <input
                                  type="number"
                                  value={row.units || ''}
                                  onChange={(e) => handleRowChange(index, 'units', e.target.value)}
                                  className="w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-center text-[11.5px] font-bold text-white outline-none focus:border-yellow-500/50"
                                />
                              </div>
                              <div>
                                <label className="mb-0.5 block text-[9px] uppercase tracking-wider text-zinc-500">
                                  Grade
                                </label>
                                <select
                                  value={row.grade || ''}
                                  onChange={(e) => handleRowChange(index, 'grade', e.target.value)}
                                  className="w-full appearance-none rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-center text-[11.5px] font-bold text-white outline-none focus:border-yellow-500/50"
                                >
                                  <option value="">N/A</option>
                                  {['A', 'B', 'C', 'D', 'E', 'F'].map((g) => (
                                    <option key={g} value={g}>{g}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="mb-0.5 block text-[9px] uppercase tracking-wider text-zinc-500">
                                  Semester
                                </label>
                                <select
                                  value={row.semester || ''}
                                  onChange={(e) => handleRowChange(index, 'semester', e.target.value)}
                                  className="w-full appearance-none rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-white outline-none focus:border-yellow-500/50"
                                >
                                  <option value="">Select</option>
                                  <option value="first">1st</option>
                                  <option value="second">2nd</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col items-start justify-between gap-3 border-t border-zinc-800 pt-3 sm:flex-row sm:items-center">
            <p className="max-w-md text-[10.5px] text-zinc-500">
              {hasUnsavedEdits
                ? 'Unsaved changes — save first.'
                : hasIncompleteRows
                ? 'Every group needs a session and semester.'
                : 'Make sure all records match before publishing.'}
            </p>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <button
                onClick={handleDiscard}
                disabled={isDeleting || isPublishing}
                className="rounded-md px-3 py-2 text-[11.5px] font-semibold text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-50 sm:order-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdits}
                disabled={isSavingEdits || !hasUnsavedEdits}
                className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[11.5px] font-bold uppercase tracking-wider transition-colors sm:order-2 ${
                  hasUnsavedEdits
                    ? 'bg-zinc-100 text-zinc-950 hover:bg-white'
                    : 'cursor-not-allowed bg-zinc-800 text-zinc-500'
                }`}
              >
                {isSavingEdits ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" strokeWidth={2.2} />
                )}
                Save
              </button>
              <button
                onClick={handlePublish}
                disabled={
                  isPublishing ||
                  isReviewLoading ||
                  editableRows.length === 0 ||
                  hasUnsavedEdits ||
                  hasIncompleteRows
                }
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-yellow-500 px-4 py-2 text-[11.5px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50 sm:order-3"
              >
                {isPublishing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isPublishing ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadResults;