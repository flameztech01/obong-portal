// src/pages/Login.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { 
  useLoginMutation, 
  useVerifyOtpMutation, 
  useResendOtpMutation,
  useGetMeQuery,
} from '../features/authApiSlice';
import { setCredentials } from '../features/auth/authSlice'; 
import { useToast } from '../components/Toast';

/* =========================================
   AUTH CHECK LOADER
   ========================================= */
const AuthCheckLoader = ({ message = 'Redirecting...' }) => (
  <div className="h-[100dvh] w-full bg-zinc-950 flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-zinc-700 border-t-yellow-500 rounded-full animate-spin" />
      <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-semibold">
        {message}
      </p>
    </div>
  </div>
);

/* =========================================
   ROLE-BASED REDIRECT HELPER
   ========================================= */
const getHomeRoute = (user) => {
  if (!user) return '/dashboard';
  const role = user.role;
  if (role === 'admin') return '/superuser/dashboard';
  if (role === 'lecturer') return '/lecturer/dashboard';

  // Student
  if (user.hasUploadedHistoricalResults === false) {
    // Note: nextStep is what the backend tells us post-OTP. On a fresh
    // refresh we rely on hasUploadedHistoricalResults from /me.
    return '/upload-results';
  }
  return '/dashboard';
};

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();

  /* -------------------------------------------
     AUTH GUARD — redirect if already logged in
     ------------------------------------------- */
  const reduxUser = useSelector((state) => state.auth?.userInfo);
  const token = reduxUser?.token;

  const { 
    data: meData, 
    isLoading: isMeLoading,
  } = useGetMeQuery(undefined, { skip: !!token });

  const authedUser = reduxUser || meData?.user;
  const isAuthenticated = !!token || !!meData?.user;
  const isCheckingAuth = !token && isMeLoading;

  useEffect(() => {
    if (isAuthenticated && authedUser) {
      navigate(getHomeRoute(authedUser), { replace: true });
    }
  }, [isAuthenticated, authedUser, navigate]);

  /* -------------------------------------------
     API Hooks
     ------------------------------------------- */
  const [login, { isLoading: isLoggingIn }] = useLoginMutation();
  const [verifyOtp, { isLoading: isVerifying }] = useVerifyOtpMutation();
  const [resendOtp, { isLoading: isResending }] = useResendOtpMutation();

  // State
  const [step, setStep] = useState('identifier'); // 'identifier' | 'otp'
  const [identifier, setIdentifier] = useState('');
  const [otpIdentifier, setOtpIdentifier] = useState('');
  const [otpArray, setOtpArray] = useState(['', '', '', '', '', '']);
  
  const otpRefs = useRef([]);

  /* =========================================
     HANDLERS
     ========================================= */
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!identifier) return toast.error('Please enter your email or matric number');

    try {
      const result = await login({ identifier }).unwrap();
      setOtpIdentifier(result.identifier);
      setStep('otp');
      toast.success("OTP sent to your email!");
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to find account. Please try again.');
    }
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otpArray];
    newOtp[index] = value.substring(value.length - 1);
    setOtpArray(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
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
      const result = await verifyOtp({ identifier: otpIdentifier, otp: otpCode }).unwrap();
      
      dispatch(setCredentials({ ...result.user, token: result.token }));
      toast.success("Logged in successfully!");

      const role = result.user?.role;

      if (role === 'admin') {
        navigate('/superuser/dashboard');
      } else if (role === 'lecturer') {
        navigate('/lecturer/dashboard');
      } else {
        if (result.nextStep === 'UPLOAD_HISTORICAL_RESULTS') {
          navigate('/upload-results');
        } else {
          navigate('/dashboard');
        }
      }

    } catch (err) {
      toast.error(err?.data?.message || 'Invalid OTP. Please try again.');
    }
  };

  const handleResendOtp = async () => {
    try {
      const result = await resendOtp({ identifier: otpIdentifier }).unwrap();
      toast.success(result.message || "A new OTP has been sent to your email.");
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to resend OTP.');
    }
  };

  /* -------------------------------------------
     GATE — block render while checking / redirecting
     ------------------------------------------- */
  if (isAuthenticated || isCheckingAuth) {
    return <AuthCheckLoader message="Already signed in" />;
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden bg-zinc-950 font-sans selection:bg-zinc-800 selection:text-white">
      
      {/* FIXED TOP BAR */}
      <header className="shrink-0 h-16 w-full z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between px-6 md:px-10">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 md:w-10 md:h-10 object-contain" />
          <div className="flex flex-col">
            <span className="text-zinc-100 font-semibold tracking-widest uppercase text-xs md:text-sm">
              Obong University
            </span>
            <span className="text-zinc-400 text-[10px] tracking-wider uppercase">
              Student Portal
            </span>
          </div>
        </Link>
        
        <Link to="/signup" className="text-xs font-semibold tracking-wider uppercase text-zinc-400 hover:text-white transition-colors">
          Sign Up
        </Link>
      </header>

      {/* Top Ribbon */}
      <div className="shrink-0 w-full h-1 flex z-50">
        <div className="flex-1 bg-red-700"></div>
        <div className="flex-1 bg-yellow-500"></div>
        <div className="flex-1 bg-green-700"></div>
      </div>

      {/* MAIN SPLIT LAYOUT */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0">
        
        {/* LEFT SIDE */}
        <div className="hidden lg:flex w-1/2 h-full relative bg-zinc-900 border-r border-zinc-800 flex-col justify-center px-16 xl:px-24 overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat opacity-20"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-transparent"></div>
          
          <div className="relative z-10 max-w-lg">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-[2px] bg-red-700"></div>
              <div className="w-8 h-[2px] bg-yellow-500"></div>
              <div className="w-8 h-[2px] bg-green-700"></div>
            </div>
            
            <h1 className="text-4xl xl:text-5xl font-serif text-white tracking-tight mb-6 leading-tight">
              {step === 'identifier' ? (
                <>Welcome back to <br />
                <span className="italic font-light text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">
                  your workspace.
                </span></>
              ) : (
                <>Check your inbox, <br />
                <span className="italic font-light text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">
                  secure your session.
                </span></>
              )}
            </h1>
            
            <p className="text-zinc-400 text-lg leading-relaxed mb-8">
              {step === 'identifier' 
                ? "Pick up right where you left off. Track your GPA, access course materials, and use AI to study smarter all in one place."
                : "We've sent a secure one-time password to your email. Enter it to verify your identity and access your portal."}
            </p>

            {step === 'identifier' && (
              <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="bg-zinc-800 p-2 rounded-lg text-yellow-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-sm mb-1">Secure OTP Login</h3>
                    <p className="text-zinc-400 text-xs leading-relaxed">
                      We don't use passwords here. Enter your details and we'll send a secure, one-time code directly to your email.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="w-full lg:w-1/2 h-full bg-zinc-950 overflow-y-auto custom-scrollbar">
          <div className="flex min-h-full items-center justify-center p-6 md:p-12">
            
            <div className="w-full max-w-md">
              
              {/* Mobile Header */}
              <div className="mb-8 lg:hidden text-center">
                <h2 className="text-3xl font-serif text-white tracking-tight mb-2">
                  {step === 'identifier' ? 'Welcome Back' : 'Verify Email'}
                </h2>
                <p className="text-zinc-400 text-sm">
                  {step === 'identifier' ? 'Log in to access your portal.' : 'Enter the code sent to your email.'}
                </p>
              </div>

              {/* Desktop Header */}
              <div className="hidden lg:block mb-8">
                <h2 className="text-2xl font-serif text-white tracking-tight mb-2">
                  {step === 'identifier' ? 'Log In' : 'Verify Your Email'}
                </h2>
                <p className="text-zinc-400 text-sm">
                  {step === 'identifier' 
                    ? 'Enter your email or matric number to continue.' 
                    : `We sent a code to ${otpIdentifier || 'your email'}.`}
                </p>
              </div>

              {/* STEP 1: IDENTIFIER */}
              {step === 'identifier' && (
                <form onSubmit={handleRequestOtp} className="space-y-6 pb-10">
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300 uppercase tracking-wider">
                      Email or Matric Number
                    </label>
                    <input 
                      type="text" 
                      name="identifier" 
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. you@example.com or OBU/CSC/21/001"
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-4 py-4 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all placeholder:text-zinc-600"
                    />
                    <p className="text-[11px] text-zinc-500 mt-2">
                      A 6-digit verification code will be sent to the email registered with this account.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button 
                      type="submit" 
                      disabled={isLoggingIn}
                      className="w-full flex justify-center items-center py-4 px-4 bg-zinc-100 hover:bg-white text-zinc-950 text-sm font-bold tracking-widest uppercase transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed rounded-lg shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                    >
                      {isLoggingIn ? 'Sending...' : 'Send Verification Code'}
                    </button>
                  </div>

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-zinc-800"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-zinc-950 px-4 text-zinc-500 uppercase tracking-wider">New here?</span>
                    </div>
                  </div>

                  <Link 
                    to="/signup" 
                    className="w-full flex justify-center items-center py-4 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-sm font-bold tracking-widest uppercase transition-all duration-300 rounded-lg"
                  >
                    Create an Account
                  </Link>

                </form>
              )}

              {/* STEP 2: OTP */}
              {step === 'otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-6 pb-10">
                  
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
                      {isVerifying ? 'Verifying...' : 'Verify & Log In'}
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
                        setStep('identifier');
                        setOtpArray(['', '', '', '', '', '']);
                      }}
                      className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                      </svg>
                      Change Email / Matric
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

export default Login;