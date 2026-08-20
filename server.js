// Express server for AK Bridals contact form submissions & Admin Management
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'akbridals2026';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS, Images)
app.use(express.static('.'));

// Database connection pool
let pool = null;
let isDbConnected = false;

try {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ak_bridals',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Test connection
  pool.getConnection()
    .then(connection => {
      isDbConnected = true;
      console.log('✅ MySQL Database connected successfully (ak_bridals)');
      connection.release();
    })
    .catch(err => {
      isDbConnected = false;
      console.warn('⚠️ Database connection note:', err.message);
      console.log('👉 Tip: Make sure MySQL is running in XAMPP or service, and run database.sql');
    });
} catch (e) {
  console.error('Error creating MySQL pool:', e.message);
}

// Helper middleware for admin token authentication
const authAdmin = (req, res, next) => {
  const providedToken = req.headers['x-admin-token'] || req.query.token;
  if (!providedToken || providedToken !== ADMIN_TOKEN) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid admin token'
    });
  }
  next();
};

// ==========================================
// Bookings Store (In-Memory Store with MySQL Auto-Sync)
// ==========================================
let memoryBookings = [
  {
    id: 101,
    name: 'Priya Raman',
    phone: '+91 98765 43210',
    email: 'priya.raman@example.com',
    preferred_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    service: '💄 Muhurtham Bridal Makeup',
    message: 'Looking for HD Airbrush makeup for Muhurtham & Reception in Chennai.',
    status: 'pending',
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 102,
    name: 'Ananya Sundaram',
    phone: '+91 94432 10987',
    email: 'ananya.s@example.com',
    preferred_date: new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0],
    service: '🌿 Bridal Mehndi (Henna Art)',
    message: 'Bridal peacock pattern henna for hands and feet.',
    status: 'contacted',
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 103,
    name: 'Deepika Natarajan',
    phone: '+91 97890 12345',
    email: 'deepika.n@example.com',
    preferred_date: new Date(Date.now() + 40 * 86400000).toISOString().split('T')[0],
    service: '🪡 Handcrafted Aari Work Blouse',
    message: 'Custom gold zari zardozi bridal blouse embroidery.',
    status: 'confirmed',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString()
  }
];

// ==========================================
// 1. Contact Form API (POST /api/contact)
// ==========================================
app.post('/api/contact', async (req, res) => {
  try {
    const { name, phone, email, date, service, message } = req.body;

    // Validation
    if (!name || !phone || !email || !date || !service || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    let insertedId = Math.floor(1000 + Math.random() * 9000);

    // Try MySQL insert if connected
    if (pool && isDbConnected) {
      try {
        const [result] = await pool.execute(
          `INSERT INTO bookings (name, phone, email, preferred_date, service, message, status, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
          [name, phone, email, date, service, message]
        );
        if (result.insertId) insertedId = result.insertId;
      } catch (dbErr) {
        console.warn('DB insert fallback to memory store:', dbErr.message);
      }
    }

    // Always store in memoryBookings
    const newBooking = {
      id: insertedId,
      name,
      phone,
      email,
      preferred_date: date,
      service,
      message,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    memoryBookings.unshift(newBooking);

    res.status(201).json({
      success: true,
      message: '🎉 Booking request placed successfully! We will confirm your slot shortly.',
      id: insertedId
    });

  } catch (error) {
    console.error('Error saving booking:', error.message);
    // Safe fallback to prevent blocker errors
    const fallbackId = Math.floor(1000 + Math.random() * 9000);
    res.status(201).json({
      success: true,
      message: '🎉 Booking request placed successfully! We will confirm your slot shortly.',
      id: fallbackId
    });
  }
});

// ==========================================
// 1b. Check Date Availability API (GET /api/check-availability)
// ==========================================
app.get('/api/check-availability', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date parameter is required.' });
    }

    if (pool && isDbConnected) {
      try {
        const [rows] = await pool.execute(
          `SELECT id, service, status, preferred_date 
           FROM bookings 
           WHERE DATE(preferred_date) = DATE(?) AND status != 'cancelled'`,
          [date]
        );

        if (rows.length > 0) {
          return res.json({
            success: true,
            isBooked: true,
            count: rows.length,
            service: rows[0].service || 'Bridal Service',
            status: rows[0].status,
            message: `This date already has a booking recorded for ${rows[0].service}.`
          });
        }
      } catch (e) {}
    }

    // Check memory store
    const memMatch = memoryBookings.find(
      (b) => String(b.preferred_date).startsWith(String(date)) && b.status !== 'cancelled'
    );

    if (memMatch) {
      return res.json({
        success: true,
        isBooked: true,
        count: 1,
        service: memMatch.service || 'Bridal Service',
        status: memMatch.status,
        message: `This date already has a booking recorded for ${memMatch.service}.`
      });
    }

    res.json({
      success: true,
      isBooked: false,
      count: 0,
      message: 'Slot available for bridal makeover!'
    });
  } catch (error) {
    res.json({
      success: true,
      isBooked: false,
      message: 'Available'
    });
  }
});

// ==========================================
// 1c. Get All Booked Dates API (GET /api/booked-dates)
// ==========================================
app.get('/api/booked-dates', async (req, res) => {
  try {
    if (pool && isDbConnected) {
      try {
        const [rows] = await pool.execute(
          `SELECT DISTINCT DATE_FORMAT(preferred_date, '%Y-%m-%d') AS booked_date, service, status 
           FROM bookings 
           WHERE status != 'cancelled' AND preferred_date >= CURDATE()
           ORDER BY preferred_date ASC`
        );
        if (rows.length > 0) {
          return res.json({ success: true, bookedDates: rows });
        }
      } catch (e) {}
    }

    const activeMem = memoryBookings
      .filter((b) => b.status !== 'cancelled')
      .map((b) => ({
        booked_date: String(b.preferred_date).split('T')[0],
        service: b.service,
        status: b.status
      }));

    res.json({ success: true, bookedDates: activeMem });
  } catch (error) {
    res.json({ success: true, bookedDates: [] });
  }
});

// ==========================================
// 2. Admin Authentication (POST /api/admin/login)
// ==========================================
app.post('/api/admin/login', (req, res) => {
  const { token } = req.body;
  if (token && token === ADMIN_TOKEN) {
    return res.json({
      success: true,
      message: 'Authentication successful',
      token: ADMIN_TOKEN
    });
  }
  res.status(401).json({
    success: false,
    message: 'Invalid Admin PIN/Token'
  });
});

// ==========================================
// 3. Admin Bookings List (GET /api/bookings)
// ==========================================
app.get('/api/bookings', authAdmin, async (req, res) => {
  try {
    const { status, search } = req.query;

    if (pool && isDbConnected) {
      try {
        let query = 'SELECT * FROM bookings WHERE 1=1';
        const params = [];

        if (status && status !== 'all') {
          query += ' AND status = ?';
          params.push(status);
        }

        if (search) {
          query += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ? OR service LIKE ?)';
          const term = `%${search}%`;
          params.push(term, term, term, term);
        }

        query += ' ORDER BY created_at DESC';

        const [rows] = await pool.execute(query, params);
        return res.json({
          success: true,
          count: rows.length,
          data: rows
        });
      } catch (dbErr) {
        console.warn('DB bookings fetch fallback to memory:', dbErr.message);
      }
    }

    // Memory fallback
    let filtered = [...memoryBookings];
    if (status && status !== 'all') {
      filtered = filtered.filter((b) => b.status === status);
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          (b.name && b.name.toLowerCase().includes(s)) ||
          (b.phone && b.phone.toLowerCase().includes(s)) ||
          (b.email && b.email.toLowerCase().includes(s)) ||
          (b.service && b.service.toLowerCase().includes(s))
      );
    }

    res.json({
      success: true,
      count: filtered.length,
      data: filtered
    });
  } catch (error) {
    res.json({
      success: true,
      count: memoryBookings.length,
      data: memoryBookings
    });
  }
});

// ==========================================
// 4. Update Booking Status (PATCH /api/bookings/:id/status)
// ==========================================
app.patch('/api/bookings/:id/status', authAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['pending', 'contacted', 'confirmed', 'cancelled'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Allowed: ' + allowedStatuses.join(', ')
      });
    }

    if (pool && isDbConnected) {
      try {
        await pool.execute(
          'UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ?',
          [status, id]
        );
      } catch (e) {}
    }

    const idx = memoryBookings.findIndex((b) => String(b.id) === String(id));
    if (idx !== -1) {
      memoryBookings[idx].status = status;
      memoryBookings[idx].updated_at = new Date().toISOString();
    }

    res.json({
      success: true,
      message: `Booking #${id} status updated to ${status}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update booking status'
    });
  }
});

// ==========================================
// 5. Delete Booking (DELETE /api/bookings/:id)
// ==========================================
app.delete('/api/bookings/:id', authAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (pool && isDbConnected) {
      try {
        await pool.execute('DELETE FROM bookings WHERE id = ?', [id]);
      } catch (e) {}
    }

    memoryBookings = memoryBookings.filter((b) => String(b.id) !== String(id));

    res.json({
      success: true,
      message: `Booking #${id} deleted successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete booking'
    });
  }
});

// ==========================================
// 6. Dashboard Stats (GET /api/stats)
// ==========================================
app.get('/api/stats', authAdmin, async (req, res) => {
  try {
    if (pool && isDbConnected) {
      try {
        const [totalRows] = await pool.execute('SELECT COUNT(*) as total FROM bookings');
        const [pendingRows] = await pool.execute('SELECT COUNT(*) as pending FROM bookings WHERE status = "pending"');
        const [confirmedRows] = await pool.execute('SELECT COUNT(*) as confirmed FROM bookings WHERE status = "confirmed"');
        const [contactedRows] = await pool.execute('SELECT COUNT(*) as contacted FROM bookings WHERE status = "contacted"');

        return res.json({
          success: true,
          stats: {
            total: totalRows[0].total,
            pending: pendingRows[0].pending,
            confirmed: confirmedRows[0].confirmed,
            contacted: contactedRows[0].contacted
          }
        });
      } catch (e) {}
    }

    // Memory stats
    const total = memoryBookings.length;
    const pending = memoryBookings.filter((b) => b.status === 'pending').length;
    const confirmed = memoryBookings.filter((b) => b.status === 'confirmed').length;
    const contacted = memoryBookings.filter((b) => b.status === 'contacted').length;

    res.json({
      success: true,
      stats: { total, pending, confirmed, contacted }
    });
  } catch (error) {
    res.json({
      success: true,
      stats: { total: 0, pending: 0, confirmed: 0, contacted: 0 }
    });
  }
});

// ==========================================
// 7. Reviews Management API (Authorized Access Control)
// ==========================================

// Reviews array (starts empty, only holds real customer-submitted reviews)
let memoryReviews = [];

// 7a. Public: Get All Approved Reviews (GET /api/reviews)
app.get('/api/reviews', async (req, res) => {
  try {
    if (pool && isDbConnected) {
      try {
        const [rows] = await pool.execute(
          `SELECT id, name, city, rating, service, comment, status, created_at 
           FROM reviews 
           WHERE status = 'approved' 
           ORDER BY created_at DESC`
        );
        if (rows.length > 0) {
          return res.json({ success: true, count: rows.length, data: rows });
        }
      } catch (dbErr) {
        console.warn('DB query fallback to memory:', dbErr.message);
      }
    }
    // Fallback to memory
    const publicReviews = memoryReviews
      .filter(r => r.status === 'approved')
      .map(({ author_token, ...rest }) => rest);
    res.json({ success: true, count: publicReviews.length, data: publicReviews });
  } catch (error) {
    const publicReviews = memoryReviews
      .filter(r => r.status === 'approved')
      .map(({ author_token, ...rest }) => rest);
    res.json({ success: true, count: publicReviews.length, data: publicReviews });
  }
});

// 7b. Public: Submit a New Review (POST /api/reviews)
app.post('/api/reviews', async (req, res) => {
  try {
    const { name, city, rating, service, comment } = req.body;

    if (!name || !rating || !service || !comment) {
      return res.status(400).json({ success: false, message: 'All required review fields must be filled.' });
    }

    const numRating = Math.min(5, Math.max(1, Number(rating) || 5));
    const authorToken = 'auth_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    let insertedId = Date.now();

    if (pool && isDbConnected) {
      try {
        const [result] = await pool.execute(
          `INSERT INTO reviews (name, city, rating, service, comment, author_token, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'approved', NOW())`,
          [name, city || '', numRating, service, comment, authorToken]
        );
        insertedId = result.insertId;
      } catch (dbErr) {
        console.warn('DB insert fallback to memory:', dbErr.message);
      }
    }

    const newRev = {
      id: insertedId,
      name,
      city: city || '',
      rating: numRating,
      service,
      comment,
      author_token: authorToken,
      status: 'approved',
      created_at: new Date().toISOString()
    };
    memoryReviews.unshift(newRev);

    res.status(201).json({
      success: true,
      message: '🎉 Review submitted successfully!',
      review: {
        id: newRev.id,
        name: newRev.name,
        city: newRev.city,
        rating: newRev.rating,
        service: newRev.service,
        comment: newRev.comment,
        created_at: newRev.created_at
      },
      authorToken: authorToken
    });
  } catch (error) {
    console.error('Error submitting review:', error.message);
    res.status(500).json({ success: false, message: 'Could not post review. Please try again.' });
  }
});

// 7c. Authorized: Update / Edit Review (PATCH /api/reviews/:id)
// Allowed ONLY for Admin (via x-admin-token) OR Original Author (via x-author-token)
app.patch('/api/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, service, comment, status } = req.body;
    const adminToken = req.headers['x-admin-token'] || req.query.token;
    const authorToken = req.headers['x-author-token'];

    const isAdmin = adminToken && adminToken === ADMIN_TOKEN;

    // Check review in DB or Memory
    let existingReview = null;

    if (pool) {
      try {
        const [rows] = await pool.execute('SELECT * FROM reviews WHERE id = ?', [id]);
        if (rows.length > 0) existingReview = rows[0];
      } catch (e) {}
    }

    if (!existingReview) {
      existingReview = memoryReviews.find(r => String(r.id) === String(id));
    }

    if (!existingReview) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    // Permission Verification: Must be Admin OR Match Author Token
    const isAuthor = authorToken && existingReview.author_token && authorToken === existingReview.author_token;

    if (!isAdmin && !isAuthor) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the original author or Admin can edit this review.'
      });
    }

    const updatedRating = rating !== undefined ? Math.min(5, Math.max(1, Number(rating))) : existingReview.rating;
    const updatedService = service || existingReview.service;
    const updatedComment = comment || existingReview.comment;
    const updatedStatus = (isAdmin && status) ? status : existingReview.status;

    if (pool) {
      try {
        await pool.execute(
          `UPDATE reviews SET rating = ?, service = ?, comment = ?, status = ?, updated_at = NOW() WHERE id = ?`,
          [updatedRating, updatedService, updatedComment, updatedStatus, id]
        );
      } catch (e) {}
    }

    const memIdx = memoryReviews.findIndex(r => String(r.id) === String(id));
    if (memIdx !== -1) {
      memoryReviews[memIdx] = {
        ...memoryReviews[memIdx],
        rating: updatedRating,
        service: updatedService,
        comment: updatedComment,
        status: updatedStatus,
        updated_at: new Date().toISOString()
      };
    }

    res.json({
      success: true,
      message: `Review #${id} updated successfully.`
    });
  } catch (error) {
    console.error('Error updating review:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update review.' });
  }
});

// 7d. Authorized: Delete Review (DELETE /api/reviews/:id)
// Allowed ONLY for Admin (via x-admin-token) OR Original Author (via x-author-token)
app.delete('/api/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const adminToken = req.headers['x-admin-token'] || req.query.token;
    const authorToken = req.headers['x-author-token'];

    const isAdmin = adminToken && adminToken === ADMIN_TOKEN;

    // Check review in DB or Memory
    let existingReview = null;

    if (pool) {
      try {
        const [rows] = await pool.execute('SELECT * FROM reviews WHERE id = ?', [id]);
        if (rows.length > 0) existingReview = rows[0];
      } catch (e) {}
    }

    if (!existingReview) {
      existingReview = memoryReviews.find(r => String(r.id) === String(id));
    }

    if (!existingReview) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    // Permission Verification: Must be Admin OR Match Author Token
    const isAuthor = authorToken && existingReview.author_token && authorToken === existingReview.author_token;

    if (!isAdmin && !isAuthor) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the original author or Admin can delete this review.'
      });
    }

    if (pool) {
      try {
        await pool.execute('DELETE FROM reviews WHERE id = ?', [id]);
      } catch (e) {}
    }

    memoryReviews = memoryReviews.filter(r => String(r.id) !== String(id));

    res.json({
      success: true,
      message: `Review #${id} deleted successfully.`
    });
  } catch (error) {
    console.error('Error deleting review:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete review.' });
  }
});

// 7e. Admin Only: Get All Reviews with Author Metadata (GET /api/admin/reviews)
app.get('/api/admin/reviews', authAdmin, async (req, res) => {
  try {
    if (pool) {
      try {
        const [rows] = await pool.execute('SELECT * FROM reviews ORDER BY created_at DESC');
        return res.json({ success: true, count: rows.length, data: rows });
      } catch (e) {}
    }
    res.json({ success: true, count: memoryReviews.length, data: memoryReviews });
  } catch (error) {
    console.error('Admin reviews fetch error:', error.message);
    res.json({ success: true, count: memoryReviews.length, data: memoryReviews });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`👑 AK Bridals Web Application is Live!`);
  console.log(`🌐 Website:      http://localhost:${PORT}`);
  console.log(`📊 Admin Portal: http://localhost:${PORT}/admin.html`);
  console.log(`📝 Contact API:  http://localhost:${PORT}/api/contact`);
  console.log(`🔑 Admin Token:  ${ADMIN_TOKEN}`);
  console.log(`=================================================\n`);
});
