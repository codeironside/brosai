import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HLSVideo } from '../common/HLSVideo';

interface ClientelePageViewProps {
  onGetStarted: () => void;
}

const TESTIMONIALS = [
  {
    name: 'Sara Klein',
    role: 'Director of Operations',
    company: 'Stratify',
    avatar: 'https://i.pravatar.cc/72?img=12',
    quote: 'With Vamvamvam AI we went from managing tedious operational work to having AI agents that handle everything.',
    metric: '28 Hrs Saved',
  },
  {
    name: 'Marcus Vance',
    role: 'VP of Growth',
    company: 'HyperScale',
    avatar: 'https://i.pravatar.cc/72?img=33',
    quote: 'Our agency manages 14 high-tier clients. Brand Brain guarantees zero compliance slips across all social posts.',
    metric: '3.4x Reach',
  },
  {
    name: 'Elena Rostova',
    role: 'Founder & CEO',
    company: 'Nexus Cloud',
    avatar: 'https://i.pravatar.cc/72?img=47',
    quote: 'Trend Radar alerted us to a trending viral hook hours before competitors. Captured 12k signups in 48 hours.',
    metric: '12k Leads',
  },
];

export const ClientelePageView: React.FC<ClientelePageViewProps> = ({ onGetStarted }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = TESTIMONIALS[activeIdx];

  return (
    <div className="relative min-h-screen w-full bg-black text-white font-sans flex flex-col justify-between overflow-x-hidden">
      {/* Background Video */}
      <HLSVideo
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_171521_25968ba2-b594-4b32-aab7-f6b69398a6fa.mp4"
      />

      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/70 z-0 pointer-events-none" />

      {/* Bottom-Anchored Main Content */}
      <main className="relative z-10 mt-auto pt-24 sm:pt-28 px-5 pb-8 sm:px-8 sm:pb-12 lg:px-12 lg:pb-16 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 sm:gap-8 max-w-7xl mx-auto w-full">
        
        {/* Left Side: Headline & Stats Counters */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-xl space-y-4"
        >
          <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-mono font-medium uppercase tracking-wider text-blue-300">
            Enterprise Clientele & Case Studies
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-semibold leading-[1.15] tracking-tight text-white">
            Loved by 42,500+ Operations Leaders
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-white/80 leading-relaxed font-light">
            From high-growth SaaS founders to global agencies, Vamvamvam AI powers autonomous growth and operational freedom.
          </p>

          {/* Stats Bar with Silkscreen Font */}
          <div className="pt-2 grid grid-cols-3 gap-2.5 sm:gap-3">
            <div className="rounded-xl bg-white/10 backdrop-blur-md p-2.5 sm:p-3 border border-white/10">
              <div className="font-silkscreen text-lg sm:text-2xl font-normal text-white">42,500+</div>
              <div className="text-[10px] sm:text-[11px] text-white/70 mt-1">Client Teams</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-md p-2.5 sm:p-3 border border-white/10">
              <div className="font-silkscreen text-lg sm:text-2xl font-normal text-white">99.8%</div>
              <div className="text-[10px] sm:text-[11px] text-white/70 mt-1">Ops Uptime</div>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-md p-2.5 sm:p-3 border border-white/10">
              <div className="font-silkscreen text-lg sm:text-2xl font-normal text-blue-300">20+ Hrs</div>
              <div className="text-[10px] sm:text-[11px] text-white/70 mt-1">Saved Weekly</div>
            </div>
          </div>
        </motion.div>

        {/* Right Side: Compact Testimonial Glass Cards */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col gap-3 w-full lg:w-[420px]"
        >
          
          {/* Active Testimonial Card */}
          <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <blockquote className="text-xs sm:text-sm leading-relaxed text-white/90 italic">
              "{active.quote}"
            </blockquote>

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <div className="flex items-center gap-3">
                <img
                  src={active.avatar}
                  alt={active.name}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-blue-400/40"
                />
                <div>
                  <div className="text-xs font-bold text-white">{active.name}</div>
                  <div className="text-[10px] sm:text-[11px] text-white/60">{active.role} • {active.company}</div>
                </div>
              </div>

              <div className="font-silkscreen text-[10px] sm:text-xs text-blue-300 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-blue-600/30 border border-blue-400/30">
                {active.metric}
              </div>
            </div>
          </div>

          {/* Testimonial Switchers */}
          <div className="flex items-center gap-2">
            {TESTIMONIALS.map((t, idx) => (
              <button
                key={t.name}
                onClick={() => setActiveIdx(idx)}
                className={`flex-1 py-2 px-2 sm:px-3 rounded-xl border text-[11px] sm:text-xs font-semibold transition-all ${
                  activeIdx === idx
                    ? 'bg-white/20 border-blue-400/60 text-white'
                    : 'bg-white/10 border-white/10 text-white/60 hover:text-white'
                }`}
              >
                {t.company}
              </button>
            ))}
          </div>

        </motion.div>

      </main>
    </div>
  );
};
