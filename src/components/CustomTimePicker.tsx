import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock } from 'lucide-react';

interface CustomTimePickerProps {
  value: string; // HH:MM format
  onChange: (time: string) => void;
  disabled?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export function CustomTimePicker({ value, onChange, disabled, onOpenChange }: CustomTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Parse value or default to 12:00
  const [hours, minutes] = value ? value.split(':').map(Number) : [12, 0];

  // Generate hours and minutes
  const hoursArray = Array.from({ length: 24 }, (_, i) => i);
  const minutesArray = Array.from({ length: 60 }, (_, i) => i);

  // Scroll to selected value when opened
  useEffect(() => {
    let scrollTimer: NodeJS.Timeout | null = null;

    if (isOpen && hoursRef.current && minutesRef.current) {
      const ITEM_HEIGHT = 56; // h-14 = 56px

      scrollTimer = setTimeout(() => {
        if (hoursRef.current) {
          hoursRef.current.scrollTop = hours * ITEM_HEIGHT;
        }
        if (minutesRef.current) {
          minutesRef.current.scrollTop = minutes * ITEM_HEIGHT;
        }
      }, 150);
    }

    // Cleanup both timers on unmount or dependency change
    return () => {
      if (scrollTimer) {
        clearTimeout(scrollTimer);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, [isOpen, hours, minutes]);

  // Handle scroll - update selected value based on scroll position
  const handleScroll = (type: 'hours' | 'minutes') => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const ITEM_HEIGHT = 56;
      const ref = type === 'hours' ? hoursRef : minutesRef;

      if (!ref.current) return;

      const scrollTop = ref.current.scrollTop;
      const selectedIndex = Math.round(scrollTop / ITEM_HEIGHT);

      if (type === 'hours') {
        const newHour = Math.max(0, Math.min(23, selectedIndex));
        const formattedHour = String(newHour).padStart(2, '0');
        const formattedMinute = String(minutes).padStart(2, '0');
        onChange(`${formattedHour}:${formattedMinute}`);

        // Snap to exact position
        ref.current.scrollTop = newHour * ITEM_HEIGHT;
      } else {
        const newMinute = Math.max(0, Math.min(59, selectedIndex));
        const formattedHour = String(hours).padStart(2, '0');
        const formattedMinute = String(newMinute).padStart(2, '0');
        onChange(`${formattedHour}:${formattedMinute}`);

        // Snap to exact position
        ref.current.scrollTop = newMinute * ITEM_HEIGHT;
      }
    }, 150);
  };

  const formatDisplayTime = () => {
    if (!value) return 'Выберите время';
    return value;
  };

  return (
    <>
      {/* Display Button */}
      <motion.button
        type="button"
        onClick={() => !disabled && handleOpenChange(!isOpen)}
        disabled={disabled}
        className={`flex h-12 w-full rounded-xl border-2 bg-background px-4 py-3 text-base items-center justify-between transition-all ${
          disabled
            ? 'cursor-not-allowed opacity-50 border-border/30'
            : 'border-[#4A9FD8]/30 hover:border-[#4A9FD8]/50'
        }`}
        whileHover={!disabled ? { scale: 1.01 } : {}}
        whileTap={!disabled ? { scale: 0.99 } : {}}
      >
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-[#4A9FD8]" />
          <span className={`font-medium ${value ? 'text-foreground' : 'text-muted-foreground'}`}>
            {formatDisplayTime()}
          </span>
        </div>
        <svg
          className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </motion.button>

      {/* Modal Wheel Picker - iPhone Style */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
              onClick={() => handleOpenChange(false)}
            />

            {/* Picker Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, type: 'spring', damping: 25 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-[90%] max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative bg-background rounded-3xl shadow-2xl p-6"
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
              >
              {/* Title */}
              <h3 className="text-center text-lg font-semibold mb-4">
                Выберите время
              </h3>

              <div className="relative">
                {/* Professional iOS-style gradient overlays */}
                <div
                  className="absolute top-0 left-0 right-0 pointer-events-none z-20"
                  style={{
                    height: '80px',
                    background: 'linear-gradient(to bottom, hsl(var(--background)) 0%, hsl(var(--background)) 20%, hsl(var(--background) / 0.95) 40%, hsl(var(--background) / 0.7) 60%, hsl(var(--background) / 0.3) 80%, transparent 100%)',
                    borderTopLeftRadius: '1.5rem',
                    borderTopRightRadius: '1.5rem'
                  }}
                />
                <div
                  className="absolute bottom-0 left-0 right-0 pointer-events-none z-20"
                  style={{
                    height: '80px',
                    background: 'linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background)) 20%, hsl(var(--background) / 0.95) 40%, hsl(var(--background) / 0.7) 60%, hsl(var(--background) / 0.3) 80%, transparent 100%)',
                    borderBottomLeftRadius: '1.5rem',
                    borderBottomRightRadius: '1.5rem'
                  }}
                />

                {/* Selection indicator - более яркий */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-14 bg-[#4A9FD8]/10 border-y border-[#4A9FD8]/20 pointer-events-none z-10" />

              <div className="flex gap-6 items-center justify-center py-2"
                style={{
                  touchAction: 'pan-y',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                {/* Hours Column */}
                <div className="relative flex-1 max-w-[120px]">
                  <div
                    ref={hoursRef}
                    className="h-64 scrollbar-hide"
                    onScroll={() => handleScroll('hours')}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                    style={{
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                      WebkitOverflowScrolling: 'touch',
                      scrollSnapType: 'y mandatory',
                      touchAction: 'pan-y',
                      overscrollBehavior: 'contain',
                      userSelect: 'none',
                      WebkitUserSelect: 'none'
                    }}
                  >
                    {/* Top padding */}
                    <div className="h-[112px]" />

                    {hoursArray.map((hour) => (
                      <div
                        key={hour}
                        className={`w-full h-14 flex items-center justify-center text-2xl font-medium transition-all ${
                          hours === hour
                            ? 'text-foreground font-semibold scale-105'
                            : 'text-muted-foreground/60'
                        }`}
                        style={{ scrollSnapAlign: 'center' }}
                      >
                        {String(hour).padStart(2, '0')}
                      </div>
                    ))}

                    {/* Bottom padding */}
                    <div className="h-[112px]" />
                  </div>
                </div>

                {/* Separator */}
                <div className="text-4xl font-bold text-foreground">:</div>

                {/* Minutes Column */}
                <div className="relative flex-1 max-w-[120px]">
                  <div
                    ref={minutesRef}
                    className="h-64 scrollbar-hide"
                    onScroll={() => handleScroll('minutes')}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                    style={{
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                      WebkitOverflowScrolling: 'touch',
                      scrollSnapType: 'y mandatory',
                      touchAction: 'pan-y',
                      overscrollBehavior: 'contain',
                      userSelect: 'none',
                      WebkitUserSelect: 'none'
                    }}
                  >
                    {/* Top padding */}
                    <div className="h-[112px]" />

                    {minutesArray.map((minute) => (
                      <div
                        key={minute}
                        className={`w-full h-14 flex items-center justify-center text-2xl font-medium transition-all ${
                          minutes === minute
                            ? 'text-foreground font-semibold scale-105'
                            : 'text-muted-foreground/60'
                        }`}
                        style={{ scrollSnapAlign: 'center' }}
                      >
                        {String(minute).padStart(2, '0')}
                      </div>
                    ))}

                    {/* Bottom padding */}
                    <div className="h-[112px]" />
                  </div>
                </div>
              </div>
              </div>

              {/* Done Button */}
              <motion.button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="w-full mt-6 py-4 px-4 rounded-xl bg-gradient-to-r from-[#4A9FD8] to-[#52C9C1] text-white font-semibold text-lg shadow-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Готово
              </motion.button>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
}
