/* js/toast.js */

import { elements } from './utils/dom.js';

/**
 * Modern Reactive Toast Notification System.
 */
class ToastNotification {
    constructor() {
        this.container = elements.toastContainer;
        if (!this.container) {
            // Create container if not already in DOM
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    }

    /**
     * Shows a toast notification.
     * @param {string} type - 'success' | 'danger' | 'warning' | 'info'
     * @param {string} title - Main header of notification
     * @param {string} message - Content details
     * @param {number} duration - Delay in ms before auto-dismiss (default: 4000)
     */
    show(type, title, message, duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Define icons based on level
        let iconClass = 'fa-circle-info';
        if (type === 'success') iconClass = 'fa-circle-check';
        if (type === 'danger') iconClass = 'fa-circle-exclamation';
        if (type === 'warning') iconClass = 'fa-triangle-exclamation';

        toast.innerHTML = `
            <i class="toast-icon fa-solid ${iconClass}"></i>
            <div class="toast-content">
                <span class="toast-title">${title}</span>
                <span class="toast-message">${message}</span>
            </div>
            <button class="toast-close" aria-label="Dismiss Notification">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;

        // Bind dismiss click
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.dismiss(toast));

        // Auto-dismiss schedule
        const timeoutId = setTimeout(() => this.dismiss(toast), duration);
        toast.dataset.timeoutId = timeoutId;

        this.container.appendChild(toast);
    }

    /**
     * Triggers slide-out animation and cleans up DOM.
     * @param {HTMLElement} toast 
     */
    dismiss(toast) {
        if (toast.classList.contains('dismissing')) return;
        
        // Clear auto-dismiss trigger
        if (toast.dataset.timeoutId) {
            clearTimeout(Number(toast.dataset.timeoutId));
        }

        toast.classList.add('dismissing');
        
        // Wait for slide-out animation to complete, then remove
        toast.addEventListener('animationend', (e) => {
            if (e.animationName === 'toastSlideOut') {
                toast.remove();
            }
        });
    }

    // Helper shorthand modes
    success(title, message, duration) { this.show('success', title, message, duration); }
    danger(title, message, duration) { this.show('danger', title, message, duration); }
    error(title, message, duration) { this.show('danger', title, message, duration); } // alias
    warning(title, message, duration) { this.show('warning', title, message, duration); }
    info(title, message, duration) { this.show('info', title, message, duration); }
}

export const toast = new ToastNotification();
export default toast;
