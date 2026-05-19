/* js/converters/xmlToExcel.js */

/**
 * Parses raw XML text into an XML DOM document.
 * @param {string} xmlString 
 * @returns {XMLDocument}
 */
export function parseXmlString(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
    
    // Check if XML has parser error tags
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
        throw new Error('Gagal memparsing XML. Harap periksa apakah ada kesalahan sintaksis seperti tag yang belum ditutup atau karakter yang belum di-escape. Detail: ' + parserError.textContent.trim());
    }
    
    return xmlDoc;
}

/**
 * Analyzes the XML structure and returns list of element tag names that appear multiple times.
 * This helps the UI provide a dropdown to select the "row record" tag.
 * @param {XMLDocument} xmlDoc 
 * @returns {{ tagNames: Array<{name: string, count: number}>, defaultTag: string }}
 */
export function detectXmlRowTags(xmlDoc) {
    const counts = {};
    const rootTag = xmlDoc.documentElement.tagName;
    
    // Traverses document and counts element node tags
    const elements = xmlDoc.getElementsByTagName('*');
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        
        // Skip document root element
        if (el === xmlDoc.documentElement) continue;
        
        const tagName = el.tagName;
        counts[tagName] = (counts[tagName] || 0) + 1;
    }
    
    // Convert counts to sorted array
    const sortedTags = Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count);
        
    // Check if the XML is flat (children of root have mostly unique tag names)
    const rootChildren = xmlDoc.documentElement.children;
    let isFlat = false;
    if (rootChildren.length > 0) {
        const uniqueChildTags = new Set(Array.from(rootChildren).map(c => c.tagName));
        if (uniqueChildTags.size / rootChildren.length > 0.8) {
            isFlat = true;
        }
    }
    
    // Add the root element as an option for Flat Mode
    const tagsWithRoot = [
        { name: `${rootTag} (Mode Flat: Parameter-Nilai)`, isRoot: true, rawName: rootTag, count: rootChildren.length },
        ...sortedTags.map(t => ({ ...t, isRoot: false, rawName: t.name }))
    ];
    
    // Determine default tag
    let defaultTag = tagsWithRoot[0].name; // Default to flat mode if detected
    if (!isFlat && sortedTags.length > 0) {
        // Otherwise look for standard repeating tags
        for (const tag of sortedTags) {
            const instances = xmlDoc.getElementsByTagName(tag.name);
            if (instances.length > 0 && instances[0].children.length > 0) {
                defaultTag = tag.name;
                break;
            }
        }
    }
    
    return {
        tagNames: tagsWithRoot,
        defaultTag: defaultTag
    };
}

/**
 * Extracts list of flat JSON objects and unique headers list from matching XML rows.
 * @param {XMLDocument} xmlDoc 
 * @param {string} rowTagName 
 * @returns {{ rows: Array<object>, headers: Array<string> }}
 */
export function extractDataFromXml(xmlDoc, rowTagName) {
    if (!rowTagName) {
        throw new Error('Silakan pilih elemen XML valid yang mewakili baris data.');
    }
    
    const rootTag = xmlDoc.documentElement.tagName;
    
    // Check if flat mode is selected
    if (rowTagName === rootTag || rowTagName.startsWith(`${rootTag} (Mode Flat`)) {
        const rootChildren = xmlDoc.documentElement.children;
        const rows = [];
        
        for (let i = 0; i < rootChildren.length; i++) {
            const child = rootChildren[i];
            rows.push({
                'Parameter': child.tagName,
                'Value': child.textContent.trim()
            });
        }
        
        return {
            rows: rows,
            headers: ['Parameter', 'Value']
        };
    }
    
    const elements = xmlDoc.getElementsByTagName(rowTagName);
    if (elements.length === 0) {
        return { rows: [], headers: [] };
    }
    
    const rows = [];
    const headersSet = new Set();
    
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const rowData = {};
        
        // 1. Extract attributes (e.g. <employee id="EMP101"> becomes rowData['id'] = 'EMP101')
        if (el.attributes) {
            for (let j = 0; j < el.attributes.length; j++) {
                const attr = el.attributes[j];
                const key = `@${attr.name}`; // Prefix with @ to denote it came from attribute
                rowData[key] = attr.value;
                headersSet.add(key);
            }
        }
        
        // 2. Extract child node text values
        const children = el.children;
        if (children.length > 0) {
            for (let j = 0; j < children.length; j++) {
                const child = children[j];
                
                // If it's a simple text element (no nested elements), extract value
                if (child.children.length === 0) {
                    rowData[child.tagName] = child.textContent.trim();
                    headersSet.add(child.tagName);
                } else {
                    // For nested items, flat-stringify them or parse recursively (we will stringify for neat cell presentation)
                    rowData[child.tagName] = child.innerHTML.trim();
                    headersSet.add(child.tagName);
                }
            }
        } else {
            // Self-closing tag or plain text row element
            const val = el.textContent.trim();
            if (val) {
                rowData['value'] = val;
                headersSet.add('value');
            }
        }
        
        rows.push(rowData);
    }
    
    return {
        rows: rows,
        headers: Array.from(headersSet)
    };
}

/**
 * Builds a workbook from extracted XML rows using SheetJS, and triggers user download.
 * @param {Array<object>} rows - Flat JSON list
 * @param {Array<string>} headers - Headers listing
 * @param {string} baseFilename - original file name
 * @param {string} format - 'xlsx' | 'xls' | 'csv'
 */
export function downloadXmlAsExcel(rows, headers, baseFilename, format = 'xlsx') {
    if (!rows || rows.length === 0) {
        throw new Error('Tidak ada baris data yang ditemukan untuk dikonversikan.');
    }
    
    // Create new sheet
    const worksheet = window.XLSX.utils.json_to_sheet(rows, { header: headers });
    
    // Create workbook
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Hasil Konversi XML');
    
    // Generate buffer based on formats
    let bookType = 'xlsx';
    let ext = '.xlsx';
    let mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    
    if (format === 'xls') {
        bookType = 'biff8';
        ext = '.xls';
        mime = 'application/vnd.ms-excel';
    } else if (format === 'csv') {
        bookType = 'csv';
        ext = '.csv';
        mime = 'text/csv;charset=utf-8;';
    }
    
    // Generate output file binary
    const excelOutput = window.XLSX.write(workbook, { bookType: bookType, type: 'array' });
    const blob = new Blob([excelOutput], { type: mime });
    
    // Trigger download
    const cleanedName = baseFilename.substring(0, baseFilename.lastIndexOf('.')) || baseFilename;
    const downloadName = `${cleanedName}_converted${ext}`;
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
}
