import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface GlassOption {
  value: string;
  label: string;
}

export interface GlassSelectProps {
  options: (string | GlassOption)[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  compact?: boolean;
  className?: string;
  disabled?: boolean;
}

export const GlassSelect: React.FC<GlassSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  compact = false,
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options array into { value, label } objects
  const normalizedOptions: GlassOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full text-left font-medium transition-all cursor-pointer flex items-center justify-between shadow-lg focus:outline-none focus:ring-2 focus:ring-white/20 ${
          compact ? 'px-3.5 py-2 text-xs rounded-lg' : 'px-4 py-2.5 text-xs sm:text-sm rounded-xl'
        } ${
          isOpen
            ? 'bg-zinc-900 border-white/40 text-white ring-2 ring-white/20 shadow-xl'
            : 'bg-zinc-950 hover:bg-zinc-900 border-white/20 text-white'
        } border disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span className="truncate pr-2">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`shrink-0 transition-transform duration-200 text-white/70 ${
            compact ? 'w-3.5 h-3.5' : 'w-4 h-4'
          } ${isOpen ? 'rotate-180 text-white' : ''}`}
        />
      </button>

      {/* Translucent Glass Dropdown Popover Menu */}
      {isOpen && (
        <div
            className={`absolute left-0 right-0 top-full mt-2 z-50 rounded-xl bg-zinc-950 border border-white/25 shadow-2xl p-1.5 space-y-1 max-h-60 overflow-y-auto custom-scrollbar ${
            compact ? 'text-xs' : 'text-xs sm:text-sm'
          }`}
        >
          {normalizedOptions.map((option) => {
            const isSelected = option.value === value;
            return (
              <div
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`w-full text-left px-3.5 py-2 rounded-lg font-medium transition-all flex items-center justify-between cursor-pointer select-none ${
                  isSelected
                    ? 'bg-white/15 text-white font-semibold border border-white/30 shadow-sm'
                    : 'text-white/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-2" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

