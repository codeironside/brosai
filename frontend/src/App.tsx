import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';


// Dedicated Page Views & Components
import { ModulesPageView } from './components/pages/ModulesPageView';
import { ClientelePageView } from './components/pages/ClientelePageView';
import { ServicesPageView } from './components/pages/ServicesPageView';
import { AboutPageView } from './components/pages/AboutPageView';
import { SignInPageView } from './components/pages/SignInPageView';
import { DashboardPageView } from './components/pages/DashboardPageView';
import { LegalPageView } from './components/pages/LegalPageView';
import { HLSVideo } from './components/common/HLSVideo';
import { SquashHamburger } from './components/common/SquashHamburger';

type PageRoute = 'home' | 'modules' | 'clientele' | 'services' | 'about' | 'signin' | 'dashboard' | 'privacy' | 'terms';

function VamvamvamAIHeroContent() {
  const { isAuthenticated, logout } = useApp();
  const [currentPage, setCurrentPage] = useState<PageRoute>(() => {
    if (typeof window === 'undefined') return 'home';
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth') || sessionStorage.getItem('brosai_return_dashboard') === '1') {
      return 'dashboard';
    }
    return 'home';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Protected Dashboard Route Guard: redirect to signin if not authenticated
  useEffect(() => {
    if (currentPage === 'dashboard' && !isAuthenticated) {
      setCurrentPage('signin');
    }
  }, [currentPage, isAuthenticated]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);


  const navigateTo = (page: PageRoute) => {
    setCurrentPage(page);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen w-full bg-black text-white font-sans overflow-x-hidden">
      
      {/* TOP NAVIGATION BAR */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-6 lg:px-12 bg-gradient-to-b from-black/90 via-black/50 to-transparent backdrop-blur-md">
        
        {/* Logo Component */}
        <div 
          onClick={() => navigateTo('home')}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <svg 
            className="w-6 h-6 fill-white transition-transform duration-300 group-hover:scale-105" 
            viewBox="0 0 256 256"
          >
            <path d="M 128 128 C 128 198.692 70.692 256 0 256 C 0 185.308 57.308 128 128 128 Z M 128 128 C 198.692 128 256 185.308 256 256 C 185.308 256 128 198.692 128 128 Z M 0 0 C 70.692 0 128 57.308 128 128 C 57.308 128 0 70.692 0 0 Z M 256 0 C 256 70.692 198.692 128 128 128 C 128 57.308 185.308 0 256 0 Z" />
          </svg>
          <span className="text-lg font-semibold text-white lowercase tracking-tight">
            vamvamvam ai
          </span>
        </div>

        {/* Desktop Navigation Cluster (`hidden md:flex`) */}
        <div className="hidden md:flex items-center gap-3">
          {/* Glass Pill Cluster */}
          <div className="rounded-full bg-white/10 px-1.5 py-1.5 backdrop-blur-lg flex items-center gap-1 border border-white/10">
            <button 
              onClick={() => navigateTo('home')} 
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                currentPage === 'home' ? 'bg-white/20 text-white shadow' : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              Home
            </button>
            {isAuthenticated && (
              <button 
                onClick={() => navigateTo('dashboard')} 
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  currentPage === 'dashboard' ? 'bg-white/20 text-white shadow font-semibold' : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                Dashboard
              </button>
            )}

            <button 
              onClick={() => navigateTo('modules')} 
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                currentPage === 'modules' ? 'bg-white/20 text-white shadow' : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              Modules
            </button>
            <button 
              onClick={() => navigateTo('clientele')} 
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                currentPage === 'clientele' ? 'bg-white/20 text-white shadow' : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              Clientele
            </button>
            <button 
              onClick={() => navigateTo('services')} 
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                currentPage === 'services' ? 'bg-white/20 text-white shadow' : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              Our Services
            </button>
            <button 
              onClick={() => navigateTo('about')} 
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                currentPage === 'about' ? 'bg-white/20 text-white shadow' : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              About
            </button>
          </div>

          {/* Separate CTA Pill */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (isAuthenticated) {
                logout();
                navigateTo('home');
              } else {
                navigateTo('signin');
              }
            }}
            className="rounded-full px-5 py-2.5 text-sm font-medium text-white btn-cta-gradient flex items-center justify-center transition-all hover:opacity-90 shadow-lg"
          >
            {isAuthenticated ? 'Sign out' : 'Get started'}
          </motion.button>
        </div>


        {/* Mobile Hamburger Button with SquashHamburger animation */}
        <div className="md:hidden">
          <SquashHamburger
            isOpen={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />
        </div>
      </nav>

      {/* MOBILE MENU GLASS OVERLAY + DRAWER */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md"
            />

            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 z-40 h-full w-72 bg-black/95 backdrop-blur-xl flex flex-col justify-between border-l border-white/10"
            >
              {/* Links List */}
              <div className="px-6 pt-24 flex flex-col gap-2">
                {[
                  { label: 'Home', page: 'home' },
                  ...(isAuthenticated ? [{ label: 'Dashboard', page: 'dashboard' }] : []),
                  { label: 'Modules', page: 'modules' },
                  { label: 'Clientele', page: 'clientele' },
                  { label: 'Our Services', page: 'services' },
                  { label: 'About', page: 'about' },
                ].map((link, idx) => (

                  <motion.button
                    key={link.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => navigateTo(link.page as PageRoute)}
                    className={`rounded-xl px-4 py-3.5 text-base font-medium text-left transition-all ${
                      currentPage === link.page
                        ? 'bg-white/20 text-white font-semibold'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {link.label}
                  </motion.button>
                ))}
              </div>

              {/* Bottom Mobile CTA */}
              <div className="px-6 pb-10">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    if (isAuthenticated) {
                      logout();
                      navigateTo('home');
                    } else {
                      navigateTo('signin');
                    }
                  }}
                  className="w-full rounded-full py-3.5 text-base font-medium text-white btn-cta-gradient text-center shadow-lg"
                >
                  {isAuthenticated ? 'Sign out' : 'Get started'}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DYNAMIC PAGE VIEWS WITH ANIMATED TRANSITIONS */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full min-h-screen"
        >
          {currentPage === 'home' && (
            <section className="relative min-h-screen w-full overflow-hidden bg-black text-white font-sans flex flex-col justify-between">
              
              {/* Home Video Background */}
              <HLSVideo
                src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_115001_bcdaa3b4-03de-47e7-ad63-ae3e392c32d4.mp4"
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/60 z-0 pointer-events-none" />

              {/* MAIN HOME HERO CONTENT */}
              <main className="relative z-10 mt-auto pt-24 sm:pt-28 px-5 pb-8 sm:px-8 sm:pb-12 lg:px-12 lg:pb-16 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 sm:gap-8 max-w-7xl mx-auto w-full">
                
                {/* LEFT SIDE: HEADLINE + REPLACED GLASS CTA BUTTON */}
                <div className="max-w-xl space-y-4 sm:space-y-5">
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                    className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-mono font-medium uppercase tracking-wider text-blue-300"
                  >
                    Autonomous AI Ops Platform
                  </motion.div>

                  <motion.h1 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="text-2xl sm:text-4xl lg:text-[3.5rem] font-semibold leading-[1.15] tracking-tight text-white"
                  >
                    Ship AI workers that grind while you rest
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="text-xs sm:text-sm md:text-base text-white/80 leading-relaxed font-light"
                  >
                    Automate content creation, audience inboxing, and daily operations with self-governing AI agents.
                  </motion.p>

                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="flex flex-wrap items-center gap-3 pt-2"
                  >
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => navigateTo(isAuthenticated ? 'dashboard' : 'signin')}
                      className="rounded-full px-7 py-3 text-sm font-semibold text-white btn-cta-gradient shadow-xl flex items-center gap-2 transition-all"
                    >
                      <span>{isAuthenticated ? 'Open dashboard' : 'Get Started Free'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </motion.div>
                </div>

                {/* RIGHT SIDE: TWO GLASS CARDS */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="flex flex-col sm:flex-row gap-4 sm:gap-5 w-full lg:w-auto"
                >
                  
                  {/* GLASS CARD 1: STATS */}
                  <div className="sm:w-64 rounded-2xl bg-white/10 backdrop-blur-lg p-4 sm:p-6 flex flex-col justify-between border border-white/15">
                    <div>
                      <div className="font-silkscreen text-2xl sm:text-4xl font-normal tracking-tight text-white">
                        42,500+
                      </div>
                      <p className="text-xs sm:text-sm leading-relaxed mt-2 sm:mt-4 text-white/70">
                        Teams run Vamvamvam AI to handle recurring ops daily.
                      </p>
                    </div>
                  </div>

                  {/* GLASS CARD 2: TESTIMONIAL */}
                  <div className="sm:w-64 rounded-2xl bg-white/10 backdrop-blur-lg p-4 sm:p-6 flex flex-col justify-between border border-white/15">
                    <div>
                      <div className="flex items-center gap-2 mb-3 sm:mb-4">
                        <div className="w-6 h-6 rounded-md bg-black text-white font-bold text-xs flex items-center justify-center border border-white/20">
                          S
                        </div>
                        <span className="text-sm font-semibold text-white">
                          Stratify
                        </span>
                      </div>

                      <blockquote className="text-xs sm:text-sm leading-relaxed text-white/80 italic">
                        "With Vamvamvam AI we went from managing tedious operational work to having AI agents that handle everything."
                      </blockquote>
                    </div>

                    <div className="flex items-center gap-3 mt-4 sm:mt-5">
                      <img
                        src="https://i.pravatar.cc/72?img=12"
                        alt="Sara Klein"
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-white/20"
                      />
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-white">
                          Sara Klein
                        </div>
                        <div className="text-[10px] sm:text-xs text-white/60">
                          Dir of Operations
                        </div>
                      </div>
                    </div>
                  </div>

                </motion.div>

              </main>

            </section>
          )}

          {currentPage === 'modules' && (
            <ModulesPageView
              onOpenModule={() => navigateTo('signin')}
              onGetStarted={() => navigateTo('signin')}
            />
          )}

          {currentPage === 'clientele' && (
            <ClientelePageView
              onGetStarted={() => navigateTo('signin')}
            />
          )}

          {currentPage === 'services' && (
            <ServicesPageView
              onGetStarted={() => navigateTo('signin')}
            />
          )}

          {currentPage === 'about' && (
            <AboutPageView
              onGetStarted={() => navigateTo('signin')}
            />
          )}

          {currentPage === 'privacy' && <LegalPageView kind="privacy" />}
          {currentPage === 'terms' && <LegalPageView kind="terms" />}

          {currentPage === 'signin' && (
            <SignInPageView onLoginSuccess={() => navigateTo('dashboard')} />
          )}

          {currentPage === 'dashboard' && (
            <DashboardPageView />
          )}
        </motion.div>
      </AnimatePresence>

      {!['dashboard', 'signin'].includes(currentPage) && (
        <div className="relative z-30 px-5 sm:px-12 py-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-white/45">
          <span>© 2026 Vamvamvam AI</span>
          <button type="button" onClick={() => navigateTo('privacy')} className="hover:text-white">
            Privacy Policy
          </button>
          <button type="button" onClick={() => navigateTo('terms')} className="hover:text-white">
            Terms of Service
          </button>
        </div>
      )}

    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <VamvamvamAIHeroContent />
    </AppProvider>
  );
}

export default App;
