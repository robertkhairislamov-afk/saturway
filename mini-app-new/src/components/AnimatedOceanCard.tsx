import { motion } from 'motion/react';
import { ReactNode } from 'react';
import { Card } from './ui/card';

interface AnimatedOceanCardProps {
  children: ReactNode;
  className?: string;
  showWaves?: boolean;
  showGlow?: boolean;
  delay?: number;
}

export function AnimatedOceanCard({ 
  children, 
  className = '',
  showWaves = true,
  showGlow = true,
  delay = 0,
}: AnimatedOceanCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4,
        delay,
        type: 'spring',
        stiffness: 100,
      }}
      className="group relative"
    >
      <Card className={`relative overflow-hidden border-[#4A9FD8]/20 bg-gradient-to-br from-card to-card/50 transition-all hover:shadow-md ${className}`}>
        {/* Animated wave pattern overlay */}
        {showWaves && (
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-[#4A9FD8]/5 via-transparent to-[#52C9C1]/5"
              animate={{
                backgroundPosition: ['0% 0%', '100% 100%'],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'linear',
              }}
              style={{
                backgroundSize: '200% 200%',
              }}
            />
          </div>
        )}

        {/* Glow effect on hover */}
        {showGlow && (
          <motion.div
            className="pointer-events-none absolute -inset-[1px] rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background: 'linear-gradient(135deg, rgba(74,159,216,0.1) 0%, rgba(82,201,193,0.1) 100%)',
              filter: 'blur(8px)',
            }}
          />
        )}

        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </Card>
    </motion.div>
  );
}
