// src/pages/UploadResults.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { 
  PenTool, 
  ChevronLeft, 
  AlertCircle,
  Loader2,
  FileSearch,
  Trash2,
  Save,
  CalendarDays,
  Files
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { 
  useGetHistoricalCoursesQuery, 
  useCreateSelfUploadMutation,
  useGetUploadQuery,
  usePublishUploadMutation,
  useDeleteUploadMutation,
  useEditUploadRowsMutation
} from '../features/resultApiSlice';
import { useParseResultMutation } from '../features/aiApiSlice';

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-zinc-800 rounded-lg ${className}`}></div>
);

const SEMESTER_LABEL = { first: '1st Semester', second: '2nd Semester' };
const SEMESTER_ORDER = { first: 0, second: 1 };

// "2022/2023", "2022-2023", "2022/23" -> "2022/2023" (null if invalid)
const normalizeSessionInput = (value) => {
  const m = String(value || '').match(/(\d{4})\s*[\/\\-]\s*(\d{2,4})/);
  if (!m) return null;
  const start = m[1];
  let end = m[2];
  if (end.length === 2) end = `${start.slice(0, 2)}${end}`;
  if (Number(end) !== Number(start) + 1) return null;
  return `${start}/${end}`;
};

// Rows with a level are grouped by level + semester; rows without one by session + semester
const groupKeyOf = (row) => {
  const semester = row.semester || 'unknown';
  return row.level
    ? `L${row.level}__${semester}`
    : `S${row.session || 'none'}__${semester}`;
};

// Session box that only commits on blur / Enter, so the group doesn't jump while typing
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
      placeholder="Session e.g. 2022/2023"
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
      className={`w-44 bg-zinc-950 border text-white text-xs rounded px-2 py-1.5 focus:outline-none font-mono ${
        invalid ? 'border-red-500/60 focus:border-red-400' : 'border-zinc-700 focus:border-yellow-500'
      }`}
    />
  );
};

const UploadResults = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // API Hooks
  const { data: coursesData, isLoading: isCoursesLoading } = useGetHistoricalCoursesQuery();
  const [createSelfUpload, { isLoading: isCreating }] = useCreateSelfUploadMutation();
  const [parseResult, { isLoading: isParsing }] = useParseResultMutation();
  const [publishUpload, { isLoading: isPublishing }] = usePublishUploadMutation();
  const [deleteUpload, { isLoading: isDeleting }] = useDeleteUploadMutation();
  const [editUploadRows, { isLoading: isSavingEdits }] = useEditUploadRowsMutation();

  // State
  const [step, setStep] = useState('select');
  const [transferData, setTransferData] = useState({ cgpa: '', credits: '' });
  const [selectedGrades, setSelectedGrades] = useState({}); 
  
  const [files, setFiles] = useState([]); 
  const [uploadId, setUploadId] = useState(null);
  
  // Semester filter for manual entry
  const [semesterFilter, setSemesterFilter] = useState('all'); // 'all' | 'first' | 'second'

  // State for editable review rows
  const [editableRows, setEditableRows] = useState([]);
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);

  const { data: reviewData, isLoading: isReviewLoading } = useGetUploadQuery(uploadId, { skip: !uploadId });

  const isTransfer = coursesData?.isTransferStudent;
  const courses = coursesData?.courses || {};

  // Sync review data to editable state when it loads
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
        credits: coursesData.transferCredits || ''
      });
    }
  }, [isTransfer, coursesData]);

  // Group review rows by level (or session) + semester, keeping the original index for editing
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
    setSelectedGrades(prev => {
      const newGrades = { ...prev };
      if (newGrades[key] === grade) {
        delete newGrades[key]; // Toggle off
      } else {
        newGrades[key] = grade;
      }
      return newGrades;
    });
  };

  /* =========================================
     DISCARD / CANCEL
     ========================================= */
  const handleDiscard = async () => {
    try {
      if (uploadId) {
        await deleteUpload(uploadId).unwrap();
      }
      setUploadId(null);
      setFiles([]);
      setSelectedGrades({});
      setEditableRows([]);
      setHasUnsavedEdits(false);
      setStep('select');
      toast.success("Draft discarded successfully");
    } catch (err) {
      console.error("Discard error:", err);
      toast.error("Failed to discard upload");
    }
  };

  /* =========================================
     SUBMIT MANUAL ENTRY
     ========================================= */
  const handleManualSubmit = async () => {
    const rows = [];

    Object.keys(courses).forEach(level => {
      const sessions = courses[level];
      
      Object.keys(sessions).forEach(sessionName => {
        sessions[sessionName].forEach(course => {
          const key = `${level}-${sessionName}-${course.courseCode}`;
          const grade = selectedGrades[key];
          
          if (grade) {
            rows.push({
              session: sessionName,
              semester: course.semester, 
              courseCode: course.courseCode,
              courseTitle: course.courseTitle,
              units: course.units,
              grade: grade
            });
          }
        });
      });
    });

    if (rows.length === 0) return toast.error("Please select at least one grade.");

    try {
      const payload = { rows };
      if (isTransfer) {
        payload.transferCgpa = Number(transferData.cgpa);
        payload.transferCredits = Number(transferData.credits);
      }

      const result = await createSelfUpload(payload).unwrap();
      setUploadId(result.upload.id);
      setStep('review');
      toast.success(`${rows.length} grades saved. Please review before publishing.`);
    } catch (err) {
      console.error("🚨 MANUAL UPLOAD ERROR:", err);
      toast.error(err?.data?.message || "Failed to save grades.");
    }
  };

  /* =========================================
     SUBMIT DOCUMENT UPLOAD
     ========================================= */
  const handleDocumentSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) return toast.error("Please select at least one file.");

    // Check combined file size
    const totalSize = files.reduce((acc, file) => acc + file.size, 0);
    if (totalSize > 15 * 1024 * 1024) {
      return toast.error("Total file size is too large. Maximum is 15MB.");
    }

    try {
      const fd = new FormData();
      
      files.forEach(file => fd.append("documents", file));
      
      if (isTransfer) {
        fd.append("transferCgpa", transferData.cgpa);
        fd.append("transferCredits", transferData.credits);
      }

      const uploadRes = await createSelfUpload(fd).unwrap();
      const newUploadId = uploadRes.upload.id;

      toast.success(`${files.length} file(s) uploaded! AI is reading them...`);
      
      try {
        await parseResult({ uploadId: newUploadId }).unwrap();
        setUploadId(newUploadId);
        setStep('review');
        toast.success("Document parsed successfully!");
      } catch (aiErr) {
        console.error("🚨 AI PARSE ERROR:", aiErr);
        const errorMessage = aiErr?.data?.error || aiErr?.data?.message || "AI failed to read the document.";
        toast.error(errorMessage);
        setUploadId(newUploadId); 
        setStep('review');
      }

    } catch (err) {
      console.error("🚨 FULL UPLOAD ERROR:", err);
      if (err?.status === 'FETCH_ERROR') {
        toast.error("Network error. The server might be offline.");
      } else {
        toast.error(err?.data?.message || "Failed to upload document.");
      }
    }
  };

  /* =========================================
     EDIT REVIEW ROWS
     ========================================= */
  const handleRowChange = (index, field, value) => {
    const newRows = [...editableRows];
    const updatedRow = { ...newRows[index] };
    
    if (field === 'units') {
      updatedRow[field] = Number(value);
    } else {
      updatedRow[field] = value;
    }
    
    newRows[index] = updatedRow;
    setEditableRows(newRows);
    setHasUnsavedEdits(true);
  };

  const handleRemoveRow = (index) => {
    const newRows = editableRows.filter((_, i) => i !== index);
    setEditableRows(newRows);
    setHasUnsavedEdits(true);
  };

  // Set the session for a whole level (both semesters), or for a group of level-less rows
  const handleSessionCommit = (group, text) => {
    const normalized = text ? normalizeSessionInput(text) : null;
    if (text && !normalized) {
      return toast.error('Invalid session. Use consecutive years like 2022/2023.');
    }

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
      toast.success("Edits saved successfully!");
      setHasUnsavedEdits(false);
    } catch (err) {
      console.error("Save edits error:", err);
      toast.error("Failed to save edits.");
    }
  };

  /* =========================================
     PUBLISH
     ========================================= */
  const handlePublish = async () => {
    if (hasUnsavedEdits) return toast.error("Please save your edits before publishing.");
    if (hasIncompleteRows) return toast.error("Every group needs a session and semester before publishing.");
    try {
      await publishUpload(uploadId).unwrap();
      toast.success("Results published successfully! Your CGPA has been updated.");
      navigate('/dashboard');
    } catch (err) {
      console.error("🚨 PUBLISH ERROR:", err);
      toast.error(err?.data?.message || "Failed to publish results.");
    }
  };

  if (isCoursesLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 p-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const selectedCount = Object.keys(selectedGrades).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div>
        <button 
          onClick={() => step === 'select' ? navigate('/dashboard') : handleDiscard()}
          className="text-zinc-400 hover:text-white flex items-center gap-2 text-sm font-medium mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> 
          {step === 'select' ? 'Back to Dashboard' : 'Cancel & Go Back'}
        </button>
        <h1 className="text-2xl md:text-3xl font-serif text-white tracking-tight">Upload Historical Results</h1>
        <p className="text-zinc-400 text-sm mt-1">
          {isTransfer 
            ? "Enter your previous grades and transfer credits to generate your accurate CGPA." 
            : "Select the grades you got in your previous levels. You can upload 1st semester now and 2nd semester later."}
        </p>
      </div>

      {/* STEP 1: SELECT METHOD */}
      {step === 'select' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button onClick={() => setStep('manual')} className="bg-zinc-900 border border-zinc-800 hover:border-yellow-500/50 rounded-2xl p-6 flex flex-col items-start text-left transition-all group">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-yellow-500 mb-4 group-hover:scale-110 transition-transform">
              <PenTool className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Manual Entry</h3>
            <p className="text-sm text-zinc-400">Pick your grades from a list of courses.</p>
          </button>

          <button onClick={() => setStep('document')} className="bg-zinc-900 border border-zinc-800 hover:border-yellow-500/50 rounded-2xl p-6 flex flex-col items-start text-left transition-all group">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-yellow-500 mb-4 group-hover:scale-110 transition-transform">
              <FileSearch className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Upload Transcript</h3>
            <p className="text-sm text-zinc-400">Upload images or PDFs. Our AI will read them.</p>
          </button>
        </div>
      )}

      {/* STEP 2A: MANUAL ENTRY */}
      {step === 'manual' && (
        <div className="space-y-6">
          {isTransfer && (
            <div className="bg-zinc-900 border border-yellow-500/30 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500" /> Transfer Summary
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1 block">Previous CGPA</label>
                  <input type="number" step="0.01" max="5" value={transferData.cgpa} onChange={(e) => setTransferData({...transferData, cgpa: e.target.value})} placeholder="e.g. 3.50" className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2 focus:border-yellow-500/50 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1 block">Previous Total Credits</label>
                  <input type="number" value={transferData.credits} onChange={(e) => setTransferData({...transferData, credits: e.target.value})} placeholder="e.g. 45" className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2 focus:border-yellow-500/50 focus:outline-none" />
                </div>
              </div>
            </div>
          )}

          {/* SEMESTER FILTER TABS */}
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-full max-w-md mx-auto">
            {['all', 'first', 'second'].map((sem) => (
              <button
                key={sem}
                onClick={() => setSemesterFilter(sem)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${
                  semesterFilter === sem 
                    ? 'bg-zinc-800 text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {sem === 'all' ? 'Show All' : `${sem} Semester`}
              </button>
            ))}
          </div>

          {/* Loop through levels */}
          {[100, 200, 300, 400, 500].map(level => {
            const sessions = courses[level] || {};
            const sessionKeys = Object.keys(sessions);

            if (sessionKeys.length === 0) {
              if (level <= 400) {
                return (
                  <div key={level} className="bg-zinc-900 border border-yellow-500/20 rounded-2xl p-6 text-center">
                    <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2 opacity-50" />
                    <h3 className="text-white font-medium">{level} Level Courses Not Available</h3>
                    <p className="text-sm text-zinc-400 mt-1 max-w-md mx-auto">
                      No historical courses have been uploaded for {level} Level yet. Please contact your Course Rep or Admin.
                    </p>
                  </div>
                );
              }
              return null;
            }

            return (
              <div key={level} className="space-y-4">
                <div className="flex items-center gap-3 border-b border-zinc-800 pb-2">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-yellow-500">
                    <span className="font-bold text-sm">{level}</span>
                  </div>
                  <h2 className="text-xl font-serif text-white tracking-tight">{level} Level Courses</h2>
                </div>
                
                {sessionKeys.map(sessionName => {
                  const filteredCourses = sessions[sessionName].filter(course => {
                    if (semesterFilter === 'all') return true;
                    return course.semester === semesterFilter;
                  });

                  if (filteredCourses.length === 0) return null;

                  return (
                    <div key={`${level}-${sessionName}`} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                      <div className="bg-zinc-950/50 p-4 border-b border-zinc-800 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-yellow-500" />
                        <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider">{sessionName} Session</h3>
                      </div>

                      <div className="divide-y divide-zinc-800/50">
                        {filteredCourses.map(course => {
                          const gradeKey = `${level}-${sessionName}-${course.courseCode}`;
                          const currentGrade = selectedGrades[gradeKey];

                          return (
                            <div key={gradeKey} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-800/20 transition-colors">
                              <div>
                                <p className="font-mono text-sm font-bold text-white">{course.courseCode}</p>
                                <p className="text-xs text-zinc-400">
                                  {course.courseTitle} <span className="text-zinc-600">•</span> {course.units} Units
                                  <span className="ml-2 text-zinc-500 capitalize">({course.semester} Sem)</span>
                                </p>
                              </div>
                              <div className="flex gap-1">
                                {['A', 'B', 'C', 'D', 'E', 'F'].map(grade => (
                                  <button 
                                    key={grade} 
                                    onClick={() => handleGradeSelect(level, sessionName, course.courseCode, grade)} 
                                    className={`w-8 h-8 rounded text-xs font-bold transition-all ${
                                      currentGrade === grade 
                                        ? grade === 'F' ? 'bg-red-500 text-white scale-110 shadow-lg' : 'bg-yellow-500 text-zinc-950 scale-110 shadow-lg' 
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
                })}
              </div>
            );
          })}

          <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-4">
            <p className="text-sm text-zinc-400">
              {selectedCount === 0 
                ? "No grades selected yet." 
                : `You have selected ${selectedCount} course${selectedCount === 1 ? '' : 's'}.`}
            </p>
            <button 
              onClick={handleManualSubmit} 
              disabled={isCreating || selectedCount === 0} 
              className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-400 text-zinc-950 text-sm font-bold uppercase tracking-wider px-8 py-3.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
              {isCreating ? 'Saving...' : `Save ${selectedCount} Selected Courses`}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2B: DOCUMENT UPLOAD */}
      {step === 'document' && (
        <form onSubmit={handleDocumentSubmit} className="space-y-6">
          {isTransfer && (
            <div className="bg-zinc-900 border border-yellow-500/30 rounded-xl p-5 mb-6">
              <h3 className="text-sm font-bold text-white mb-3">Transfer Summary (Optional)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1 block">Previous CGPA</label>
                  <input type="number" step="0.01" max="5" value={transferData.cgpa} onChange={(e) => setTransferData({...transferData, cgpa: e.target.value})} placeholder="e.g. 3.50" className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2 focus:border-yellow-500/50 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1 block">Previous Total Credits</label>
                  <input type="number" value={transferData.credits} onChange={(e) => setTransferData({...transferData, credits: e.target.value})} placeholder="e.g. 45" className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2 focus:border-yellow-500/50 focus:outline-none" />
                </div>
              </div>
            </div>
          )}

          <div className="border-2 border-dashed border-zinc-700 hover:border-yellow-500/50 rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-colors relative">
            <input 
              type="file" 
              accept="image/*,application/pdf" 
              multiple 
              onChange={(e) => setFiles(Array.from(e.target.files))} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
            />
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 mb-4">
              <Files className="w-8 h-8" strokeWidth={1.5} />
            </div>
            <p className="text-white font-medium mb-1">
              {files.length > 0 ? `${files.length} file(s) selected` : "Click to upload or drag and drop"}
            </p>
            <p className="text-zinc-500 text-xs">Upload up to 5 images or PDFs (Total max 15MB)</p>
            
            {files.length > 0 && (
              <div className="mt-4 space-y-1 w-full max-w-xs mx-auto">
                {files.map((f, i) => (
                  <p key={i} className="text-[10px] text-zinc-400 truncate bg-zinc-900/50 py-1 px-2 rounded border border-zinc-800">{f.name}</p>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" disabled={isCreating || isParsing || files.length === 0} className="bg-yellow-500 hover:bg-yellow-400 text-zinc-950 text-sm font-bold uppercase tracking-wider px-8 py-3.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
              {(isCreating || isParsing) && <Loader2 className="w-4 h-4 animate-spin" />}
              {isParsing ? 'AI is reading...' : 'Process Documents'}
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: REVIEW & EDIT (GROUPED BY LEVEL / SESSION + SEMESTER) */}
      {step === 'review' && (
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 bg-zinc-950/30 flex justify-between items-center gap-4">
              <div>
                <h3 className="font-bold text-white">Review & Edit Results</h3>
                <p className="text-xs text-zinc-400 mt-1">Check the AI's work. Type the session for each level, and fix any wrong units, grades or semesters before publishing.</p>
              </div>
              <span className={`text-xs font-bold whitespace-nowrap ${editableRows.length === 0 ? 'text-red-500' : 'text-zinc-400'}`}>
                {editableRows.length} courses found
              </span>
            </div>
            
            {isReviewLoading ? (
              <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-yellow-500" /></div>
            ) : editableRows.length === 0 ? (
              <div className="p-10 flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
                <h4 className="text-white font-bold mb-1">No courses found</h4>
                <p className="text-zinc-400 text-sm max-w-md">No courses were provided. Please try a clearer image, or use the Manual Entry option.</p>
              </div>
            ) : (
              <div className="p-4 space-y-6">
                {groupedRows.map((group) => {
                  const totalUnits = group.items.reduce((sum, { row }) => sum + (Number(row.units) || 0), 0);
                  const missingSession = !group.session;
                  const missingSemester = !SEMESTER_LABEL[group.semester];
                  const isProblem = missingSession || missingSemester;

                  return (
                    <div key={group.key} className={`border rounded-xl overflow-hidden ${isProblem ? 'border-red-500/30' : 'border-zinc-800'}`}>
                      <div className={`px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b ${isProblem ? 'bg-red-500/5 border-red-500/30' : 'bg-zinc-950/50 border-zinc-800'}`}>
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2">
                            <CalendarDays className={`w-4 h-4 ${isProblem ? 'text-red-400' : 'text-yellow-500'}`} />
                            <h4 className={`text-sm font-bold uppercase tracking-wider ${isProblem ? 'text-red-400' : 'text-yellow-500'}`}>
                              {group.level ? `${group.level} Level` : 'Other'}
                              <span className="text-zinc-500 mx-2">•</span>
                              {SEMESTER_LABEL[group.semester] || 'Unknown Semester'}
                            </h4>
                          </div>
                          <SessionInput
                            value={group.session}
                            invalid={missingSession}
                            onCommit={(text) => handleSessionCommit(group, text)}
                          />
                        </div>
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                          {group.items.length} course{group.items.length === 1 ? '' : 's'} • {totalUnits} units
                        </span>
                      </div>

                      {missingSession && (
                        <p className="px-4 py-2 text-xs text-red-400 bg-red-500/5 border-b border-red-500/20">
                          This transcript doesn't print the session. Type it in the box above (e.g. 2022/2023).
                        </p>
                      )}
                      {missingSemester && (
                        <p className="px-4 py-2 text-xs text-red-400 bg-red-500/5 border-b border-red-500/20">
                          The semester could not be read. Set it on each row below.
                        </p>
                      )}

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-zinc-300">
                          <thead className="bg-zinc-950/30 text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                            <tr>
                              <th className="px-4 py-3 font-medium">Course Code</th>
                              <th className="px-4 py-3 font-medium">Course Title</th>
                              <th className="px-4 py-3 font-medium w-20">Units</th>
                              <th className="px-4 py-3 font-medium w-24">Grade</th>
                              <th className="px-4 py-3 font-medium w-32">Semester</th>
                              <th className="px-4 py-3 font-medium text-right w-16">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/50">
                            {group.items.map(({ row, index }) => (
                              <tr key={index} className="hover:bg-zinc-800/20 transition-colors">
                                <td className="px-4 py-2">
                                  <input type="text" value={row.courseCode || ''} onChange={(e) => handleRowChange(index, 'courseCode', e.target.value)} className="w-full min-w-[90px] bg-zinc-950 border border-zinc-800 text-white text-sm rounded px-2 py-1.5 focus:border-yellow-500/50 focus:outline-none font-mono uppercase" />
                                </td>
                                <td className="px-4 py-2">
                                  <input type="text" value={row.courseTitle || ''} onChange={(e) => handleRowChange(index, 'courseTitle', e.target.value)} className="w-full min-w-[160px] bg-zinc-950 border border-zinc-800 text-zinc-300 text-sm rounded px-2 py-1.5 focus:border-yellow-500/50 focus:outline-none" />
                                </td>
                                <td className="px-4 py-2">
                                  <input type="number" value={row.units || ''} onChange={(e) => handleRowChange(index, 'units', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded px-2 py-1.5 focus:border-yellow-500/50 focus:outline-none text-center font-bold" />
                                </td>
                                <td className="px-4 py-2">
                                  <select value={row.grade || ''} onChange={(e) => handleRowChange(index, 'grade', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded px-2 py-1.5 focus:border-yellow-500/50 focus:outline-none font-bold appearance-none text-center">
                                    <option value="">N/A</option>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                    <option value="D">D</option>
                                    <option value="E">E</option>
                                    <option value="F">F</option>
                                  </select>
                                </td>
                                <td className="px-4 py-2">
                                  <select value={row.semester || ''} onChange={(e) => handleRowChange(index, 'semester', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs rounded px-2 py-1.5 focus:border-yellow-500/50 focus:outline-none">
                                    <option value="">Select</option>
                                    <option value="first">1st Sem</option>
                                    <option value="second">2nd Sem</option>
                                  </select>
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <button onClick={() => handleRemoveRow(index)} className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Delete row">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
            <p className="text-xs text-zinc-400 max-w-md">
              {hasUnsavedEdits 
                ? "You have unsaved changes. Please save them before publishing." 
                : hasIncompleteRows
                ? "Every group needs a session and semester before you can publish."
                : "Make sure all units, grades and semesters exactly match your records."}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button onClick={handleDiscard} disabled={isDeleting || isPublishing} className="px-6 py-3.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors text-center">
                Cancel
              </button>
              
              <button onClick={handleSaveEdits} disabled={isSavingEdits || !hasUnsavedEdits} className={`text-sm font-bold uppercase tracking-wider px-6 py-3.5 rounded-lg transition-colors flex items-center justify-center gap-2 ${hasUnsavedEdits ? 'bg-zinc-100 hover:bg-white text-zinc-950 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}>
                {isSavingEdits ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>

              <button onClick={handlePublish} disabled={isPublishing || isReviewLoading || editableRows.length === 0 || hasUnsavedEdits || hasIncompleteRows} className="bg-yellow-500 hover:bg-yellow-400 text-zinc-950 text-sm font-bold uppercase tracking-wider px-8 py-3.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isPublishing && <Loader2 className="w-4 h-4 animate-spin" />}
                {isPublishing ? 'Publishing...' : 'Publish Results'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UploadResults;