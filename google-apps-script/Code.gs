/**
 * ============================================================================
 * RUN SOCIETY TRIESTE - GOOGLE APPS SCRIPT PER "LA TUA VOCE" / "YOUR VOICE"
 * ============================================================================
 * 
 * ISTRUZIONI DI INSTALLAZIONE RAPIDA:
 * 1. Crea un nuovo Foglio Google (o aprine uno esistente).
 * 2. Clicca nel menu in alto su: "Estensioni" -> "Apps Script".
 * 3. Incolla questo codice all'interno del file Code.gs (sostituendo il codice precedente).
 * 4. Clicca su "Esegui" -> seleziona "setupSheet" (per autorizzare i permessi e creare l'intestazione).
 * 5. Clicca in alto a destra su "Distribuisci" (Deploy) -> "Nuova distribuzione".
 * 6. Seleziona il tipo: "Applicazione web" (Web App).
 * 7. Imposta:
 *    - Descrizione: "Run Society Feedback Webhook"
 *    - Esegui come: "Utente proprietario" (Me)
 *    - Chi può accedere: "Chiunque" (Anyone - anche anonimi).
 * 8. Copia l'URL dell'applicazione web generato e incollalo nella variabile GOOGLE_SHEETS_WEBHOOK_URL nel file .env!
 * ============================================================================
 */

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Feedbacks") || ss.getActiveSheet();
  sheet.setName("Feedbacks");

  const headers = [
    "Timestamp",
    "Lingua / Language",
    "1. Motivo prima volta (First Reason)",
    "1. Altro (First Reason Other)",
    "2. Cosa ti ha fatto tornare (First Impression)",
    "3. Frequenza partecipazione (Frequency)",
    "1.1 Motivo assenza/rarità (Absence Reason)",
    "1.1 Altro assenza (Absence Other)",
    "4. Momento speciale club (Special Moment)",
    "5. Ambiente attuale (Atmosphere)",
    "5. Altro ambiente (Atmosphere Other)",
    "2.1 Suggerimenti miglioramento (Improvement Tips)",
    "6. Eventi/Iniziative preferite (Favorite Events)",
    "7. Fattori costanza (Consistency Factors)",
    "7. Altro costanza (Consistency Other)",
    "8. Novità future desiderate (Future Additions)",
    "The Open Track - Sezione Libera (Free Text)",
    "Percorso Branching (Path Taken)",
    "Dispositivo / User Agent"
  ];

  // Se la prima riga è vuota, crea le intestazioni
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#E63F11");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    
    // Regola larghezze colonne
    for (let i = 1; i <= headers.length; i++) {
      sheet.setColumnWidth(i, 220);
    }
    sheet.setColumnWidth(1, 160); // Timestamp
    sheet.setColumnWidth(2, 100); // Lingua
    sheet.setColumnWidth(17, 300); // Sezione Libera
  }

  return "Foglio configurato correttamente!";
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Feedbacks") || ss.getActiveSheet();
    if (sheet.getName() !== "Feedbacks") {
      sheet.setName("Feedbacks");
    }

    // Assicurati che l'header esista
    if (sheet.getLastRow() === 0) {
      setupSheet();
    }

    let rawData;
    if (e && e.postData && e.postData.contents) {
      rawData = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      rawData = e.parameter;
    } else {
      rawData = {};
    }

    const timestamp = rawData.timestamp || Utilities.formatDate(new Date(), "Europe/Rome", "yyyy-MM-dd HH:mm:ss");
    const lang = rawData.language || "it";

    const q1Reasons = Array.isArray(rawData.q1_reasons) ? rawData.q1_reasons.join(", ") : (rawData.q1_reasons || "");
    const q1Other = rawData.q1_other || "";
    const q2Impression = rawData.q2_impression || "";
    const q3Frequency = rawData.q3_frequency || "";
    const q3SubReason = rawData.q3_sub_reason || "";
    const q3SubOther = rawData.q3_sub_other || "";
    const q4SpecialMoment = rawData.q4_special_moment || "";
    const q5Atmosphere = rawData.q5_atmosphere || "";
    const q5Other = rawData.q5_other || "";
    const q5SubImprovement = rawData.q5_sub_improvement || "";
    const q6FavoriteEvents = rawData.q6_favorite_events || "";
    const q7Consistency = Array.isArray(rawData.q7_consistency) ? rawData.q7_consistency.join(", ") : (rawData.q7_consistency || "");
    const q7Other = rawData.q7_other || "";
    const q8FutureAdditions = rawData.q8_future_additions || "";
    const openTrack = rawData.open_track || "";
    const pathTaken = rawData.path_taken || "";
    const userAgent = rawData.user_agent || "";

    const row = [
      timestamp,
      lang.toUpperCase(),
      q1Reasons,
      q1Other,
      q2Impression,
      q3Frequency,
      q3SubReason,
      q3SubOther,
      q4SpecialMoment,
      q5Atmosphere,
      q5Other,
      q5SubImprovement,
      q6FavoriteEvents,
      q7Consistency,
      q7Other,
      q8FutureAdditions,
      openTrack,
      pathTaken,
      userAgent
    ];

    sheet.appendRow(row);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Feedback salvato con successo su Google Sheets!",
      timestamp: timestamp
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "Run Society Google Sheets Feedback Webhook",
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
