import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';

interface AnimatedTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'button';
  delay?: number;
}

export function AnimatedText({
  text,
  className = '',
  style = {},
  as: Component = 'span',
  delay = 0
}: AnimatedTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    if (displayText !== text) {
      setIsChanging(true);
      const timer = setTimeout(() => {
        setDisplayText(text);
        setIsChanging(false);
      }, 150); // Быстрая смена в середине анимации
      return () => clearTimeout(timer);
    }
  }, [text, displayText]);

  const MotionComponent = motion[Component] as any;

  return (
    <AnimatePresence mode="wait">
      <MotionComponent
        key={displayText}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
        transition={{
          duration: 0.2,
          delay: delay,
          ease: 'easeOut'
        }}
        className={className}
        style={style}
      >
        {displayText}
      </MotionComponent>
    </AnimatePresence>
  );
}
