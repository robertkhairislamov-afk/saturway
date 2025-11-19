import { useState, useEffect, useRef, useMemo } from 'react';
import { formatLocalDate } from '../lib/dateUtils';

interface IOSDateTimePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: string, time: string) => void;
  initialDate?: string;
  initialTime?: string;
}

/* --- CONSTANTS --- */
const ITEM_HEIGHT = 44;

/* --- HELPER FUNCTIONS --- */
const generateDates = () => {
  const days = [];
  const today = new Date();
  const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const weekDays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

  for (let i = 0; i < 60; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    let label = (i === 0)
      ? "Сегодня"
      : (i === 1)
        ? "Завтра"
        : `${weekDays[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;

    days.push({
      value: i,
      label,
      dateObj: date
    });
  }

  return days;
};

const generateHours = () =>
  Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: i.toString().padStart(2, '0')
  }));

const generateMinutes = () =>
  Array.from({ length: 60 }, (_, i) => ({
    value: i,
    label: i.toString().padStart(2, '0')
  }));

/* --- COLUMN COMPONENT --- */
interface PickerColumnProps {
  items: { value: number; label: string }[];
  value: number;
  onChange: (value: number) => void;
  width: string;
}

const PickerColumn = ({ items, value, onChange, width }: PickerColumnProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isScrolling = useRef<NodeJS.Timeout | null>(null);

  // Init position
  useEffect(() => {
    if (scrollRef.current) {
      const idx = items.findIndex(i => i.value === value);
      if (idx !== -1) {
        scrollRef.current.scrollTop = idx * ITEM_HEIGHT;
      }
    }
  }, [items, value]);

  // 3D Effect Logic
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const center = container.scrollTop + (container.offsetHeight / 2);

    items.forEach((_, idx) => {
      const el = itemRefs.current[idx];
      if (!el) return;

      const elCenter = el.offsetTop + (ITEM_HEIGHT / 2);
      const dist = center - elCenter;

      // Rotate X calculation
      let angle = dist * (90 / (container.offsetHeight / 2));
      angle = Math.max(-90, Math.min(90, angle));

      const absDist = Math.abs(dist);
      const isActive = absDist < ITEM_HEIGHT / 2;

      el.style.transform = `rotateX(${angle}deg) scale(${isActive ? 1.1 : 0.95})`;
      el.style.opacity = `${Math.max(0.3, 1 - (absDist / 150))}`;
      el.style.fontWeight = isActive ? '600' : '400';
      el.style.color = isActive ? '#0f172a' : '#94a3b8';
    });
  };

  const onScroll = () => {
    handleScroll();
    if (isScrolling.current) {
      clearTimeout(isScrolling.current);
    }
    isScrolling.current = setTimeout(() => {
      if (scrollRef.current) {
        const idx = Math.round(scrollRef.current.scrollTop / ITEM_HEIGHT);
        if (items[idx]) {
          onChange(items[idx].value);
        }
      }
    }, 150);
  };

  return (
    <div className={`h-full ${width} relative`}>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="h-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory py-[108px]"
      >
        {items.map((item, idx) => (
          <div
            key={item.value}
            ref={el => itemRefs.current[idx] = el}
            className="h-[44px] snap-center flex items-center justify-center cursor-pointer select-none text-[17px]"
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
};

/* --- MAIN COMPONENT --- */
export function IOSDateTimePicker({
  isOpen,
  onClose,
  onConfirm,
  initialDate,
  initialTime
}: IOSDateTimePickerProps) {
  // Initialize from props
  const getInitialDayOffset = () => {
    if (!initialDate) return 0;
    const initial = new Date(initialDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    initial.setHours(0, 0, 0, 0);
    const diff = Math.floor((initial.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.min(59, diff));
  };

  const getInitialHour = () => {
    if (!initialTime) return 12;
    return parseInt(initialTime.split(':')[0]) || 12;
  };

  const getInitialMinute = () => {
    if (!initialTime) return 0;
    return parseInt(initialTime.split(':')[1]) || 0;
  };

  const [val, setVal] = useState({
    day: getInitialDayOffset(),
    hour: getInitialHour(),
    minute: getInitialMinute()
  });

  const [show, setShow] = useState(false);

  const days = useMemo(generateDates, []);
  const hours = useMemo(generateHours, []);
  const minutes = useMemo(generateMinutes, []);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
    } else {
      setTimeout(() => setShow(false), 300);
    }
  }, [isOpen]);

  const handleSave = () => {
    const selectedDate = days.find(d => d.value === val.day);
    if (selectedDate) {
      const dateStr = formatLocalDate(selectedDate.dateObj);
      const timeStr = `${val.hour.toString().padStart(2, '0')}:${val.minute.toString().padStart(2, '0')}`;
      onConfirm(dateStr, timeStr);
    }
    onClose();
  };

  if (!show && !isOpen) return null;

  return (
    <div className="relative z-[100]">
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed bottom-0 w-full transition-transform duration-300 ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-t-2xl shadow-2xl overflow-hidden max-w-lg mx-auto">

          {/* Header */}
          <div className="flex justify-between p-4 border-b border-border/50 bg-white/50 dark:bg-slate-800/50">
            <button
              onClick={onClose}
              className="text-slate-500 dark:text-slate-400"
            >
              Отмена
            </button>
            <span className="font-semibold">Дата и время</span>
            <button
              onClick={handleSave}
              className="text-[#4A9FD8] font-bold"
            >
              Готово
            </button>
          </div>

          {/* Drum */}
          <div className="relative h-[260px] bg-slate-50/50 dark:bg-slate-900/50">
            <div className="absolute top-1/2 w-full h-[44px] -translate-y-1/2 bg-slate-200/30 dark:bg-slate-700/30 pointer-events-none border-y border-slate-300/50 dark:border-slate-600/50" />
            <div className="absolute inset-0 pointer-events-none picker-mask dark:picker-mask-dark" />

            <div className="flex justify-center h-full picker-perspective">
              <PickerColumn
                items={days}
                value={val.day}
                onChange={v => setVal({...val, day: v})}
                width="w-40"
              />
              <div className="flex items-center pb-2 font-bold text-slate-300 dark:text-slate-600 px-1">:</div>
              <PickerColumn
                items={hours}
                value={val.hour}
                onChange={v => setVal({...val, hour: v})}
                width="w-16"
              />
              <div className="flex items-center pb-2 font-bold text-slate-300 dark:text-slate-600">:</div>
              <PickerColumn
                items={minutes}
                value={val.minute}
                onChange={v => setVal({...val, minute: v})}
                width="w-16"
              />
            </div>
          </div>

          {/* Bottom safe area */}
          <div className="h-8 bg-white/50 dark:bg-slate-800/50" />
        </div>
      </div>
    </div>
  );
}
