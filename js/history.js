/* js/history.js */

import { elements } from './utils/dom.js';

const STORAGE_KEY = 'smart_converter_history_logs';

/**
 * Loads list of saved conversion items from localStorage.
 * @returns {Array}
 */
export function getHistory() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Failed to parse history data:', e);
        return [];
    }
}

/**
 * Pushes a new conversion run into history log.
 * @param {string} filename 
 * @param {string} formattedSize 
 * @param {string} type - 'excel-to-xml' | 'xml-to-excel'
 * @param {string} status - 'success' | 'error'
 */
export function addHistoryRecord(filename, formattedSize, type, status = 'success') {
    const records = getHistory();
    const newRecord = {
        id: 'h_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        filename,
        size: formattedSize,
        type,
        status,
        timestamp: new Date().toISOString()
    };
    
    // Unshift to place latest first, cap at 30 items
    records.unshift(newRecord);
    if (records.length > 30) {
        records.pop();
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    renderHistoryList();
}

/**
 * Deletes a single history record.
 * @param {string} id 
 */
export function deleteHistoryRecord(id) {
    let records = getHistory();
    records = records.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    renderHistoryList();
}

/**
 * Clears all saved logs.
 */
export function clearAllHistory() {
    localStorage.removeItem(STORAGE_KEY);
    renderHistoryList();
}

/**
 * Formats ISO String to sleek time representation.
 * @param {string} isoString 
 * @returns {string}
 */
function formatTimeAgo(isoString) {
    try {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
        return 'Baru saja';
    }
}

/**
 * Re-renders the history lists in the Sidebar card.
 */
export function renderHistoryList() {
    const listContainer = elements.history.list;
    if (!listContainer) return;
    
    const records = getHistory();
    
    if (records.length === 0) {
        listContainer.innerHTML = `
            <div class="history-empty">
                <i class="history-empty-icon fa-solid fa-clock-rotate-left"></i>
                <p>Belum ada riwayat konversi</p>
                <small style="color: var(--text-muted); font-size: 0.75rem;">Catatan aktivitas konversi Anda akan muncul di sini</small>
            </div>
        `;
        return;
    }
    
    listContainer.innerHTML = records.map(record => {
        const isExcelToXml = record.type === 'excel-to-xml';
        const badgeClass = isExcelToXml ? 'to-xml' : 'to-excel';
        const iconClass = isExcelToXml ? 'fa-file-excel' : 'fa-file-code';
        const directionText = isExcelToXml ? 'Excel ➔ XML' : 'XML ➔ Excel';
        
        return `
            <div class="history-item" data-id="${record.id}">
                <div class="history-item-info">
                    <div class="history-item-badge ${badgeClass}" title="${directionText}">
                        <i class="fa-solid ${iconClass}"></i>
                    </div>
                    <div class="history-item-details">
                        <span class="history-item-name" title="${record.filename}">${record.filename}</span>
                        <div class="history-item-meta">
                            <span>${record.size}</span>
                            <span>•</span>
                            <span>${formatTimeAgo(record.timestamp)}</span>
                        </div>
                    </div>
                </div>
                <div class="history-item-actions">
                    <button class="history-action-btn delete" data-id="${record.id}" title="Hapus Catatan Riwayat">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Bind click event for delete buttons
    listContainer.querySelectorAll('.history-action-btn.delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            deleteHistoryRecord(id);
        });
    });
}
