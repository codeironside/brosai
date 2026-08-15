import React, { useState } from 'react';
import { ArrowRight, Brain, Calendar, ShieldCheck, Inbox, TrendingUp, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';
import { HLSVideo } from '../common/HLSVideo';

interface ModulesPageViewProps {
  onOpenModule: (tab: string) => void;
  onGetStarted: () => void;
}

const MODULES_LIST = [
  {
    id: 'brand',
    name: 'Brand Brain',
    icon: Brain,
    tagline: 'Brand Identity Memory',
    desc: 'Stores voice, colors, and doc guidelines so all outputs match 100%.',
    stat: '99.9% Match',
  },
  {
    id: 'calendar',
    name: 'Content Factory',
    icon: Calendar,
    tagline: '30-Day Multi-Platform Pipeline',
    desc: 'Auto-adapts concepts across LinkedIn, X, Instagram, TikTok, and YouTube.',
    stat: '10x Speed',
  },
  {
    id: 'autopilot',
    name: 'Autopilot Guardrails',
    icon: ShieldCheck,
    tagline: 'Policy Safety Enforcer',
    desc: 'Real-time content verification and crisis protection safety triggers.',
    stat: 'SOC2 Certified',
  },
  {
    id: 'inbox',
    name: 'Unified Inbox',
    icon: Inbox,
    tagline: 'Autonomous Social Engagement',
    desc: 'Replies to DMs and comments using context-aware operational agents.',
    stat: '< 2min SLA',
  },
  {
    id: 'trends',
    name: 'Trend Radar',
    icon: TrendingUp,
    tagline: 'Real-Time Market Intelligence',
    desc: 'Scrapes viral trends and news in your niche to propose instant hooks.',
    stat: '24/7 Scraping',
  },
  {
    id: 'analytics',
    name: 'ROI Analytics Engine',
    icon: Cpu,
    tagline: 'Revenue & Time Tracking',
    desc: 'Measures engagement rates and team hours saved with live dashboards.',
    stat: '$14.2k Saved',
  },
];

export const ModulesPageView: React.FC<ModulesPageViewProps> = ({ onOpenModule, onGetStarted }) => {
  const [selectedModule, setSelectedModule] = useState(MODULES_LIST[0]);

  return (
    <div className="relative min-h-screen w-full bg-black text-white font-sans flex flex-col justify-between overflow-x-hidden">
      {/* Background Video */}
      <HLSVideo
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260729_102822_0e6c87e8-c141-4744-bf32-ad30db296371.mp4"
      />

      {/* Dark Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/60 z-0 pointer-events-none" />

      {/* Bottom-Anchored Main Content */}
      <main className="relative z-10 mt-auto pt-24 sm:pt-28 px-5 pb-8 sm:px-8 sm:pb-12 lg:px-12 lg:pb-16 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 sm:gap-8 max-w-7xl mx-auto w-full">
        
        {/* Left Side: Headline & Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-xl space-y-4"
        >
          <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-mono font-medium uppercase tracking-wider text-blue-300">
            Autonomous Agent Architecture
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-semibold leading-[1.15] tracking-tight text-white">
            6 Specialized AI Modules. One Command Hub.
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-white/80 leading-relaxed font-light">
            Deploy hyper-specialized agents for content repurposing, brand compliance, real-time trend surveillance, and automated customer engagement.
          </p>

          <div className="pt-2 flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onGetStarted}
              className="rounded-full px-6 py-2.5 text-sm font-medium text-white btn-cta-gradient shadow-lg hover:opacity-90 transition-all"
            >
              Get started
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onOpenModule(selectedModule.id)}
              className="rounded-full px-5 py-2.5 text-sm font-medium text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-all flex items-center gap-2"
            >
              <span>Explore {selectedModule.name}</span>
              <ArrowRight className="w-4 h-4 text-blue-400" />
            </motion.button>
          </div>
        </motion.div>

        {/* Right Side: Compact Glass Cards for Modules */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col gap-3 w-full lg:w-[480px]"
        >
          
          {/* Module Selector Chips Grid */}
          <div className="grid grid-cols-3 gap-2">
            {MODULES_LIST.map((mod) => {
              const isSelected = selectedModule.id === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setSelectedModule(mod)}
                  className={`p-2.5 rounded-xl border text-left transition-all duration-200 ${
                    isSelected
                      ? 'bg-white/20 border-blue-400/60 backdrop-blur-xl shadow-lg'
                      : 'bg-white/10 border-white/10 backdrop-blur-md hover:bg-white/15 text-white/70'
                  }`}
                >
                  <div className="text-xs font-semibold text-white truncate">{mod.name}</div>
                  <div className="font-silkscreen text-[10px] text-blue-300 mt-1">{mod.stat}</div>
                </button>
              );
            })}
          </div>

          {/* Active Module Compact Card */}
          <motion.div 
            key={selectedModule.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 p-4 sm:p-5 flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">{selectedModule.name}</h3>
                <p className="text-xs text-blue-300 font-medium">{selectedModule.tagline}</p>
              </div>
              <span className="font-silkscreen text-xs font-normal text-white px-2.5 py-1 rounded bg-blue-600/30 border border-blue-400/30">
                {selectedModule.stat}
              </span>
            </div>

            <p className="text-xs text-white/80 leading-relaxed font-light">
              {selectedModule.desc}
            </p>
          </motion.div>

        </motion.div>

      </main>
    </div>
  );
};
