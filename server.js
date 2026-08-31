const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

// ==============================================================================
// CONFIGURAZIONE AMBIENTE & SICUREZZA
// ==============================================================================
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'RunSociety2026!Admin';
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'runsociety_trieste_admin_session_secret_key_2026_secure';

const EVENTS_FILE = path.join(__dirname, 'data', 'events.json');
const RACES_FILE = path.join(__dirname, 'data', 'races.json');
const FEEDBACKS_FILE = path.join(__dirname, 'data', 'feedbacks.json');

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Anti-clickjacking & Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// ==============================================================================
// RATE LIMITING & PROTEZIONE BRUTE-FORCE
// ==============================================================================
const loginAttempts = new Map(); // ip -> { count: number, resetAt: number, lockedUntil: number }
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minuti
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minuti di blocco se superato

function checkRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true, remaining: MAX_ATTEMPTS };

  if (record.lockedUntil && now < record.lockedUntil) {
    const waitMin = Math.ceil((record.lockedUntil - now) / 60000);
    return { allowed: false, locked: true, waitMin };
  }

  if (now > record.resetAt) {
    loginAttempts.delete(ip);
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }

  const remaining = Math.max(0, MAX_ATTEMPTS - record.count);
  return { allowed: remaining > 0, remaining };
}

function recordFailedLogin(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, resetAt: now + ATTEMPT_WINDOW_MS, lockedUntil: 0 };
  record.count += 1;
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
  }
  loginAttempts.set(ip, record);
}

function resetLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

// ==============================================================================
// TIMING-SAFE VERIFICATION & CRYPTOGRAPHIC SESSION MANAGEMENT
// ==============================================================================
function safeCompare(inputStr, expectedStr) {
  if (typeof inputStr !== 'string' || typeof expectedStr !== 'string') return false;
  const hash1 = crypto.createHash('sha256').update(inputStr).digest();
  const hash2 = crypto.createHash('sha256').update(expectedStr).digest();
  return crypto.timingSafeEqual(hash1, hash2);
}

function generateSessionToken(username) {
  const payload = {
    user: username,
    exp: Date.now() + 8 * 3600 * 1000, // 8 ore
    nonce: crypto.randomBytes(16).toString('hex')
  };
  const dataStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', ADMIN_SESSION_SECRET)
    .update(dataStr)
    .digest('base64url');
  return `${dataStr}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [dataStr, signature] = token.split('.');
  if (!dataStr || !signature) return null;

  const expectedSig = crypto
    .createHmac('sha256', ADMIN_SESSION_SECRET)
    .update(dataStr)
    .digest('base64url');

  if (!safeCompare(signature, expectedSig)) {
    return null;
  }

  try {
    const payloadJson = Buffer.from(dataStr, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson);
    if (!payload.exp || Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// Middleware di autenticazione per le route protette
function requireAdminAuth(req, res, next) {
  const token = req.cookies.rs_admin_session ||
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);

  const session = verifySessionToken(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Non autorizzato. Effettua il login per accedere.',
      code: 'UNAUTHORIZED'
    });
  }
  req.adminUser = session.user;
  next();
}

// Helper per il salvataggio atomico di file JSON con backup
function saveJsonAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const tempFile = `${filePath}.${Date.now()}.tmp`;
  const backupFile = `${filePath}.backup.json`;

  try {
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupFile);
    }
    const jsonStr = JSON.stringify(data, null, 2) + '\n';
    fs.writeFileSync(tempFile, jsonStr, 'utf8');
    fs.renameSync(tempFile, filePath);
    return true;
  } catch (err) {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    console.error(`Errore salvataggio atomico ${filePath}:`, err);
    throw err;
  }
}

function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim();
}

// ==============================================================================
// ROTTE AUTENTICAZIONE ADMIN
// ==============================================================================
app.post('/api/admin/login', (req, res) => {
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const rateStatus = checkRateLimit(clientIp);

  if (!rateStatus.allowed) {
    return res.status(429).json({
      success: false,
      error: `Troppi tentativi falliti. Riprova tra ${rateStatus.waitMin || 15} minuti per motivi di sicurezza.`
    });
  }

  const { username, password } = req.body || {};
  const isUserValid = safeCompare(username, ADMIN_USERNAME);
  const isPassValid = safeCompare(password, ADMIN_PASSWORD);

  if (!isUserValid || !isPassValid) {
    recordFailedLogin(clientIp);
    const updatedStatus = checkRateLimit(clientIp);
    return res.status(401).json({
      success: false,
      error: 'Credenziali non corrette.',
      remainingAttempts: updatedStatus.remaining
    });
  }

  resetLoginAttempts(clientIp);
  const token = generateSessionToken(username);

  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie('rs_admin_session', token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    maxAge: 8 * 3600 * 1000,
    path: '/'
  });

  return res.json({
    success: true,
    message: 'Autenticazione riuscita.',
    token,
    user: { username }
  });
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('rs_admin_session', { path: '/' });
  return res.json({ success: true, message: 'Logout effettuato con successo.' });
});

app.get('/api/admin/me', (req, res) => {
  const token = req.cookies.rs_admin_session ||
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);

  const session = verifySessionToken(token);
  if (!session) {
    return res.status(401).json({ authenticated: false });
  }
  return res.json({ authenticated: true, username: session.user });
});

// ==============================================================================
// CRUD RUN DEL CLUB (events.json)
// ==============================================================================
function readEventsFile() {
  if (!fs.existsSync(EVENTS_FILE)) return { events: [] };
  const raw = fs.readFileSync(EVENTS_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { events: parsed };
    return parsed.events ? parsed : { events: [] };
  } catch {
    return { events: [] };
  }
}

app.get('/api/admin/events', requireAdminAuth, (req, res) => {
  try {
    const data = readEventsFile();
    return res.json({ success: true, events: data.events || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/events', requireAdminAuth, (req, res) => {
  try {
    const { date, title, description, time, location, city } = req.body || {};

    if (!date || !title || !city) {
      return res.status(400).json({ success: false, error: 'Data, Titolo e Selezione Città sono obbligatori.' });
    }

    const cleanCity = String(city).toLowerCase().trim();
    if (!['trieste', 'venezia', 'entrambi'].includes(cleanCity)) {
      return res.status(400).json({ success: false, error: "La città deve essere 'trieste', 'venezia' oppure 'entrambi'." });
    }

    const newEvent = {
      date: sanitizeInput(date),
      title: typeof title === 'object' ? title : sanitizeInput(title),
      description: typeof description === 'object' ? description : sanitizeInput(description || ''),
      time: sanitizeInput(time || 'Meeting: 18:45, Start: 19:00'),
      location: typeof location === 'object' ? location : sanitizeInput(location || 'porto_vecchio'),
      city: cleanCity
    };

    const data = readEventsFile();
    data.events = data.events || [];
    data.events.push(newEvent);

    saveJsonAtomic(EVENTS_FILE, data);

    return res.status(201).json({
      success: true,
      message: 'Run aggiunta con successo!',
      event: newEvent,
      totalEvents: data.events.length
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/admin/events/:index', requireAdminAuth, (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);
    const data = readEventsFile();
    const list = data.events || [];

    if (isNaN(index) || index < 0 || index >= list.length) {
      return res.status(404).json({ success: false, error: 'Run non trovata.' });
    }

    const { date, title, description, time, location, city } = req.body || {};

    if (!date || !title || !city) {
      return res.status(400).json({ success: false, error: 'Data, Titolo e Selezione Città sono obbligatori.' });
    }

    const cleanCity = String(city).toLowerCase().trim();
    if (!['trieste', 'venezia', 'entrambi'].includes(cleanCity)) {
      return res.status(400).json({ success: false, error: "La città deve essere 'trieste', 'venezia' oppure 'entrambi'." });
    }

    const updatedEvent = {
      date: sanitizeInput(date),
      title: typeof title === 'object' ? title : sanitizeInput(title),
      description: typeof description === 'object' ? description : sanitizeInput(description || ''),
      time: sanitizeInput(time || 'Meeting: 18:45, Start: 19:00'),
      location: typeof location === 'object' ? location : sanitizeInput(location || 'porto_vecchio'),
      city: cleanCity
    };

    list[index] = updatedEvent;
    data.events = list;
    saveJsonAtomic(EVENTS_FILE, data);

    return res.json({
      success: true,
      message: 'Run aggiornata con successo!',
      event: updatedEvent,
      index
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/admin/events/:index', requireAdminAuth, (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);
    const data = readEventsFile();
    const list = data.events || [];

    if (isNaN(index) || index < 0 || index >= list.length) {
      return res.status(404).json({ success: false, error: 'Run non trovata.' });
    }

    const deleted = list.splice(index, 1);
    data.events = list;
    saveJsonAtomic(EVENTS_FILE, data);

    return res.json({
      success: true,
      message: 'Run eliminata con successo.',
      deleted: deleted[0],
      totalRemaining: list.length
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// CRUD GARE ESTERNE (races.json)
// ==============================================================================
function readRacesFile() {
  if (!fs.existsSync(RACES_FILE)) return [];
  const raw = fs.readFileSync(RACES_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : (parsed.races || []);
  } catch {
    return [];
  }
}

app.get('/api/admin/races', requireAdminAuth, (req, res) => {
  try {
    const list = readRacesFile();
    return res.json({ success: true, races: list });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/races', requireAdminAuth, (req, res) => {
  try {
    const { nome, data, distanze_km, disciplina, localita, area, prezzo, link_info } = req.body || {};

    if (!nome || !data) {
      return res.status(400).json({ success: false, error: 'Nome e Data della gara sono obbligatori.' });
    }

    // Normalizza distanze
    let distArray = [];
    if (Array.isArray(distanze_km)) {
      distArray = distanze_km.map(Number).filter(n => !isNaN(n) && n > 0);
    } else if (typeof distanze_km === 'string') {
      distArray = distanze_km.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n > 0);
    }
    if (distArray.length === 0) distArray = [10.0];

    // Data originale DD/MM/YYYY
    let dataOriginale = '';
    if (data.includes('-')) {
      const parts = data.split('-');
      dataOriginale = `${parts[2]}/${parts[1]}/${parts[0]}`;
    } else {
      dataOriginale = data;
    }

    const newRace = {
      nome: sanitizeInput(nome),
      data: sanitizeInput(data),
      data_originale: dataOriginale,
      distanze_km: distArray,
      disciplina: sanitizeInput(disciplina || 'strada'),
      localita: sanitizeInput(localita || 'Friuli Venezia Giulia'),
      area: sanitizeInput(area || 'Friuli Venezia Giulia'),
      prezzo: sanitizeInput(prezzo || 'N/D'),
      link_info: sanitizeInput(link_info || 'https://www.fidal.it')
    };

    const list = readRacesFile();
    list.push(newRace);
    // Ordina per data
    list.sort((a, b) => (a.data || '').localeCompare(b.data || ''));

    saveJsonAtomic(RACES_FILE, list);

    return res.status(201).json({
      success: true,
      message: 'Gara aggiunta con successo!',
      race: newRace,
      totalRaces: list.length
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/admin/races/:index', requireAdminAuth, (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);
    const list = readRacesFile();

    if (isNaN(index) || index < 0 || index >= list.length) {
      return res.status(404).json({ success: false, error: 'Gara non trovata.' });
    }

    const { nome, data, distanze_km, disciplina, localita, area, prezzo, link_info } = req.body || {};

    let distArray = [];
    if (Array.isArray(distanze_km)) {
      distArray = distanze_km.map(Number).filter(n => !isNaN(n) && n > 0);
    } else if (typeof distanze_km === 'string') {
      distArray = distanze_km.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n > 0);
    }
    if (distArray.length === 0) distArray = [10.0];

    let dataOriginale = '';
    if (data && data.includes('-')) {
      const parts = data.split('-');
      dataOriginale = `${parts[2]}/${parts[1]}/${parts[0]}`;
    } else {
      dataOriginale = data || list[index].data_originale;
    }

    const updatedRace = {
      nome: sanitizeInput(nome || list[index].nome),
      data: sanitizeInput(data || list[index].data),
      data_originale: dataOriginale,
      distanze_km: distArray,
      disciplina: sanitizeInput(disciplina || list[index].disciplina),
      localita: sanitizeInput(localita || list[index].localita),
      area: sanitizeInput(area || list[index].area),
      prezzo: sanitizeInput(prezzo || list[index].prezzo),
      link_info: sanitizeInput(link_info || list[index].link_info)
    };

    list[index] = updatedRace;
    list.sort((a, b) => (a.data || '').localeCompare(b.data || ''));

    saveJsonAtomic(RACES_FILE, list);

    return res.json({
      success: true,
      message: 'Gara aggiornata con successo!',
      race: updatedRace,
      index
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/admin/races/:index', requireAdminAuth, (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);
    const list = readRacesFile();

    if (isNaN(index) || index < 0 || index >= list.length) {
      return res.status(404).json({ success: false, error: 'Gara non trovata.' });
    }

    const deleted = list.splice(index, 1);
    saveJsonAtomic(RACES_FILE, list);

    return res.json({
      success: true,
      message: 'Gara eliminata con successo.',
      deleted: deleted[0],
      totalRemaining: list.length
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// FEEDBACK SUBMISSION
// ==============================================================================
app.post(['/api/feedback', '/api/submit-feedback'], async (req, res) => {
  try {
    const feedbackData = {
      ...req.body,
      serverReceivedAt: new Date().toISOString(),
      ip: req.ip || req.headers['x-forwarded-for'] || ''
    };

    let feedbacksList = [];
    try {
      if (fs.existsSync(FEEDBACKS_FILE)) {
        const content = fs.readFileSync(FEEDBACKS_FILE, 'utf8');
        feedbacksList = JSON.parse(content || '[]');
      }
    } catch (err) {
      console.warn('Could not read existing feedbacks.json, starting fresh', err.message);
    }
    feedbacksList.push(feedbackData);
    saveJsonAtomic(FEEDBACKS_FILE, feedbacksList);

    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    let googleSheetForwarded = false;
    let googleSheetError = null;

    if (webhookUrl && webhookUrl.startsWith('http')) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(feedbackData)
        });
        if (response.ok) {
          googleSheetForwarded = true;
        } else {
          googleSheetError = `HTTP ${response.status}`;
        }
      } catch (fErr) {
        googleSheetError = fErr.message;
        console.warn('Error forwarding to Google Sheets webhook:', fErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Feedback received successfully',
      googleSheetForwarded,
      googleSheetError,
      timestamp: feedbackData.serverReceivedAt
    });
  } catch (error) {
    console.error('Error processing feedback submission:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while saving feedback'
    });
  }
});

// ==============================================================================
// ROUTING PAGINE & STATIC ASSETS
// ==============================================================================
app.get(['/admin', '/admin.html'], (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get(['/laTuaVoce', '/la-tua-voce', '/your-voice', '/latuavoce'], (req, res) => {
  res.sendFile(path.join(__dirname, 'laTuaVoce.html'));
});

// Serve static assets
app.use(express.static(path.join(__dirname, '.')));

// 404 fallback
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
