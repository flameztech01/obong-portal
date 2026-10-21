// src/pages/Study.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Search, FileText, Presentation, HelpCircle, Book,
  Download, Bot, MessageSquare, X, Loader2, Send, Sparkles,
  Play, Clock, CheckCircle2, XCircle, Timer
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { 
  useListMaterialsQuery, useListQuizzesQuery, useGetQuizQuery,
  useStartAttemptMutation, useSubmitAttemptMutation, useListMyAttemptsQuery
} from '../features/studyApiSlice';
import { 
  useSummarizeMaterialMutation, useChatWithMaterialMutation 
} from '../features/aiApiSlice';

const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-zinc-800 ${className}`} />
);

/* =========================================
   AI SUMMARY MODAL
   ========================================= */
const SummaryModal = ({ isOpen, onClose, material, summary, isLoading }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Mobile: Bottom Sheet */}
      <div className="md:hidden absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-zinc-800 bg-zinc-900 animate-in slide-in-from-bottom duration-300">
        <div className="flex shrink-0 justify-center pb-1.5 pt-2.5">
          <div className="h-1 w-9 rounded-full bg-zinc-700" />
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-4 pb-3">
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-yellow-500" strokeWidth={2.2} />
            <div className="min-w-0">
              <h3 className="truncate text-[14px] font-semibold text-white">AI Summary</h3>
              <p className="truncate text-[10.5px] text-zinc-500">{material?.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-zinc-400">
            <X className="h-3.5 w-3.5" strokeWidth={2.2} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="mb-3 h-7 w-7 animate-spin text-yellow-500" />
              <p className="text-[11.5px] text-zinc-400">AI is reading and summarizing...</p>
            </div>
          ) : summary ? (
            <div className="space-y-4">
              <div>
                <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-yellow-500">Overview</h3>
                <p className="text-[12.5px] leading-relaxed text-zinc-300">{summary.summary}</p>
              </div>
              {summary.keyPoints?.length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-yellow-500">Key Points</h3>
                  <ul className="space-y-1.5">
                    {summary.keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12.5px] text-zinc-300">
                        <span className="mt-0.5 text-yellow-500">•</span> {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="py-6 text-center text-[12px] text-red-400">Failed to generate summary.</p>
          )}
        </div>
      </div>

      {/* Desktop: Centered Dialog */}
      <div className="hidden md:flex absolute inset-0 items-center justify-center p-4" onClick={onClose}>
        <div className="flex max-h-[80vh] w-full max-w-xl flex-col rounded-2xl border border-zinc-800 bg-zinc-900 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-yellow-500/10 text-yellow-500">
                <Sparkles className="h-4 w-4" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-[14px] font-semibold text-white">AI Summary</h2>
                <p className="truncate text-[10.5px] text-zinc-500">{material?.title}</p>
              </div>
            </div>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800 text-zinc-400 hover:text-white">
              <X className="h-3.5 w-3.5" strokeWidth={2.2} />
            </button>
          </div>
          <div className="overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-yellow-500" />
                <p className="text-[12px] text-zinc-400">AI is reading and summarizing the document...</p>
              </div>
            ) : summary ? (
              <div className="space-y-5">
                <div>
                  <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-yellow-500">Overview</h3>
                  <p className="text-[12.5px] leading-relaxed text-zinc-300">{summary.summary}</p>
                </div>
                {summary.keyPoints?.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-yellow-500">Key Points</h3>
                    <ul className="space-y-2">
                      {summary.keyPoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12.5px] text-zinc-300">
                          <span className="mt-0.5 text-yellow-500">•</span> {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="py-6 text-center text-[12.5px] text-red-400">Failed to generate summary.</p>
            )}
          </div>
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
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
    }
  };

  const ChatUI = () => (
    <>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950/30 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-yellow-500/10 text-yellow-500">
            <Bot className="h-4 w-4" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold text-white">Study AI</h2>
            <p className="truncate text-[10px] text-zinc-500 max-w-[180px]">{material?.title}</p>
          </div>
        </div>
        <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800 text-zinc-400 hover:text-white">
          <X className="h-3.5 w-3.5" strokeWidth={2.2} />
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3.5 py-2 text-[12px] ${
              msg.role === 'user' ? 'bg-yellow-500 text-zinc-950 rounded-br-sm' : 'bg-zinc-800 text-zinc-200 rounded-bl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-xl rounded-bl-sm bg-zinc-800 px-3.5 py-2.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-500" />
              <span className="text-[11px] text-zinc-400">Thinking...</span>
            </div>
          </div>
        )}
      </div>
      <form onSubmit={handleSend} className="shrink-0 border-t border-zinc-800 bg-zinc-950/30 p-2.5">
        <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 p-1 focus-within:border-yellow-500/50 transition-colors">
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Ask about this document..." 
            className="flex-1 bg-transparent px-2 py-1.5 text-[12px] text-white focus:outline-none placeholder:text-zinc-600" 
          />
          <button type="submit" disabled={!input.trim() || isLoading} className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-yellow-500 text-zinc-950 disabled:opacity-50">
            <Send className="h-3.5 w-3.5" strokeWidth={2.2} />
          </button>
        </div>
      </form>
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      {/* Mobile: Bottom Sheet */}
      <div className="relative z-10 flex h-[85dvh] w-full flex-col rounded-t-2xl border-t border-zinc-800 bg-zinc-900 animate-in slide-in-from-bottom duration-300 sm:hidden">
        <div className="flex shrink-0 justify-center pb-1.5 pt-2.5">
          <div className="h-1 w-9 rounded-full bg-zinc-700" />
        </div>
        <ChatUI />
      </div>

      {/* Desktop: Centered */}
      <div className="relative z-10 hidden h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 animate-in zoom-in-95 duration-200 sm:flex">
        <ChatUI />
      </div>
    </div>
  );
};

/* =========================================
   MAIN STUDY HUB COMPONENT
   ========================================= */
const Study = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('materials'); 
  
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [deadline, setDeadline] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);

  const [search, setSearch] = useState('');
  const [summaryMaterial, setSummaryMaterial] = useState(null);
  const [chatMaterial, setChatMaterial] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);

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
      setActiveTab('quizzes');
    } catch (err) {
      toast.error(err?.data?.message || "Failed to submit quiz.");
    }
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'slide': return <Presentation className="h-4 w-4" strokeWidth={2} />;
      case 'past_question': return <HelpCircle className="h-4 w-4" strokeWidth={2} />;
      case 'textbook': return <Book className="h-4 w-4" strokeWidth={2} />;
      default: return <FileText className="h-4 w-4" strokeWidth={2} />;
    }
  };

  /* =========================================
     ACTIVE QUIZ FULL SCREEN UI
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
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-[14px] font-semibold text-white md:text-[15px]">{activeQuiz.title}</h1>
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
                      <label key={i} className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 transition-all ${
                        answers[q.id] === opt 
                          ? 'border-yellow-500/50 bg-yellow-500/10' 
                          : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                      }`}>
                        <input 
                          type="radio" 
                          name={`q_${q.id}`} 
                          value={opt} 
                          checked={answers[q.id] === opt} 
                          onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))} 
                          className="h-3.5 w-3.5 border-zinc-700 bg-zinc-900 text-yellow-500 focus:ring-yellow-500 focus:ring-offset-zinc-900" 
                        />
                        <span className={`text-[12px] ${answers[q.id] === opt ? 'font-medium text-white' : 'text-zinc-300'}`}>{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea 
                    rows="3" 
                    placeholder="Type your answer here..." 
                    value={answers[q.id] || ''} 
                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))} 
                    className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-[12px] text-white focus:border-yellow-500/50 focus:outline-none" 
                  />
                )}
              </div>
            ))}
          </div>
        </main>

        <footer className="shrink-0 border-t border-zinc-800 bg-zinc-900 p-3">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <p className="hidden text-[11px] text-zinc-500 sm:block">
              Answered {Object.keys(answers).length} of {activeQuiz.questions.length}
            </p>
            <button 
              onClick={() => handleSubmitQuiz(false)} 
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
     STUDY HUB DASHBOARD
     ========================================= */
  return (
    <div className="-mx-4 min-h-screen bg-zinc-950 px-4 pb-8 pt-4 animate-in fade-in duration-500 md:mx-0 md:bg-transparent md:px-0 md:pt-0">
      <div className="mx-auto max-w-5xl space-y-4 md:space-y-5">
        
        {/* HEADER */}
        <div>
          <h1 className="flex items-center gap-2 text-xl font-serif tracking-tight text-white md:text-2xl">
            <BookOpen className="h-5 w-5 text-yellow-500 md:h-6 md:w-6" strokeWidth={2} />
            Study Hub
          </h1>
          <p className="mt-0.5 text-[11.5px] text-zinc-500">
            Access materials, study with AI, and take quizzes.
          </p>
        </div>

        {/* TABS */}
        <div className="flex w-full max-w-[260px] rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
          <button 
            onClick={() => setActiveTab('materials')} 
            className={`flex-1 rounded py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'materials' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Materials
          </button>
          <button 
            onClick={() => setActiveTab('quizzes')} 
            className={`flex-1 rounded py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'quizzes' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Quizzes
          </button>
        </div>

        {/* TAB 1: MATERIALS */}
        {activeTab === 'materials' && (
          <div className="space-y-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" strokeWidth={2} />
              <input 
                type="text" 
                placeholder="Search materials..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 py-1.5 pl-8 pr-3 text-[12px] text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30" 
              />
            </div>

            {isMaterialsLoading ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
              </div>
            ) : materials.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
                <BookOpen className="mx-auto mb-2.5 h-8 w-8 text-zinc-700" strokeWidth={1.5} />
                <h3 className="text-[13px] font-medium text-white">No materials found</h3>
                <p className="mt-0.5 text-[11px] text-zinc-500">Check back later when your lecturers upload new materials.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {materials.map((material) => (
                  <div key={material.id} className="group flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700">
                    <div className="flex-1 p-3.5">
                      <div className="mb-2.5 flex items-start justify-between gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 transition-colors group-hover:text-yellow-500">
                          {getFileIcon(material.type)}
                        </div>
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                          {material.type.replace('_', ' ')}
                        </span>
                      </div>
                      <h3 className="mb-1 line-clamp-2 text-[13px] font-semibold leading-snug text-white">
                        {material.title}
                      </h3>
                      <p className="line-clamp-2 text-[11px] text-zinc-400">
                        {material.description || 'No description.'}
                      </p>
                      <div className="mt-3">
                        <span className="rounded bg-yellow-500/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-yellow-500">
                          {material.course?.code || 'Course'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 border-t border-zinc-800 bg-zinc-950/50 p-2">
                      <a 
                        href={material.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-zinc-800 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-zinc-700"
                      >
                        <Download className="h-3 w-3" strokeWidth={2.2} /> View
                      </a>
                      <button 
                        onClick={() => handleSummarize(material)} 
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-yellow-500 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-950 transition-colors hover:bg-yellow-400"
                      >
                        <Sparkles className="h-3 w-3" strokeWidth={2.2} /> Summary
                      </button>
                      <button 
                        onClick={() => setChatMaterial(material)} 
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-zinc-300 transition-colors hover:bg-zinc-700"
                      >
                        <MessageSquare className="h-3.5 w-3.5" strokeWidth={2.2} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: QUIZZES */}
        {activeTab === 'quizzes' && (
          <div className="space-y-5">
            {/* Available Quizzes */}
            <div className="space-y-2.5">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Available Quizzes</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {isQuizzesLoading ? (
                  [1, 2, 3].map(i => <Skeleton key={i} className="h-44 w-full" />)
                ) : quizzes.length === 0 ? (
                  <div className="col-span-full rounded-xl border border-dashed border-zinc-800 p-6 text-center text-[11.5px] text-zinc-500">
                    No quizzes available right now.
                  </div>
                ) : (
                  quizzes.map((quiz) => (
                    <div key={quiz.id} className="flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700">
                      <div className="flex-1 p-3.5">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-300">
                            {quiz.course?.code}
                          </span>
                          <span className="text-[9.5px] font-bold uppercase tracking-wider text-yellow-500">
                            {quiz.totalMarks} Marks
                          </span>
                        </div>
                        <h3 className="mb-1 line-clamp-1 text-[13px] font-semibold text-white">
                          {quiz.title}
                        </h3>
                        <p className="line-clamp-2 text-[11px] text-zinc-400">
                          {quiz.description || 'No description.'}
                        </p>
                        <div className="mt-3 flex items-center gap-3 text-[10.5px] text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" strokeWidth={2} /> {quiz.durationMinutes ? `${quiz.durationMinutes}m` : 'No limit'}
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" strokeWidth={2} /> {quiz.questions.length} Qs
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
                          Start Quiz
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* My Attempts */}
            <div className="space-y-2.5">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">My Attempts</h2>
              <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                {isAttemptsLoading ? (
                  <div className="space-y-2 p-3">
                    {[1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : attempts.length === 0 ? (
                  <div className="p-6 text-center text-[11.5px] text-zinc-500">
                    You haven't taken any quizzes yet.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/60">
                    {attempts.map((attempt) => {
                      const isGraded = attempt.status === 'graded';
                      return (
                        <div key={attempt.id} className="flex flex-col justify-between gap-2 p-3 sm:flex-row sm:items-center">
                          <div className="min-w-0">
                            <h3 className="truncate text-[12px] font-medium text-white">
                              {attempt.quiz?.title || 'Unknown Quiz'}
                            </h3>
                            <p className="mt-0.5 truncate text-[10px] text-zinc-500">
                              {attempt.quiz?.course?.code} <span className="mx-0.5">•</span> {new Date(attempt.submittedAt).toLocaleDateString()}
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
                            ) : attempt.status === 'submitted' ? (
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
            </div>
          </div>
        )}

      </div>

      <SummaryModal 
        isOpen={!!summaryMaterial} 
        onClose={() => setSummaryMaterial(null)} 
        material={summaryMaterial} 
        summary={aiSummary} 
        isLoading={isSummarizing} 
      />
      <ChatModal 
        isOpen={!!chatMaterial} 
        onClose={() => setChatMaterial(null)} 
        material={chatMaterial} 
      />
    </div>
  );
};

export default Study;