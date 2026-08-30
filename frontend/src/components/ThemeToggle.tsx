import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface Props {
  className?: string;
  size?: 'sm' | 'md';
}

export default function ThemeToggle({ className = '', size = 'md' }: Props) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const btnSize = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
  const iconSize = size === 'sm' ? 15 : 17;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white ${btnSize} ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun size={iconSize} className="text-amber-400 transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon size={iconSize} className="text-slate-600 transition-transform duration-200 hover:-rotate-12" />
      )}
    </button>
  );
}
