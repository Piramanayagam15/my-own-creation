// Express server for AK Bridals - Full Operational Backend & Admin Management
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'akbridals2026';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files (HTML, CSS, JS, Images)
app.use(express.static('.'));

// ========================================================
// Persistent Data Store Engine (data/store.json + MySQL)
// ========================================================
const DATA_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial Default Dataset
const defaultStore = {
  settings: {
    studio_name: 'AK Bridals',
    owner_name: 'AK Bridal Artistry',
    phone: '+91 8190913110',
    whatsapp: '918190913110',
    email: '1508apiramanayagam@gmail.com',
    location: 'Tamil Nadu & Destination Weddings (Chennai, Madurai, Coimbatore, Tirunelveli, Bengaluru)',
    instagram: 'https://instagram.com/',
    about_bio: 'At AK Bridals, we specialize in high-definition bridal transformations, authentic organic mehndi, handcrafted aari silk embroidery, and traditional muhurtham saree pleating.',
    pin: 'akbridals2026'
  },
  services: [],
  gallery: [],
  blocked_dates: [],
  bookings: [],
  reviews: []
};

// Load data from file or initialize
let store = { ...defaultStore };
try {
  if (fs.existsSync(STORE_FILE)) {
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    store = JSON.parse(raw);
    console.log('📦 Persistent store loaded from store.json');
  } else {
    fs.writeFileSync(STORE_FILE, JSON.stringify(defaultStore, null, 2), 'utf8');
  }
} catch (e) {
  console.warn('Store file initialization error, using defaults in memory', e.message);
}

const saveStore = () => {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write store.json:', e.message);
  }
};

// ========================================================
// MySQL Database Pool (Full Unified CRUD Integration)
// ========================================================
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

  pool.getConnection()
    .then(connection => {
      isDbConnected = true;
      console.log('✅ MySQL Database connected successfully (ak_bridals)');
      connection.release();
    })
    .catch(err => {
      isDbConnected = false;
      console.warn('⚠️ Database note: Operating on Persistent JSON Engine:', err.message);
    });
} catch (e) {
  console.warn('MySQL initialization skipped, using persistent JSON store.');
}

// Safe MySQL query executor with graceful error handling
const executeDbQuery = async (sql, params = []) => {
  if (!pool || !isDbConnected) return null;
  try {
    const [result] = await pool.execute(sql, params);
    return result;
  } catch (e) {
    console.warn('MySQL execution notice:', e.message);
    return null;
  }
};

// ========================================================
// 🔐 ADMIN SECURITY, SESSION MANAGEMENT & RATE LIMITING
// ========================================================

// Timing-safe string comparison to prevent timing attacks
const safeCompare = (a, b) => {
  try {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (e) {
    return a === b;
  }
};

// Rate limiter state: IP -> { attempts: number, firstAttempt: number, lockedUntil: number }
const loginRateLimiter = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// In-Memory Active Admin Sessions: token -> { createdAt, expiresAt, ip }
const activeSessions = new Map();

// Helper to generate a cryptographic admin session token
const createAdminSession = (ip) => {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + (24 * 60 * 60 * 1000); // 24 Hours validity
  activeSessions.set(token, { createdAt: now, expiresAt, ip });
  return token;
};

// Admin Authentication Middleware (Supports Master PIN & Secure Session Tokens)
const authAdmin = (req, res, next) => {
  const providedToken = req.headers['x-admin-token'] || req.query.token;
  const currentPin = store.settings?.pin || ADMIN_TOKEN;

  if (!providedToken) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Admin authentication token or PIN required.'
    });
  }

  // 1. Check Master Token or Studio PIN
  if (safeCompare(providedToken, ADMIN_TOKEN) || safeCompare(providedToken, currentPin)) {
    return next();
  }

  // 2. Check Cryptographic Session Token
  if (activeSessions.has(providedToken)) {
    const session = activeSessions.get(providedToken);
    if (session.expiresAt > Date.now()) {
      return next();
    } else {
      activeSessions.delete(providedToken);
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Admin session expired. Please log in again.'
      });
    }
  }

  return res.status(401).json({
    success: false,
    message: 'Unauthorized: Invalid admin credentials.'
  });
};

// ========================================================
// 1. ADMIN AUTHENTICATION API (with Brute-Force Protection)
// ========================================================
app.post('/api/admin/login', (req, res) => {
  const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';
  const now = Date.now();

  // Check Rate Limiting
  const rateRecord = loginRateLimiter.get(clientIp);
  if (rateRecord && rateRecord.lockedUntil > now) {
    const remainingSec = Math.ceil((rateRecord.lockedUntil - now) / 1000);
    return res.status(429).json({
      success: false,
      message: `🚫 Too many failed login attempts. Security lockout active for ${remainingSec} seconds.`
    });
  }

  const { pin, token } = req.body;
  const input = (pin || token || '').trim();
  const currentPin = (store.settings?.pin || ADMIN_TOKEN).trim();

  // Validate PIN / Token
  if (safeCompare(input, ADMIN_TOKEN) || safeCompare(input, currentPin)) {
    // Reset rate limiter on successful login
    loginRateLimiter.delete(clientIp);

    // Issue Secure Session Token
    const sessionToken = createAdminSession(clientIp);

    return res.json({
      success: true,
      token: sessionToken,
      masterToken: ADMIN_TOKEN,
      message: '👑 Admin authenticated successfully with secure cryptographic session.',
      admin: {
        name: store.settings.owner_name || 'Studio Admin',
        role: 'Owner'
      }
    });
  }

  // Handle Failed Attempt
  const currentAttempts = rateRecord ? rateRecord.attempts + 1 : 1;
  const isLockout = currentAttempts >= MAX_ATTEMPTS;
  loginRateLimiter.set(clientIp, {
    attempts: isLockout ? 0 : currentAttempts,
    firstAttempt: rateRecord ? rateRecord.firstAttempt : now,
    lockedUntil: isLockout ? now + LOCKOUT_WINDOW_MS : 0
  });

  const remainingAttempts = MAX_ATTEMPTS - currentAttempts;
  res.status(401).json({
    success: false,
    message: isLockout 
      ? '🚫 Account locked for 15 minutes due to 5 consecutive failed login attempts.'
      : `Invalid Admin PIN. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining.` : ''}`
  });
});

// ========================================================
// 2. BOOKINGS API (Dual-Engine MySQL + JSON Store)
// ========================================================

// 2a. Public: Submit Booking Request (POST /api/bookings or /api/contact)
const handleNewBooking = async (req, res) => {
  try {
    const { name, phone, email, date, preferred_date, eventType, event_type, service, location, message } = req.body;

    const bookingName = (name || '').trim();
    const bookingPhone = (phone || '').trim();
    const bookingEmail = (email || '').trim();
    const bookingDate = (date || preferred_date || '').trim();
    const bookingEventType = (eventType || event_type || 'Wedding / Muhurtham').trim();
    const bookingService = (service || '💄 Muhurtham Bridal Makeup').trim();
    const bookingLocation = (location || 'Tamil Nadu').trim();
    const bookingMessage = (message || 'Please contact me regarding bridal availability.').trim();

    if (!bookingName || !bookingPhone || !bookingDate) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone number, and event date are required.'
      });
    }

    const nextId = store.bookings.length > 0 ? Math.max(...store.bookings.map(b => Number(b.id) || 100)) + 1 : 101;
    const bookingRef = `AKB-${nextId}`;

    const newBooking = {
      id: nextId,
      booking_ref: bookingRef,
      name: bookingName,
      phone: bookingPhone,
      email: bookingEmail,
      preferred_date: bookingDate,
      event_type: bookingEventType,
      service: bookingService,
      location: bookingLocation,
      message: bookingMessage,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    store.bookings.unshift(newBooking);
    saveStore();

    // MySQL Database Insert
    await executeDbQuery(
      `INSERT INTO bookings (id, booking_ref, name, phone, email, preferred_date, event_type, service, location, message, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [String(nextId), bookingRef, bookingName, bookingPhone, bookingEmail, bookingDate, bookingEventType, bookingService, bookingLocation, bookingMessage]
    );

    res.status(201).json({
      success: true,
      message: '🎉 Booking request received! Our bridal team will contact you shortly.',
      booking: newBooking
    });
  } catch (error) {
    console.error('Booking submission error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to process booking request.' });
  }
};

app.post('/api/bookings', handleNewBooking);
app.post('/api/contact', handleNewBooking);

// 2b. Admin: Get all bookings (GET /api/bookings and GET /api/admin/bookings)
const handleGetBookings = async (req, res) => {
  const { status, search } = req.query;
  let list = [...store.bookings];

  if (status && status !== 'all') {
    list = list.filter(b => b.status === status);
  }

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(b => 
      (b.name && b.name.toLowerCase().includes(q)) ||
      (b.phone && b.phone.includes(q)) ||
      (b.email && b.email.toLowerCase().includes(q)) ||
      (b.service && b.service.toLowerCase().includes(q))
    );
  }

  res.json({
    success: true,
    count: list.length,
    total: store.bookings.length,
    data: list
  });
};

app.get('/api/admin/bookings', authAdmin, handleGetBookings);
app.get('/api/bookings', authAdmin, handleGetBookings);

// 2c. Admin: Update Booking Status (PATCH & PUT /api/bookings/:id/status)
const handleUpdateBookingStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'contacted', 'confirmed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status. Must be pending, contacted, confirmed, or cancelled.' });
  }

  const booking = store.bookings.find(b => String(b.id) === String(id) || b.booking_ref === String(id));
  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found.' });
  }

  booking.status = status;
  booking.updated_at = new Date().toISOString();

  // If confirmed, automatically block the date in calendar
  if (status === 'confirmed' && booking.preferred_date) {
    if (!store.blocked_dates) store.blocked_dates = [];
    if (!store.blocked_dates.includes(booking.preferred_date)) {
      store.blocked_dates.push(booking.preferred_date);
    }
  }

  saveStore();

  // MySQL Status Update
  await executeDbQuery('UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ? OR booking_ref = ?', [status, String(id), String(id)]);

  res.json({
    success: true,
    message: `Booking status updated to ${status}.`,
    booking,
    blocked_dates: store.blocked_dates
  });
};

app.patch('/api/bookings/:id/status', authAdmin, handleUpdateBookingStatus);
app.put('/api/bookings/:id/status', authAdmin, handleUpdateBookingStatus);
app.patch('/api/admin/bookings/:id/status', authAdmin, handleUpdateBookingStatus);
app.put('/api/admin/bookings/:id/status', authAdmin, handleUpdateBookingStatus);
app.put('/api/admin/bookings/:id', authAdmin, handleUpdateBookingStatus);
app.patch('/api/admin/bookings/:id', authAdmin, handleUpdateBookingStatus);

// 2d. Admin: Delete Booking (DELETE /api/bookings/:id)
const handleDeleteBooking = async (req, res) => {
  const { id } = req.params;
  const targetBooking = store.bookings.find(b => String(b.id) === String(id) || b.booking_ref === String(id));

  if (targetBooking && targetBooking.status === 'confirmed' && targetBooking.preferred_date) {
    const hasOther = store.bookings.some(b => 
      String(b.id) !== String(id) && 
      b.status === 'confirmed' && 
      b.preferred_date === targetBooking.preferred_date
    );
    if (!hasOther) {
      store.blocked_dates = store.blocked_dates.filter(d => d !== targetBooking.preferred_date);
    }
  }

  store.bookings = store.bookings.filter(b => String(b.id) !== String(id) && b.booking_ref !== String(id));
  saveStore();

  // MySQL Delete
  await executeDbQuery('DELETE FROM bookings WHERE id = ? OR booking_ref = ?', [String(id), String(id)]);

  res.json({ success: true, message: `Booking #${id} deleted successfully.`, blocked_dates: store.blocked_dates });
};

app.delete('/api/bookings/:id', authAdmin, handleDeleteBooking);
app.delete('/api/admin/bookings/:id', authAdmin, handleDeleteBooking);

// ========================================================
// 3. REVIEWS & RATINGS API (Strict Moderation Flow)
// ========================================================

// 3a. Public: Get Approved Reviews with Real Rating Breakdown (GET /api/reviews)
app.get('/api/reviews', (req, res) => {
  const approvedReviews = (store.reviews || []).filter(r => r.status === 'approved');

  let avgRating = 0;
  let breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  if (approvedReviews.length > 0) {
    const totalStars = approvedReviews.reduce((sum, r) => sum + Number(r.rating || 5), 0);
    avgRating = Number((totalStars / approvedReviews.length).toFixed(1));

    approvedReviews.forEach(r => {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
      breakdown[star] = (breakdown[star] || 0) + 1;
    });
  }

  res.json({
    success: true,
    count: approvedReviews.length,
    averageRating: avgRating,
    breakdown,
    data: approvedReviews
  });
});

// 3b. Admin: Get All Reviews including Pending & Rejected (GET /api/admin/reviews)
app.get('/api/admin/reviews', authAdmin, (req, res) => {
  const allReviews = store.reviews || [];
  const pendingCount = allReviews.filter(r => r.status === 'pending').length;
  const approvedCount = allReviews.filter(r => r.status === 'approved').length;
  const rejectedCount = allReviews.filter(r => r.status === 'rejected').length;

  res.json({
    success: true,
    total: allReviews.length,
    counts: { pending: pendingCount, approved: approvedCount, rejected: rejectedCount },
    data: allReviews
  });
});

// 3c. Public: Submit Review -> Goes to Pending status (POST /api/reviews)
app.post('/api/reviews', async (req, res) => {
  try {
    const { name, city, rating, service, comment } = req.body;

    if (!name || !rating || !comment) {
      return res.status(400).json({ success: false, message: 'Name, rating, and comment are required.' });
    }

    const nextId = (store.reviews && store.reviews.length > 0) 
      ? Math.max(...store.reviews.map(r => Number(r.id) || 100)) + 1 
      : 101;

    const authorToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

    const newReview = {
      id: nextId,
      name: name.trim(),
      city: (city || 'Tamil Nadu').trim(),
      rating: Math.min(5, Math.max(1, Number(rating))),
      service: (service || 'Bridal Makeover').trim(),
      comment: comment.trim(),
      author_token: authorToken,
      status: 'pending', // Awaits admin verification
      created_at: new Date().toISOString()
    };

    if (!store.reviews) store.reviews = [];
    store.reviews.unshift(newReview);
    saveStore();

    // MySQL Insert
    await executeDbQuery(
      `INSERT INTO reviews (id, name, city, rating, service, comment, author_token, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [String(nextId), newReview.name, newReview.city, newReview.rating, newReview.service, newReview.comment, authorToken]
    );

    res.status(201).json({
      success: true,
      message: '✨ Thank you! Your review has been submitted and will appear on the site once approved by AK Bridals.',
      review: newReview,
      authorToken
    });
  } catch (error) {
    console.error('Review submit error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to submit review.' });
  }
});

// 3d. Admin: Moderate Review - Approve or Reject (PATCH & PUT /api/admin/reviews/:id/status or /moderate)
const handleModerateReview = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['approved', 'rejected', 'pending'];
  const targetStatus = status || 'approved';

  if (!validStatuses.includes(targetStatus)) {
    return res.status(400).json({ success: false, message: 'Status must be approved, rejected, or pending.' });
  }

  const review = (store.reviews || []).find(r => String(r.id) === String(id));
  if (!review) {
    return res.status(404).json({ success: false, message: 'Review not found.' });
  }

  review.status = targetStatus;
  review.moderated_at = new Date().toISOString();
  saveStore();

  // MySQL Status Update
  await executeDbQuery('UPDATE reviews SET status = ?, updated_at = NOW() WHERE id = ?', [targetStatus, String(id)]);

  res.json({
    success: true,
    message: `Review #${id} is now ${targetStatus}.`,
    review
  });
};

app.patch('/api/admin/reviews/:id/status', authAdmin, handleModerateReview);
app.put('/api/admin/reviews/:id/status', authAdmin, handleModerateReview);
app.put('/api/admin/reviews/:id/moderate', authAdmin, handleModerateReview);

// 3e. Admin or Author: Delete Review (DELETE /api/reviews/:id)
app.delete('/api/reviews/:id', async (req, res) => {
  const { id } = req.params;
  const adminToken = req.headers['x-admin-token'] || req.query.token;
  const authorToken = req.headers['x-author-token'];

  const isAdmin = adminToken && (adminToken === ADMIN_TOKEN || adminToken === store.settings?.pin || activeSessions.has(adminToken));

  const review = (store.reviews || []).find(r => String(r.id) === String(id));
  if (!review) {
    return res.status(404).json({ success: false, message: 'Review not found.' });
  }

  const isAuthor = authorToken && review.author_token && authorToken === review.author_token;

  if (!isAdmin && !isAuthor) {
    return res.status(403).json({ success: false, message: 'Permission denied: Admin or author token required.' });
  }

  store.reviews = store.reviews.filter(r => String(r.id) !== String(id));
  saveStore();

  // MySQL Delete
  await executeDbQuery('DELETE FROM reviews WHERE id = ?', [String(id)]);

  res.json({ success: true, message: `Review #${id} deleted successfully.` });
});

// ========================================================
// 4. GALLERY & VIDEO SHOWCASE API
// ========================================================

// 4a. Public: Get Gallery Items (GET /api/gallery)
app.get('/api/gallery', (req, res) => {
  const { category, type } = req.query;
  let items = [...(store.gallery || [])];

  if (category && category !== 'all') {
    items = items.filter(item => item.category === category);
  }

  if (type && type !== 'all') {
    items = items.filter(item => item.type === type);
  }

  res.json({
    success: true,
    count: items.length,
    data: items
  });
});

// 4b. Admin: Upload Media (POST /api/gallery)
app.post('/api/gallery', authAdmin, async (req, res) => {
  try {
    const { title, category, type, src, desc } = req.body;

    if (!title || !category || !src) {
      return res.status(400).json({ success: false, message: 'Title, category, and image/video are required.' });
    }

    const uniqueId = req.body.id || `media_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const newItem = {
      id: uniqueId,
      title: title.trim(),
      category: category.trim(),
      type: type === 'video' ? 'video' : 'image',
      src: src.trim(),
      desc: (desc || '').trim(),
      created_at: req.body.created_at || new Date().toISOString()
    };

    if (!store.gallery) store.gallery = [];
    store.gallery.unshift(newItem);
    saveStore();

    // MySQL Insert
    await executeDbQuery(
      `INSERT INTO gallery (id, title, category, type, src, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [uniqueId, newItem.title, newItem.category, newItem.type, newItem.src, newItem.desc]
    );

    res.status(201).json({
      success: true,
      message: '📸 Media added to bridal gallery successfully.',
      item: newItem,
      media: newItem
    });
  } catch (error) {
    console.error('Gallery upload error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to upload media.' });
  }
});

// 4c. Admin: Delete Media (DELETE /api/gallery/:id)
app.delete('/api/gallery/:id', authAdmin, async (req, res) => {
  const { id } = req.params;
  const before = (store.gallery || []).length;
  store.gallery = (store.gallery || []).filter(g => String(g.id) !== String(id));

  if (store.gallery.length === before) {
    return res.status(404).json({ success: false, message: 'Media item not found.' });
  }

  saveStore();

  // MySQL Delete
  await executeDbQuery('DELETE FROM gallery WHERE id = ?', [String(id)]);

  res.json({ success: true, message: `Media item #${id} deleted successfully.` });
});

// ========================================================
// 5. SERVICES & PACKAGES API
// ========================================================

// 5a. Public: Get Services (GET /api/services)
app.get('/api/services', (req, res) => {
  res.json({
    success: true,
    count: (store.services || []).length,
    data: store.services || []
  });
});

// 5b. Admin: Add Service (POST /api/services)
app.post('/api/services', authAdmin, async (req, res) => {
  const { name, key, icon, tag, starting_price, desc, inclusions } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Service name is required.' });
  }

  const sPrice = Number(starting_price) || 0;
  const nextId = `srv-${Date.now()}`;
  const newService = {
    id: nextId,
    key: key || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: name.trim(),
    icon: icon || '💄',
    tag: tag || 'Popular',
    starting_price: sPrice,
    price_display: sPrice > 0 ? `Starting from ₹${sPrice.toLocaleString('en-IN')}` : 'Custom Package',
    desc: (desc || '').trim(),
    inclusions: Array.isArray(inclusions) ? inclusions : (inclusions ? inclusions.split(',').map(s => s.trim()) : [])
  };

  if (!store.services) store.services = [];
  store.services.push(newService);
  saveStore();

  // MySQL Insert
  await executeDbQuery(
    `INSERT INTO services (id, service_key, name, icon, starting_price, price_display, tag, description, inclusions, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [nextId, newService.key, newService.name, newService.icon, sPrice, newService.price_display, newService.tag, newService.desc, JSON.stringify(newService.inclusions)]
  );

  res.status(201).json({ success: true, message: 'Service added successfully.', service: newService });
});

// 5c. Admin: Update Service (PUT /api/services/:id)
app.put('/api/services/:id', authAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, icon, tag, starting_price, desc, inclusions } = req.body;

  const service = (store.services || []).find(s => String(s.id) === String(id) || s.key === String(id));
  if (!service) {
    return res.status(404).json({ success: false, message: 'Service not found.' });
  }

  if (name) service.name = name.trim();
  if (icon) service.icon = icon.trim();
  if (tag) service.tag = tag.trim();
  if (starting_price !== undefined) {
    const sPrice = Number(starting_price) || 0;
    service.starting_price = sPrice;
    service.price_display = sPrice > 0 ? `Starting from ₹${sPrice.toLocaleString('en-IN')}` : 'Custom Package';
  }
  if (desc) service.desc = desc.trim();
  if (inclusions) {
    service.inclusions = Array.isArray(inclusions) ? inclusions : inclusions.split(',').map(s => s.trim());
  }

  saveStore();

  // MySQL Update
  await executeDbQuery(
    `UPDATE services SET name = ?, icon = ?, tag = ?, starting_price = ?, price_display = ?, description = ?, inclusions = ?, updated_at = NOW()
     WHERE id = ? OR service_key = ?`,
    [service.name, service.icon, service.tag, service.starting_price, service.price_display, service.desc, JSON.stringify(service.inclusions), String(id), String(id)]
  );

  res.json({ success: true, message: 'Service updated successfully.', service });
});

// 5d. Admin: Delete Service (DELETE /api/services/:id)
app.delete('/api/services/:id', authAdmin, async (req, res) => {
  const { id } = req.params;
  store.services = (store.services || []).filter(s => String(s.id) !== String(id) && s.key !== String(id));
  saveStore();

  // MySQL Delete
  await executeDbQuery('DELETE FROM services WHERE id = ? OR service_key = ?', [String(id), String(id)]);

  res.json({ success: true, message: `Service #${id} deleted successfully.` });
});

// ========================================================
// 6. DATE AVAILABILITY MANAGER API
// ========================================================

// 6a. Public: Get Blocked Dates (GET /api/availability)
app.get('/api/availability', (req, res) => {
  res.json({
    success: true,
    blocked_dates: store.blocked_dates || []
  });
});

// 6b. Admin: Block a Date (POST /api/availability & POST /api/availability/block)
const handleBlockDate = async (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ success: false, message: 'Date is required (YYYY-MM-DD).' });

  if (!store.blocked_dates) store.blocked_dates = [];
  if (!store.blocked_dates.includes(date)) {
    store.blocked_dates.push(date);
    saveStore();
  }

  // MySQL Insert
  await executeDbQuery('INSERT IGNORE INTO blocked_dates (blocked_date) VALUES (?)', [date]);

  res.json({ success: true, message: `Date ${date} marked as booked.`, blocked_dates: store.blocked_dates });
};

app.post('/api/availability', authAdmin, handleBlockDate);
app.post('/api/availability/block', authAdmin, handleBlockDate);

// 6c. Admin: Unblock a Date (DELETE /api/availability/:date & POST /api/availability/unblock)
const handleUnblockDate = async (req, res) => {
  const date = req.params.date || (req.body && req.body.date);
  if (!date) return res.status(400).json({ success: false, message: 'Date is required.' });

  store.blocked_dates = (store.blocked_dates || []).filter(d => d !== date);
  saveStore();

  // MySQL Delete
  await executeDbQuery('DELETE FROM blocked_dates WHERE blocked_date = ?', [date]);

  res.json({ success: true, message: `Date ${date} unblocked.`, blocked_dates: store.blocked_dates });
};

app.delete('/api/availability/:date', authAdmin, handleUnblockDate);
app.post('/api/availability/unblock', authAdmin, handleUnblockDate);

// 6d. Public: Real-time Date Availability Checker (GET /api/check-availability)
app.get('/api/check-availability', (req, res) => {
  const { date } = req.query;
  const isBooked = (store.blocked_dates || []).includes(date);
  const booking = isBooked ? (store.bookings || []).find(b => b.preferred_date === date && b.status !== 'cancelled') : null;
  res.json({
    success: true,
    date,
    isBooked,
    service: booking ? booking.service : null
  });
});

// ========================================================
// 7. SETTINGS & CONTACT INFO API
// ========================================================

// 7a. Public: Get Business Settings (GET /api/settings)
app.get('/api/settings', (req, res) => {
  const publicSettings = { ...store.settings };
  delete publicSettings.pin; // Do not expose PIN publicly
  res.json({ success: true, data: publicSettings });
});

// 7b. Admin: Update Settings (PUT /api/settings)
app.put('/api/settings', authAdmin, async (req, res) => {
  const { phone, whatsapp, email, location, about_bio, pin, studio_name, owner_name } = req.body;

  if (phone) store.settings.phone = phone.trim();
  if (whatsapp) store.settings.whatsapp = whatsapp.replace(/[^0-9]/g, '');
  if (email) store.settings.email = email.trim();
  if (location) store.settings.location = location.trim();
  if (about_bio) store.settings.about_bio = about_bio.trim();
  if (pin) store.settings.pin = pin.trim();
  if (studio_name) store.settings.studio_name = studio_name.trim();
  if (owner_name) store.settings.owner_name = owner_name.trim();

  saveStore();

  // MySQL Settings Update
  if (isDbConnected && pool) {
    for (const [k, v] of Object.entries(store.settings)) {
      await executeDbQuery('INSERT INTO studio_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?', [k, String(v), String(v)]);
    }
  }

  res.json({ success: true, message: 'Studio settings updated successfully.', data: store.settings });
});

// 8. Admin: Reset / Purge All Data (POST /api/admin/reset-all-data)
app.post('/api/admin/reset-all-data', authAdmin, async (req, res) => {
  store.gallery = [];
  store.reviews = [];
  store.bookings = [];
  store.blocked_dates = [];
  store.services = [];
  saveStore();

  // MySQL Reset
  await executeDbQuery('DELETE FROM bookings');
  await executeDbQuery('DELETE FROM reviews');
  await executeDbQuery('DELETE FROM gallery');
  await executeDbQuery('DELETE FROM services');
  await executeDbQuery('DELETE FROM blocked_dates');

  res.json({ success: true, message: 'All store data purged successfully.' });
});

// 9. Unified Multi-Device Real-Time Sync Endpoint (GET /api/sync & POST /api/sync)
app.get('/api/sync', (req, res) => {
  res.json({
    success: true,
    data: store
  });
});

app.post('/api/sync', authAdmin, (req, res) => {
  const { bookings, reviews, gallery, services, blocked_dates, settings } = req.body;
  if (Array.isArray(bookings)) store.bookings = bookings;
  if (Array.isArray(reviews)) store.reviews = reviews;
  if (Array.isArray(gallery)) store.gallery = gallery;
  if (Array.isArray(services)) store.services = services;
  if (Array.isArray(blocked_dates)) store.blocked_dates = blocked_dates;
  if (settings && typeof settings === 'object') store.settings = { ...store.settings, ...settings };
  saveStore();
  res.json({ success: true, message: 'Unified store synchronized successfully.', data: store });
});

// Start Server
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`👑 AK Bridals Web Application is Live!`);
    console.log(`🌐 Website:      http://localhost:${PORT}`);
    console.log(`📊 Admin Portal: http://localhost:${PORT}/admin.html`);
    console.log(`📝 Bookings API: http://localhost:${PORT}/api/bookings`);
    console.log(`⭐ Reviews API:  http://localhost:${PORT}/api/reviews`);
    console.log(`🔑 Admin Token:  ${ADMIN_TOKEN}`);
    console.log(`=================================================\n`);
  });
}

module.exports = app;
