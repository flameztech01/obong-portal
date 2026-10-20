// src/pages/Results.jsx
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { 
  Plus, 
  ChevronDown, 
  AlertTriangle, 
  FileText, 
  Award, 
  BookOpen, 
  TrendingUp 
} from 'lucide-react';
import { useGetMyResultsQuery, useGetMyGpaQuery } from '../features/resultApiSlice';

// =========================================
// SKELETONS
// =========================================
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-zinc-800 rounded-lg ${className}`}></div>
);

const Results = () => {
  // 1. Fetch data
  const { data: gpaData, isLoading: isGpaLoading } = useGetMyGpaQuery();
  const { data: resultsData, isLoading: isResultsLoading } = useGetMyResultsQuery();

  // State to track which semester is expanded (default to null)
  const [expandedSemester, setExpandedSemester] = useState(null);

  const results = resultsData?.results || [];
  const carryovers = gpaData?.carryovers || [];

  // 2. Group results by Session and Semester
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

    // Sort by session name descending (newest first)
    return Object.values(groups).sort((a, b) => {
      return b.sessionName.localeCompare(a.sessionName) || b.semester.localeCompare(a.semester);
    });
  }, [results]);

  const toggleSemester = (key) => {
    setExpandedSemester((prev) => (prev === key ? null : key));
  };

  if (isGpaLoading || isResultsLoading) {
    return (
      <div className="space-y-6 p-4 md:p-8 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // Check if the student has absolutely no results yet
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] px-6 text-center animate-in fade-in max-w-4xl mx-auto">
        <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-6 text-zinc-500">
          <FileText className="w-10 h-10" strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl font-serif text-white mb-2">No Results Found</h2>
        <p className="text-zinc-400 text-sm max-w-md mb-6">
          You don't have any published results yet. If you are an old or transfer student, you need to upload your historical results to generate your CGPA.
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
        <div>
          <h1 className="text-2xl md:text-3xl font-serif text-white tracking-tight">
            Academic Results
          </h1>
          <p className="text-zinc-400 text-sm mt-1">View your grades, GPA, and carryovers.</p>
        </div>
        
        {/* Permanent button to upload more results */}
        <Link 
          to="/upload-results"
          className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border border-zinc-700 shrink-0"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          Add More Results
        </Link>
      </div>

      {/* =========================================
          OVERVIEW CARDS
          ========================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        
        {/* CGPA */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Award className="w-16 h-16 text-yellow-500" />
          </div>
          <p className="text-zinc-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-1">Cumulative GPA</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl md:text-3xl font-bold text-white">{gpaData?.cumulative?.gpa?.toFixed(2) || '0.00'}</span>
            <span className="text-zinc-500 text-xs">/ 5.00</span>
          </div>
        </div>

        {/* Total Units */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-5">
          <p className="text-zinc-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-1">Total Credits</p>
          <span className="text-2xl md:text-3xl font-bold text-white mt-1 block">{gpaData?.cumulative?.units || 0}</span>
        </div>

        {/* Courses */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-5">
          <p className="text-zinc-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-1">Courses Taken</p>
          <span className="text-2xl md:text-3xl font-bold text-white mt-1 block">{gpaData?.totalCourses || 0}</span>
        </div>

        {/* Carryovers */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-5">
          <p className="text-zinc-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-1">Carryovers</p>
          <span className={`text-2xl md:text-3xl font-bold mt-1 block ${carryovers.length > 0 ? 'text-red-500' : 'text-white'}`}>
            {carryovers.length}
          </span>
        </div>

      </div>

      {/* =========================================
          TRANSFER STUDENT INFO (If Applicable)
          ========================================= */}
      {gpaData?.transferData?.cgpa && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
          <div className="bg-yellow-500/10 p-2 rounded-lg text-yellow-500">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">Transfer Credits Included</h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Your overall CGPA includes <strong>{gpaData.transferData.credits} credits</strong> from your previous institution with a <strong>{gpaData.transferData.cgpa.toFixed(2)} GPA</strong>.
            </p>
          </div>
        </div>
      )}

      {/* =========================================
          CARRYOVERS ALERT (If Applicable)
          ========================================= */}
      {carryovers.length > 0 && (
        <div className="bg-zinc-900 border border-red-500/30 rounded-xl p-4 md:p-5 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
          <h3 className="text-white font-medium flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Carryover Courses
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {carryovers.map((co, i) => (
              <div key={i} className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3">
                <p className="text-sm font-bold text-white">{co.courseCode}</p>
                <p className="text-xs text-zinc-400 truncate mt-0.5">{co.courseTitle || 'Unknown Title'}</p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/50">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{co.units} Units</span>
                  <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded">Grade {co.latestGrade}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================
          SEMESTER BREAKDOWN (Accordion)
          ========================================= */}
      <div className="space-y-3">
        <h2 className="text-lg font-serif text-white tracking-tight mt-6 mb-2">Semester Breakdown</h2>
        
        {groupedResults.map((group) => {
          const isExpanded = expandedSemester === group.key;
          
          return (
            <div 
              key={group.key} 
              className={`bg-zinc-900 border transition-colors duration-200 rounded-xl overflow-hidden ${
                isExpanded ? 'border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.05)]' : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {/* Accordion Header */}
              <button 
                onClick={() => toggleSemester(group.key)}
                className="w-full flex items-center justify-between p-4 md:p-5 text-left focus:outline-none"
              >
                <div className="flex flex-col">
                  <span className="text-sm md:text-base font-bold text-white uppercase tracking-wide">
                    {group.sessionName} <span className="text-zinc-500 font-normal lowercase">•</span> {group.semester} semester
                  </span>
                  <span className="text-xs text-zinc-500 mt-1">{group.courses.length} courses</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">GPA</p>
                    <p className="text-sm font-bold text-yellow-500">
                      {gpaData?.sessionBreakdown?.find(s => s.session?.name === group.sessionName && s.semester === group.semester)?.gpa?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-zinc-800 text-white' : 'bg-zinc-800/50 text-zinc-400'}`}>
                    <ChevronDown className="w-4 h-4" strokeWidth={2} />
                  </div>
                </div>
              </button>

              {/* Accordion Content (Table) */}
              {isExpanded && (
                <div className="border-t border-zinc-800/50">
                  
                  {/* Desktop Table */}
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
                          <tr key={course.id} className="hover:bg-zinc-800/20 transition-colors">
                            <td className="px-5 py-3 font-mono font-medium text-white">{course.courseCode}</td>
                            <td className="px-5 py-3">{course.courseTitle || '—'}</td>
                            <td className="px-5 py-3 text-center">{course.units}</td>
                            <td className="px-5 py-3 text-center">{course.score !== null ? course.score : '—'}</td>
                            <td className="px-5 py-3 text-right">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-xs ${
                                course.grade === 'A' ? 'bg-green-500/10 text-green-400' :
                                course.grade === 'B' ? 'bg-blue-500/10 text-blue-400' :
                                course.grade === 'C' ? 'bg-yellow-500/10 text-yellow-400' :
                                course.grade === 'D' ? 'bg-orange-500/10 text-orange-400' :
                                course.grade === 'E' ? 'bg-zinc-500/20 text-zinc-400' :
                                'bg-red-500/10 text-red-500' // F
                              }`}>
                                {course.grade}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile List */}
                  <div className="md:hidden divide-y divide-zinc-800/50 bg-zinc-950/20">
                    {group.courses.map((course) => (
                      <div key={course.id} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-mono font-bold text-white text-sm">{course.courseCode}</p>
                          <p className="text-zinc-400 text-xs mt-0.5 max-w-[200px] truncate">{course.courseTitle || '—'}</p>
                          <p className="text-zinc-500 text-[10px] mt-1">{course.units} Units {course.score !== null ? `• Score: ${course.score}` : ''}</p>
                        </div>
                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-bold text-sm ${
                          course.grade === 'A' ? 'bg-green-500/10 text-green-400' :
                          course.grade === 'B' ? 'bg-blue-500/10 text-blue-400' :
                          course.grade === 'C' ? 'bg-yellow-500/10 text-yellow-400' :
                          course.grade === 'D' ? 'bg-orange-500/10 text-orange-400' :
                          course.grade === 'E' ? 'bg-zinc-500/20 text-zinc-400' :
                          'bg-red-500/10 text-red-500'
                        }`}>
                          {course.grade}
                        </span>
                      </div>
                    ))}
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default Results;