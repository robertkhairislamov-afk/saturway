import { Sun, Moon } from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from './ThemeContext';
import logoImage from '../assets/443c5c749ebfe974980617b9c917b81b051ddc82.png';

export function AppHeader() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-card/95 backdrop-blur-lg">
      <div className="mx-auto max-w-2xl px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#4A9FD8] to-[#52C9C1] p-1">
              <img
                src={logoImage}
                alt="Saturway Logo"
                className="h-full w-full object-contain drop-shadow-md"
              />
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-[#4A9FD8] to-[#52C9C1] bg-clip-text" style={{ fontSize: '20px', fontWeight: 700, color: 'transparent' }}>
                Saturway
              </h1>
              <p className="text-muted-foreground" style={{ fontSize: '12px' }}>
                AI Organizer
              </p>
            </div>
          </div>

          {/* Theme Toggle Button */}
          <motion.button
            onClick={toggleTheme}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-muted hover:bg-muted/80 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <Moon className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Sun className="h-5 w-5 text-yellow-500" />
            )}
          </motion.button>
        </div>
      </div>
    </header>
  );
}
