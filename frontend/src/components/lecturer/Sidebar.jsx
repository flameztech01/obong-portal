// src/components/lecturer/Sidebar.jsx
import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router';
import { 
  LayoutDashboard, 
  FileEdit, 
  BookOpen, 
  BrainCircuit, 
  GraduationCap,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { useGetMeQuery, useLogoutMutation } from '../../features/authApiSlice';
import { useToast } from '../../components/Toast';

const LecturerSidebar = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate();
  const toast = useToast();
  
  const { data: userData, isLoading, isError } = useGetMeQuery();
  const [logout] = useLogoutMutation();

  const user = userData?.user;
  const isHod = user?.extraRoles?.includes('hod');

  const handleLogout = async () => {
    try {
      await logout().unwrap();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userInfo');
      toast.success("Logged out successfully");
      navigate('/login');
    } catch (err) {
      toast.error("Failed to log out");
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userInfo');
      navigate('/login');
    }
  };

  // Navigation Links Configuration
  const navSections = [
    {
      title: "Teaching",
      links: [
        { name: 'Dashboard', path: '/lecturer/dashboard', icon: LayoutDashboard },
        { name: 'Manage Results', path: '/lecturer/results', icon: FileEdit },
        { name: 'Study Materials', path: '/lecturer/materials', icon: BookOpen },
        { name: 'Quizzes', path: '/lecturer/quizzes', icon: BrainCircuit },
      ]
    }
  ];

  // If the lecturer is also an HOD, add department management links
  if (isHod) {
    navSections.push({
      title: "Department (HOD)",
      links: [
        { name: 'Dept. Overview', path: '/lecturer/hod-overview', icon: ShieldCheck },
      ]
    });
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 h-[100dvh] w-64 bg-zinc-950 border-r border-zinc-800 z-50 flex flex-col
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-zinc-800 shrink-0">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          <div className="flex flex-col">
            <span className="text-zinc-100 font-semibold tracking-widest uppercase text-[10px]">
              Obong University
            </span>
            <span className="text-yellow-500 font-bold text-[9px] tracking-wider uppercase">
              Lecturer Panel
            </span>
          </div>
        </div>

        {/* School Color Ribbon */}
        <div className="h-1 w-full flex shrink-0">
          <div className="flex-1 bg-red-700"></div>
          <div className="flex-1 bg-yellow-500"></div>
          <div className="flex-1 bg-green-700"></div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6 custom-scrollbar">
          
          {isError ? (
            <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-xs mb-3">Session expired.</p>
              <button onClick={() => navigate('/login')} className="w-full py-2 bg-zinc-800 text-white text-xs rounded">Log In Again</button>
            </div>
          ) : isLoading ? (
             <div className="animate-pulse space-y-4 px-2">
               {[1, 2, 3, 4].map(i => (
                 <div key={i} className="h-10 bg-zinc-900 rounded-lg w-full"></div>
               ))}
             </div>
          ) : (
            navSections.map((section, idx) => (
              <div key={idx}>
                <h3 className="px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.links.map((link) => {
                    const Icon = link.icon;
                    return (
                      <NavLink
                        key={link.name}
                        to={link.path}
                        onClick={() => setIsOpen(false)}
                        className={({ isActive }) => `
                          flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                          ${isActive 
                            ? 'bg-zinc-900 text-yellow-500 shadow-[inset_2px_0_0_0_#EAB308]' 
                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'}
                        `}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                        {link.name}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-zinc-800 shrink-0">
          
          {/* Switch to Student Portal Link */}
          <Link 
            to="/dashboard"
            className="w-full flex items-center justify-center gap-2 py-2 mb-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold rounded-lg transition-colors"
          >
            <GraduationCap className="w-4 h-4" />
            Switch to Portal
          </Link>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-yellow-500 font-bold text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'L'}
                  </span>
                )}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-zinc-200 text-sm font-medium truncate max-w-[100px]">
                  {user?.name || 'Loading...'}
                </span>
                <span className="text-zinc-500 text-[10px] uppercase tracking-wider">
                  {isHod ? 'HOD / Lecturer' : 'Lecturer'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-900 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-500/20 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-200"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default LecturerSidebar;