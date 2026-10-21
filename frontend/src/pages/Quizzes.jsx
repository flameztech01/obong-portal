// src/pages/Quizzes.jsx
import React, { useState, useEffect } from 'react';
import { 
  Play, Clock, Award, CheckCircle2, XCircle, AlertCircle, Timer,
  BookOpen, Loader2
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { 
  useListQuizzesQuery, useGetQuizQuery, useStartAttemptMutation, 
  useSubmitAttemptMutation, useListMyAttemptsQuery
} from '../features/studyApiSlice';

const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-zinc-800 ${className}`} />
);

const Quizzes = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('available'); // 'available' | 'attempts'
  
  // Quiz Taking State
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [deadline, setDeadline] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);

  // API Hooks
  const { data: quizzesData, isLoading: isQuizzesLoading } = useListQuizzesQuery(undefined, { skip: activeQuizId });
  const { data: quizData, isLoading: isQuizLoading } = useGetQuizQuery(activeQuizId, { skip: !activeQuizId });
  const { data: attemptsData, isLoading: isAttemptsLoading } = useListMyAttemptsQuery(undefined, { skip: activeQuizId });
  
  const [startAttempt, { isLoading: isStarting }] = useStartAttemptMutation();
  const [submitAttempt, { isLoading: isSubmitting }] = useSubmitAttemptMutation();

  const quizzes = quizzesData?.quizzes || [];
  const attempts = attemptsData?.attempts || [];
  const activeQuiz = quizData?.quiz;

  // Handle Timer
  useEffect(() => {
    if (!deadline) return;
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(deadline).getTime() - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft("00:00");
        toast.error("Time is up! Auto-submitting...");
        handleSubmit(true); // Auto submit
      } else {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  const handleStartQuiz = async (quizId) => {
    try {
      const res = await startAttempt(quizId).unwrap();
      
      if (res.message === "Resuming your attempt") {
        toast.success("Resuming your quiz...");
      } else {
        toast.success("Quiz started! Good luck.");
      }

      setActiveQuizId(quizId);
      setAttemptId(res.attempt.id);
      setDeadline(res.attempt.deadlineAt);
      
      // Pre-fill answers if resuming
      const initialAnswers = {};
      res.attempt.answers?.forEach(a => {
        if (a.answer) initialAnswers[a.questionId] = a.answer;
      });
      setAnswers(initialAnswers);

    } catch (err) {
      toast.error(err?.data?.message || "Failed to start quiz");
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (isAuto = false) => {
    if (!isAuto) {
      if (!window.confirm("Are you sure you want to submit your quiz? You cannot change your answers after this.")) return;
    }

    try {
      const payloadAnswers = Object.entries(answers).map(([qId, val]) => ({
        questionId: qId,
        answer: val
      }));

      await submitAttempt({ quizId: activeQuizId, answers: payloadAnswers }).unwrap();
      
      toast.success(isAuto ? "Quiz auto-submitted." : "Quiz submitted successfully!");
      
      // Reset state
      setActiveQuizId(null);
      setAttemptId(null);
      setDeadline(null);
      setAnswers({});
      setActiveTab('attempts'); // Send them to see their results

    } catch (err) {
      console.error("Submit error:", err);
      toast.error(err?.data?.message || "Failed to submit quiz.");
    }
  };

  /* =========================================
     ACTIVE QUIZ UI
     ========================================= */
  if (activeQuizId) {
    if (isQuizLoading) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-yellow-500" />
          <p className="text-[12px] text-zinc-400">Loading quiz...</p>
        </div>
      );
    }

    if (!activeQuiz) return null;

    return (
      <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-zinc-950 animate-in fade-in">
        {/* Sticky Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-[14px] font-semibold text-white md:text-[15px]">
              {activeQuiz.title}
            </h1>
            <p className="mt-0.5 truncate text-[10.5px] text-zinc-400">
              {activeQuiz.course?.code} <span className="mx-1 text-zinc-600">•</span> {activeQuiz.questions.length} Qs <span className="mx-1 text-zinc-600">•</span> {activeQuiz.totalMarks} Marks
            </p>
          </div>
          
          {deadline && (
            <div className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[13px] font-bold ${
              timeLeft === '00:00' ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800 text-yellow-500'
            }`}>
              <Timer className="h-3.5 w-3.5" strokeWidth={2} /> {timeLeft}
            </div>
          )}
        </header>

        {/* Questions Scroll Area */}
        <main className="flex-1 overflow-y-auto p-3 custom-scrollbar md:p-6">
          <div className="mx-auto max-w-2xl space-y-3 pb-24">
            {activeQuiz.questions.map((q, index) => (
              <div key={q.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 md:p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="text-[13px] font-medium leading-snug text-white md:text-[13.5px]">
                    <span className="mr-1.5 font-bold text-yellow-500">{index + 1}.</span> {q.question}
                  </h3>
                  <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                    {q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}
                  </span>
                </div>

                {q.type === 'mcq' ? (
                  <div className="mt-2 space-y-1.5">
                    {q.options.map((opt, i) => (
                      <label 
                        key={i} 
                        className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 transition-all ${
                          answers[q.id] === opt 
                            ? 'border-yellow-500/50 bg-yellow-500/10' 
                            : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name={`q_${q.id}`} 
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={() => handleAnswerChange(q.id, opt)}
                          className="h-3.5 w-3.5 border-zinc-700 bg-zinc-900 text-yellow-500 focus:ring-yellow-500 focus:ring-offset-zinc-900"
                        />
                        <span className={`text-[12px] ${answers[q.id] === opt ? 'font-medium text-white' : 'text-zinc-300'}`}>
                          {opt}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    rows="3"
                    placeholder="Type your answer here..."
                    value={answers[q.id] || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-[12px] text-white focus:border-yellow-500/50 focus:outline-none"
                  />
                )}
              </div>
            ))}
          </div>
        </main>

        {/* Sticky Footer */}
        <footer className="shrink-0 border-t border-zinc-800 bg-zinc-900 p-3">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <p className="hidden text-[11px] text-zinc-500 sm:block">
              Answered {Object.keys(answers).length} of {activeQuiz.questions.length}
            </p>
            <button 
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || timeLeft === '00:00'}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-yellow-500 px-6 py-2 text-[12px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400 disabled:opacity-50 sm:w-auto"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          </div>
        </footer>
      </div>
    );
  }

  /* =========================================
     DASHBOARD UI (TABS)
     ========================================= */
  return (
    <div className="-mx-4 min-h-screen bg-zinc-950 px-4 pb-8 pt-4 animate-in fade-in duration-500 md:mx-0 md:bg-transparent md:px-0 md:pt-0">
      <div className="mx-auto max-w-5xl space-y-4 md:space-y-5">
        
        {/* HEADER */}
        <div>
          <h1 className="flex items-center gap-2 text-xl font-serif tracking-tight text-white md:text-2xl">
            <Award className="h-5 w-5 text-yellow-500 md:h-6 md:w-6" strokeWidth={2} />
            Quizzes
          </h1>
          <p className="mt-0.5 text-[11.5px] text-zinc-500">
            Test your knowledge with quizzes created by your lecturers and course reps.
          </p>
        </div>

        {/* TABS */}
        <div className="flex w-full max-w-[280px] rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
          <button
            onClick={() => setActiveTab('available')}
            className={`flex-1 rounded py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'available' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Available
          </button>
          <button
            onClick={() => setActiveTab('attempts')}
            className={`flex-1 rounded py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'attempts' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            My Attempts
          </button>
        </div>

        {/* TAB 1: AVAILABLE QUIZZES */}
        {activeTab === 'available' && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {isQuizzesLoading ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="h-44 w-full" />)
            ) : quizzes.length === 0 ? (
              <div className="col-span-full rounded-xl border border-dashed border-zinc-800 p-8 text-center">
                <BookOpen className="mx-auto mb-2.5 h-8 w-8 text-zinc-700" strokeWidth={1.5} />
                <h3 className="text-[13px] font-medium text-white">No quizzes available</h3>
                <p className="mt-0.5 text-[11px] text-zinc-500">Check back later when your lecturers publish new quizzes.</p>
              </div>
            ) : (
              quizzes.map((quiz) => (
                <div key={quiz.id} className="flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700">
                  <div className="flex-1 p-3.5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-300">
                        {quiz.course?.code || 'General'}
                      </span>
                      <span className="text-[9.5px] font-bold uppercase tracking-wider text-yellow-500">
                        {quiz.totalMarks} Marks
                      </span>
                    </div>
                    <h3 className="mb-1 line-clamp-1 text-[13px] font-semibold text-white">
                      {quiz.title}
                    </h3>
                    <p className="line-clamp-2 text-[11px] text-zinc-400">
                      {quiz.description || 'No description provided.'}
                    </p>
                    
                    <div className="mt-3 flex items-center gap-3 text-[10.5px] text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" strokeWidth={2} /> 
                        {quiz.durationMinutes ? `${quiz.durationMinutes}m` : 'No limit'}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" strokeWidth={2} /> 
                        {quiz.questions.length} Qs
                      </span>
                    </div>
                  </div>
                  
                  <div className="border-t border-zinc-800 bg-zinc-950/50 p-2.5">
                    <button 
                      onClick={() => handleStartQuiz(quiz.id)}
                      disabled={isStarting}
                      className="flex w-full items-center justify-center gap-1.5 rounded-md bg-zinc-100 py-2 text-[10.5px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-white disabled:opacity-50"
                    >
                      {isStarting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" strokeWidth={2.2} />}
                      {isStarting ? 'Starting...' : 'Start Quiz'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: MY ATTEMPTS */}
        {activeTab === 'attempts' && (
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
            {isAttemptsLoading ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : attempts.length === 0 ? (
              <div className="p-8 text-center">
                <AlertCircle className="mx-auto mb-2.5 h-8 w-8 text-zinc-700" strokeWidth={1.5} />
                <h3 className="text-[13px] font-medium text-white">No attempts yet</h3>
                <p className="mt-0.5 text-[11px] text-zinc-500">Take a quiz to see your results here.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {attempts.map((attempt) => {
                  const isGraded = attempt.status === 'graded';
                  const isSubmitted = attempt.status === 'submitted';
                  
                  return (
                    <div key={attempt.id} className="flex flex-col justify-between gap-2 p-3 transition-colors hover:bg-zinc-800/30 sm:flex-row sm:items-center">
                      <div className="min-w-0">
                        <h3 className="truncate text-[12px] font-medium text-white">
                          {attempt.quiz?.title || 'Unknown Quiz'}
                        </h3>
                        <p className="mt-0.5 truncate text-[10px] text-zinc-500">
                          {attempt.quiz?.course?.code} <span className="mx-0.5">•</span> Submitted {new Date(attempt.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex shrink-0 items-center gap-3">
                        {isGraded ? (
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-[12px] font-bold text-white">{attempt.score} / {attempt.totalMarks}</p>
                              <p className="text-[9px] uppercase tracking-wider text-zinc-500">Score</p>
                            </div>
                            <div className={`flex h-7 w-7 items-center justify-center rounded-full ${
                              (attempt.score / attempt.totalMarks) >= 0.5 
                                ? 'bg-emerald-500/10 text-emerald-400' 
                                : 'bg-red-500/10 text-red-500'
                            }`}>
                              {(attempt.score / attempt.totalMarks) >= 0.5 
                                ? <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.2} /> 
                                : <XCircle className="h-3.5 w-3.5" strokeWidth={2.2} />}
                            </div>
                          </div>
                        ) : isSubmitted ? (
                          <div className="flex items-center gap-1.5 rounded bg-yellow-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-yellow-500">
                            <Clock className="h-3 w-3" strokeWidth={2.2} /> Pending
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 rounded bg-zinc-800 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.2} /> In Progress
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default Quizzes;