// src/pages/Quizzes.jsx
import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Clock, 
  Award, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Timer,
  ChevronLeft,
  BookOpen,
  Loader2
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { 
  useListQuizzesQuery, 
  useGetQuizQuery,
  useStartAttemptMutation, 
  useSubmitAttemptMutation,
  useListMyAttemptsQuery
} from '../features/studyApiSlice';

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-zinc-800 rounded-lg ${className}`}></div>
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
        <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-yellow-500 animate-spin mb-4" />
          <p className="text-zinc-400">Loading quiz...</p>
        </div>
      );
    }

    if (!activeQuiz) return null;

    return (
      <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col overflow-hidden">
        {/* Sticky Header */}
        <header className="shrink-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-serif text-white">{activeQuiz.title}</h1>
            <p className="text-xs text-zinc-400">{activeQuiz.course?.code} • {activeQuiz.questions.length} Questions • {activeQuiz.totalMarks} Marks</p>
          </div>
          
          {deadline && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-lg ${timeLeft === '00:00' ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800 text-yellow-500'}`}>
              <Timer className="w-5 h-5" /> {timeLeft}
            </div>
          )}
        </header>

        {/* Questions Scroll Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-8 pb-32">
            {activeQuiz.questions.map((q, index) => (
              <div key={q.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h3 className="text-base text-white font-medium">
                    <span className="text-yellow-500 mr-2">{index + 1}.</span> {q.question}
                  </h3>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 px-2 py-1 rounded">
                    {q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}
                  </span>
                </div>

                {q.type === 'mcq' ? (
                  <div className="space-y-2 mt-4">
                    {q.options.map((opt, i) => (
                      <label 
                        key={i} 
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          answers[q.id] === opt 
                            ? 'bg-yellow-500/10 border-yellow-500/50' 
                            : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name={`q_${q.id}`} 
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={() => handleAnswerChange(q.id, opt)}
                          className="w-4 h-4 text-yellow-500 bg-zinc-900 border-zinc-700 focus:ring-yellow-500 focus:ring-offset-zinc-900"
                        />
                        <span className={`text-sm ${answers[q.id] === opt ? 'text-white' : 'text-zinc-300'}`}>{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    rows="4"
                    placeholder="Type your answer here..."
                    value={answers[q.id] || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-xl p-4 focus:border-yellow-500/50 focus:outline-none resize-none"
                  />
                )}
              </div>
            ))}
          </div>
        </main>

        {/* Sticky Footer */}
        <footer className="shrink-0 bg-zinc-900 border-t border-zinc-800 p-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <p className="text-xs text-zinc-500 hidden sm:block">
              Answered {Object.keys(answers).length} of {activeQuiz.questions.length}
            </p>
            <button 
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || timeLeft === '00:00'}
              className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-400 text-zinc-950 px-8 py-3 rounded-xl font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
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
    <div className="space-y-6 pb-24 animate-in fade-in duration-500 max-w-6xl mx-auto">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl md:text-3xl font-serif text-white tracking-tight flex items-center gap-3">
          <Award className="w-7 h-7 text-yellow-500" strokeWidth={1.5} />
          Quizzes
        </h1>
        <p className="text-zinc-400 text-sm mt-1">Test your knowledge with quizzes created by your lecturers and course reps.</p>
      </div>

      {/* TABS */}
      <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-full max-w-md">
        <button
          onClick={() => setActiveTab('available')}
          className={`flex-1 py-2.5 text-sm font-bold uppercase tracking-wider rounded-lg transition-colors ${
            activeTab === 'available' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Available Quizzes
        </button>
        <button
          onClick={() => setActiveTab('attempts')}
          className={`flex-1 py-2.5 text-sm font-bold uppercase tracking-wider rounded-lg transition-colors ${
            activeTab === 'attempts' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          My Attempts
        </button>
      </div>

      {/* TAB 1: AVAILABLE QUIZZES */}
      {activeTab === 'available' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isQuizzesLoading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full" />)
          ) : quizzes.length === 0 ? (
            <div className="col-span-full bg-zinc-900 border border-zinc-800 border-dashed rounded-2xl p-12 text-center">
              <BookOpen className="w-12 h-12 text-zinc-700 mx-auto mb-4" strokeWidth={1} />
              <h3 className="text-lg font-medium text-white mb-1">No quizzes available</h3>
              <p className="text-zinc-500 text-sm">Check back later when your lecturers publish new quizzes.</p>
            </div>
          ) : (
            quizzes.map((quiz) => (
              <div key={quiz.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col hover:border-zinc-700 transition-colors">
                <div className="p-5 flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                      {quiz.course?.code || 'General'}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-500">
                      {quiz.totalMarks} Marks
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white leading-tight mb-2">{quiz.title}</h3>
                  <p className="text-xs text-zinc-400 line-clamp-2">{quiz.description || 'No description provided.'}</p>
                  
                  <div className="flex items-center gap-4 mt-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {quiz.durationMinutes ? `${quiz.durationMinutes} mins` : 'No limit'}</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {quiz.questions.length} Questions</span>
                  </div>
                </div>
                
                <div className="p-4 bg-zinc-950/50 border-t border-zinc-800">
                  <button 
                    onClick={() => handleStartQuiz(quiz.id)}
                    disabled={isStarting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                  >
                    {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {isAttemptsLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : attempts.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-zinc-700 mx-auto mb-4" strokeWidth={1} />
              <h3 className="text-lg font-medium text-white mb-1">No attempts yet</h3>
              <p className="text-zinc-500 text-sm">Take a quiz to see your results here.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {attempts.map((attempt) => {
                const isGraded = attempt.status === 'graded';
                const isSubmitted = attempt.status === 'submitted';
                
                return (
                  <div key={attempt.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-800/20 transition-colors">
                    <div>
                      <h3 className="text-sm font-bold text-white">{attempt.quiz?.title || 'Unknown Quiz'}</h3>
                      <p className="text-xs text-zinc-400 mt-1">
                        {attempt.quiz?.course?.code} • Submitted {new Date(attempt.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {isGraded ? (
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-bold text-white">{attempt.score} / {attempt.totalMarks}</p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Score</p>
                          </div>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            (attempt.score / attempt.totalMarks) >= 0.5 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                          }`}>
                            {(attempt.score / attempt.totalMarks) >= 0.5 ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                          </div>
                        </div>
                      ) : isSubmitted ? (
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-yellow-500 bg-yellow-500/10 px-3 py-1.5 rounded-lg">
                          <Clock className="w-4 h-4" /> Pending Grading
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 bg-zinc-800 px-3 py-1.5 rounded-lg">
                          <Loader2 className="w-4 h-4 animate-spin" /> In Progress
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
  );
};

export default Quizzes;