/* js/utils/dom.js */

/**
 * Pre-cached DOM element selectors and references.
 */
export const elements = {
    // Shell & Theme
    themeToggle: document.getElementById('theme-toggle'),
    themeIcon: document.querySelector('#theme-toggle i'),
    navTabs: document.querySelectorAll('.nav-tab'),
    sections: document.querySelectorAll('.converter-section'),
    
    // Excel to XML Elements
    excel: {
        section: document.getElementById('excel-to-xml-section'),
        dropzone: document.getElementById('excel-dropzone'),
        fileInput: document.getElementById('excel-file-input'),
        fileCard: document.getElementById('excel-file-card'),
        fileName: document.getElementById('excel-file-name'),
        fileSize: document.getElementById('excel-file-size'),
        removeFileBtn: document.getElementById('excel-remove-file'),
        
        sheetSelectGroup: document.getElementById('excel-sheet-group'),
        sheetSelect: document.getElementById('excel-sheet'),
        
        rootNode: document.getElementById('xml-root-node'),
        rowNode: document.getElementById('xml-row-node'),
        prettyPrint: document.getElementById('xml-pretty-print'),
        indentSpaces: document.getElementById('xml-indent'),
        indentValue: document.getElementById('xml-indent-val'),
        sanitizeTags: document.getElementById('xml-sanitize-tags'),
        
        convertBtn: document.getElementById('excel-convert-btn'),
        
        previewContainer: document.getElementById('excel-preview-container'),
        previewName: document.getElementById('excel-preview-name'),
        previewCode: document.getElementById('excel-preview-code'),
        copyBtn: document.getElementById('excel-copy-btn'),
        downloadBtn: document.getElementById('excel-download-btn')
    },
    
    // XML to Excel Elements
    xml: {
        section: document.getElementById('xml-to-excel-section'),
        dropzone: document.getElementById('xml-dropzone'),
        fileInput: document.getElementById('xml-file-input'),
        fileCard: document.getElementById('xml-file-card'),
        fileName: document.getElementById('xml-file-name'),
        fileSize: document.getElementById('xml-file-size'),
        removeFileBtn: document.getElementById('xml-remove-file'),
        
        rowSelectorGroup: document.getElementById('xml-selector-group'),
        rowSelectorSelect: document.getElementById('xml-row-selector'),
        
        exportFormat: document.getElementById('excel-export-format'),
        
        convertBtn: document.getElementById('xml-convert-btn'),
        
        previewContainer: document.getElementById('xml-preview-container'),
        previewName: document.getElementById('xml-preview-name'),
        previewTable: document.getElementById('xml-preview-table'),
        previewTableHead: document.getElementById('xml-table-head'),
        previewTableBody: document.getElementById('xml-table-body'),
        paginationInfo: document.getElementById('xml-pagination-info'),
        prevPageBtn: document.getElementById('xml-prev-page'),
        nextPageBtn: document.getElementById('xml-next-page'),
        downloadBtn: document.getElementById('xml-download-btn')
    },
    
    // Conversion History
    history: {
        clearBtn: document.getElementById('history-clear-all'),
        list: document.getElementById('history-list'),
    },
    
    // Notifications Container
    toastContainer: document.getElementById('toast-container')
};
