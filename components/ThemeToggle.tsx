'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
      setDarkMode(false);
    } else {
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;

      document.documentElement.classList.toggle(
        'dark',
        prefersDark
      );

      setDarkMode(prefersDark);
    }

    setMounted(true);
  }, []);

  function toggleTheme() {
    const nextDarkMode = !darkMode;

    setDarkMode(nextDarkMode);

    document.documentElement.classList.toggle(
      'dark',
      nextDarkMode
    );

    localStorage.setItem(
      'theme',
      nextDarkMode ? 'dark' : 'light'
    );
  }

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle dark mode"
        className="h-8 w-8 border border-white/60 bg-black"
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={
        darkMode
          ? 'Switch to light mode'
          : 'Switch to dark mode'
      }
      aria-pressed={darkMode}
      onClick={toggleTheme}
      className="flex h-8 w-8 items-center justify-center border border-white/60 bg-black text-white transition-colors duration-150 hover:border-[#0050FF] hover:text-[#0050FF] active:border-[#0050FF] active:text-[#0050FF]"
    >
      {darkMode ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          className="h-[15px] w-[15px] sm:h-[17px] sm:w-[17px]"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />

          <path
            d="M12 2V4"
            strokeLinecap="round"
          />

          <path
            d="M12 20V22"
            strokeLinecap="round"
          />

          <path
            d="M4.93 4.93L6.34 6.34"
            strokeLinecap="round"
          />

          <path
            d="M17.66 17.66L19.07 19.07"
            strokeLinecap="round"
          />

          <path
            d="M2 12H4"
            strokeLinecap="round"
          />

          <path
            d="M20 12H22"
            strokeLinecap="round"
          />

          <path
            d="M4.93 19.07L6.34 17.66"
            strokeLinecap="round"
          />

          <path
            d="M17.66 6.34L19.07 4.93"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          className="h-[15px] w-[15px] sm:h-[17px] sm:w-[17px]"
          aria-hidden="true"
        >
          <path
            d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5A8.5 8.5 0 1 0 20.5 14.5Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}