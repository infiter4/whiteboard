import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';
import { Palette } from 'lucide-react';

const themeColors: { [key: string]: string } = {
  light: '#111111',
  dark: '#1a1a1a',
  ocean: '#0d1b2a',
  nebula: '#191226',
  forest: '#1a2e28',
};

const themeNames: { [key: string]: string } = {
  light: 'Midnight',
  dark: 'Dark',
  ocean: 'Ocean',
  nebula: 'Nebula',
  forest: 'Forest',
};

const ThemeSwitcher = () => {
  const { theme, setTheme, themes } = useTheme();

  return (
    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/20">
      <Palette className="w-4 h-4 text-slate-700" />
      <div className="flex items-center gap-1.5">
        {themes.map((t) => (
          <motion.button
            key={t}
            onClick={() => setTheme(t)}
            className={`relative w-7 h-7 rounded-full transition-all ${
              theme === t ? 'ring-2 ring-offset-2 ring-blue-600' : 'hover:scale-110'
            }`}
            style={{ backgroundColor: themeColors[t] }}
            title={themeNames[t]}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.95 }}
          >
            {theme === t && (
              <motion.div
                layoutId="activeTheme"
                className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            {t === 'light' && <div className="absolute inset-0 rounded-full border-2 border-slate-200"></div>}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default ThemeSwitcher;
