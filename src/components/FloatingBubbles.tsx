import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface FloatingBubblesProps {
  count?: number;
  minSize?: number;
  maxSize?: number;
  opacity?: number;
  className?: string;
}

export function FloatingBubbles({ 
  count = 8,
  minSize = 15,
  maxSize = 35,
  opacity = 0.15,
  className = ''
}: FloatingBubblesProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    
    checkTheme();
    
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, []);

  const bubbles = Array.from({ length: count }, (_, i) => ({
    id: i,
    size: Math.random() * (maxSize - minSize) + minSize,
    left: Math.random() * 100,
    delay: Math.random() * 6,
    duration: Math.random() * 10 + 15,
    xOffset: Math.random() * 30 - 15,
  }));

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {bubbles.map((bubble) => (
        <motion.div
          key={bubble.id}
          className={`absolute rounded-full ${
            isDark ? 'bg-white/8' : 'bg-[#4A9FD8]/15'
          }`}
          style={{
            width: bubble.size,
            height: bubble.size,
            left: `${bubble.left}%`,
            bottom: '-50px',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(74,159,216,0.08)'}`,
            opacity: opacity,
            willChange: 'transform',
            contain: 'layout style paint',
          }}
          animate={{
            y: [0, -window.innerHeight - 100],
            x: [0, bubble.xOffset],
          }}
          transition={{
            duration: bubble.duration,
            repeat: Infinity,
            delay: bubble.delay,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}
