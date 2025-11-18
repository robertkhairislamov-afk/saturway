import { motion } from 'motion/react';

interface OceanAccentsProps {
  variant?: 'subtle' | 'medium' | 'vibrant';
  showRipples?: boolean;
  showGradientOrbs?: boolean;
  className?: string;
}

export function OceanAccents({
  variant = 'subtle',
  showRipples = true,
  showGradientOrbs = true,
  className = ''
}: OceanAccentsProps) {

  const opacities = {
    subtle: 0.03,
    medium: 0.05,
    vibrant: 0.08,
  };

  const ripples = Array.from({ length: 2 }, (_, i) => ({
    id: i,
    delay: i * 3,
  }));

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {/* Gradient orbs - оптимизированы */}
      {showGradientOrbs && (
        <>
          <motion.div
            className="absolute left-0 top-0 h-80 w-80 rounded-full bg-gradient-to-br from-[#4A9FD8] to-[#52C9C1]"
            style={{
              opacity: opacities[variant],
              filter: 'blur(40px)',
              transform: 'translate(-50%, -50%)',
              willChange: 'transform',
              contain: 'layout style paint',
            }}
            animate={{
              scale: [1, 1.15, 1],
              x: [0, 20, 0],
              y: [0, 25, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          <motion.div
            className="absolute bottom-0 left-1/2 h-80 w-80 rounded-full bg-gradient-to-br from-[#5AB5E8] to-[#4A9FD8]"
            style={{
              opacity: opacities[variant],
              filter: 'blur(45px)',
              transform: 'translate(-50%, 40%)',
              willChange: 'transform',
              contain: 'layout style paint',
            }}
            animate={{
              scale: [1, 1.12, 1],
              x: [0, -25, 0],
              y: [0, -20, 0],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 2,
            }}
          />
        </>
      )}

      {/* Ripple effects - оптимизированы */}
      {showRipples && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {ripples.map((ripple) => (
            <motion.div
              key={ripple.id}
              className="absolute h-32 w-32 rounded-full border border-[#4A9FD8]"
              style={{
                left: '-64px',
                top: '-64px',
                opacity: 0,
                willChange: 'transform, opacity',
                contain: 'layout style paint',
              }}
              animate={{
                scale: [1, 3],
                opacity: [opacities[variant] * 2.5, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                delay: ripple.delay,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
