import React from 'react';

const Welcome = () => {
  return (
    // h-[100dvh] restricts the height exactly to the screen size
    <div className="relative h-[100dvh] w-full flex flex-col overflow-hidden bg-zinc-950 font-sans selection:bg-zinc-800 selection:text-white">
      
      {/* =========================================
          BACKGROUND IMAGE & OVERLAYS
          ========================================= */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat"
          aria-hidden="true"
        ></div>
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-zinc-950/80 mix-blend-multiply"></div>
        
        {/* Vignette for depth */}
        <div className="absolute inset-0 shadow-[inset_0_0_200px_rgba(0,0,0,0.9)]"></div>
      </div>

      {/* =========================================
          MATURE USE OF SCHOOL COLORS (Top Ribbon)
          ========================================= */}
      <div className="absolute top-0 left-0 w-full h-1 flex z-20 shrink-0">
        <div className="flex-1 bg-red-700"></div>
        <div className="flex-1 bg-yellow-500"></div>
        <div className="flex-1 bg-green-700"></div>
      </div>

      {/* =========================================
          TOP NAV / LOGO (shrink-0 prevents squishing)
          ========================================= */}
      <header className="relative z-10 w-full px-6 py-5 md:px-10 md:py-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 md:gap-4">
          <img 
            src="/logo.png" 
            alt="Obong University Logo" 
            className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-lg"
          />
          <div className="flex flex-col">
            <span className="text-zinc-100 font-semibold tracking-widest uppercase text-xs md:text-sm">
              Obong University
            </span>
            <span className="text-zinc-400 text-[10px] md:text-xs tracking-wider uppercase">
              Student Portal
            </span>
          </div>
        </div>
        <div className="hidden sm:block">
          <span className="text-zinc-400 text-xs tracking-widest uppercase border border-zinc-700/50 px-4 py-2 rounded-full bg-zinc-900/30 backdrop-blur-sm">
            Unofficial
          </span>
        </div>
      </header>

      {/* =========================================
          MAIN HERO CONTENT
          Mobile: Bottom Left | Desktop: Left Split
          ========================================= */}
      <main className="relative z-10 flex-grow flex flex-col justify-end md:justify-center px-6 md:px-16 lg:px-24 pb-12 md:pb-0 w-full max-w-7xl mx-auto">
        
        {/* The w-full md:w-[65%] keeps the text on the left side on desktop, 
            leaving the right side open to show the background image */}
        <div className="w-full md:w-[65%] lg:w-[60%] flex flex-col items-start text-left">
          
          <div className="flex items-center gap-2 mb-6 md:mb-8">
            <div className="w-6 md:w-8 h-[2px] bg-red-700"></div>
            <div className="w-6 md:w-8 h-[2px] bg-yellow-500"></div>
            <div className="w-6 md:w-8 h-[2px] bg-green-700"></div>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-5xl lg:text-6xl font-serif text-white tracking-tight mb-4 md:mb-6 leading-[1.1] drop-shadow-md">
            Welcome to <br className="hidden md:block" />
            <span className="italic font-light text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">
              Obong University
            </span> 
            <br className="hidden md:block" /> Portal
          </h1>

          <p className="text-zinc-300 text-sm md:text-base lg:text-lg max-w-md md:max-w-xl leading-relaxed mb-8 md:mb-10 font-light drop-shadow">
            A dedicated academic workspace designed to help you excel. 
            <span className="hidden md:inline"> Access study materials, track your academic progress, and leverage AI to study smarter.</span>
          </p>

          <div className="flex flex-col sm:flex-row items-start gap-3 md:gap-4 w-full sm:w-auto">
            <a 
              href="/login" 
              className="w-full sm:w-auto px-8 py-3.5 md:px-10 md:py-4 bg-zinc-100 hover:bg-white text-zinc-950 text-xs md:text-sm font-bold tracking-widest uppercase transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] text-center"
            >
              Login to Portal
            </a>
            <a 
              href="/signup" 
              className="w-full sm:w-auto px-8 py-3.5 md:px-10 md:py-4 border border-zinc-600 hover:border-zinc-400 bg-zinc-900/50 backdrop-blur-sm text-zinc-200 hover:text-white text-xs md:text-sm font-bold tracking-widest uppercase transition-all duration-300 text-center"
            >
              Create Account
            </a>
          </div>
        </div>

      </main>

      {/* =========================================
          FOOTER (shrink-0 prevents squishing)
          ========================================= */}
      <footer className="relative z-10 w-full px-6 py-5 md:px-10 shrink-0 bg-gradient-to-t from-zinc-950 to-transparent">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 text-[10px] md:text-xs text-zinc-500 font-medium">
          <p>
            &copy; {new Date().getFullYear()} Obong University Portal.
          </p>
          <div className="flex items-center gap-2 bg-zinc-900/80 px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-zinc-800 w-full md:w-auto">
            <svg className="w-3 h-3 md:w-4 md:h-4 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
            </svg>
            <span>
              Built by a student, for the students. 
              <span className="text-zinc-300 font-semibold ml-1">Not an official portal.</span>
            </span>
          </div>
        </div>
      </footer>

    </div>
  )
}

export default Welcome;