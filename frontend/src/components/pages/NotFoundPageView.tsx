import React from 'react';
import { HLSVideo } from '../common/HLSVideo';

interface NotFoundPageViewProps {
  onGoHome: () => void;
}

export const NotFoundPageView: React.FC<NotFoundPageViewProps> = ({ onGoHome }) => {
  return (
    <div className="relative min-h-screen w-full bg-black text-white font-sans overflow-x-hidden">
      <HLSVideo src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260603_132049_036591b8-6e92-4760-b94c-a7ea6eef315c.mp4" />
      <div className="absolute inset-0 bg-black/70 z-0 pointer-events-none" />
      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-5 text-center">
        <p className="font-silkscreen text-6xl sm:text-8xl text-white/90">404</p>
        <h1 className="mt-4 text-2xl sm:text-4xl font-semibold">This page does not exist</h1>
        <p className="mt-3 max-w-md text-sm text-white/70">
          The link is broken or the page was moved. Head back to Vamvamvam AI and continue from there.
        </p>
        <button
          type="button"
          onClick={onGoHome}
          className="mt-8 rounded-full px-7 py-3 text-sm font-semibold text-white btn-cta-gradient"
        >
          Back to home
        </button>
      </main>
    </div>
  );
};
