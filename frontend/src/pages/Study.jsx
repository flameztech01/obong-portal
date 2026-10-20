// src/pages/Study.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Search, 
  FileText, 
  Presentation, 
  HelpCircle,
  Book,
  Download,
  Bot,
  MessageSquare,
  X,
  Loader2,
  Send,
  Sparkles,
  Play,
  Clock,
  Award,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Timer
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { 
  useListMaterialsQuery, 
  useListQuizzesQuery,
  useGetQuizQuery,
  useStartAttemptMutation, 
  useSubmitAttemptMutation,
  useListMyAttemptsQuery
} from '../features/studyApiSlice';
import { 
  useSummarizeMaterialMutation, 
  useChatWithMaterialMutation 
} from '../features/aiApiSlice';

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-zinc-800 rounded-lg ${className}`}></div>
);

/* =========================================
   AI SUMMARY MODAL
   ========================================= */
const SummaryModal = ({ isOpen, onClose, material, summary, isLoading }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500/10 p-2 rounded-lg text-yellow-500"><Sparkles className="w-5 h-5" /></div>
            <div>
              <h2 className="text-lg font-serif text-white tracking-tight">AI Summary</h2>
              <p className="text-xs text-zinc-400">{material?.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mb-4" />
              <p className="text-zinc-400 text-sm">AI is reading and summarizing the document...</p>
            </div>
          ) : summary ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider mb-2">Overview</h3>
                <p className="text-sm text-zinc-300 leading-relaxed">{summary.summary}</p>
              </div>
              {summary.keyPoints?.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-yellow-500 uppercase tracking-wider mb-2">Key Points</h3>
                  <ul className="space-y-2">
                    {summary.keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-300"><span className="text-yellow-500 mt-0.5">•</span> {point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-red-400 text-sm">Failed to generate summary.</p>
          )}
        </div>
      </div>
    </div>
  );
};

/* =========================================
   AI CHAT MODAL
   ========================================= */
const ChatModal = ({ isOpen, onClose, material }) => {
  const [chatWithAI, { isLoading }] = useChatWithMaterialMutation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setMessages([{ role: 'assistant', content: `Hi! I've read "${material?.title}". Ask me anything about it.` }]);
      setInput('');
    }
  }, [isOpen, material]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await chatWithAI({ materialId: material.id, message: userMsg, history }).unwrap();
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg h-[80vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-950/30">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500/10 p-1.5 rounded-lg text-yellow-500"><Bot className="w-5 h-5" /></div>
            <div>
              <h2 className="text-sm font-bold text-white">Study AI</h2>
              <p className="text-[10px] text-zinc-400 truncate max-w-[200px]">{material?.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'bg-yellow-500 text-zinc-950 rounded-br-sm' : 'bg-zinc-800 text-zinc-200 rounded-bl-sm'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" /><span className="text-xs text-zinc-400">Thinking...</span>
              </div>
            </div>
          )}
        </div>
        <form onSubmit={handleSend} className="p-3 border-t border-zinc-800 bg-zinc-950/30 shrink-0">
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-1 focus-within:border-yellow-500/50 transition-colors">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about this document..." className="flex-1 bg-transparent text-white text-sm px-3 py-2 focus:outline-none placeholder:text-zinc-600" />
            <button type="submit" disabled={!input.trim() || isLoading} className="p-2 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 rounded-lg transition-colors disabled:opacity-50">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================
   MAIN STUDY HUB COMPONENT
   ========================================= */
const Study = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('materials'); // 'materials' | 'quizzes'
  
  // Quiz Taking State
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [deadline, setDeadline] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);

  // Material State
  const [search, setSearch] = useState('');
  const [summaryMaterial, setSummaryMaterial] = useState(null);
  const [chatMaterial, setChatMaterial] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);

  // API Hooks
  const { data: materialsData, isLoading: isMaterialsLoading } = useListMaterialsQuery({ search }, { skip: activeQuizId });
  const { data: quizzesData, isLoading: isQuizzesLoading } = useListQuizzesQuery(undefined, { skip: activeQuizId });
  const { data: quizData, isLoading: isQuizLoading } = useGetQuizQuery(activeQuizId, { skip: !activeQuizId });
  const { data: attemptsData, isLoading: isAttemptsLoading } = useListMyAttemptsQuery(undefined, { skip: activeQuizId });
  
  const [summarize, { isLoading: isSummarizing }] = useSummarizeMaterialMutation();
  const [startAttempt, { isLoading: isStarting }] = useStartAttemptMutation();
  const [submitAttempt, { isLoading: isSubmitting }] = useSubmitAttemptMutation();

  const materials = materialsData?.materials || [];
  const quizzes = quizzesData?.quizzes || [];
  const attempts = attemptsData?.attempts || [];
  const activeQuiz = quizData?.quiz;

  // Timer logic
  useEffect(() => {
    if (!deadline) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(deadline).getTime() - now;
      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft("00:00");
        toast.error("Time is up! Auto-submitting...");
        handleSubmitQuiz(true);
      } else {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  const handleSummarize = async (material) => {
    setSummaryMaterial(material);
    setAiSummary(null);
    try {
      const res = await summarize({ materialId: material.id }).unwrap();
      setAiSummary(res.summary);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to generate summary");
      setSummaryMaterial(null);
    }
  };

  const handleStartQuiz = async (quizId) => {
    try {
      const res = await startAttempt(quizId).unwrap();
      toast.success(res.message === "Resuming your attempt" ? "Resuming quiz..." : "Quiz started!");
      setActiveQuizId(quizId);
      setDeadline(res.attempt.deadlineAt);
      const initialAnswers = {};
      res.attempt.answers?.forEach(a => { if (a.answer) initialAnswers[a.questionId] = a.answer; });
      setAnswers(initialAnswers);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to start quiz");
    }
  };

  const handleSubmitQuiz = async (isAuto = false) => {
    if (!isAuto && !window.confirm("Submit quiz? You cannot change answers after.")) return;
    try {
      const payloadAnswers = Object.entries(answers).map(([qId, val]) => ({ questionId: qId, answer: val }));
      await submitAttempt({ quizId: activeQuizId, answers: payloadAnswers }).unwrap();
      toast.success(isAuto ? "Quiz auto-submitted." : "Quiz submitted successfully!");
      setActiveQuizId(null);
      setDeadline(null);
      setAnswers({});
      setActiveTab('quizzes'); // Return to quizzes tab
    } catch (err) {
      toast.error(err?.data?.message || "Failed to submit quiz.");
    }
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'slide': return <Presentation className="w-5 h-5" />;
      case 'past_question': return <HelpCircle className="w-5 h-5" />;
      case 'textbook': return <Book className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  /* =========================================
     ACTIVE QUIZ FULL SCREEN UI
     ========================================= */
  if (activeQuizId) {
    if (isQuizLoading) return <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col items-center justify-center"><Loader2 className="w-10 h-10 text-yellow-500 animate-spin mb-4" /><p className="text-zinc-400">Loading quiz...</p></div>;
    if (!activeQuiz) return null;

    return (
      <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col overflow-hidden">
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

        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-8 pb-32">
            {activeQuiz.questions.map((q, index) => (
              <div key={q.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h3 className="text-base text-white font-medium"><span className="text-yellow-500 mr-2">{index + 1}.</span> {q.question}</h3>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 px-2 py-1 rounded">{q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}</span>
                </div>
                {q.type === 'mcq' ? (
                  <div className="space-y-2 mt-4">
                    {q.options.map((opt, i) => (
                      <label key={i} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${answers[q.id] === opt ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
                        <input type="radio" name={`q_${q.id}`} value={opt} checked={answers[q.id] === opt} onChange={() => setAnswers(prev => ({...prev, [q.id]: opt}))} className="w-4 h-4 text-yellow-500 bg-zinc-900 border-zinc-700 focus:ring-yellow-500 focus:ring-offset-zinc-900" />
                        <span className={`text-sm ${answers[q.id] === opt ? 'text-white' : 'text-zinc-300'}`}>{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea rows="4" placeholder="Type your answer here..." value={answers[q.id] || ''} onChange={(e) => setAnswers(prev => ({...prev, [q.id]: e.target.value}))} className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-xl p-4 focus:border-yellow-500/50 focus:outline-none resize-none" />
                )}
              </div>
            ))}
          </div>
        </main>

        <footer className="shrink-0 bg-zinc-900 border-t border-zinc-800 p-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <p className="text-xs text-zinc-500 hidden sm:block">Answered {Object.keys(answers).length} of {activeQuiz.questions.length}</p>
            <button onClick={() => handleSubmitQuiz(false)} disabled={isSubmitting || timeLeft === '00:00'} className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-400 text-zinc-950 px-8 py-3 rounded-xl font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          </div>
        </footer>
      </div>
    );
  }

  /* =========================================
     STUDY HUB DASHBOARD
     ========================================= */
  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500 max-w-6xl mx-auto">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl md:text-3xl font-serif text-white tracking-tight flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-yellow-500" strokeWidth={1.5} />
          Study Hub
        </h1>
        <p className="text-zinc-400 text-sm mt-1">Access materials, study with AI, and take quizzes.</p>
      </div>

      {/* TABS */}
      <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-full max-w-md">
        <button onClick={() => setActiveTab('materials')} className={`flex-1 py-2.5 text-sm font-bold uppercase tracking-wider rounded-lg transition-colors ${activeTab === 'materials' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Materials</button>
        <button onClick={() => setActiveTab('quizzes')} className={`flex-1 py-2.5 text-sm font-bold uppercase tracking-wider rounded-lg transition-colors ${activeTab === 'quizzes' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Quizzes</button>
      </div>

      {/* TAB 1: MATERIALS */}
      {activeTab === 'materials' && (
        <div className="space-y-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" strokeWidth={1.5} />
            <input type="text" placeholder="Search materials..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-lg pl-9 pr-4 py-2.5 focus:border-yellow-500/50 focus:outline-none" />
          </div>

          {isMaterialsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full" />)}</div>
          ) : materials.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-2xl p-12 text-center">
              <BookOpen className="w-12 h-12 text-zinc-700 mx-auto mb-4" strokeWidth={1} />
              <h3 className="text-lg font-medium text-white mb-1">No materials found</h3>
              <p className="text-zinc-500 text-sm">Check back later when your lecturers upload new materials.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {materials.map((material) => (
                <div key={material.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col hover:border-zinc-700 transition-colors group">
                  <div className="p-5 flex-1">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-yellow-500 transition-colors shrink-0">{getFileIcon(material.type)}</div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">{material.type.replace('_', ' ')}</span>
                    </div>
                    <h3 className="text-base font-bold text-white leading-tight mb-1 line-clamp-2">{material.title}</h3>
                    <p className="text-xs text-zinc-400 line-clamp-2">{material.description || 'No description.'}</p>
                    <div className="flex items-center gap-2 mt-4">
                      <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider bg-yellow-500/10 px-2 py-1 rounded">{material.course?.code || 'Course'}</span>
                    </div>
                  </div>
                  <div className="p-3 bg-zinc-950/50 border-t border-zinc-800 flex items-center gap-2">
                    <a href={material.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors"><Download className="w-3.5 h-3.5" /> View</a>
                    <button onClick={() => handleSummarize(material)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors"><Sparkles className="w-3.5 h-3.5" /> Summary</button>
                    <button onClick={() => setChatMaterial(material)} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"><MessageSquare className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: QUIZZES */}
      {activeTab === 'quizzes' && (
        <div className="space-y-8">
          {/* Available Quizzes */}
          <div>
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">Available Quizzes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isQuizzesLoading ? (
                [1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full" />)
              ) : quizzes.length === 0 ? (
                <div className="col-span-full bg-zinc-900 border border-zinc-800 border-dashed rounded-2xl p-8 text-center text-zinc-500 text-sm">No quizzes available right now.</div>
              ) : (
                quizzes.map((quiz) => (
                  <div key={quiz.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col hover:border-zinc-700 transition-colors">
                    <div className="p-5 flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">{quiz.course?.code}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-500">{quiz.totalMarks} Marks</span>
                      </div>
                      <h3 className="text-lg font-bold text-white leading-tight mb-2">{quiz.title}</h3>
                      <p className="text-xs text-zinc-400 line-clamp-2">{quiz.description || 'No description.'}</p>
                      <div className="flex items-center gap-4 mt-4 text-xs text-zinc-500">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {quiz.durationMinutes ? `${quiz.durationMinutes}m` : 'No limit'}</span>
                        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {quiz.questions.length} Qs</span>
                      </div>
                    </div>
                    <div className="p-4 bg-zinc-950/50 border-t border-zinc-800">
                      <button onClick={() => handleStartQuiz(quiz.id)} disabled={isStarting} className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50">
                        {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Start Quiz
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* My Attempts */}
          <div>
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">My Attempts</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              {isAttemptsLoading ? (
                <div className="p-4 space-y-4">{[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : attempts.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm">You haven't taken any quizzes yet.</div>
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  {attempts.map((attempt) => {
                    const isGraded = attempt.status === 'graded';
                    return (
                      <div key={attempt.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-bold text-white">{attempt.quiz?.title || 'Unknown Quiz'}</h3>
                          <p className="text-xs text-zinc-400 mt-1">{attempt.quiz?.course?.code} • {new Date(attempt.submittedAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          {isGraded ? (
                            <div className="flex items-center gap-3">
                              <div className="text-right"><p className="text-sm font-bold text-white">{attempt.score} / {attempt.totalMarks}</p><p className="text-[10px] text-zinc-500 uppercase tracking-wider">Score</p></div>
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${(attempt.score / attempt.totalMarks) >= 0.5 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{(attempt.score / attempt.totalMarks) >= 0.5 ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}</div>
                            </div>
                          ) : attempt.status === 'submitted' ? (
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-yellow-500 bg-yellow-500/10 px-3 py-1.5 rounded-lg"><Clock className="w-4 h-4" /> Pending</div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 bg-zinc-800 px-3 py-1.5 rounded-lg"><Loader2 className="w-4 h-4 animate-spin" /> In Progress</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <SummaryModal isOpen={!!summaryMaterial} onClose={() => setSummaryMaterial(null)} material={summaryMaterial} summary={aiSummary} isLoading={isSummarizing} />
      <ChatModal isOpen={!!chatMaterial} onClose={() => setChatMaterial(null)} material={chatMaterial} />
    </div>
  );
};

export default Study;