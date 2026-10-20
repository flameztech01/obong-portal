// src/components/Sidebar.jsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router';
import { useGetMeQuery, useLogoutMutation } from '../features/authApiSlice';
import { useToast } from '../components/Toast';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate();
  const toast = useToast();
  
  const { data: userData, isLoading, isError } = useGetMeQuery();
  const [logout] = useLogoutMutation();

  const user = userData?.user;

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

  const links = [
    { name: 'Dashboard', path: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', roles: ['student', 'lecturer', 'admin'] },
    
    // Study Tools
    { name: 'Study Materials', path: '/study', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', roles: ['student', 'lecturer', 'admin'] },
    { name: 'Quizzes', path: '/quizzes', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', roles: ['student', 'lecturer', 'admin'] },
    
    // Student Tools
    { name: 'My Results', path: '/results', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', roles: ['student'] },
    
    // Staff & Extra Role Tools
    { name: 'Manage Results', path: '/manage-results', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', roles: ['lecturer', 'admin'], extraRoles: ['course_rep'] },
    
    // ✅ NEW: Student Admin Tools (Moved out of /superuser)
    { name: 'Manage Courses', path: '/manage-courses', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', roles: [], extraRoles: ['student_admin'] },

    // Full Admin Panel (Only show if they are a full admin)
    { name: 'Admin Panel', path: '/superuser', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', roles: ['admin'] },
  ];

  const filteredLinks = links.filter(link => {
    if (!user) return false;
    
    // If user is full admin, show everything tagged for admin
    if (user.role === 'admin' && link.roles.includes('admin')) return true;
    
    // Check base role
    if (link.roles.includes(user.role)) return true;
    
    // Check extra roles (like course_rep, student_admin)
    const hasExtra = link.extraRoles?.some(r => user.extraRoles?.includes(r));
    if (hasExtra) return true;

    return false;
  });

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsOpen(false)} />
      )}

      <aside className={`fixed top-0 left-0 h-[100dvh] w-64 bg-zinc-950 border-r border-zinc-800 z-50 flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-zinc-800 shrink-0">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          <div className="flex flex-col">
            <span className="text-zinc-100 font-semibold tracking-widest uppercase text-[10px]">Obong University</span>
            <span className="text-zinc-500 text-[9px] tracking-wider uppercase">Portal</span>
          </div>
        </div>

        {/* School Color Ribbon */}
        <div className="h-1 w-full flex shrink-0">
          <div className="flex-1 bg-red-700"></div>
          <div className="flex-1 bg-yellow-500"></div>
          <div className="flex-1 bg-green-700"></div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
          {isError ? (
            <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-xs mb-3">Session expired.</p>
              <button onClick={() => navigate('/login')} className="w-full py-2 bg-zinc-800 text-white text-xs rounded">Log In Again</button>
            </div>
          ) : isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-zinc-900 rounded-lg w-full"></div>)}
            </div>
          ) : (
            filteredLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive ? 'bg-zinc-900 text-yellow-500 shadow-[inset_2px_0_0_0_#EAB308]' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'}
                `}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={link.icon}></path>
                </svg>
                {link.name}
              </NavLink>
            ))
          )}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-zinc-800 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700">
                {user?.profilePicture ? <img src={user.profilePicture} alt="Avatar" className="w-full h-full object-cover" /> : <span className="text-zinc-400 font-bold text-sm">{user?.name?.charAt(0).toUpperCase() || '?'}</span>}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-zinc-200 text-sm font-medium truncate max-w-[100px]">{user?.name || 'Loading...'}</span>
                <span className="text-zinc-500 text-[10px] uppercase tracking-wider">
                  {user?.extraRoles?.length > 0 ? user.extraRoles.join(', ') : user?.role}
                </span>
              </div>
            </div>
          </div>

          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-900 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-500/20 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;