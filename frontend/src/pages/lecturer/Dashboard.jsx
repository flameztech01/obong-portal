// src/pages/lecturer/Dashboard.jsx
import React from 'react';
import { Link } from 'react-router';
import { 
  BookOpen, 
  FileEdit, 
  BrainCircuit, 
  UploadCloud, 
  ChevronRight,
  Users,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { useGetMeQuery } from '../../features/authApiSlice';
import { useListOfferingsQuery } from '../../features/academicApiSlice';
import { useListUploadsQuery } from '../../features/resultApiSlice';

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-zinc-800 rounded-lg ${className}`}></div>
);

const LecturerDashboard = () => {
  const { data: userData, isLoading: isUserLoading } = useGetMeQuery();
  const user = userData?.user;

  // 1. Fetch Offerings assigned to this lecturer
  const { data: offeringsData, isLoading: isOfferingsLoading } = useListOfferingsQuery(
    { lecturer: user?.id, limit: 100 },
    { skip: !user?.id }
  );
  const offerings = offeringsData?.offerings || [];

  // 2. Fetch Draft Result Uploads
  const { data: uploadsData, isLoading: isUploadsLoading } = useListUploadsQuery(
    { mine: "true", publishStatus: "draft", limit: 100 },
    { skip: !user?.id }
  );
  const draftUploads = uploadsData?.uploads || [];

  const isHod = user?.extraRoles?.includes('hod');
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  if (isUserLoading) {
    return (
      <div className="space-y-4 p-4 md:p-8 max-w-7xl mx-auto">
        <Skeleton className="h-20 w-full md:w-1/3" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500 max-w-6xl mx-auto">
      
      {/* DESKTOP HEADER */}
      <div className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-zinc-500 text-sm font-medium tracking-wide uppercase mb-1">
            {today}
          </p>
          <h1 className="text-3xl lg:text-4xl font-serif text-white tracking-tight">
            Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">{user?.name?.split(' ')[0]}</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-zinc-400 bg-zinc-900 px-4 py-2 rounded-xl border border-zinc-800">
          {isHod ? (
            <><CheckCircle2 className="w-4 h-4 text-yellow-500" /> HOD Access</>
          ) : (
            <><Users className="w-4 h-4 text-zinc-500" /> Lecturer Access</>
          )}
        </div>
      </div>

      {/* MOBILE HERO CARD */}
      <div className="md:hidden bg-zinc-900 border border-zinc-800 rounded-2xl p-4 relative overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700 overflow-hidden">
               {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-yellow-500 font-bold text-lg">{user?.name?.charAt(0).toUpperCase()}</span>
                )}
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Lecturer Profile</p>
              <h2 className="text-base font-bold text-white leading-tight truncate">{user?.name}</h2>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20 uppercase tracking-wider">
              {isHod ? 'HOD' : 'Staff'}
            </span>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        
        {/* Active Courses */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center">
              <BookOpen className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="text-zinc-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-1">Active Courses</p>
            {isOfferingsLoading ? <Skeleton className="h-8 w-16" /> : (
              <span className="text-2xl md:text-3xl font-bold text-white">{offerings.length}</span>
            )}
          </div>
        </div>

        {/* Pending Uploads */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-5 flex flex-col justify-between hover:border-yellow-500/50 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center">
              <FileEdit className="w-4 h-4" strokeWidth={1.5} />
            </div>
            {draftUploads.length > 0 && (
              <span className="text-[9px] font-bold text-zinc-950 bg-yellow-500 px-1.5 py-0.5 rounded animate-pulse">
                NEEDS REVIEW
              </span>
            )}
          </div>
          <div>
            <p className="text-zinc-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-1">Draft Results</p>
            {isUploadsLoading ? <Skeleton className="h-8 w-16" /> : (
              <span className={`text-2xl md:text-3xl font-bold ${draftUploads.length > 0 ? 'text-yellow-500' : 'text-white'}`}>
                {draftUploads.length}
              </span>
            )}
          </div>
        </div>

        {/* Quizzes Created (Placeholder for future extension) */}
        <div className="col-span-2 md:col-span-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <p className="text-zinc-500 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-1">Quizzes</p>
            <Link to="/lecturer/quizzes" className="text-sm font-bold text-yellow-500 flex items-center gap-1 hover:underline mt-1">
              Manage Quizzes <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </div>

      {/* QUICK ACTIONS */}
      <div>
        <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3 px-1">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Link to="/lecturer/results" className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 transition-colors group">
            <div className="w-10 h-10 rounded-full bg-zinc-950 flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">Upload Results</span>
          </Link>
          
          <Link to="/lecturer/materials" className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 transition-colors group">
            <div className="w-10 h-10 rounded-full bg-zinc-950 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">Add Materials</span>
          </Link>

          <Link to="/lecturer/quizzes" className="col-span-2 md:col-span-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 transition-colors group">
            <div className="w-10 h-10 rounded-full bg-zinc-950 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <BrainCircuit className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">Create Quiz</span>
          </Link>
        </div>
      </div>

      {/* ASSIGNED COURSES LIST */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">My Assigned Courses</h2>
        </div>
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {isOfferingsLoading ? (
             <div className="p-4 space-y-4">
               {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
             </div>
          ) : offerings.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">
              You have not been assigned to any course offerings yet. Contact the Admin.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {offerings.map((offering) => (
                <div key={offering.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-800/20 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm font-bold text-white">{offering.course?.code || 'Unknown Course'}</p>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                        {offering.level}L
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">{offering.course?.title}</p>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {offering.session?.name || 'Current Session'}
                    </span>
                    <span className="capitalize">{offering.semester} Sem</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default LecturerDashboard;