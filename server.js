const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

// Enable JSON and URL-encoded body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API endpoint to receive feedback
app.post(['/api/feedback', '/api/submit-feedback'], async (req, res) => {
  try {
    const feedbackData = {
      ...req.body,
      serverReceivedAt: new Date().toISOString(),
      ip: req.ip || req.headers['x-forwarded-for'] || ''
    };

    // 1. Persistent local backup
    const feedbacksFile = path.join(__dirname, 'data', 'feedbacks.json');
    let feedbacksList = [];
    try {
      if (fs.existsSync(feedbacksFile)) {
        const content = fs.readFileSync(feedbacksFile, 'utf8');
        feedbacksList = JSON.parse(content || '[]');
      }
    } catch (err) {
      console.warn('Could not read existing feedbacks.json, starting fresh', err.message);
    }
    feedbacksList.push(feedbackData);
    try {
      fs.writeFileSync(feedbacksFile, JSON.stringify(feedbacksList, null, 2), 'utf8');
    } catch (err) {
      console.error('Error writing to feedbacks.json:', err.message);
    }

    // 2. Forward to Google Sheets Webhook (if configured)
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

// Route alias for /laTuaVoce and /your-voice
app.get(['/laTuaVoce', '/la-tua-voce', '/your-voice', '/latuavoce'], (req, res) => {
  res.sendFile(path.join(__dirname, 'laTuaVoce.html'));
});

// Serve static assets from root directory
app.use(express.static(path.join(__dirname, '.')));

// 404 fallback
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
