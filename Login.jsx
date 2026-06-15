import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup 
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { Activity, Mail, Lock, ShieldAlert, LogIn, UserPlus } from 'lucide-react';

const Logo = ({ className = "h-8 w-8" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="login-logo-grad" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#00c6ff" />
        <stop offset="100%" stopColor="#0072ff" />
      </linearGradient>
    </defs>
    <path 
      d="M 44 15 h 12 a 8 8 0 0 1 8 8 v 13 h 13 a 8 8 0 0 1 8 8 v 12 a 8 8 0 0 1 -8 8 h -13 v 13 a 8 8 0 0 1 -8 8 h -12 a 8 8 0 0 1 -8 -8 v -13 h -13 a 8 8 0 0 1 -8 -8 v -12 a 8 8 0 0 1 8 -8 h 13 v -13 a 8 8 0 0 1 8 -8 z" 
      fill="url(#login-logo-grad)" 
    />
    <path 
      d="M 25 50 H 42 L 47 38 L 51 64 L 55 36 L 59 50 H 75" 
      stroke="white" 
      strokeWidth="4.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
  </svg>
);

function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    if (isSignUp) {
      if (password !== confirmPassword) {
        setErrorMsg("Passwords do not match.");
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setErrorMsg("Password should be at least 6 characters.");
        setLoading(false);
        return;
      }
    }

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error(err);
      let cleanErr = err.message;
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        cleanErr = "Incorrect email or password.";
      } else if (err.code === 'auth/email-already-in-use') {
        cleanErr = "This email is already registered.";
      } else if (err.code === 'auth/invalid-email') {
        cleanErr = "Please enter a valid email address.";
      }
      setErrorMsg(cleanErr);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMsg(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Premium Interactive Animated Mesh Gradients */}
      <div className="absolute top-[-25%] left-[-20%] w-[650px] h-[650px] rounded-full bg-cyan-500/10 blur-[150px] animate-drift-1 pointer-events-none"></div>
      <div className="absolute bottom-[-30%] right-[-15%] w-[750px] h-[750px] rounded-full bg-purple-600/15 blur-[180px] animate-drift-2 pointer-events-none"></div>
      <div className="absolute top-[35%] left-[-15%] w-[500px] h-[500px] rounded-full bg-blue-600/5 blur-[130px] animate-drift-3 pointer-events-none"></div>
      <div className="absolute top-[-10%] right-[-10%] w-[550px] h-[550px] rounded-full bg-indigo-500/10 blur-[140px] animate-drift-1 pointer-events-none"></div>

      {/* Grid Overlay with Radial Gradient Mask for high-tech background depth */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none"
        style={{ maskImage: 'radial-gradient(circle, #000 40%, transparent 85%)', WebkitMaskImage: 'radial-gradient(circle, #000 40%, transparent 85%)' }}
      ></div>

      {/* Dynamic Animated Dual-Layer Heartbeat EKG wave */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none select-none z-0">
        <svg className="w-full h-96 text-cyan-400 stroke-current pointer-events-none" fill="none" viewBox="0 0 1000 200">
          {/* Glowing neon blurred shadow line */}
          <path 
            className="animate-ekg stroke-[5] blur-[4px] opacity-60" 
            d="M 0 100 L 200 100 L 220 75 L 240 125 L 260 20 L 280 180 L 300 90 L 320 110 L 340 100 L 600 100 L 620 75 L 640 125 L 660 20 L 680 180 L 700 90 L 720 110 L 740 100 L 1000 100" 
          />
          {/* Sharp bright sweep line */}
          <path 
            className="animate-ekg stroke-[2.5]" 
            d="M 0 100 L 200 100 L 220 75 L 240 125 L 260 20 L 280 180 L 300 90 L 320 110 L 340 100 L 600 100 L 620 75 L 640 125 L 660 20 L 680 180 L 700 90 L 720 110 L 740 100 L 1000 100" 
          />
        </svg>
      </div>

      {/* Login Portal Card with dynamic glassmorphism and thin glowing border */}
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-3xl border border-white/10 p-8 rounded-[32px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] z-10 transition-all duration-300 hover:border-blue-500/20 hover:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] relative overflow-hidden group">
        
        {/* Card subtle top-border lighting effect */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent"></div>

        {/* Portal Header */}
        <div className="flex flex-col items-center text-center gap-3 mb-8">
          <div className="flex items-center justify-center drop-shadow-lg mb-1.5 hover:scale-105 transition-all">
            <Logo className="h-16 w-16" />
          </div>
          <div>
            <h1 className="text-2.5xl font-black text-white tracking-tight bg-gradient-to-b from-white to-slate-200 bg-clip-text text-transparent">CareSync AI</h1>
            <p className="text-xs text-slate-400 font-semibold mt-1">Real-Time Patient Monitoring Portal</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800/80 mb-6">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setErrorMsg(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              !isSignUp ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setErrorMsg(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              isSignUp ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold px-4 py-3 rounded-xl mb-5 animate-fade-in flex items-start gap-2">
            <ShieldAlert className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Email Credentials Form */}
        <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-slate-500" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@caresync.com"
                className="w-full pl-10 pr-4 py-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl text-slate-100 text-xs font-semibold placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-slate-500" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl text-slate-100 text-xs font-semibold placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-inner"
              />
            </div>
          </div>

          {isSignUp && (
            <div className="flex flex-col gap-1.5 animate-fade-in">
              <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Confirm Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </span>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl text-slate-100 text-xs font-semibold placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-inner"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs py-3.5 rounded-xl mt-2 transition-all shadow-lg active:scale-98 disabled:opacity-50 border border-blue-400/10 hover:shadow-blue-500/20"
          >
            {loading ? 'Processing Authentication...' : isSignUp ? 'Create System Account' : 'Sign Into Dashboard'}
          </button>
        </form>

        {/* Premium Badge Separator */}
        <div className="relative flex items-center justify-center my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800/80"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900/90 px-3 text-[10px] font-bold text-slate-500 tracking-widest rounded-full py-0.5 border border-slate-800/60">
              or connect with
            </span>
          </div>
        </div>

        {/* Google SSO Button matching credentials button size */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full bg-slate-950/80 hover:bg-slate-900/90 text-slate-100 font-bold text-xs py-3.5 rounded-xl flex items-center justify-center gap-3 transition-all border border-slate-800 hover:border-slate-700 active:scale-98 disabled:opacity-50 shadow-md hover:shadow-blue-900/10"
        >
          {/* Google Icon SVG */}
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>Continue with Google</span>
        </button>
      </div>
    </div>
  );
}

export default Login;
