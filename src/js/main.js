// Utility Functions
function validateFile(file) {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    return fileExtension === 'csv';
}

function errorHandler(error) {
    console.error(error);
    alert('An error occurred: ' + error.message);
}

// File Saving Function
function saveFile(data, filename) {
    const blob = new Blob([data], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Core Functions
let headers = [];
let updatedHeaders = [];

function handleFileUpload() {
    const fileInput = document.getElementById('csv-file');
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const csvData = event.target.result;
            detectDelimiter(csvData);  
            headers = csvData.split('\n')[0].split(detectedDelimiter); 
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

function displayHeaders() {
    const columnsContainer = document.getElementById('columns-container');
    columnsContainer.innerHTML = '';
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
        <th>#</th>
        <th>Name</th>
        <th>Modify</th>
        <th>New Header</th>
    `;
    columnsContainer.appendChild(headerRow);
    headers.forEach((header, index) => {
        const columnItem = document.createElement('tr');
        columnItem.className = 'column-item';
        columnItem.innerHTML = `
            <td>${index + 1}</td>
            <td>${header}</td>
            <td><input type="checkbox" id="rename-${index}" onclick="toggleRenameField(${index})"><label for="rename-${index}">Modify</label></td>
            <td><input type="text" id="new-name-${index}" placeholder="New Name" disabled></td> <!-- text fields are now disabled, not hidden -->
        `;
        columnsContainer.appendChild(columnItem);
    });
    columnsContainer.hidden = false;
    document.getElementById('save-button').hidden = false;
}


function toggleRenameField(index) {
    const renameCheckbox = document.getElementById(`rename-${index}`);
    const renameField = document.getElementById(`new-name-${index}`);
    renameField.disabled = !renameCheckbox.checked;  // toggle disabled state based on checkbox
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
    document.getElementById('delimiter-container').hidden = false;
}

function toggleDelimiterField() {
    const changeDelimiterCheckbox = document.getElementById('change-delimiter-checkbox');
    const newDelimiterField = document.getElementById('new-delimiter');
    newDelimiterField.disabled = !changeDelimiterCheckbox.checked;
}



function saveUpdatedFile() {
    updatedHeaders = headers.slice();
    headers.forEach((_, index) => {
        const renameCheckbox = document.getElementById(`rename-${index}`);
        if (renameCheckbox.checked) {
            const newName = document.getElementById(`new-name-${index}`).value;
            updatedHeaders[index] = newName || updatedHeaders[index];  // fall back to original name if new name is empty
        }
    });

    // Preparing new CSV data
    const fileInput = document.getElementById('csv-file');
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = function(event) {
        let updatedCsvData = event.target.result;
        const rows = updatedCsvData.split('\n');
        rows[0] = updatedHeaders.join(',');  // Update the headers
        updatedCsvData = rows.join('\n');

        const newDelimiterCheckbox = document.getElementById('change-delimiter-checkbox');
        if (newDelimiterCheckbox.checked) {
            const newDelimiter = document.getElementById('new-delimiter').value;
            updatedCsvData = updatedCsvData.replace(new RegExp(detectedDelimiter, 'g'), newDelimiter);
        }

        // Saving updated file
        const updatedFilename = 'updated_' + file.name;
        saveFile(updatedCsvData, updatedFilename);
    };
    reader.onerror = function(event) {
        errorHandler(new Error('Failed to read file.'));
    };
    reader.readAsText(file);
}

