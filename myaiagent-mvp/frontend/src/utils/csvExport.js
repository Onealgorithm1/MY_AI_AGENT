/**
 * Convert JSON data to CSV format
 * @param {Array<Object>} data - Array of objects to convert
 * @param {Array<string>} [headers] - Optional list of headers (keys) to include. If omitted, uses all keys from first object.
 * @returns {string} CSV string
 */
export const convertToCSV = (data, headers = null) => {
    if (!data || !data.length) {
        return '';
    }

    // If no headers provided, use keys from the first object
    if (!headers) {
        headers = Object.keys(data[0]);
    }

    const csvRows = [];

    // Add header row
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
        const values = headers.map(header => {
            const escaped = ('' + (row[header] || '')).replace(/"/g, '\\"');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
};

/**
 * Trigger a browser download of CSV data
 * @param {Array<Object>} data - Array of objects to download
 * @param {string} filename - Name of the file (without extension)
 * @param {Array<string>} [headers] - Optional list of headers
 */
export const downloadCSV = (data, filename = 'export', headers = null) => {
    try {
        const csvData = convertToCSV(data, headers);
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${filename}.csv`);
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return true;
    } catch (error) {
        console.error('Failed to download CSV:', error);
        return false;
    }
};

export default {
    convertToCSV,
    downloadCSV
};
