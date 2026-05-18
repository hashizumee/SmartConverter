/* js/utils/helpers.js */

/**
 * Formats a file size in bytes to a human-readable string.
 * @param {number} bytes 
 * @param {number} decimals 
 * @returns {string}
 */
export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Escapes special XML characters to prevent syntax issues and XSS.
 * @param {any} unsafe 
 * @returns {string}
 */
export function escapeXml(unsafe) {
    if (unsafe === undefined || unsafe === null) return '';
    const str = String(unsafe);
    return str.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

/**
 * Converts column headers/names into valid XML tags according to selected strategy.
 * @param {string} str - Header string
 * @param {string} strategy - 'none' | 'camelCase' | 'snakeCase'
 * @returns {string}
 */
export function sanitizeTagName(str, strategy = 'snakeCase') {
    if (!str) return 'column';
    
    // Step 1: Replace all non-alphanumeric characters with spaces/dashes temporarily
    let clean = str.trim();
    
    // If the string starts with a number or invalid XML character, prepend an underscore
    if (/^[0-9.-]/.test(clean)) {
        clean = '_' + clean;
    }
    
    // Replace standard XML invalid characters with spaces
    clean = clean.replace(/[^a-zA-Z0-9_\s-]/g, '');

    if (strategy === 'camelCase') {
        return clean
            .toLowerCase()
            .replace(/[-_\s]+(.)?/g, (match, ch) => ch ? ch.toUpperCase() : '');
    } else if (strategy === 'snakeCase') {
        return clean
            .replace(/[\s-]+/g, '_')
            .replace(/([a-z])([A-Z])/g, '$1_$2')
            .toLowerCase();
    } else {
        // 'none' strategy: just replace spaces/dashes with underscores to guarantee validity
        return clean.replace(/[\s-]+/g, '_');
    }
}

/**
 * Downloads a text/blob file in the browser.
 * @param {string|Blob} content 
 * @param {string} filename 
 * @param {string} contentType 
 */
export function downloadFile(content, filename, contentType) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
}
