import React from 'react';
import { Play, Sparkles } from 'lucide-react';

export const FooterVideoShowcase: React.FC = () => {
  return (
    <footer className="relative w-full h-[500px] overflow-hidden bg-black text-white mt-16 border-t border-slate-800">
      {/* Background Video */}
      <video
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260725_114042_d2ed2a89-f2fa-449b-9609-da456344257b.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover lg:scale-[1.2] opacity-40"
      />

      {/* Overlay UI Content */}
      <div className="relative z-10 max-w-7xl mx-auto h-full px-6 flex flex-col justify-between py-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold tracking-tight text-white">Bros</span>
            <span className="text-2xl font-bold tracking-tight text-brand-500">AI</span>
          </div>
          <span className="text-xs font-pixel uppercase tracking-widest text-slate-300">
            Autonomous Social Engine
          </span>
        </div>

        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700 backdrop-blur-md text-xs text-brand-400 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hire Your AI Social Media Department</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Connect. Train. Let your AI Manager run your brand.
          </h2>
          <p className="text-sm text-slate-300">
            Zero technical automation workflows. Real brand-aware content creation, multi-platform scheduling, lead detection, and automated notifications.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-white/20 pt-6 text-xs text-slate-400">
          <div>© 2026 Bros AI SaaS Inc. All rights reserved.</div>
          <div className="flex space-x-6 mt-4 sm:mt-0">
            <a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
