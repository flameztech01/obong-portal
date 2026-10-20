// src/components/admin/Layout.jsx
import React, { useState } from 'react';
import { Outlet, Link } from 'react-router';
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';
import AdminSidebar from './Sidebar';
import { useGetMeQuery } from '../../features/authApiSlice';

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Fetch user to check role
  const { data: userData, isLoading, isError } = useGetMeQuery();
  const user = userData?.user;

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="h-[100dvh] w-full bg-zinc-950 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-yellow-500 animate-spin mb-4" />
        <p className="text-zinc-400 text-sm font-medium tracking-wider uppercase">Verifying Access...</p>
      </div>
    );
  }

  // 2. Access Denied State
  if (isError || !user || user.role !== 'admin') {
    return (
      <div className="h-[100dvh] w-full bg-zinc-950 flex items-center justify-center p-6">
        <div className="bg-zinc-900 border border-red-500/20 rounded-3xl p-8 md:p-12 max-w-md w-full text-center relative overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.1)]">
          {/* Top red accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50"></div>
          
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-red-500" strokeWidth={1.5} />
          </div>
          
          <h1 className="text-2xl font-serif text-white tracking-tight mb-3">
            Access Denied
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed mb-8">
            You do not have the required <strong className="text-white">Administrator</strong> privileges to access this area. If you believe this is an error, please contact the system administrator.
          </p>
          
          <Link 
            to="/dashboard" 
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-zinc-100 hover:bg-white text-zinc-950 text-sm font-bold uppercase tracking-wider rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
            Return to Student Portal
          </Link>
        </div>
      </div>
    );
  }

  // 3. Authorized Render
  return (
    <div className="min-h-[100dvh] w-full bg-zinc-950 font-sans selection:bg-zinc-800 selection:text-white flex">
      
      {/* ADMIN SIDEBAR COMPONENT */}
      <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* MAIN CONTENT WRAPPER */}
      {/* lg:ml-64 pushes the content to the right of the fixed sidebar on desktop */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 transition-all duration-300">
        
        {/* MOBILE TOP BAR (Hidden on Desktop) */}
        <header className="lg:hidden sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 flex flex-col shrink-0">
          <div className="h-16 flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              {/* Hamburger Menu Button */}
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -ml-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors focus:outline-none"
                aria-label="Open admin sidebar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              </button>
              
              <Link to="/superuser/dashboard" className="flex items-center gap-2">
                <img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain" />
                <div className="flex flex-col">
                  <span className="text-zinc-100 font-semibold tracking-widest uppercase text-[10px] leading-tight">
                    Obong Portal
                  </span>
                  <span className="text-yellow-500 font-bold text-[9px] uppercase tracking-wider leading-tight">
                    Admin
                  </span>
                </div>
              </Link>
            </div>
            
            {/* Small Avatar indicator for mobile */}
            <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center">
               <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
               </svg>
            </div>
          </div>
          
          {/* Mobile School Color Ribbon */}
          <div className="h-0.5 w-full flex">
            <div className="flex-1 bg-red-700"></div>
            <div className="flex-1 bg-yellow-500"></div>
            <div className="flex-1 bg-green-700"></div>
          </div>
        </header>

        {/* SCROLLABLE PAGE CONTENT */}
        {/* This is where your Admin pages (User Directory, Departments, etc.) will render */}
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950">
          <div className="mx-auto max-w-7xl w-full h-full p-4 md:p-8">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
};

export default AdminLayout;