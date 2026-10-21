import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { useDispatch } from 'react-redux';
import { 
  useSignupMutation, 
  useVerifyOtpMutation, 
  useResendOtpMutation,
  useGetDepartmentsQuery,
} from '../features/authApiSlice';
import { setCredentials } from '../features/auth/authSlice';
import { useToast } from '../components/Toast';

/* =========================================
   CUSTOM DROPDOWN (optionally searchable)
   ========================================= */
const CustomSelect = ({ 
  label, 
  options, 
  value, 
  onChange, 
  placeholder, 
  disabled = false, 
  searchable = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus the search input when the dropdown opens
  useEffect(() => {
    if (isOpen && searchable) {
      const t = setTimeout(() => searchRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [isOpen, searchable]);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions =
    searchable && query.trim()
      ? options.filter((o) =>
          o.label.toLowerCase().includes(query.trim().toLowerCase())
        )
      : options;

  const handleToggle = () => {
    if (disabled) return;
    if (isOpen) {
      setIsOpen(false);
      setQuery('');
    } else {
      setIsOpen(true);
    }
  };

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className="space-y-1.5 relative" ref={dropdownRef}>
      {label && (
        <label className="text-xs font-medium text-zinc-300 uppercase tracking-wider">
          {label}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between bg-zinc-900 border ${
          isOpen ? 'border-yellow-500/50 ring-1 ring-yellow-500/50' : 'border-zinc-800'
        } text-zinc-100 text-sm rounded-lg px-4 py-3 transition-all ${
          disabled ? 'opacity-60 cursor-not-allowed' : ''
        }`}
      >
        <span className={`truncate text-left ${!selectedOption ? 'text-zinc-600' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {searchable && (
            <div className="p-2 border-b border-zinc-800">
              <div className="relative">
                <svg
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type to search..."
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm rounded-md pl-8 pr-3 py-2 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all placeholder:text-zinc-600"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsOpen(false);
                      setQuery('');
                    }
                    if (e.key === 'Enter' && filteredOptions.length > 0) {
                      e.preventDefault();
                      handleSelect(filteredOptions[0].value);
                    }
                  }}
                />
              </div>
            </div>
          )}

          <ul className="max-h-60 overflow-y-auto py-1 text-sm text-zinc-200 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <li className="px-4 py-3 text-zinc-500 text-xs italic">
                No matches found
              </li>
            ) : (
              filteredOptions.map((option) => (
                <li
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`px-4 py-2.5 cursor-pointer hover:bg-zinc-800 transition-colors ${
                    value === option.value
                      ? 'bg-zinc-800/50 text-yellow-500 font-medium'
                      : ''
                  }`}
                >
                  {option.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

/* =========================================
   MAIN SIGNUP COMPONENT
   ========================================= */
const Signup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();
  
  // API Hooks
  const [signup, { isLoading: isSigningUp }] = useSignupMutation();
  const [verifyOtp, { isLoading: isVerifying }] = useVerifyOtpMutation();
  const [resendOtp, { isLoading: isResending }] = useResendOtpMutation();

  // Real departments from backend
  const { 
    data: deptData, 
    isLoading: isDeptLoading,
    isError: isDeptError,
  } = useGetDepartmentsQuery();

  // State
  const [step, setStep] = useState('signup');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    matricNumber: '',
    department: '',
    level: '100',
    phone: '',
    isTransferStudent: false,
  });

  const [otpIdentifier, setOtpIdentifier] = useState('');
  const [otpArray, setOtpArray] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);

  // Build options from API response
  const departments = (deptData?.departments || []).map((d) => ({
    value: d._id,
    label: d.name,
  }));

  const levels = [
    { value: '100', label: '100 Level' },
    { value: '200', label: '200 Level' },
    { value: '300', label: '300 Level' },
    { value: '400', label: '400 Level' },
    { value: '500', label: '500 Level' },
  ];

  /* =========================================
     HANDLERS
     ========================================= */
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCustomChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();

    if (!formData.department) {
      return toast.error('Please select a department.');
    }

    try {
      const result = await signup(formData).unwrap();
      setOtpIdentifier(result.identifier);
      setStep('otp');
      toast.success("Account created! Check your email for the OTP.");
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to create account. Please try again.');
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
      toast.success("Email verified successfully!");
      
      if (result.nextStep === 'UPLOAD_HISTORICAL_RESULTS') {
        navigate('/upload-results');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Invalid OTP. Please try again.');
    }
  };

  const handleResendOtp = async () => {
    try {
      const result = await resendOtp({ identifier: otpIdentifier }).unwrap();
      toast.success(result.message);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to resend OTP.');
    }
  };

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
        
        <Link to="/login" className="text-xs font-semibold tracking-wider uppercase text-zinc-400 hover:text-white transition-colors">
          Log In
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
        
        {/* LEFT SIDE (Fixed) */}
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
              {step === 'signup' ? (
                <>Your academic journey, <br />
                <span className="italic font-light text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">
                  simplified.
                </span></>
              ) : (
                <>Check your inbox, <br />
                <span className="italic font-light text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">
                  secure your account.
                </span></>
              )}
            </h1>
            
            <p className="text-zinc-400 text-lg leading-relaxed mb-8">
              {step === 'signup' 
                ? "Join your fellow students on the unofficial portal built to help you excel. Access study materials, calculate your CGPA effortlessly, and study smarter with AI."
                : "We've sent a secure one-time password to your email. Enter it to verify your identity and access your portal."}
            </p>
          </div>
        </div>

        {/* RIGHT SIDE (Scrollable) */}
        <div className="w-full lg:w-1/2 h-full bg-zinc-950 overflow-y-auto custom-scrollbar">
          <div className="flex min-h-full items-center justify-center p-6 md:p-12">
            <div className="w-full max-w-lg">
              
              {/* Mobile Header */}
              <div className="mb-8 lg:hidden text-center">
                <h2 className="text-3xl font-serif text-white tracking-tight mb-2">
                  {step === 'signup' ? 'Create Account' : 'Verify Email'}
                </h2>
                <p className="text-zinc-400 text-sm">
                  {step === 'signup' ? 'Join the student portal today.' : 'Enter the code sent to your email.'}
                </p>
              </div>

              {/* Desktop Header */}
              <div className="hidden lg:block mb-8">
                <h2 className="text-2xl font-serif text-white tracking-tight mb-2">
                  {step === 'signup' ? 'Create an Account' : 'Verify Your Email'}
                </h2>
                <p className="text-zinc-400 text-sm">
                  {step === 'signup' ? 'Fill in your details to get started.' : `We sent a code to ${otpIdentifier || 'your email'}.`}
                </p>
              </div>

              {/* =========================================
                  STEP 1: SIGNUP FORM
                  ========================================= */}
              {step === 'signup' && (
                <form onSubmit={handleSignupSubmit} className="space-y-5 pb-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-medium text-zinc-300 uppercase tracking-wider">Full Name</label>
                      <input 
                        type="text" name="name" required
                        value={formData.name} onChange={handleChange}
                        placeholder="e.g. John Doe"
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all placeholder:text-zinc-600"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-medium text-zinc-300 uppercase tracking-wider">Email Address</label>
                      <input 
                        type="email" name="email" required
                        value={formData.email} onChange={handleChange}
                        placeholder="you@example.com"
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all placeholder:text-zinc-600"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-medium text-zinc-300 uppercase tracking-wider">Matric Number</label>
                      <input 
                        type="text" name="matricNumber" required
                        value={formData.matricNumber} onChange={handleChange}
                        placeholder="e.g. OBU/CSC/21/001"
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all placeholder:text-zinc-600 uppercase"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-medium text-zinc-300 uppercase tracking-wider">Phone Number (Optional)</label>
                      <input 
                        type="tel" name="phone"
                        value={formData.phone} onChange={handleChange}
                        placeholder="e.g. 08012345678"
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all placeholder:text-zinc-600"
                      />
                    </div>

                    {/* Department — searchable select */}
                    <div className="md:col-span-2">
                      <CustomSelect 
                        label="Department" 
                        placeholder={
                          isDeptLoading 
                            ? 'Loading departments...' 
                            : isDeptError 
                              ? 'Failed to load departments' 
                              : departments.length === 0 
                                ? 'No departments available' 
                                : 'Select Department'
                        }
                        options={departments} 
                        value={formData.department} 
                        onChange={(val) => handleCustomChange('department', val)}
                        disabled={isDeptLoading || isDeptError || departments.length === 0}
                        searchable
                      />
                      {isDeptError && (
                        <p className="text-[11px] text-red-400 mt-1">
                          Couldn't load departments. Please refresh the page.
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <CustomSelect 
                        label="Current Level" 
                        placeholder="Select Level" 
                        options={levels} 
                        value={formData.level} 
                        onChange={(val) => handleCustomChange('level', val)} 
                      />
                    </div>

                    {/* MODERN TRANSFER STUDENT TOGGLE */}
                    <div className="md:col-span-2">
                      <div
                        onClick={() => setFormData({ ...formData, isTransferStudent: !formData.isTransferStudent })}
                        className={`group flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-300 ${
                          formData.isTransferStudent
                            ? 'bg-zinc-900 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.05)]'
                            : 'bg-zinc-950/50 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg transition-colors ${
                            formData.isTransferStudent ? 'bg-yellow-500/10 text-yellow-500' : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-300'
                          }`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                            </svg>
                          </div>
                          <div>
                            <span className={`text-sm font-medium transition-colors ${
                              formData.isTransferStudent ? 'text-white' : 'text-zinc-300'
                            }`}>
                              I am a Transfer Student
                            </span>
                            <p className="text-xs text-zinc-500 mt-0.5 max-w-[200px] sm:max-w-xs leading-relaxed">
                              Enable this to upload your previous institution's transcript.
                            </p>
                          </div>
                        </div>

                        <div
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-300 ${
                            formData.isTransferStudent ? 'bg-yellow-500' : 'bg-zinc-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${
                              formData.isTransferStudent ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button 
                      type="submit" 
                      disabled={isSigningUp || isDeptLoading || isDeptError}
                      className="w-full flex justify-center items-center py-4 px-4 bg-zinc-100 hover:bg-white text-zinc-950 text-sm font-bold tracking-widest uppercase transition-all duration-300 disabled:opacity-70 rounded-lg"
                    >
                      {isSigningUp ? 'Processing...' : 'Create Account'}
                    </button>
                  </div>

                  <p className="text-center text-xs text-zinc-500 pt-2 pb-6">
                    Already have an account? <Link to="/login" className="text-yellow-500 hover:text-yellow-400 font-semibold">Log in here</Link>
                  </p>
                </form>
              )}

              {/* =========================================
                  STEP 2: OTP VERIFICATION
                  ========================================= */}
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
                      type="submit" disabled={isVerifying}
                      className="w-full flex justify-center items-center py-4 px-4 bg-zinc-100 hover:bg-white text-zinc-950 text-sm font-bold tracking-widest uppercase transition-all duration-300 disabled:opacity-70 rounded-lg"
                    >
                      {isVerifying ? 'Verifying...' : 'Verify Email'}
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
                      onClick={() => setStep('signup')}
                      className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
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

export default Signup;