/* js/app.js */

import { elements } from './utils/dom.js';
import { formatBytes, downloadFile } from './utils/helpers.js';
import { initTheme } from './theme.js';
import { toast } from './toast.js';
import { renderHistoryList, addHistoryRecord, clearAllHistory } from './history.js';
import { parseExcelWorkbook, convertSheetToXml } from './converters/excelToXml.js';
import { parseXmlString, detectXmlRowTags, extractDataFromXml, downloadXmlAsExcel } from './converters/xmlToExcel.js';

// Application State
const state = {
    excel: {
        file: null,
        workbook: null,
        sheetNames: [],
        convertedXml: ''
    },
    xml: {
        file: null,
        doc: null,
        tagNames: [],
        extractedRows: [],
        extractedHeaders: [],
        currentPage: 1,
        rowsPerPage: 5
    }
};

/**
 * Initializes the entire application coordinator.
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize core visual features
    initTheme();
    renderHistoryList();
    
    // 2. Setup general event listeners
    initNavigationTabs();
    initHistoryControls();
    
    // 3. Setup Excel-to-XML Event Bindings
    initExcelConverter();
    
    // 4. Setup XML-to-Excel Event Bindings
    initXmlConverter();
    
    toast.info('Sistem Siap', 'Selamat datang di SmartConverter! Siap memproses file Excel dan XML.');
});

/* ==========================================================================
   NAVIGATION & GENERAL CONTROLS
   ========================================================================== */

function initNavigationTabs() {
    const switchTab = (targetTab) => {
        const matchingTab = Array.from(elements.navTabs).find(t => t.getAttribute('data-tab') === targetTab);
        if (matchingTab) {
            // Toggle active tabs
            elements.navTabs.forEach(t => t.classList.remove('active'));
            matchingTab.classList.add('active');
            
            // Toggle active content sections
            elements.sections.forEach(section => {
                section.classList.remove('active');
                if (section.id.startsWith(targetTab)) {
                    section.classList.add('active');
                }
            });
            
            // Scroll to the work container smoothly
            const mainContainer = document.querySelector('.app-container');
            if (mainContainer) {
                mainContainer.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };

    elements.navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });

    // Listen to custom banner & footer triggers
    document.addEventListener('click', (e) => {
        // Quick Convert tag trigger
        const quickTag = e.target.closest('.active-tab-trigger');
        if (quickTag) {
            const target = quickTag.getAttribute('data-target');
            switchTab(target);
            return;
        }

        // Footer links
        const excelLink = e.target.closest('.tab-link-excel');
        if (excelLink) {
            e.preventDefault();
            switchTab('excel');
            return;
        }

        const xmlLink = e.target.closest('.tab-link-xml');
        if (xmlLink) {
            e.preventDefault();
            switchTab('xml');
            return;
        }
    });
}

function initHistoryControls() {
    if (elements.history.clearBtn) {
        elements.history.clearBtn.addEventListener('click', () => {
            if (confirm('Apakah Anda yakin ingin menghapus semua catatan riwayat konversi?')) {
                clearAllHistory();
                toast.success('Riwayat Dibersihkan', 'Semua catatan aktivitas konversi telah berhasil dihapus.');
            }
        });
    }
}

/* ==========================================================================
   EXCEL TO XML MODULE
   ========================================================================== */

function initExcelConverter() {
    const exc = elements.excel;
    
    // Check elements exist
    if (!exc.dropzone || !exc.fileInput) return;
    
    // Setup File Upload triggers
    exc.dropzone.addEventListener('click', () => exc.fileInput.click());
    
    exc.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleExcelFileSelect(e.target.files[0]);
        }
    });
    
    // Drag & drop listeners
    setupDragAndDrop(exc.dropzone, handleExcelFileSelect);
    
    // Remove selected file button
    exc.removeFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetExcelState();
    });
    
    // Indent range change indicator
    if (exc.indentSpaces) {
        exc.indentSpaces.addEventListener('input', (e) => {
            if (exc.indentValue) {
                exc.indentValue.textContent = e.target.value;
            }
        });
    }
    
    // Toggle indent display based on pretty print checkbox
    if (exc.prettyPrint) {
        exc.prettyPrint.addEventListener('change', (e) => {
            const rangeGroup = document.querySelector('.range-group-container');
            if (rangeGroup) {
                rangeGroup.style.opacity = e.target.checked ? '1' : '0.4';
                exc.indentSpaces.disabled = !e.target.checked;
            }
        });
    }
    
    // Action: Convert Excel ➔ XML
    if (exc.convertBtn) {
        exc.convertBtn.addEventListener('click', () => {
            performExcelToXmlConversion();
        });
    }
    
    // Action: Copy XML to Clipboard
    if (exc.copyBtn) {
        exc.copyBtn.addEventListener('click', () => {
            if (!state.excel.convertedXml) return;
            navigator.clipboard.writeText(state.excel.convertedXml)
                .then(() => {
                    toast.success('Disalin', 'Konten XML berhasil disalin ke papan klip (clipboard).');
                })
                .catch(() => {
                    toast.error('Gagal Menyalin', 'Gagal menyalin XML. Silakan pilih secara manual.');
                });
        });
    }
    
    // Action: Download XML Output File
    if (exc.downloadBtn) {
        exc.downloadBtn.addEventListener('click', () => {
            if (!state.excel.convertedXml || !state.excel.file) return;
            const origName = state.excel.file.name;
            const cleanName = origName.substring(0, origName.lastIndexOf('.')) || origName;
            downloadFile(state.excel.convertedXml, `${cleanName}.xml`, 'application/xml');
            toast.success('Unduhan Dimulai', `Menyimpan ${cleanName}.xml ke folder unduhan Anda.`);
        });
    }
}

/**
 * Handles incoming Excel files and updates UI cards.
 * @param {File} file 
 */
async function handleExcelFileSelect(file) {
    // Validate file extensions
    const ext = file.name.split('.').pop().toLowerCase();
    const validExts = ['xlsx', 'xls', 'csv'];
    
    if (!validExts.includes(ext)) {
        toast.error('Format Tidak Valid', `Berkas Excel harus berakhiran .xlsx, .xls, atau .csv. Berkas termuat: .${ext}`);
        return;
    }
    
    resetExcelState();
    state.excel.file = file;
    
    // Update uploader card visual states
    elements.excel.fileName.textContent = file.name;
    elements.excel.fileSize.textContent = formatBytes(file.size);
    elements.excel.dropzone.style.display = 'none';
    elements.excel.fileCard.style.display = 'flex';
    
    toast.info('Membaca Lembar Kerja', 'Mengurai metadata tabel. Harap tunggu...');
    
    try {
        // Asynchronously read using SheetJS
        const { sheetNames, workbook } = await parseExcelWorkbook(file);
        
        state.excel.sheetNames = sheetNames;
        state.excel.workbook = workbook;
        
        // Populate multi-sheet dropdown lists
        elements.excel.sheetSelect.innerHTML = sheetNames.map(name => `<option value="${name}">${name}</option>`).join('');
        
        if (sheetNames.length > 1) {
            elements.excel.sheetSelectGroup.style.display = 'block';
            toast.success('Excel Terurai', `Berhasil memuat berkas dengan ${sheetNames.length} lembar kerja (sheet) terpisah.`);
        } else {
            elements.excel.sheetSelectGroup.style.display = 'none';
            toast.success('Excel Terurai', 'Berkas berhasil dimuat dan divalidasi.');
        }
        
        elements.excel.convertBtn.disabled = false;
        
    } catch (err) {
        toast.error('Kesalahan Berkas', err.message);
        resetExcelState();
    }
}

function resetExcelState() {
    state.excel.file = null;
    state.excel.workbook = null;
    state.excel.sheetNames = [];
    state.excel.convertedXml = '';
    
    elements.excel.fileInput.value = '';
    elements.excel.dropzone.style.display = 'flex';
    elements.excel.fileCard.style.display = 'none';
    elements.excel.sheetSelectGroup.style.display = 'none';
    elements.excel.convertBtn.disabled = true;
    elements.excel.previewContainer.classList.remove('active');
}

/**
 * Reads form options and stringifies SheetJS into customized XML code.
 */
function performExcelToXmlConversion() {
    const exc = elements.excel;
    if (!state.excel.workbook || !state.excel.file) return;
    
    const selectedSheet = exc.sheetSelect.value || state.excel.sheetNames[0];
    
    // Pull form options
    const options = {
        rootNode: exc.rootNode.value.trim() || 'workbook',
        rowNode: exc.rowNode.value.trim() || 'row',
        prettyPrint: exc.prettyPrint.checked,
        indentSpaces: parseInt(exc.indentSpaces.value, 10),
        sanitizeStrategy: exc.sanitizeTags.value
    };
    
    toast.info('Mengonversi Data', 'Menerapkan tata letak dan membangun struktur XML...');
    
    setTimeout(() => {
        try {
            const xml = convertSheetToXml(state.excel.workbook, selectedSheet, options);
            state.excel.convertedXml = xml;
            
            // Format preview container
            exc.previewName.textContent = `${state.excel.file.name} ➔ Pratinjau XML`;
            exc.previewCode.innerHTML = highlightXml(xml);
            exc.previewContainer.classList.add('active');
            
            // Push audit record into conversion history sidebar
            addHistoryRecord(state.excel.file.name, formatBytes(state.excel.file.size), 'excel-to-xml', 'success');
            
            // Pemicu Unduhan Otomatis dengan ekstensi yang tepat (.xml)
            const origName = state.excel.file.name;
            const cleanName = origName.substring(0, origName.lastIndexOf('.')) || origName;
            downloadFile(xml, `${cleanName}.xml`, 'application/xml');
            
            toast.success('Sukses & Diunduh', `Data berhasil dikonversikan dan diunduh sebagai ${cleanName}.xml!`);
            
            // Scroll to preview area
            exc.previewContainer.scrollIntoView({ behavior: 'smooth' });
            
        } catch (err) {
            toast.error('Konversi Gagal', err.message);
            addHistoryRecord(state.excel.file.name, formatBytes(state.excel.file.size), 'excel-to-xml', 'error');
        }
    }, 100);
}

/* ==========================================================================
   XML TO EXCEL MODULE
   ========================================================================== */

function initXmlConverter() {
    const xm = elements.xml;
    
    if (!xm.dropzone || !xm.fileInput) return;
    
    // Trigger upload
    xm.dropzone.addEventListener('click', () => xm.fileInput.click());
    
    xm.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleXmlFileSelect(e.target.files[0]);
        }
    });
    
    // Drag & drop setups
    setupDragAndDrop(xm.dropzone, handleXmlFileSelect);
    
    // Remove loaded XML
    xm.removeFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetXmlState();
    });
    
    // Dropdown row tag changes updates preview table
    if (xm.rowSelectorSelect) {
        xm.rowSelectorSelect.addEventListener('change', () => {
            parseAndPreviewXmlData();
        });
    }
    
    // Action: Convert XML ➔ Excel Sheet
    if (xm.convertBtn) {
        xm.convertBtn.addEventListener('click', () => {
            performXmlToExcelConversion();
        });
    }
    
    // Action: Pagination Buttons
    if (xm.prevPageBtn) {
        xm.prevPageBtn.addEventListener('click', () => {
            if (state.xml.currentPage > 1) {
                state.xml.currentPage--;
                renderTablePreview();
            }
        });
    }
    
    if (xm.nextPageBtn) {
        xm.nextPageBtn.addEventListener('click', () => {
            const maxPage = Math.ceil(state.xml.extractedRows.length / state.xml.rowsPerPage);
            if (state.xml.currentPage < maxPage) {
                state.xml.currentPage++;
                renderTablePreview();
            }
        });
    }
}

/**
 * Handles incoming XML file selections.
 * @param {File} file 
 */
function handleXmlFileSelect(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (ext !== 'xml') {
        toast.error('Format Tidak Valid', `Berkas XML harus berakhiran .xml. Berkas termuat: .${ext}`);
        return;
    }
    
    resetXmlState();
    state.xml.file = file;
    
    elements.xml.fileName.textContent = file.name;
    elements.xml.fileSize.textContent = formatBytes(file.size);
    elements.xml.dropzone.style.display = 'none';
    elements.xml.fileCard.style.display = 'flex';
    
    toast.info('Membaca XML', 'Menganalisis tag struktur XML. Harap tunggu...');
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const xmlContent = e.target.result;
            const xmlDoc = parseXmlString(xmlContent);
            
            state.xml.doc = xmlDoc;
            
            // Detect repeating tags to act as Row selector
            const { tagNames, defaultTag } = detectXmlRowTags(xmlDoc);
            state.xml.tagNames = tagNames;
            
            if (tagNames.length === 0) {
                throw new Error('Tidak dapat mengidentifikasi elemen data berulang di dalam struktur XML.');
            }
            
            // Load selector dropdowns
            elements.xml.rowSelectorSelect.innerHTML = tagNames.map(item => 
                `<option value="${item.name}">${item.name} (${item.count} baris)</option>`
            ).join('');
            
            // Apply default selection
            elements.xml.rowSelectorSelect.value = defaultTag;
            elements.xml.rowSelectorGroup.style.display = 'block';
            
            // Automatically preview data inside interactive table preview
            parseAndPreviewXmlData();
            
            elements.xml.convertBtn.disabled = false;
            toast.success('XML Terurai', `Berhasil memparsing XML. Tag berulang terdeteksi otomatis: <${defaultTag}>`);
            
        } catch (err) {
            toast.error('Kesalahan Berkas', err.message);
            resetXmlState();
        }
    };
    
    reader.onerror = () => {
        toast.error('Kesalahan Berkas', 'Gagal membaca berkas XML.');
        resetXmlState();
    };
    
    reader.readAsText(file);
}

function resetXmlState() {
    state.xml.file = null;
    state.xml.doc = null;
    state.xml.tagNames = [];
    state.xml.extractedRows = [];
    state.xml.extractedHeaders = [];
    state.xml.currentPage = 1;
    
    elements.xml.fileInput.value = '';
    elements.xml.dropzone.style.display = 'flex';
    elements.xml.fileCard.style.display = 'none';
    elements.xml.rowSelectorGroup.style.display = 'none';
    elements.xml.convertBtn.disabled = true;
    elements.xml.previewContainer.classList.remove('active');
}

/**
 * Extracts elements matching select tag and updates visual previews.
 */
function parseAndPreviewXmlData() {
    if (!state.xml.doc) return;
    
    const selectedTag = elements.xml.rowSelectorSelect.value;
    
    try {
        const { rows, headers } = extractDataFromXml(state.xml.doc, selectedTag);
        
        state.xml.extractedRows = rows;
        state.xml.extractedHeaders = headers;
        state.xml.currentPage = 1; // Reset to page 1
        
        if (rows.length === 0) {
            elements.xml.previewContainer.classList.remove('active');
            toast.warning('Elemen Kosong', `Tidak ada struktur berulang yang ditemukan dengan nama tag <${selectedTag}>.`);
            return;
        }
        
        // Render preview table
        elements.xml.previewName.textContent = `${state.xml.file.name} ➔ Pratinjau Excel (${rows.length} baris)`;
        renderTablePreview();
        elements.xml.previewContainer.classList.add('active');
        
    } catch (err) {
        toast.error('Gagal Memparsing', err.message);
    }
}

/**
 * Re-draws tabular grid based on current pagination indices.
 */
function renderTablePreview() {
    const xm = elements.xml;
    const { extractedRows, extractedHeaders, currentPage, rowsPerPage } = state.xml;
    
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, extractedRows.length);
    const pageRows = extractedRows.slice(startIndex, endIndex);
    
    // Draw columns headers
    xm.previewTableHead.innerHTML = `<tr>${extractedHeaders.map(h => `<th>${h}</th>`).join('')}</tr>`;
    
    // Draw cells
    xm.previewTableBody.innerHTML = pageRows.map(row => {
        return `<tr>${extractedHeaders.map(header => {
            const cellVal = row[header] !== undefined ? row[header] : '';
            return `<td title="${cellVal}">${cellVal}</td>`;
        }).join('')}</tr>`;
    }).join('');
    
    // Update pagination footer controls
    const maxPage = Math.ceil(extractedRows.length / rowsPerPage);
    xm.paginationInfo.textContent = `Menampilkan baris ${startIndex + 1} - ${endIndex} dari ${extractedRows.length} (Halaman ${currentPage} dari ${maxPage})`;
    
    xm.prevPageBtn.disabled = currentPage === 1;
    xm.nextPageBtn.disabled = currentPage === maxPage || maxPage === 0;
}

/**
 * Triggers client-side SheetJS converter and saves to Audit list.
 */
function performXmlToExcelConversion() {
    const xm = elements.xml;
    if (!state.xml.file || state.xml.extractedRows.length === 0) return;
    
    const selectedFormat = xm.exportFormat.value;
    
    toast.info('Menyusun Lembar Kerja', 'Menyusun kolom-kolom tabel dan membangun file spreadsheet...');
    
    setTimeout(() => {
        try {
            downloadXmlAsExcel(
                state.xml.extractedRows,
                state.xml.extractedHeaders,
                state.xml.file.name,
                selectedFormat
            );
            
            addHistoryRecord(state.xml.file.name, formatBytes(state.xml.file.size), 'xml-to-excel', 'success');
            toast.success('Unduhan Dimulai', 'File tabel spreadsheet Excel berhasil dibuat dan disimpan.');
            
        } catch (err) {
            toast.error('Ekspor Gagal', err.message);
            addHistoryRecord(state.xml.file.name, formatBytes(state.xml.file.size), 'xml-to-excel', 'error');
        }
    }, 100);
}

/* ==========================================================================
   INTERACTIVE UTILITIES & PLUGINS
   ========================================================================== */

/**
 * Setup dragging events on target drops.
 * @param {HTMLElement} dropzone 
 * @param {Function} callback 
 */
function setupDragAndDrop(dropzone, callback) {
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        }, false);
    });
    
    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            callback(files[0]);
        }
    }, false);
}

/**
 * Fast Regex-based XML syntax highlighting.
 * @param {string} xmlString 
 * @returns {string} HTML representation
 */
function highlightXml(xmlString) {
    if (!xmlString) return '';
    
    // Escape standard tags first to avoid parsing native HTML
    let escaped = xmlString
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
        
    // 1. Color declarations <?xml ... ?>
    escaped = escaped.replace(/(&lt;\?[^?]+\?&gt;)/g, '<span class="xml-comment">$1</span>');
    
    // 2. Color XML Comments <!-- ... -->
    escaped = escaped.replace(/(&lt;!--.*?--&gt;)/g, '<span class="xml-comment">$1</span>');
    
    // 3. Color tags names &lt;/tag&gt;
    escaped = escaped.replace(/(&lt;\/?)([a-zA-Z0-9_:-]+)(\s|&gt;)/g, '$1<span class="xml-tag">$2</span>$3');
    
    // 4. Color attributes attr="val"
    escaped = escaped.replace(/(\s)([a-zA-Z0-9_:-]+)(=&quot;.*?&quot;)/g, '$1<span class="xml-attr">$2</span>$3');
    
    // 5. Color tag text contents between tag closures and openings
    // Matches: &gt;text&lt;
    escaped = escaped.replace(/(&gt;)([^&]+)(&lt;)/g, '$1<span class="xml-text">$2</span>$3');
    
    // 6. Color value quotes separately inside tags
    escaped = escaped.replace(/(=&quot;)(.*?)&quot;/g, '=<span class="xml-val">&quot;$2&quot;</span>');

    return escaped;
}
