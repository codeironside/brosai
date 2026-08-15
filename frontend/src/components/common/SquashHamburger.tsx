import React from 'react';
import { motion } from 'framer-motion';

interface SquashHamburgerProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

export const SquashHamburger: React.FC<SquashHamburgerProps> = ({
  isOpen,
  onClick,
  className = '',
}) => {
  const springTransition = {
    type: 'spring' as const,
    stiffness: 300,
    damping: 20,
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Toggle menu"
      className={`relative z-50 flex items-center justify-center cursor-pointer rounded-full bg-white/10 backdrop-blur-lg border border-white/15 hover:bg-white/20 transition-colors p-2.5 ${className}`}
    >
      {/* Container: 15x10px mobile, 18x12px desktop */}
      <div className="relative w-[15px] sm:w-[18px] h-[10px] sm:h-[12px] flex flex-col justify-between">
        {/* Top Bar */}
        <motion.span
          initial={false}
          animate={
            isOpen
              ? {
                  y: 'calc(5px - 0.6px)',
                  rotate: 45,
                }
              : {
                  y: 0,
                  rotate: 0,
                }
          }
          transition={springTransition}
          className="absolute top-0 left-0 right-0 h-[1.2px] sm:h-[1.5px] bg-white rounded-full origin-center"
        />

        {/* Middle Bar */}
        <motion.span
          initial={false}
          animate={
            isOpen
              ? {
                  opacity: 0,
                  scale: 0,
                }
              : {
                  opacity: 1,
                  scale: 1,
                }
          }
          transition={springTransition}
          className="absolute top-[calc(50%-0.6px)] left-0 right-0 h-[1.2px] sm:h-[1.5px] bg-white rounded-full"
        />

        {/* Bottom Bar */}
        <motion.span
          initial={false}
          animate={
            isOpen
              ? {
                  y: 'calc(-5px + 0.6px)',
                  rotate: -45,
                }
              : {
                  y: 0,
                  rotate: 0,
                }
          }
          transition={springTransition}
          className="absolute bottom-0 left-0 right-0 h-[1.2px] sm:h-[1.5px] bg-white rounded-full origin-center"
        />
      </div>
    </button>
  );
};
