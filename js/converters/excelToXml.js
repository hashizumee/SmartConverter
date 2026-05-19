/* js/converters/excelToXml.js */

import { sanitizeTagName, escapeXml } from '../utils/helpers.js';

/**
 * Parses an Excel file and returns sheet names and SheetJS workbook reference.
 * @param {File} file 
 * @returns {Promise<{sheetNames: Array<string>, workbook: any}>}
 */
export function parseExcelWorkbook(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = window.XLSX.read(data, { type: 'array' });
                resolve({
                    sheetNames: workbook.SheetNames,
                    workbook: workbook
                });
            } catch (err) {
                reject(new Error('Gagal membaca berkas Excel. Pastikan berkas tersebut merupakan spreadsheet .xlsx, .xls, atau .csv yang valid. Detail: ' + err.message));
            }
        };
        
        reader.onerror = () => reject(new Error('Terjadi kesalahan saat membaca berkas. Silakan coba lagi.'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Converts a specific spreadsheet sheet to an XML string based on custom preferences.
 * @param {any} workbook - SheetJS Workbook object
 * @param {string} sheetName - Target Sheet Name
 * @param {object} options - Custom XML parameters
 * @returns {string}
 */
export function convertSheetToXml(workbook, sheetName, options = {}) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
        throw new Error(`Lembar kerja "${sheetName}" tidak ditemukan di dalam dokumen.`);
    }

    // Convert sheet rows to JSON objects (Header-based)
    // defval: '' makes sure empty cells are output as empty tags rather than being omitted entirely!
    const rows = window.XLSX.utils.sheet_to_json(sheet, { defval: '' });
    
    if (rows.length === 0) {
        throw new Error(`Lembar kerja "${sheetName}" kosong.`);
    }

    const {
        mode = 'standard',
        keyColumn = '',
        valueColumn = '',
        rootNode = 'workbook',
        rowNode = 'row',
        prettyPrint = true,
        indentSpaces = 2,
        sanitizeStrategy = 'snakeCase'
    } = options;

    const indentStr = prettyPrint ? ' '.repeat(indentSpaces) : '';
    const newline = prettyPrint ? '\n' : '';
    
    // Clean tag declarations
    const cleanRoot = sanitizeTagName(rootNode, 'none'); 

    let xml = `<?xml version="1.0" encoding="UTF-8"?>` + newline;
    xml += `<${cleanRoot}>` + newline;

    if (mode === 'key_value') {
        rows.forEach(row => {
            const paramName = row[keyColumn];
            const paramValue = row[valueColumn];
            
            // Skip if parameter name is empty
            if (paramName === undefined || paramName === null || String(paramName).trim() === '') {
                return;
            }
            
            const cleanTag = sanitizeTagName(String(paramName), sanitizeStrategy);
            const escapedVal = escapeXml(paramValue !== undefined ? String(paramValue) : '');
            
            xml += (prettyPrint ? indentStr : '') + `<${cleanTag}>${escapedVal}</${cleanTag}>` + newline;
        });
    } else {
        const cleanRow = sanitizeTagName(rowNode, 'none');
        rows.forEach(row => {
            xml += (prettyPrint ? indentStr : '') + `<${cleanRow}>` + newline;
            
            Object.entries(row).forEach(([header, val]) => {
                const cleanTag = sanitizeTagName(header, sanitizeStrategy);
                const escapedVal = escapeXml(val !== undefined ? String(val) : '');
                
                xml += (prettyPrint ? indentStr.repeat(2) : '') + `<${cleanTag}>${escapedVal}</${cleanTag}>` + newline;
            });

            xml += (prettyPrint ? indentStr : '') + `</${cleanRow}>` + newline;
        });
    }

    xml += `</${cleanRoot}>`;
    return xml;
}
