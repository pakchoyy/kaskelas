var SPREADSHEET_ID = '';
var SHEET_SISWA = 'Siswa';
var SHEET_KAS = 'Kas';
var SHEET_KEUANGAN = 'Keuangan';

function doGet(e) {
  var action = e && e.parameter ? e.parameter.action : '';

  if (action === 'ping') {
    return jsonResponse({ success: true, message: 'pong' });
  }

  if (action === 'getData') {
    try {
      return jsonResponse({
        success: true,
        data: readAllData(),
      });
    } catch (error) {
      return jsonResponse({ success: false, message: error.message }, 500);
    }
  }

  return jsonResponse({ success: true, message: 'Bantu Guru Yuk - Kas Kelas API' });
}

function doPost(e) {
  var action = e && e.parameter ? e.parameter.action : '';
  var payload = parsePayload(e);

  if (!action) {
    return jsonResponse({ success: false, message: 'Missing action' }, 400);
  }

  try {
    if (action === 'saveSiswa') {
      return jsonResponse({ success: true, message: 'Students saved', data: saveStudents(payload.students || []) });
    }

    if (action === 'saveKas') {
      return jsonResponse({ success: true, message: 'Cash saved', data: saveCash(payload.cashRecords || []) });
    }

    if (action === 'saveKeuangan') {
      return jsonResponse({ success: true, message: 'Finance saved', data: saveFinance(payload.financeRecords || []) });
    }

    return jsonResponse({ success: false, message: 'Unknown action: ' + action }, 400);
  } catch (error) {
    return jsonResponse({ success: false, message: error.message }, 500);
  }
}

function getSpreadsheet() {
  if (!SPREADSHEET_ID) {
    throw new Error('Set SPREADSHEET_ID in Code.gs before deploying.');
  }

  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet(name) {
  var spreadsheet = getSpreadsheet();
  var sheet = spreadsheet.getSheetByName(name);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }

  return sheet;
}

function ensureHeaders(sheet, headers) {
  var firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  var needsWrite = headers.some(function (header, index) {
    return String(firstRow[index] || '').trim() !== header;
  });

  if (needsWrite) {
    sheet.clearContents();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function saveStudents(students) {
  var sheet = getSheet(SHEET_SISWA);
  ensureHeaders(sheet, ['No', 'Nama', 'StudentId', 'CreatedAt', 'UpdatedAt']);

  var rows = students.map(function (student, index) {
    return [index + 1, student.name || '', student.id || '', student.createdAt || '', student.updatedAt || ''];
  });

  clearRows(sheet, 2);
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  return { count: rows.length };
}

function saveCash(cashRecords) {
  var sheet = getSheet(SHEET_KAS);
  ensureHeaders(sheet, ['Tanggal', 'NamaSiswa', 'Status', 'StudentId', 'UpdatedAt']);

  var rows = [];
  cashRecords.forEach(function (record) {
    var date = record.date || '';
    var studentId = record.studentId || '';
    var studentName = record.studentName || studentId;
    var status = Number(record.status || 1);

    if (!date || !studentId) {
      return;
    }

    rows.push([date, studentName, status, studentId, record.updatedAt || '']);
  });

  clearRows(sheet, 2);
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  return { count: rows.length };
}

function saveFinance(financeRecords) {
  var sheet = getSheet(SHEET_KEUANGAN);
  ensureHeaders(sheet, ['Tanggal', 'Tipe', 'Nominal', 'Keterangan', 'TransactionId', 'CreatedAt', 'UpdatedAt']);

  var rows = financeRecords.map(function (transaction) {
    return [
      transaction.date || '',
      transaction.type || '',
      Number(transaction.nominal || 0),
      transaction.note || '',
      transaction.id || '',
      transaction.createdAt || '',
      transaction.updatedAt || '',
    ];
  });

  clearRows(sheet, 2);
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  return { count: rows.length };
}

function readAllData() {
  return {
    students: readStudents(),
    cashRecords: readCash(),
    financeRecords: readFinance(),
  };
}

function readStudents() {
  var sheet = getSheet(SHEET_SISWA);
  var values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return [];
  }

  return values.slice(1).map(function (row) {
    return {
      id: String(row[2] || ''),
      name: String(row[1] || ''),
      createdAt: String(row[3] || ''),
      updatedAt: String(row[4] || ''),
    };
  }).filter(function (student) {
    return student.name;
  });
}

function readCash() {
  var sheet = getSheet(SHEET_KAS);
  var values = sheet.getDataRange().getValues();
  var recordsByDate = {};

  if (values.length <= 1) {
    return [];
  }

  values.slice(1).forEach(function (row) {
    var date = String(row[0] || '');
    var studentName = String(row[1] || '');
    var studentId = String(row[3] || row[1] || '');
    var updatedAt = String(row[4] || '');
    var status = Number(row[2] || 0);

    if (!date || !studentId || status !== 1) {
      return;
    }

    if (!recordsByDate[date]) {
      recordsByDate[date] = { date: date, checkedStudentIds: [], updatedAt: updatedAt };
    }

    recordsByDate[date].checkedStudentIds.push(studentId);
    recordsByDate[date].updatedAt = updatedAt || recordsByDate[date].updatedAt;
  });

  return Object.keys(recordsByDate).map(function (key) {
    return recordsByDate[key];
  });
}

function readFinance() {
  var sheet = getSheet(SHEET_KEUANGAN);
  var values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return [];
  }

  return values.slice(1).map(function (row) {
    return {
      id: String(row[4] || ''),
      type: String(row[1] || ''),
      date: String(row[0] || ''),
      nominal: Number(row[2] || 0),
      note: String(row[3] || ''),
      createdAt: String(row[5] || ''),
      updatedAt: String(row[6] || ''),
    };
  }).filter(function (transaction) {
    return transaction.date && transaction.type && transaction.note;
  });
}

function clearRows(sheet, startRow) {
  var lastRow = sheet.getLastRow();

  if (lastRow >= startRow) {
    sheet.getRange(startRow, 1, lastRow - startRow + 1, sheet.getMaxColumns()).clearContent();
  }
}

function parsePayload(e) {
  try {
    var raw = e && e.parameter ? e.parameter.payload : '';
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function jsonResponse(payload, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
