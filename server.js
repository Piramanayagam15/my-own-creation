// Express server for AK Bridals contact form submissions
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (your HTML, CSS, JS)
app.use(express.static('.'));

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ak_bridals',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
pool.getConnection()
  .then(connection => {
    console.log('✅ Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    console.log('Please check your database configuration in .env file');
  });

// API endpoint to handle contact form submissions
app.post('/api/contact', async (req, res) => {
  try {
    const { name, phone, email, date, service, message } = req.body;

    // Validation
    if (!name || !phone || !email || !date || !service || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address'
      });
    }

    // Insert into database
    const [result] = await pool.execute(
      `INSERT INTO bookings (name, phone, email, preferred_date, service, message, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [name, phone, email, date, service, message]
    );

    res.status(201).json({
      success: true,
      message: 'Thank you for your enquiry! We will contact you shortly.',
      id: result.insertId
    });

  } catch (error) {
    console.error('Error saving booking:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later or contact us directly.'
    });
  }
});

// API endpoint to get all bookings (for admin - you can add authentication later)
app.get('/api/bookings', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM bookings ORDER BY created_at DESC'
    );
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Contact form API: http://localhost:${PORT}/api/contact`);
});

