const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

// MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',       // default XAMPP user
  password: '',       // default is empty
  database: 'smart_room'
});

db.connect(err => {
  if (err) throw err;
  console.log('Connected to MySQL');
});

//Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Route to receive sensor data
app.post('/sensor-data', (req, res) => {
  const { temperature, humidity, co2, lux, air_quality } = req.body;

  // Basic validation
  if (
    co2 === undefined ||
    lux === undefined ||
    temperature === undefined ||
    humidity === undefined ||
    air_quality === undefined
  ) {
    return res.status(400).json({ error: 'Missing sensor data' });
  }

  const query = `INSERT INTO sensor_readings (temperature, humidity, co2, lux, air_quality) VALUES (?, ?, ?, ?, ?)`;

  db.query(query, [temperature, humidity, co2, lux, air_quality], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database insert error');
    }
    res.send('Data saved');
  });
});

app.get('/get-sensor-data', (req, res) => {
  db.query('SELECT * FROM sensor_readings ORDER BY created_at DESC LIMIT 50', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database error');
    }
    res.json(results);
  });
});



app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${port}`);
});
