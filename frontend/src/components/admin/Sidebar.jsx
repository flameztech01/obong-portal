// src/components/admin/Sidebar.jsx
import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router';
import { useDispatch } from 'react-redux';
import { useGetMeQuery, useLogoutMutation } from '../../features/authApiSlice';
import { clearCredentials } from '../../features/auth/authSlice';
import { apiSlice } from '../../features/apiSlice';
import { useToast } from '../../components/Toast';

const AdminSidebar = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();

  const { data: userData, isLoading, isError } = useGetMeQuery();
  const [logout] = useLogoutMutation();

  const user = userData?.user;

  const handleLogout = async () => {
    // 1. Backend kills the httpOnly jwt cookie. If it fails (offline,
    //    already expired), we still log out locally — the user asked for it.
    try {
      await logout().unwrap();
    } catch (err) {
      console.warn('Logout request failed:', err?.data?.message || err?.message);
    }

    // 2. Clear redux auth state + persisted userInfo
    dispatch(clearCredentials());

    // 3. Wipe EVERY RTK Query cache so a back-nav can't repaint stale data
    dispatch(apiSlice.util.resetApiState());

    // 4. Belt-and-braces cleanup for any legacy keys that might still linger.
    //    (Redundant with the slice, but cheap and safe.)
    try {
      ['accessToken', 'token', 'refreshToken', 'userInfo'].forEach((k) =>
        localStorage.removeItem(k)
      );
      sessionStorage.clear();
    } catch {
      /* storage blocked — ignore */
    }

    toast.success('Logged out successfully');
    navigate('/login', { replace: true });
  };

  const navSections = [
    {
      title: 'Overview',
      links: [
        { name: 'Dashboard', path: '/superuser/dashboard', end: true, icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      ],
    },
    {
      title: 'Management',
      links: [
        { name: 'User Directory', path: '/superuser/users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
        // 👇 NEW: Anonymous Posts
        { name: 'Anonymous Posts', path: '/superuser/anonymous', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
        { name: 'Appointments', path: '/superuser/appointments', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
        { name: 'Teams', path: '/superuser/teams', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
      ],
    },
    {
      title: 'Academics',
      links: [
        { name: 'Departments', path: '/superuser/departments', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
        { name: 'Sessions & Promotions', path: '/superuser/sessions', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
        { name: 'Course Catalog', path: '/superuser/courses', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
      ],
    },
    {
      title: 'System',
      links: [
        { name: 'Audit Logs', path: '/superuser/audit-logs', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
        { name: 'Settings', path: '/superuser/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
      ],
    },
  ];

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
      <aside
        className={`
          fixed top-0 left-0 h-[100dvh] w-64 bg-zinc-950 border-r border-zinc-800 z-50 flex flex-col
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-zinc-800 shrink-0">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          <div className="flex flex-col">
            <span className="text-zinc-100 font-semibold tracking-widest uppercase text-[10px]">
              Obong University
            </span>
            <span className="text-yellow-500 font-bold text-[9px] tracking-wider uppercase">
              Admin Panel
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
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar">
          {isError ? (
            <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-xs mb-3">Session expired or connection lost.</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs rounded transition-colors"
              >
                Log In Again
              </button>
            </div>
          ) : isLoading ? (
            <div className="animate-pulse space-y-4 px-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-8 bg-zinc-900 rounded-lg w-full"></div>
              ))}
            </div>
          ) : (
            navSections.map((section, idx) => (
              <div key={idx}>
                <h3 className="px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.links.map((link) => (
                    <NavLink
                      key={link.name}
                      to={link.path}
                      end={link.end}
                      onClick={() => setIsOpen(false)}
                      className={({ isActive }) => `
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                        ${isActive
                          ? 'bg-zinc-900 text-yellow-500 shadow-[inset_2px_0_0_0_#EAB308]'
                          : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'}
                      `}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={link.icon}></path>
                      </svg>
                      {link.name}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))
          )}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-zinc-800 shrink-0">
          <Link
            to="/dashboard"
            className="w-full flex items-center justify-center gap-2 py-2 mb-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
            </svg>
            Switch to Portal
          </Link>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-yellow-500 font-bold text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'A'}
                  </span>
                )}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-zinc-200 text-sm font-medium truncate max-w-[100px]">
                  {user?.name || (isError ? 'Admin' : 'Loading...')}
                </span>
                <span className="text-zinc-500 text-[10px] uppercase tracking-wider">
                  Administrator
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-900 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-500/20 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;