import React, { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { HLSVideo } from '../common/HLSVideo';

interface ServicesPageViewProps {
  onGetStarted: () => void;
}

const SERVICES_LIST = [
  {
    id: 'workflow',
    title: 'Autonomous Workflow Setup',
    tagline: 'Custom Agent Deployment',
    description: 'We construct tailored autonomous AI pipelines connecting CMS, CRM, and social channels.',
    metric: '24/7 Deployment',
    features: ['Custom Prompt Tuning', 'Multi-Platform Webhooks', 'Automated Fallbacks'],
  },
  {
    id: 'repurpose',
    title: 'Repurpose Engine',
    tagline: '1 Video -> 10 Social Assets',
    description: 'Provide a single long-form video or blog article and our AI extracts high-converting clips & copy.',
    metric: '1 -> 10 Multiplier',
    features: ['Auto Subtitles & Hooks', 'Multi-Aspect Ratio Export', 'Voice Adaptation'],
  },
  {
    id: 'autopilot',
    title: 'Operations Guardrails',
    tagline: 'Zero-Downtime Autonomous Ops',
    description: 'Continuous background monitoring ensures AI agents operate within explicit brand safety boundaries.',
    metric: '100% Policy Match',
    features: ['Crisis Auto-Pause Rules', 'SOC2 Audit Logging', 'Human Review Queue'],
  },
  {
    id: 'agency',
    title: 'Multi-Brand Scale',
    tagline: 'Manage 50+ Clients in One Hub',
    description: 'Specialized enterprise setup for marketing agencies to manage isolated brand brains and unified billing.',
    metric: '50+ Client Capacity',
    features: ['Isolated Brand Memory', 'Role Access Control', 'Client Dashboards'],
  },
];

export const ServicesPageView: React.FC<ServicesPageViewProps> = ({ onGetStarted }) => {
  const [activeService, setActiveService] = useState(SERVICES_LIST[0]);

  return (
    <div className="relative min-h-screen w-full bg-black text-white font-sans flex flex-col justify-between overflow-x-hidden">
      {/* Background Video */}
      <HLSVideo
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/60 z-0 pointer-events-none" />

      {/* Bottom-Anchored Main Content */}
      <main className="relative z-10 mt-auto pt-24 sm:pt-28 px-5 pb-8 sm:px-8 sm:pb-12 lg:px-12 lg:pb-16 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 sm:gap-8 max-w-7xl mx-auto w-full">
        
        {/* Left Side: Title & CTAs */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-xl space-y-4"
        >
          <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-mono font-medium uppercase tracking-wider text-blue-300">
            Our Services & Capabilities
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-semibold leading-[1.15] tracking-tight text-white">
            Our Services: Autonomous AI Workflows
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-white/80 leading-relaxed font-light">
            We don't just give you tools—we engineer and deploy custom AI agent operations tailored to your business model.
          </p>

          <div className="pt-2">
            <button
              onClick={onGetStarted}
              className="rounded-full px-6 py-2.5 text-sm font-medium text-white btn-cta-gradient shadow-lg hover:opacity-90 transition-all inline-flex items-center gap-2"
            >
              <span>Get started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* Right Side: Compact Interactive Glass Card for Services */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col gap-3 w-full lg:w-[460px]"
        >
          
          {/* Service Selector Tabs */}
          <div className="grid grid-cols-2 gap-2">
            {SERVICES_LIST.map((svc) => {
              const isSelected = activeService.id === svc.id;
              return (
                <button
                  key={svc.id}
                  onClick={() => setActiveService(svc)}
                  className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-white/20 border-blue-400/60 backdrop-blur-xl text-white'
                      : 'bg-white/10 border-white/10 text-white/70 hover:bg-white/15'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{svc.title}</div>
                  <div className="font-silkscreen text-[10px] text-blue-300 mt-1">{svc.metric}</div>
                </button>
              );
            })}
          </div>

          {/* Selected Service Detail Box */}
          <motion.div 
            key={activeService.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 p-4 sm:p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">{activeService.title}</h3>
                <p className="text-xs text-blue-300 font-medium">{activeService.tagline}</p>
              </div>
              <span className="font-silkscreen text-[10px] sm:text-xs font-normal text-white px-2.5 py-1 rounded bg-blue-600/30 border border-blue-400/30">
                {activeService.metric}
              </span>
            </div>

            <p className="text-xs text-white/80 leading-relaxed font-light">
              {activeService.description}
            </p>

            <div className="pt-2 border-t border-white/10 flex flex-wrap gap-1.5 sm:gap-2">
              {activeService.features.map((f) => (
                <span key={f} className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-white/90 bg-white/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-white/10">
                  <CheckCircle2 className="w-3 h-3 text-blue-400" />
                  <span>{f}</span>
                </span>
              ))}
            </div>
          </motion.div>

        </motion.div>

      </main>
    </div>
  );
};
