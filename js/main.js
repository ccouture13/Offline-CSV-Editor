function validateFile(file) {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    return fileExtension === 'csv';
}

function errorHandler(error) {
    console.error(error);
    alert('An error occurred: ' + error.message);
}

function saveFile(data, filename) {
    const blob = new Blob([data], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

let headers = [];
let updatedHeaders = [];
let firstRowValues = [];

function handleFileUpload() {
    const fileInput = document.getElementById('csv-file');
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const csvData = event.target.result;
            detectDelimiter(csvData);  
            headers = csvData.split('\n')[0].split(detectedDelimiter); 
            firstRowValues = csvData.split('\n')[1].split(detectedDelimiter); // Store first row values
            displayHeaders();
        };
        reader.onerror = function(event) {
            errorHandler(new Error('Failed to read file.'));
        };
        reader.readAsText(file);
    }
}

function parseHeaders(csvData) {
    headers = csvData.split('\n')[0].split(',');
    displayHeaders();
}

// Function to check if a value looks like a SHA-256 hash
function isHashed(value) {
    return /^[a-fA-F0-9]{64}$/.test(value);
}

function displayHeaders() {
    const columnsContainer = document.getElementById('columns-container');
    columnsContainer.innerHTML = '';
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
        <th>Index</th>
        <th>Header</th>
        <th>Modify Header</th>
        <th>New Header</th>
        <th>Hash Value</th>
    `;
    columnsContainer.appendChild(headerRow);
    headers.forEach((header, index) => {
        const isHashed = isValueHashed(firstRowValues[index]);
        const columnItem = document.createElement('tr');
        columnItem.className = 'column-item';
        columnItem.innerHTML = `
            <td>${index + 1}</td>
            <td style="min-width: 300px; max-width: 300px; text-align: left;">${header}</td>
            <td>
                <div style="display: flex; align-items: center;">
                    <label class="switch">
                        <input type="checkbox" id="rename-${index}" onclick="toggleRenameField(${index})">
                        <span class="slider"></span>
                    </label>
                    <label for="rename-${index}" style="margin-left: 10px; font-size: 14px">Modify</label>
                </div>
            </td>
            <td>
                <div class="text-input-container">
                    <input type="text" id="new-name-${index}" placeholder="Enter New Header" disabled>
                </div>
            </td>
            <td>
                <div title="${isHashed ? 'Value is already hashed' : ''}">
                    <input type="checkbox" id="hash-${index}" ${isHashed ? 'disabled' : ''}>
                </div>
            </td>
        `;
        columnsContainer.appendChild(columnItem);
    });
    columnsContainer.hidden = false;
    document.getElementById('save-button').hidden = false;
    document.getElementById('restart-button').hidden = false;
    document.getElementById('columns-container-wrapper').style.display = '';
    document.getElementById('file-upload-container').style.display = 'none';
}

function isValueHashed(value) {
    // Assume a value is hashed if it's 64 characters long (length of a SHA-256 hash)
    return value.length === 64;
}

function toggleRenameField(index) {
    const renameCheckbox = document.getElementById(`rename-${index}`);
    const renameField = document.getElementById(`new-name-${index}`);
    renameField.disabled = !renameCheckbox.checked;
}

let detectedDelimiter = '';

function detectDelimiter(csvData) {
    const firstLine = csvData.split('\n')[0];
    if (firstLine.includes(';')) {
        detectedDelimiter = ';';
    } else {
        detectedDelimiter = ',';
    }
    document.getElementById('detected-delimiter').textContent = detectedDelimiter;
    // document.getElementById('delimiter-container').style.display = '';
}

function toggleDelimiterField() {
    const changeDelimiterCheckbox = document.getElementById('change-delimiter-checkbox');
    const newDelimiterDropdown = document.getElementById('new-delimiter');
    newDelimiterDropdown.disabled = !changeDelimiterCheckbox.checked;
}

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);                    
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashColumn(columnData) {
    const hashedColumn = [];
    for (const value of columnData) {
        hashedColumn.push(await sha256(value));
    }
    return hashedColumn;
}

function saveUpdatedFile() {
    updatedHeaders = headers.slice();
    headers.forEach((_, index) => {
        const renameCheckbox = document.getElementById(`rename-${index}`);
        if (renameCheckbox.checked) {
            const newName = document.getElementById(`new-name-${index}`).value;
            updatedHeaders[index] = newName || updatedHeaders[index]; 
        }
    });

    // Preparing new CSV data
    const fileInput = document.getElementById('csv-file');
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = async function(event) {
        let updatedCsvData = event.target.result;
        const rows = updatedCsvData.split('\n');
        rows[0] = updatedHeaders.join(',');

        const columns = rows.slice(1).map(row => row.split(','));
        for (let index = 0; index < headers.length; index++) {
            const hashCheckbox = document.getElementById(`hash-${index}`);
            if (hashCheckbox.checked) {
                const columnData = columns.map(row => row[index]);
                const hashedColumn = await hashColumn(columnData);
                columns.forEach((row, rowIndex) => {
                    row[index] = hashedColumn[rowIndex];
                });
            }
        }
        rows.splice(1, rows.length - 1, ...columns.map(row => row.join(',')));
        updatedCsvData = rows.join('\n');

        const newDelimiterCheckbox = document.getElementById('change-delimiter-checkbox');
        if (newDelimiterCheckbox.checked) {
            const newDelimiter = document.getElementById('new-delimiter').value;
            updatedCsvData = updatedCsvData.replace(new RegExp(detectedDelimiter, 'g'), newDelimiter);
        }

        // Saving updated file
        const now = new Date();
        const dateTimeString = now.toISOString().replace(/:/g, '-');  // Replace colons to ensure a valid filename
        const updatedFilename = `${dateTimeString}_${file.name}`;
        saveFile(updatedCsvData, updatedFilename);
    };
    reader.onerror = function(event) {
        errorHandler(new Error('Failed to read file.'));
    };
    reader.readAsText(file);
}

function dropHandler(ev) {
    ev.preventDefault();
    if (ev.dataTransfer.items && ev.dataTransfer.items[0].kind === 'file') {
          const file = ev.dataTransfer.items[0].getAsFile();
                document.getElementById('csv-file').files = ev.dataTransfer.files;
                handleFileUpload();
    }
}