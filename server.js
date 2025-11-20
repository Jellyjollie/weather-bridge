const express = require('express');
const axios = require('axios');
const app = express();

// Configuration - CHANGE THESE IF NEEDED
const FIREBASE_HOST = 'respondr-da5cb-default-rtdb.firebaseio.com/';
const FIREBASE_AUTH = '2i7HR4tO28CVITDhBZNki02gkFZcF3fAXeRtMwgI';
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Weather Station Bridge is running!',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Weather Station Bridge'
  });
});

// Bridge endpoint for weather data
app.post('/weather', async (req, res) => {
  try {
    console.log('\n=== Incoming Weather Data ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Client IP:', req.ip);
    console.log('Data:', JSON.stringify(req.body, null, 2));

    // Validate required fields
    const requiredFields = ['temperature', 'humidity', 'wind_speed_avg', 'timestamp', 'device_id'];
    const missingFields = requiredFields.filter(field => req.body[field] === undefined);
    
    if (missingFields.length > 0) {
      console.error('Missing fields:', missingFields);
      return res.status(400).json({ 
        error: 'Missing required fields', 
        missing: missingFields 
      });
    }

    // Get timestamp for Firebase path
    const timestamp = req.body.timestamp_ms || Date.now();
    
    // Prepare data for Firebase
    const weatherData = {
      temperature: parseFloat(req.body.temperature) || 0,
      humidity: parseFloat(req.body.humidity) || 0,
      wind_speed_avg: parseFloat(req.body.wind_speed_avg) || 0,
      wind_speed_max: parseFloat(req.body.wind_speed_max) || 0,
      wind_direction: parseInt(req.body.wind_direction) || 0,
      rainfall_period: parseFloat(req.body.rainfall_period) || 0,
      rainfall_total: parseFloat(req.body.rainfall_total) || 0,
      signal_strength: parseInt(req.body.signal_strength) || 0,
      samples: parseInt(req.body.samples) || 0,
      timestamp: req.body.timestamp || new Date().toISOString(),
      device_id: req.body.device_id,
      received_at: new Date().toISOString()
    };

    // Firebase Realtime Database URL
    const firebaseUrl = `https://${FIREBASE_HOST}/weather-data/${timestamp}.json?auth=${FIREBASE_AUTH}`;
    
    console.log('Forwarding to Firebase...');
    
    // Send to Firebase
    const firebaseResponse = await axios.put(firebaseUrl, weatherData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('Firebase Response:', firebaseResponse.status);
    console.log('✓ Data successfully stored in Firebase');

    res.status(200).json({ 
      success: true, 
      message: 'Data uploaded to Firebase',
      timestamp: timestamp,
      firebase_status: firebaseResponse.status
    });

  } catch (error) {
    console.error('\n=== Error ===');
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('Firebase Response Status:', error.response.status);
      console.error('Firebase Response Data:', error.response.data);
      
      res.status(500).json({ 
        error: 'Firebase upload failed', 
        details: error.response.data,
        status: error.response.status
      });
    } else if (error.request) {
      console.error('No response from Firebase');
      res.status(503).json({ 
        error: 'No response from Firebase', 
        details: 'Request timeout or network error' 
      });
    } else {
      console.error('Error details:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        details: error.message 
      });
    }
  }
});

// Start server
app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   Weather Station HTTP-HTTPS Bridge   ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`\n✓ Server running on port ${PORT}`);
  console.log(`✓ Bridge endpoint: /weather`);
  console.log(`✓ Health check: /health`);
  console.log(`✓ Target: ${FIREBASE_HOST}`);
  console.log('\nWaiting for weather data...\n');
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});
