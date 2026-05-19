/* js/theme.js */

import { elements } from './utils/dom.js';

/**
 * Initializes and manages Light/Dark theme toggles.
 */
export function initTheme() {
    const THEME_KEY = 'smart_converter_theme';
    const THEMES = {
        DARK: 'dark',
        LIGHT: 'light'
    };

    // 1. Get initial theme (localStorage -> System settings -> Default dark)
    const savedTheme = localStorage.getItem(THEME_KEY);
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const initialTheme = savedTheme || (prefersLight ? THEMES.LIGHT : THEMES.DARK);

    // 2. Set theme initially
    setTheme(initialTheme);

    // 3. Bind toggle event
    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || THEMES.DARK;
            const newTheme = currentTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
            setTheme(newTheme);
        });
    }

    /**
     * Helper to set theme on document and change icons.
     * @param {string} theme 
     */
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
        
        // Update toggle icons
        if (elements.themeIcon) {
            if (theme === THEMES.LIGHT) {
                elements.themeIcon.className = 'fa-solid fa-moon';
                elements.themeToggle.setAttribute('aria-label', 'Switch to Dark Mode');
            } else {
                elements.themeIcon.className = 'fa-solid fa-sun';
                elements.themeToggle.setAttribute('aria-label', 'Switch to Light Mode');
            }
        }
    }
}
