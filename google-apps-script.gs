/**
 * ============================================================
 *  GATE CHECK — Event Ticket Validator
 *  Backend: Google Apps Script (Web App) + Google Sheets
 * ============================================================
 *  Cara pakai: lihat PANDUAN.md
 *
 *  Struktur kolom Sheet (baris 1 = header, urutan HARUS sama):
 *  A: Timestamp
 *  B: Order ID
 *  C: Nama Lengkap
 *  D: Email
 *  E: Nomor WhatsApp
 *  F: Kategori Tiket
 *  G: Jumlah Tiket
 *  H: Total Harga
 *  I: Status Pembayaran
 *  J: E-Ticket Code / QR Code Unique String
 *  K: Metode Pembayaran
 *  L: Bukti Pembayaran
 *  M: E-Ticket Email Sent At
 *  N: Status Penukaran      <-- kolom BARU, isi manual "Belum Ditukarkan" untuk semua baris data
 *  O: Waktu Penukaran       <-- kolom BARU, biarkan kosong, otomatis terisi saat check-in
 * ============================================================
 */

// ---------- KONFIGURASI ----------
const SHEET_NAME = "Tickets";       // GANTI sesuai nama tab sheet kamu (mis. "Form Responses 1")
const SECRET_TOKEN = "";            // opsional: isi string rahasia, lalu isi juga CONFIG.TOKEN di index.html
const TIMEZONE = "Asia/Jakarta";
const TOTAL_COLUMNS = 15;           // A..O

const COLUMNS = {
  TIMESTAMP: 0,
  ORDER_ID: 1,
  NAMA_LENGKAP: 2,
  EMAIL: 3,
  NOMOR_WHATSAPP: 4,
  KATEGORI_TIKET: 5,
  JUMLAH_TIKET: 6,
  TOTAL_HARGA: 7,
  STATUS_PEMBAYARAN: 8,
  E_TICKET_CODE: 9,
  METODE_PEMBAYARAN: 10,
  BUKTI_PEMBAYARAN: 11,
  EMAIL_SENT_AT: 12,
  STATUS_PENUKARAN: 13,   // N
  WAKTU_PENUKARAN: 14,    // O
};

const STATUS_BELUM = "Belum Ditukarkan";
const STATUS_SUDAH = "Sudah Ditukarkan";

// Kolom yang boleh diedit lewat web (field key -> index kolom)
const EDITABLE_FIELDS = {
  Nama_Lengkap: COLUMNS.NAMA_LENGKAP,
  Email: COLUMNS.EMAIL,
  Nomor_WhatsApp: COLUMNS.NOMOR_WHATSAPP,
  Kategori_Tiket: COLUMNS.KATEGORI_TIKET,
  Jumlah_Tiket: COLUMNS.JUMLAH_TIKET,
};

// ============================================================
// ENTRY POINTS
// ============================================================
function doGet(e) {
  try {
    const action = e.parameter.action;
    if (!checkToken(e.parameter.token)) return jsonOut({ ok: false, message: "Unauthorized" });

    if (action === "stats") return jsonOut(handleStats());
    if (action === "search") return jsonOut(handleSearch(e.parameter.code));
    if (action === "search_prefix") return jsonOut(handleSearchPrefix(e.parameter.q));
    if (action === "list_checked") return jsonOut(handleListChecked());
    if (action === "ping") return jsonOut({ ok: true, message: "pong" });

    return jsonOut({ ok: false, message: "Unknown action" });
  } catch (err) {
    return jsonOut({ ok: false, message: "Server error: " + err.message });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    if (!checkToken(body.token)) return jsonOut({ ok: false, message: "Unauthorized" });

    if (body.action === "checkin") return jsonOut(handleCheckin(body.code));
    if (body.action === "update") return jsonOut(handleUpdate(body.code, body.fields || {}));
    if (body.action === "undo_checkin") return jsonOut(handleUndoCheckin(body.code));
    if (body.action === "delete") return jsonOut(handleDelete(body.code));

    return jsonOut({ ok: false, message: "Unknown action" });
  } catch (err) {
    return jsonOut({ ok: false, message: "Server error: " + err.message });
  }
}

// ============================================================
// HANDLERS
// ============================================================
function handleStats() {
  const rows = getDataRows();
  const total = rows.length;
  const checkedIn = rows.filter(r => r[COLUMNS.STATUS_PENUKARAN] === STATUS_SUDAH).length;
  return { ok: true, total, checkedIn, remaining: total - checkedIn };
}

function handleSearch(rawCode) {
  const code = normalize(rawCode);
  if (!code) return { ok: false, found: false, message: "Kode kosong" };

  const found = findTicketRow(code);
  if (!found) return { ok: true, found: false };

  return { ok: true, found: true, ticket: rowToTicket(found.row) };
}

function handleSearchPrefix(rawQuery) {
  const q = normalize(rawQuery || "");
  if (!q || q.length < 1) return { ok: true, results: [] };

  const rows = getDataRows();
  const matches = [];

  rows.forEach((row) => {
    const ticket = rowToTicket(row);
    const haystacks = [
      String(ticket.E_Ticket_Code || ""),
      String(ticket.Order_ID || ""),
      String(ticket.Nama_Lengkap || ""),
      String(ticket.Nomor_WhatsApp || "")
    ].map(v => normalize(v));

    const matched = haystacks.some(v => v.indexOf(q) !== -1 || v.startsWith(q));
    if (matched) {
      matches.push({
        code: ticket.E_Ticket_Code || "",
        name: ticket.Nama_Lengkap || "-",
        wa: ticket.Nomor_WhatsApp || "-",
        status: ticket.Status_Penukaran || STATUS_BELUM,
        orderId: ticket.Order_ID || "-",
      });
    }
  });

  return { ok: true, results: matches.slice(0, 8) };
}

function handleListChecked() {
  const rows = getDataRows();
  const checked = rows
    .filter(r => r[COLUMNS.STATUS_PENUKARAN] === STATUS_SUDAH)
    .map(rowToTicket)
    .sort((a, b) => String(b.Waktu_Penukaran).localeCompare(String(a.Waktu_Penukaran)));
  return { ok: true, tickets: checked };
}

function handleCheckin(rawCode) {
  const code = normalize(rawCode);
  if (!code) return { ok: false, message: "Kode kosong" };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // cegah race condition jika 2 panitia scan barengan

  try {
    const found = findTicketRow(code);
    if (!found) return { ok: false, message: "Tiket tidak ditemukan" };

    if (found.row[COLUMNS.STATUS_PENUKARAN] === STATUS_SUDAH) {
      return { ok: false, message: "Tiket sudah ditukarkan sebelumnya", ticket: rowToTicket(found.row) };
    }

    const sheet = getSheet();
    const timestamp = Utilities.formatDate(new Date(), TIMEZONE, "dd/MM/yyyy HH:mm:ss");
    sheet.getRange(found.rowIndex, COLUMNS.STATUS_PENUKARAN + 1).setValue(STATUS_SUDAH);
    sheet.getRange(found.rowIndex, COLUMNS.WAKTU_PENUKARAN + 1).setValue(timestamp);

    const updatedRow = found.row.slice();
    updatedRow[COLUMNS.STATUS_PENUKARAN] = STATUS_SUDAH;
    updatedRow[COLUMNS.WAKTU_PENUKARAN] = timestamp;

    return { ok: true, ticket: rowToTicket(updatedRow) };
  } finally {
    lock.releaseLock();
  }
}

function handleUpdate(rawCode, fields) {
  const code = normalize(rawCode);
  if (!code) return { ok: false, message: "Kode kosong" };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const found = findTicketRow(code);
    if (!found) return { ok: false, message: "Tiket tidak ditemukan" };

    const sheet = getSheet();
    Object.keys(fields).forEach(key => {
      if (Object.prototype.hasOwnProperty.call(EDITABLE_FIELDS, key)) {
        const colIndex = EDITABLE_FIELDS[key];
        sheet.getRange(found.rowIndex, colIndex + 1).setValue(fields[key]);
        found.row[colIndex] = fields[key];
      }
    });

    return { ok: true, ticket: rowToTicket(found.row) };
  } finally {
    lock.releaseLock();
  }
}

function handleUndoCheckin(rawCode) {
  const code = normalize(rawCode);
  if (!code) return { ok: false, message: "Kode kosong" };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const found = findTicketRow(code);
    if (!found) return { ok: false, message: "Tiket tidak ditemukan" };

    const sheet = getSheet();
    sheet.getRange(found.rowIndex, COLUMNS.STATUS_PENUKARAN + 1).setValue(STATUS_BELUM);
    sheet.getRange(found.rowIndex, COLUMNS.WAKTU_PENUKARAN + 1).setValue("");

    found.row[COLUMNS.STATUS_PENUKARAN] = STATUS_BELUM;
    found.row[COLUMNS.WAKTU_PENUKARAN] = "";

    return { ok: true, ticket: rowToTicket(found.row) };
  } finally {
    lock.releaseLock();
  }
}

function handleDelete(rawCode) {
  const code = normalize(rawCode);
  if (!code) return { ok: false, message: "Kode kosong" };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const found = findTicketRow(code);
    if (!found) return { ok: false, message: "Tiket tidak ditemukan" };

    const sheet = getSheet();
    sheet.deleteRow(found.rowIndex);

    return { ok: true, message: "Data tiket dihapus" };
  } finally {
    lock.releaseLock();
  }
}

// ============================================================
// DATA ACCESS
// ============================================================
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    const fallback = ss.getSheets()[0];
    if (fallback) {
      sheet = fallback;
    } else {
      throw new Error(`Sheet "${SHEET_NAME}" tidak ditemukan`);
    }
  }

  return sheet;
}

function getDataRows() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, TOTAL_COLUMNS).getValues();
}

function findTicketRow(code) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const target = normalize(code);
  const targetLoose = normalizeLoose(target);
  const data = sheet.getRange(2, 1, lastRow - 1, TOTAL_COLUMNS).getValues();

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const orderId = normalize(row[COLUMNS.ORDER_ID]);
    const ticketCode = normalize(row[COLUMNS.E_TICKET_CODE]);
    const nama = normalize(row[COLUMNS.NAMA_LENGKAP]);
    const wa = normalize(row[COLUMNS.NOMOR_WHATSAPP]);

    const directMatch = ticketCode === target || orderId === target || nama === target || wa === target;
    const looseMatch = normalizeLoose(ticketCode) === targetLoose
      || normalizeLoose(orderId) === targetLoose
      || normalizeLoose(nama) === targetLoose
      || normalizeLoose(wa) === targetLoose;

    if (directMatch || looseMatch) {
      return { row, rowIndex: i + 2 };
    }

    const partialMatch = normalizeLoose(ticketCode).indexOf(targetLoose) !== -1
      || normalizeLoose(orderId).indexOf(targetLoose) !== -1
      || normalizeLoose(nama).indexOf(targetLoose) !== -1
      || normalizeLoose(wa).indexOf(targetLoose) !== -1;

    if (partialMatch) {
      return { row, rowIndex: i + 2 };
    }

    const fallbackMatch = row.some(cell => normalizeLoose(cell).indexOf(targetLoose) !== -1);
    if (fallbackMatch) {
      return { row, rowIndex: i + 2 };
    }
  }

  return null;
}

function rowToTicket(row) {
  return {
    Timestamp: row[COLUMNS.TIMESTAMP],
    Order_ID: row[COLUMNS.ORDER_ID],
    Nama_Lengkap: row[COLUMNS.NAMA_LENGKAP],
    Email: row[COLUMNS.EMAIL],
    Nomor_WhatsApp: row[COLUMNS.NOMOR_WHATSAPP],
    Kategori_Tiket: row[COLUMNS.KATEGORI_TIKET],
    Jumlah_Tiket: row[COLUMNS.JUMLAH_TIKET],
    Total_Harga: row[COLUMNS.TOTAL_HARGA],
    Status_Pembayaran: row[COLUMNS.STATUS_PEMBAYARAN],
    E_Ticket_Code: row[COLUMNS.E_TICKET_CODE],
    Metode_Pembayaran: row[COLUMNS.METODE_PEMBAYARAN],
    Bukti_Pembayaran: row[COLUMNS.BUKTI_PEMBAYARAN],
    Email_Sent_At: row[COLUMNS.EMAIL_SENT_AT],
    Status_Penukaran: row[COLUMNS.STATUS_PENUKARAN],
    Waktu_Penukaran: row[COLUMNS.WAKTU_PENUKARAN],
  };
}

// ============================================================
// HELPERS
// ============================================================
function normalize(v) {
  return String(v || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toUpperCase();
}

function normalizeLoose(v) {
  return normalize(v)
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

function checkToken(token) {
  if (!SECRET_TOKEN) return true; // token tidak diwajibkan jika SECRET_TOKEN kosong
  return token === SECRET_TOKEN;
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
