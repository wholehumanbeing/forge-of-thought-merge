import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';

// Helper function to apply the theme
const applyTheme = (theme: string) => {
  const root = window.document.documentElement;
  root.classList.remove(theme === 'dark' ? 'light' : 'dark');
  root.classList.add(theme);
  localStorage.setItem('theme', theme);
};

const Layout: React.FC = () => {
  // State to manage the current theme
  const [theme, setTheme] = useState(() => {
    // Check local storage or system preference
    const storedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return storedTheme || (prefersDark ? 'dark' : 'light');
  });

  // Apply theme on initial load and when theme state changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Toggle function
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    // Apply dark class if needed, though direct manipulation of <html> is done
    <div className={`flex flex-col min-h-screen ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Simple Header with Theme Toggle */}
      <header className="bg-white dark:bg-dark-surface shadow-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-2 flex justify-between items-center">
              <h1 className="text-lg font-semibold text-gray-800 dark:text-dark-text">Forge of Thought</h1>
              <button
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                  className="p-2 rounded-md text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
              >
                  {/* Simple icon based on theme */}
                  {theme === 'light' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                      </svg>
                  ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zM1 11a1 1 0 100-2H0a1 1 0 100 2h1zM4.95 15.05a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707z" clipRule="evenodd" />
                      </svg>
                  )}
              </button>
          </div>
      </header>

      {/* Main Content Area - Adjust padding if header is present */}
      {/* Remove container/mx-auto if CanvasPage should be full width */}
      <main className="flex-grow">
        <Outlet /> {/* Child routes will render here */}
      </main>

      {/* Footer removed for minimalism */}
    </div>
  );
};

export default Layout; 