import React from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { HLSVideo } from '../common/HLSVideo';

interface AboutPageViewProps {
  onGetStarted: () => void;
}

export const AboutPageView: React.FC<AboutPageViewProps> = ({ onGetStarted }) => {
  return (
    <div className="relative min-h-screen w-full bg-black text-white font-sans flex flex-col justify-between overflow-x-hidden">
      {/* Background Video */}
      <HLSVideo
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260603_132049_036591b8-6e92-4760-b94c-a7ea6eef315c.mp4"
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/60 z-0 pointer-events-none" />

      {/* Bottom-Anchored Main Content */}
      <main className="relative z-10 mt-auto pt-24 sm:pt-28 px-5 pb-8 sm:px-8 sm:pb-12 lg:px-12 lg:pb-16 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 sm:gap-8 max-w-7xl mx-auto w-full">
        
        {/* Left Side: Headline & Philosophy */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-xl space-y-4"
        >
          <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-mono font-medium uppercase tracking-wider text-blue-300">
            About Vamvamvam AI Architecture
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-semibold leading-[1.15] tracking-tight text-white">
            Pioneering the Autonomous AI Workforce
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-white/80 leading-relaxed font-light">
            Vamvamvam AI was founded on a simple thesis: humans shouldn't spend their best creative hours executing repetitive operational workflows.
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

        {/* Right Side: Two Glass Pillars with Silkscreen Metrics */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto"
        >
          
          {/* Glass Pillar 1 */}
          <div className="sm:w-64 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 p-4 sm:p-5 flex flex-col justify-between space-y-3">
            <div>
              <div className="font-silkscreen text-xl sm:text-2xl font-normal text-white">
                20+ Hrs
              </div>
              <p className="text-xs text-blue-300 font-semibold mt-1">Saved Per Week</p>
              <p className="text-[11px] sm:text-xs text-white/70 leading-relaxed mt-2">
                Our autonomous agents handle content distribution and lead engagement so your core team stays focused on product and strategy.
              </p>
            </div>
          </div>

          {/* Glass Pillar 2 */}
          <div className="sm:w-64 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 p-4 sm:p-5 flex flex-col justify-between space-y-3">
            <div>
              <div className="font-silkscreen text-xl sm:text-2xl font-normal text-white">
                SOC2
              </div>
              <p className="text-xs text-blue-300 font-semibold mt-1">Enterprise Safety</p>
              <p className="text-[11px] sm:text-xs text-white/70 leading-relaxed mt-2">
                Built from the ground up with strict policy rules, isolated brand brain memory vectors, and instant emergency pause controls.
              </p>
            </div>
          </div>

        </motion.div>

      </main>
    </div>
  );
};
