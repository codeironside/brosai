import React, { useState } from 'react';
import { Shield, CheckCircle2, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { HLSVideo } from '../common/HLSVideo';
import { logoutFirebase } from '../../config/firebase';
import { establishGoogleSession } from '../../utils/googleSession';
import { useApp } from '../../context/AppContext';

interface SignInPageViewProps {
  onLoginSuccess?: () => void;
}

export const SignInPageView: React.FC<SignInPageViewProps> = ({ onLoginSuccess }) => {
  const { user, login, logout, isAuthenticated } = useApp();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    const result = await establishGoogleSession(login);
    setLoading(false);
    if (result.ok) {
      onLoginSuccess?.();
      return;
    }
    setErrorMsg(result.error || 'Failed to authenticate with Google');
  };

  const handleSignOut = async () => {
    setLoading(true);
    await logoutFirebase();
    logout();
    setLoading(false);
  };



  return (
    <div className="relative min-h-screen w-full bg-black text-white font-sans flex flex-col justify-between overflow-x-hidden">
      {/* Background Video */}
      <HLSVideo
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_215831_c6a8989c-d716-4d8d-8745-e972a2eec711.mp4"
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/60 z-0 pointer-events-none" />

      {/* Bottom-Anchored Main Content */}
      <main className="relative z-10 mt-auto pt-24 sm:pt-28 px-5 pb-8 sm:px-8 sm:pb-12 lg:px-12 lg:pb-16 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 sm:gap-8 max-w-7xl mx-auto w-full">
        
        {/* Left Side: Headline & Security Pitch */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-xl space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-mono font-medium uppercase tracking-wider text-blue-300">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Secure Enterprise Hub</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-semibold leading-[1.15] tracking-tight text-white">
            {isAuthenticated ? `Welcome, ${user.name}` : 'Access Your Autonomous Ops Workspace'}
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-white/80 leading-relaxed font-light">
            {isAuthenticated
              ? 'You are signed in with Google. Your AI agents keep running in the background.'
              : 'Continue with Google to open your workspace — the same way you would on LinkedIn.'}
          </p>


          <div className="pt-2 flex items-center gap-3">
            <div className="rounded-xl bg-white/10 backdrop-blur-md px-3.5 py-2 border border-white/10">
              <div className="font-silkscreen text-sm sm:text-base text-white font-normal">24/7</div>
              <div className="text-[10px] text-white/60">Live Monitoring</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-md px-3.5 py-2 border border-white/10">
              <div className="font-silkscreen text-sm sm:text-base text-blue-300 font-normal">SOC2</div>
              <div className="text-[10px] text-white/60">Certified Security</div>
            </div>
          </div>
        </motion.div>

        {/* Right Side: Clean Google Sign-In Glass Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="sm:w-80 w-full rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 p-5 sm:p-6 flex flex-col justify-between space-y-5"
        >
          {isAuthenticated ? (

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {user.avatarUrl && (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-11 h-11 rounded-full object-cover border-2 border-blue-400"
                  />
                )}
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>{user.name}</span>
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-xs text-white/60 truncate max-w-[180px]">{user.email}</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-600/20 border border-blue-400/30 text-xs text-blue-300 space-y-1">
                <div className="font-semibold">Signed in with Google</div>
                <div className="text-[11px] text-white/70">Session active & secure</div>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handleSignOut}
                className="w-full py-2.5 px-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Welcome back</h3>
                <p className="text-xs text-white/70">Use your Google account to continue</p>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-400/30 text-xs text-red-300">
                  {errorMsg}
                </div>
              )}

              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleSignIn}
                className="w-full py-3.5 px-4 rounded-full bg-white hover:bg-gray-100 text-gray-900 text-xs font-semibold flex items-center justify-center gap-3 transition-all shadow-xl disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                  <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z" />
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
                </svg>
                <span>{loading ? 'Opening Google…' : 'Continue with Google'}</span>
              </button>

              <p className="text-[10px] text-white/50 text-center leading-relaxed">
                We only use Google to confirm it is you. By continuing you agree to the Vamvamvam AI Terms.
              </p>
            </div>
          )}
        </motion.div>

      </main>
    </div>
  );
};
