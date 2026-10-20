import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { 
  useLoginMutation, 
  useVerifyOtpMutation, 
  useResendOtpMutation 
} from '../../features/authApiSlice';
import { useToast } from '../../components/Toast';

const AdminLogin = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // API Hooks
  const [login, { isLoading: isLoggingIn }] = useLoginMutation();
  const [verifyOtp, { isLoading: isVerifying }] = useVerifyOtpMutation();
  const [resendOtp, { isLoading: isResending }] = useResendOtpMutation();

  // State
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otpArray, setOtpArray] = useState(['', '', '', '', '', '']);
  
  const otpRefs = useRef([]);

  /* =========================================
     HANDLERS
     ========================================= */
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your admin email address');

    try {
      // We pass the email as the identifier
      await login({ identifier: email }).unwrap();
      setStep('otp'); // Move to OTP step
      toast.success("Security code sent to your email.");
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to find admin account. Please try again.');
    }
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otpArray];
    newOtp[index] = value.substring(value.length - 1); // Only allow 1 character
    setOtpArray(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Auto-focus previous input on Backspace
    if (e.key === 'Backspace' && !otpArray[index] && index > 0) {
      otpRefs.current[index - 1].focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpCode = otpArray.join('');
    
    if (otpCode.length !== 6) {
      return toast.error('Please enter the full 6-digit code.');
    }

    try {
      const result = await verifyOtp({ identifier: email, otp: otpCode }).unwrap();
      
      // 🚨 STRICT SECURITY CHECK
      // If the user logging in is a student or lecturer, block them.
      if (result.user?.role !== 'admin') {
        // Clear the OTP so they can't try again without requesting a new one
        setOtpArray(['', '', '', '', '', '']);
        return toast.error("Access Denied. You do not have administrator privileges.");
      }

      // ✅ Save the JWT token from the backend
      localStorage.setItem('accessToken', result.token);
      
      toast.success("Welcome back, Administrator.");
      navigate('/superuser/dashboard');

    } catch (err) {
      toast.error(err?.data?.message || 'Invalid OTP. Please try again.');
    }
  };

  const handleResendOtp = async () => {
    try {
      const result = await resendOtp({ identifier: email }).unwrap();
      toast.success(result.message || "A new security code has been sent.");
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to resend code.');
    }
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden bg-zinc-950 font-sans selection:bg-zinc-800 selection:text-white">
      
      {/* =========================================
          FIXED TOP BAR
          ========================================= */}
      <header className="shrink-0 h-16 w-full z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between px-6 md:px-10">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 md:w-10 md:h-10 object-contain" />
          <div className="flex flex-col">
            <span className="text-zinc-100 font-semibold tracking-widest uppercase text-xs md:text-sm">
              Obong University
            </span>
            <span className="text-yellow-500 font-bold text-[10px] tracking-wider uppercase">
              Admin Panel
            </span>
          </div>
        </Link>
        
        <Link to="/login" className="text-xs font-semibold tracking-wider uppercase text-zinc-400 hover:text-white transition-colors">
          Student Login
        </Link>
      </header>

      {/* Top Ribbon (School Colors) */}
      <div className="shrink-0 w-full h-1 flex z-50">
        <div className="flex-1 bg-red-700"></div>
        <div className="flex-1 bg-yellow-500"></div>
        <div className="flex-1 bg-green-700"></div>
      </div>

      {/* =========================================
          MAIN SPLIT LAYOUT
          ========================================= */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0">
        
        {/* -----------------------------------------
            LEFT SIDE: FIXED HEIGHT, NO SCROLL
            ----------------------------------------- */}
        <div className="hidden lg:flex w-1/2 h-full relative bg-zinc-900 border-r border-zinc-800 flex-col justify-center px-16 xl:px-24 overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat opacity-20 grayscale"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-transparent"></div>
          
          <div className="relative z-10 max-w-lg">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-[2px] bg-red-700"></div>
              <div className="w-8 h-[2px] bg-yellow-500"></div>
              <div className="w-8 h-[2px] bg-green-700"></div>
            </div>
            
            <h1 className="text-4xl xl:text-5xl font-serif text-white tracking-tight mb-6 leading-tight">
              System <br />
              <span className="italic font-light text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">
                Administration.
              </span>
            </h1>
            
            <p className="text-zinc-400 text-lg leading-relaxed mb-8">
              Authorized personnel only. Manage users, appoint course reps, oversee academic sessions, and configure platform-wide settings.
            </p>

            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl backdrop-blur-sm border-l-2 border-l-yellow-500">
              <div className="flex items-start gap-4">
                <div className="bg-zinc-800 p-2 rounded-lg text-yellow-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm mb-1">Restricted Access</h3>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Non-administrator accounts will be denied access. You must log in with your registered admin email address.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* -----------------------------------------
            RIGHT SIDE: SCROLLABLE FORM
            ----------------------------------------- */}
        <div className="w-full lg:w-1/2 h-full bg-zinc-950 overflow-y-auto custom-scrollbar">
          <div className="flex min-h-full items-center justify-center p-6 md:p-12">
            
            <div className="w-full max-w-md">
              
              {/* Mobile Header */}
              <div className="mb-8 lg:hidden text-center">
                <h2 className="text-3xl font-serif text-white tracking-tight mb-2">
                  {step === 'email' ? 'Admin Login' : 'Security Check'}
                </h2>
                <p className="text-zinc-400 text-sm">
                  {step === 'email' ? 'Restricted Access.' : 'Enter the code sent to your email.'}
                </p>
              </div>

              {/* Desktop Header */}
              <div className="hidden lg:block mb-8">
                <h2 className="text-2xl font-serif text-white tracking-tight mb-2">
                  {step === 'email' ? 'Administrator Login' : 'Two-Factor Authentication'}
                </h2>
                <p className="text-zinc-400 text-sm">
                  {step === 'email' 
                    ? 'Enter your admin email to receive a security code.' 
                    : `We sent a security code to ${email}.`}
                </p>
              </div>

              {/* =========================================
                  STEP 1: EMAIL FORM
                  ========================================= */}
              {step === 'email' && (
                <form onSubmit={handleRequestOtp} className="space-y-6 pb-10">
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300 uppercase tracking-wider">
                      Admin Email Address
                    </label>
                    <input 
                      type="email" 
                      name="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@obonguniversity.edu.ng"
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-4 py-4 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all placeholder:text-zinc-600"
                    />
                  </div>

                  <div className="pt-2">
                    <button 
                      type="submit" 
                      disabled={isLoggingIn}
                      className="w-full flex justify-center items-center py-4 px-4 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 text-sm font-bold tracking-widest uppercase transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed rounded-lg shadow-[0_0_20px_rgba(234,179,8,0.15)]"
                    >
                      {isLoggingIn ? 'Authenticating...' : 'Send Security Code'}
                    </button>
                  </div>

                  <div className="text-center pt-6">
                    <Link to="/login" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                      Are you a student? Go to Student Portal &rarr;
                    </Link>
                  </div>

                </form>
              )}

              {/* =========================================
                  STEP 2: OTP VERIFICATION
                  ========================================= */}
              {step === 'otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-6 pb-10">
                  
                  {/* OTP Input Grid */}
                  <div className="flex justify-between gap-2">
                    {otpArray.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-12 h-14 md:w-14 md:h-16 text-center text-2xl font-bold bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-lg focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all"
                      />
                    ))}
                  </div>

                  <div className="pt-2">
                    <button 
                      type="submit" 
                      disabled={isVerifying}
                      className="w-full flex justify-center items-center py-4 px-4 bg-zinc-100 hover:bg-white text-zinc-950 text-sm font-bold tracking-widest uppercase transition-all duration-300 disabled:opacity-70 rounded-lg"
                    >
                      {isVerifying ? 'Verifying...' : 'Verify & Access Panel'}
                    </button>
                  </div>

                  <div className="flex flex-col items-center gap-4 pt-4 text-sm">
                    <p className="text-zinc-500">
                      Didn't receive the code?{' '}
                      <button 
                        type="button" 
                        onClick={handleResendOtp}
                        disabled={isResending}
                        className="text-yellow-500 hover:text-yellow-400 font-semibold transition-colors disabled:opacity-50"
                      >
                        {isResending ? 'Sending...' : 'Click to resend'}
                      </button>
                    </p>
                    <button 
                      type="button" 
                      onClick={() => {
                        setStep('email');
                        setOtpArray(['', '', '', '', '', '']);
                      }}
                      className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                      </svg>
                      Change Email
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default AdminLogin;