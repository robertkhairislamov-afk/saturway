import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatLocalDate } from '../lib/dateUtils';

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  minDate?: string;
  onOpenChange?: (isOpen: boolean) => void;
}

export function CustomDatePicker({ value, onChange, minDate, onOpenChange }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };
  const [highlightedDay, setHighlightedDay] = useState<number | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const calendarRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to calendar when opened
  useEffect(() => {
    if (isOpen && calendarRef.current) {
      const timer = setTimeout(() => {
        calendarRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Parse current value or use today
  const selectedDate = value ? new Date(value) : null;
  const [viewDate, setViewDate] = useState(selectedDate || new Date());

  const minDateObj = minDate ? new Date(minDate) : new Date();
  minDateObj.setHours(0, 0, 0, 0);

  // Get days in month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const days: (number | null)[] = [];

    // Add empty slots for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const days = useMemo(() => getDaysInMonth(viewDate), [viewDate]);

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return 'Выберите дату';
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    newDate.setHours(0, 0, 0, 0);

    // Check if date is before minDate
    if (newDate < minDateObj) return;

    // First click - highlight
    if (highlightedDay !== day) {
      setHighlightedDay(day);
      return;
    }

    // Second click on same day - select
    const dateString = formatLocalDate(newDate);
    onChange(dateString);
    setHighlightedDay(null);
    handleOpenChange(false);
  };

  const goToPreviousMonth = () => {
    setSlideDirection('right');
    setHighlightedDay(null);
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setSlideDirection('left');
    setHighlightedDay(null);
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const isDateDisabled = (day: number) => {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    date.setHours(0, 0, 0, 0);
    return date < minDateObj;
  };

  const isDateSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === viewDate.getMonth() &&
      selectedDate.getFullYear() === viewDate.getFullYear()
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === viewDate.getMonth() &&
      today.getFullYear() === viewDate.getFullYear()
    );
  };

  const weekDays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  return (
    <div className="relative">
      {/* Display Button */}
      <motion.button
        type="button"
        onClick={() => handleOpenChange(!isOpen)}
        className="flex h-12 w-full rounded-xl border-2 border-[#4A9FD8]/30 bg-background px-4 py-2 text-sm items-center justify-between hover:border-[#4A9FD8]/50 transition-all"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
          {formatDisplayDate(selectedDate)}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </motion.button>

      {/* Calendar Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000]"
              onClick={() => handleOpenChange(false)}
            />

            {/* Calendar */}
            <motion.div
              ref={calendarRef}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, type: 'spring', damping: 25 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[10001] bg-background rounded-3xl border-2 border-[#4A9FD8]/30 shadow-2xl p-6"
              style={{ minWidth: '320px', maxWidth: '400px' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <motion.button
                  type="button"
                  onClick={goToPreviousMonth}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  whileHover={{ scale: 1.15, rotate: -5 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </motion.button>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${viewDate.getFullYear()}-${viewDate.getMonth()}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="font-semibold"
                  >
                    {viewDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                  </motion.div>
                </AnimatePresence>

                <motion.button
                  type="button"
                  onClick={goToNextMonth}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  whileHover={{ scale: 1.15, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Week Days */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '4px',
                marginBottom: '8px'
              }}>
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${viewDate.getFullYear()}-${viewDate.getMonth()}`}
                  initial={{
                    opacity: 0,
                    x: slideDirection === 'left' ? 100 : -100
                  }}
                  animate={{
                    opacity: 1,
                    x: 0
                  }}
                  exit={{
                    opacity: 0,
                    x: slideDirection === 'left' ? -100 : 100
                  }}
                  transition={{
                    duration: 0.3,
                    ease: 'easeInOut'
                  }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '4px'
                  }}
                >
                  {days.map((day, index) => {
                    if (day === null) {
                      return <div key={`empty-${index}`} />;
                    }

                    const disabled = isDateDisabled(day);
                    const selected = isDateSelected(day);
                    const highlighted = highlightedDay === day;
                    const today = isToday(day);

                    return (
                      <motion.button
                        key={day}
                        type="button"
                        onClick={() => !disabled && handleDayClick(day)}
                        disabled={disabled}
                        className={`
                          relative p-2 rounded-lg text-sm font-medium transition-all duration-200
                          ${disabled ? 'text-muted-foreground/30 cursor-not-allowed' : 'hover:bg-muted cursor-pointer'}
                          ${selected ? 'bg-gradient-to-r from-[#4A9FD8] to-[#52C9C1] text-white shadow-lg' : ''}
                          ${highlighted && !selected ? 'bg-[#4A9FD8]/20 ring-2 ring-[#4A9FD8]' : ''}
                          ${today && !selected && !highlighted ? 'ring-2 ring-[#4A9FD8]/50' : ''}
                        `}
                        whileHover={!disabled ? { scale: 1.1 } : {}}
                        whileTap={!disabled ? { scale: 0.95 } : {}}
                        animate={highlighted ? { scale: [1, 1.05, 1] } : {}}
                        transition={{ duration: 0.3 }}
                      >
                        {day}
                      </motion.button>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
