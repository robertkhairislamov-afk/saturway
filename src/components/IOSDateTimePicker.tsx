import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';
import { formatLocalDate } from '../lib/dateUtils';

interface IOSDateTimePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: string, time: string) => void;
  initialDate?: string;
  initialTime?: string;
}

interface PickerColumnProps {
  items: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  unit?: string;
}

const PickerColumn = ({ items, value, onChange, unit }: PickerColumnProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (scrollRef.current && value) {
      const index = items.findIndex(item => item.value === value);
      if (index !== -1) {
        const itemHeight = 44;
        const scrollTop = index * itemHeight;
        scrollRef.current.scrollTop = scrollTop;
      }
    }
  }, [value, items]);

  const handleScroll = () => {
    if (!scrollRef.current || isDragging) return;

    const container = scrollRef.current;
    const scrollTop = container.scrollTop;
    const itemHeight = 44;
    const centerIndex = Math.round(scrollTop / itemHeight);

    if (items[centerIndex]) {
      onChange(items[centerIndex].value);
    }

    // Apply 3D rotation effect
    const children = container.children;
    const containerCenter = container.offsetHeight / 2;

    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      const childRect = child.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const childCenter = childRect.top + childRect.height / 2 - containerRect.top;
      const distance = childCenter - containerCenter;
      const maxDistance = containerRect.height / 2;
      const angle = (distance / maxDistance) * 45; // Max 45deg rotation
      const opacity = 1 - Math.abs(distance / maxDistance) * 0.7;
      const scale = 1 - Math.abs(distance / maxDistance) * 0.3;

      child.style.transform = `rotateX(${-angle}deg) scale(${scale})`;
      child.style.opacity = `${opacity}`;
    }
  };

  const handleTouchStart = () => setIsDragging(true);
  const handleTouchEnd = () => {
    setIsDragging(false);
    if (scrollRef.current) {
      const scrollTop = scrollRef.current.scrollTop;
      const itemHeight = 44;
      const nearestIndex = Math.round(scrollTop / itemHeight);
      scrollRef.current.scrollTo({
        top: nearestIndex * itemHeight,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="flex-1 relative">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        className="overflow-y-scroll snap-y snap-mandatory scrollbar-hide h-full"
        style={{
          paddingTop: '108px',
          paddingBottom: '108px',
          perspective: '1000px',
          transformStyle: 'preserve-3d'
        }}
      >
        {items.map((item, index) => (
          <div
            key={index}
            className="h-[44px] snap-center flex items-center justify-center transition-all duration-100"
            style={{
              fontSize: '18px',
              fontWeight: 500,
              transformStyle: 'preserve-3d'
            }}
          >
            {item.label} {unit}
          </div>
        ))}
      </div>
    </div>
  );
};

export function IOSDateTimePicker({
  isOpen,
  onClose,
  onConfirm,
  initialDate,
  initialTime
}: IOSDateTimePickerProps) {
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(
    initialDate ? new Date(initialDate).getDate().toString() : today.getDate().toString()
  );
  const [selectedMonth, setSelectedMonth] = useState(
    initialDate ? (new Date(initialDate).getMonth() + 1).toString() : (today.getMonth() + 1).toString()
  );
  const [selectedYear, setSelectedYear] = useState(
    initialDate ? new Date(initialDate).getFullYear().toString() : today.getFullYear().toString()
  );
  const [selectedHour, setSelectedHour] = useState(
    initialTime ? initialTime.split(':')[0] : '12'
  );
  const [selectedMinute, setSelectedMinute] = useState(
    initialTime ? initialTime.split(':')[1] : '00'
  );

  const days = useMemo(() => {
    const daysInMonth = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => ({
      value: (i + 1).toString(),
      label: (i + 1).toString()
    }));
  }, [selectedMonth, selectedYear]);

  const months = useMemo(() => [
    { value: '1', label: 'Янв' },
    { value: '2', label: 'Фев' },
    { value: '3', label: 'Мар' },
    { value: '4', label: 'Апр' },
    { value: '5', label: 'Май' },
    { value: '6', label: 'Июн' },
    { value: '7', label: 'Июл' },
    { value: '8', label: 'Авг' },
    { value: '9', label: 'Сен' },
    { value: '10', label: 'Окт' },
    { value: '11', label: 'Ноя' },
    { value: '12', label: 'Дек' }
  ], []);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => ({
      value: (currentYear + i).toString(),
      label: (currentYear + i).toString()
    }));
  }, []);

  const hours = useMemo(() =>
    Array.from({ length: 24 }, (_, i) => ({
      value: i.toString().padStart(2, '0'),
      label: i.toString().padStart(2, '0')
    })), []
  );

  const minutes = useMemo(() =>
    Array.from({ length: 60 }, (_, i) => ({
      value: i.toString().padStart(2, '0'),
      label: i.toString().padStart(2, '0')
    })), []
  );

  const handleConfirm = () => {
    const date = new Date(
      parseInt(selectedYear),
      parseInt(selectedMonth) - 1,
      parseInt(selectedDay)
    );
    const dateStr = formatLocalDate(date);
    const timeStr = `${selectedHour}:${selectedMinute}`;
    onConfirm(dateStr, timeStr);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-lg bg-background/95 backdrop-blur-xl rounded-t-3xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Toolbar */}
          <div className="flex justify-between items-center p-4 border-b border-border/50">
            <button
              onClick={onClose}
              className="text-[#4A9FD8] font-medium text-[17px] flex items-center gap-1"
            >
              <X className="h-5 w-5" />
              Отмена
            </button>
            <span className="font-semibold text-[17px]">Дата и время</span>
            <button
              onClick={handleConfirm}
              className="text-[#4A9FD8] font-semibold text-[17px] flex items-center gap-1"
            >
              <Check className="h-5 w-5" />
              Готово
            </button>
          </div>

          {/* Wheel Picker */}
          <div className="h-64 relative" style={{ perspective: '1000px' }}>
            {/* Selection highlight */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-full h-[44px] bg-muted/30 border-y border-border/30 pointer-events-none z-10"
            />

            {/* Columns */}
            <div className="h-full flex">
              <PickerColumn
                items={days}
                value={selectedDay}
                onChange={setSelectedDay}
              />
              <PickerColumn
                items={months}
                value={selectedMonth}
                onChange={setSelectedMonth}
              />
              <PickerColumn
                items={years}
                value={selectedYear}
                onChange={setSelectedYear}
              />
              <div className="w-px bg-border/30 my-12" />
              <PickerColumn
                items={hours}
                value={selectedHour}
                onChange={setSelectedHour}
              />
              <span className="flex items-center justify-center w-4 font-semibold text-lg">:</span>
              <PickerColumn
                items={minutes}
                value={selectedMinute}
                onChange={setSelectedMinute}
              />
            </div>
          </div>

          {/* Bottom safe area */}
          <div className="h-8" />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
