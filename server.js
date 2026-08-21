// Express server for AK Bridals - Production Dual-Engine Architecture (MySQL Primary + Persistent Store Fallback)
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_PASSWORD || process.env.ADMIN_TOKEN || 'akbridals2026';
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'ak_bridals_secret_session_key_2026';

// Production Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Safe JSON parse error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ success: false, message: 'Bad request: Malformed JSON body.' });
  }
  next(err);
});

// Input sanitization helper to strip script tags and prevent XSS
const sanitizeText = (val) => {
  if (typeof val !== 'string') return val;
  return val.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
};

// Serve static files (HTML, CSS, JS, Images)
app.use(express.static('.'));

// ========================================================
// Persistent Data Store Engine (data/store.json Fallback)
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
  services: [
    {
      id: 'srv-1',
      key: 'bridal-makeup',
      name: 'Bridal Makeover & Muhurtham Styling',
      icon: '💄',
      tag: 'Most Popular',
      starting_price: 15000,
      price_display: 'Starting from ₹15,000',
      desc: 'High-definition bridal makeover with premium skin preparation, authentic muhurtham saree draping, and customized floral hair styling.',
      inclusions: ['HD / Waterproof Makeup', 'Custom Hair Artistry', 'Traditional Saree Draping', 'Trial Consultation']
    },
    {
      id: 'srv-2',
      key: 'reception-glam',
      name: 'Reception Glam & Evening Makeover',
      icon: '✨',
      tag: 'Trending',
      starting_price: 10000,
      price_display: 'Starting from ₹10,000',
      desc: 'Modern glam aesthetics with luminous skin finish, contemporary hair styling, and long-lasting waterproof setting.',
      inclusions: ['Luminous HD Base', 'Modern Updo / Waves', 'Dupatta / Gown Styling', 'Lash Extensions']
    },
    {
      id: 'srv-3',
      key: 'organic-mehndi',
      name: 'Custom Organic Bridal Mehndi',
      icon: '🌿',
      tag: 'Natural',
      starting_price: 3500,
      price_display: 'Starting from ₹3,500',
      desc: '100% triple-sifted chemical-free organic herbal henna cones providing deep, dark stains with intricate bridal patterns.',
      inclusions: ['100% Organic Henna', 'Bridal Story Motifs', 'Hands & Feet Coverage', 'Clove Stain Booster']
    },
    {
      id: 'srv-4',
      key: 'aari-embroidery',
      name: 'Handcrafted Bridal Aari & Zardosi Work',
      icon: '🪡',
      tag: 'Custom',
      starting_price: 2500,
      price_display: 'Starting from ₹2,500',
      desc: 'Intricate artisan needlework featuring pure silk threads, cutdana, antique zardosi, and bead ornamentation on pure silk blouses.',
      inclusions: ['Custom Neckline Art', 'Sleeve Zardosi Work', 'Pure Silk Threads', 'Custom Motif Design']
    }
  ],
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
// MySQL Database Connection Pool (PRIMARY SOURCE OF TRUTH)
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
      console.log('✅ MySQL Database connected successfully (ak_bridals) — Operating as PRIMARY Source of Truth');
      connection.release();
    })
    .catch(err => {
      isDbConnected = false;
      console.warn('⚠️ Database note: Operating on Persistent JSON Engine Fallback:', err.message);
    });
} catch (e) {
  console.warn('MySQL initialization skipped, using persistent JSON store.');
}

// Safe MySQL query executor
const executeDbQuery = async (sql, params = []) => {
  if (!pool || !isDbConnected) return null;
  try {
    const [result] = await pool.execute(sql, params);
    return result;
  } catch (e) {
    console.warn('MySQL query notice:', e.message);
    return null;
  }
};

// ========================================================
// 🗄️ UNIFIED DATABASE ACCESS LAYER (MySQL-First with JSON Fallback)
// ========================================================
const DB = {
  // 1. Bookings Module
  bookings: {
    getAll: async (status, search) => {
      if (isDbConnected) {
        try {
          let sql = 'SELECT * FROM bookings WHERE 1=1';
          const params = [];
          if (status && status !== 'all') {
            sql += ' AND status = ?';
            params.push(status);
          }
          if (search) {
            sql += ' AND (LOWER(name) LIKE ? OR phone LIKE ? OR LOWER(email) LIKE ? OR LOWER(service) LIKE ?)';
            const q = `%${search.toLowerCase()}%`;
            params.push(q, q, q, q);
          }
          sql += ' ORDER BY created_at DESC';
          const rows = await executeDbQuery(sql, params);
          if (Array.isArray(rows)) return rows;
        } catch (e) {}
      }

      // JSON Store Fallback
      let list = [...(store.bookings || [])];
      if (status && status !== 'all') list = list.filter(b => b.status === status);
      if (search) {
        const q = search.toLowerCase();
        list = list.filter(b => 
          (b.name && b.name.toLowerCase().includes(q)) ||
          (b.phone && b.phone.includes(q)) ||
          (b.email && b.email.toLowerCase().includes(q)) ||
          (b.service && b.service.toLowerCase().includes(q))
        );
      }
      return list;
    },
    create: async (booking) => {
      if (isDbConnected) {
        await executeDbQuery(
          `INSERT INTO bookings (id, booking_ref, name, phone, email, preferred_date, event_type, service, location, message, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [String(booking.id), booking.booking_ref, booking.name, booking.phone, booking.email, booking.preferred_date, booking.event_type || 'Wedding', booking.service, booking.location || '', booking.message || '', booking.status || 'pending']
        );
      }

      if (!store.bookings) store.bookings = [];
      store.bookings.unshift(booking);
      saveStore();
      return booking;
    },
    updateStatus: async (id, status) => {
      if (isDbConnected) {
        await executeDbQuery('UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ? OR booking_ref = ?', [status, String(id), String(id)]);
      }

      const b = (store.bookings || []).find(x => String(x.id) === String(id) || x.booking_ref === String(id));
      if (b) {
        b.status = status;
        b.updated_at = new Date().toISOString();
        if (status === 'confirmed' && b.preferred_date) {
          await DB.blockedDates.block(b.preferred_date);
        }
        saveStore();
      }
      return b;
    },
    delete: async (id) => {
      if (isDbConnected) {
        await executeDbQuery('DELETE FROM bookings WHERE id = ? OR booking_ref = ?', [String(id), String(id)]);
      }

      const target = (store.bookings || []).find(b => String(b.id) === String(id) || b.booking_ref === String(id));
      if (target && target.status === 'confirmed' && target.preferred_date) {
        const hasOther = (store.bookings || []).some(b => String(b.id) !== String(id) && b.status === 'confirmed' && b.preferred_date === target.preferred_date);
        if (!hasOther) {
          await DB.blockedDates.unblock(target.preferred_date);
        }
      }

      store.bookings = (store.bookings || []).filter(b => String(b.id) !== String(id) && b.booking_ref !== String(id));
      saveStore();
      return true;
    }
  },

  // 2. Reviews Module (Public = approved only; Admin = all)
  reviews: {
    getApproved: async () => {
      if (isDbConnected) {
        const rows = await executeDbQuery("SELECT * FROM reviews WHERE status = 'approved' ORDER BY created_at DESC");
        if (Array.isArray(rows)) return rows;
      }
      return (store.reviews || []).filter(r => r.status === 'approved');
    },
    getAll: async () => {
      if (isDbConnected) {
        const rows = await executeDbQuery('SELECT * FROM reviews ORDER BY created_at DESC');
        if (Array.isArray(rows)) return rows;
      }
      return store.reviews || [];
    },
    create: async (review) => {
      if (isDbConnected) {
        await executeDbQuery(
          `INSERT INTO reviews (id, name, city, rating, service, comment, author_token, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [String(review.id), review.name, review.city, review.rating, review.service, review.comment, review.author_token, review.status || 'pending']
        );
      }

      if (!store.reviews) store.reviews = [];
      store.reviews.unshift(review);
      saveStore();
      return review;
    },
    updateStatus: async (id, status) => {
      if (isDbConnected) {
        await executeDbQuery('UPDATE reviews SET status = ?, updated_at = NOW() WHERE id = ?', [status, String(id)]);
      }

      const r = (store.reviews || []).find(x => String(x.id) === String(id));
      if (r) {
        r.status = status;
        r.moderated_at = new Date().toISOString();
        saveStore();
      }
      return r;
    },
    delete: async (id) => {
      if (isDbConnected) {
        await executeDbQuery('DELETE FROM reviews WHERE id = ?', [String(id)]);
      }

      store.reviews = (store.reviews || []).filter(r => String(r.id) !== String(id));
      saveStore();
      return true;
    }
  },

  // 3. Gallery Media Module
  gallery: {
    getAll: async (category, type) => {
      if (isDbConnected) {
        let sql = 'SELECT * FROM gallery WHERE 1=1';
        const params = [];
        if (category && category !== 'all') {
          sql += ' AND category = ?';
          params.push(category);
        }
        if (type && type !== 'all') {
          sql += ' AND type = ?';
          params.push(type);
        }
        sql += ' ORDER BY created_at DESC';
        const rows = await executeDbQuery(sql, params);
        if (Array.isArray(rows)) return rows;
      }

      let items = [...(store.gallery || [])];
      if (category && category !== 'all') items = items.filter(g => g.category === category);
      if (type && type !== 'all') items = items.filter(g => g.type === type);
      return items;
    },
    create: async (item) => {
      if (isDbConnected) {
        await executeDbQuery(
          `INSERT INTO gallery (id, title, category, type, src, description, created_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [String(item.id), item.title, item.category, item.type, item.src, item.desc || '']
        );
      }

      if (!store.gallery) store.gallery = [];
      store.gallery.unshift(item);
      saveStore();
      return item;
    },
    delete: async (id) => {
      if (isDbConnected) {
        await executeDbQuery('DELETE FROM gallery WHERE id = ?', [String(id)]);
      }

      store.gallery = (store.gallery || []).filter(g => String(g.id) !== String(id));
      saveStore();
      return true;
    }
  },

  // 4. Services Module
  services: {
    getAll: async () => {
      if (isDbConnected) {
        const rows = await executeDbQuery('SELECT * FROM services ORDER BY starting_price ASC');
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map(r => ({
            ...r,
            inclusions: typeof r.inclusions === 'string' ? JSON.parse(r.inclusions || '[]') : r.inclusions
          }));
        }
      }
      return store.services || [];
    },
    create: async (service) => {
      if (isDbConnected) {
        await executeDbQuery(
          `INSERT INTO services (id, service_key, name, icon, starting_price, price_display, tag, description, inclusions, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [String(service.id), service.key, service.name, service.icon, service.starting_price, service.price_display, service.tag, service.desc, JSON.stringify(service.inclusions)]
        );
      }

      if (!store.services) store.services = [];
      store.services.push(service);
      saveStore();
      return service;
    },
    update: async (id, data) => {
      const s = (store.services || []).find(x => String(x.id) === String(id) || x.key === String(id));
      if (s) {
        if (data.name) s.name = data.name.trim();
        if (data.icon) s.icon = data.icon.trim();
        if (data.tag) s.tag = data.tag.trim();
        if (data.starting_price !== undefined) {
          s.starting_price = Number(data.starting_price) || 0;
          s.price_display = s.starting_price > 0 ? `Starting from ₹${s.starting_price.toLocaleString('en-IN')}` : 'Custom Package';
        }
        if (data.desc) s.desc = data.desc.trim();
        if (data.inclusions) s.inclusions = Array.isArray(data.inclusions) ? data.inclusions : data.inclusions.split(',').map(x => x.trim());
        saveStore();
      }

      if (isDbConnected && s) {
        await executeDbQuery(
          `UPDATE services SET name = ?, icon = ?, tag = ?, starting_price = ?, price_display = ?, description = ?, inclusions = ?, updated_at = NOW()
           WHERE id = ? OR service_key = ?`,
          [s.name, s.icon, s.tag, s.starting_price, s.price_display, s.desc, JSON.stringify(s.inclusions), String(id), String(id)]
        );
      }
      return s;
    },
    delete: async (id) => {
      if (isDbConnected) {
        await executeDbQuery('DELETE FROM services WHERE id = ? OR service_key = ?', [String(id), String(id)]);
      }

      store.services = (store.services || []).filter(s => String(s.id) !== String(id) && s.key !== String(id));
      saveStore();
      return true;
    }
  },

  // 5. Blocked Dates Module
  blockedDates: {
    getAll: async () => {
      if (isDbConnected) {
        const rows = await executeDbQuery('SELECT DATE_FORMAT(blocked_date, "%Y-%m-%d") as date FROM blocked_dates');
        if (Array.isArray(rows)) return rows.map(r => r.date);
      }
      return store.blocked_dates || [];
    },
    block: async (date) => {
      if (isDbConnected) {
        await executeDbQuery('INSERT IGNORE INTO blocked_dates (blocked_date) VALUES (?)', [date]);
      }

      if (!store.blocked_dates) store.blocked_dates = [];
      if (!store.blocked_dates.includes(date)) {
        store.blocked_dates.push(date);
        saveStore();
      }
      return store.blocked_dates;
    },
    unblock: async (date) => {
      if (isDbConnected) {
        await executeDbQuery('DELETE FROM blocked_dates WHERE blocked_date = ?', [date]);
      }

      store.blocked_dates = (store.blocked_dates || []).filter(d => d !== date);
      saveStore();
      return store.blocked_dates;
    }
  },

  // 6. Settings Module
  settings: {
    get: async () => {
      if (isDbConnected) {
        const rows = await executeDbQuery('SELECT setting_key, setting_value FROM studio_settings');
        if (Array.isArray(rows) && rows.length > 0) {
          const sObj = {};
          rows.forEach(r => { sObj[r.setting_key] = r.setting_value; });
          return { ...store.settings, ...sObj };
        }
      }
      return store.settings || defaultStore.settings;
    },
    update: async (newSettings) => {
      if (isDbConnected) {
        for (const [k, v] of Object.entries(newSettings)) {
          if (v !== undefined) {
            await executeDbQuery(
              'INSERT INTO studio_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
              [k, String(v), String(v)]
            );
          }
        }
      }

      store.settings = { ...store.settings, ...newSettings };
      saveStore();
      return store.settings;
    }
  },

  // 7. Admin Sessions Module
  adminSessions: {
    create: async (token, ip, expiresAt) => {
      activeSessions.set(token, { ip, expiresAt });
      if (isDbConnected) {
        await executeDbQuery(
          'INSERT INTO admin_sessions (token, ip_address, expires_at) VALUES (?, ?, FROM_UNIXTIME(? / 1000))',
          [token, ip, expiresAt]
        );
      }
    },
    validate: async (token) => {
      if (activeSessions.has(token)) {
        const session = activeSessions.get(token);
        if (session.expiresAt > Date.now()) return true;
        activeSessions.delete(token);
        return false;
      }

      if (isDbConnected) {
        const rows = await executeDbQuery('SELECT * FROM admin_sessions WHERE token = ? AND expires_at > NOW()', [token]);
        if (Array.isArray(rows) && rows.length > 0) {
          activeSessions.set(token, { ip: rows[0].ip_address, expiresAt: new Date(rows[0].expires_at).getTime() });
          return true;
        }
      }
      return false;
    },
    delete: async (token) => {
      activeSessions.delete(token);
      if (isDbConnected) {
        await executeDbQuery('DELETE FROM admin_sessions WHERE token = ?', [token]);
      }
    }
  }
};

// ========================================================
// 🔐 BRUTE-FORCE RATE LIMITING & SECURITY DEFENSE
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

// Rate Limiter: IP -> { attempts: number, firstAttempt: number, lockedUntil: number }
const loginRateLimiter = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const activeSessions = new Map();

// Authentication Middleware
const authAdmin = async (req, res, next) => {
  const providedToken = req.headers['x-admin-token'] || req.query.token;
  const currentPin = store.settings?.pin || ADMIN_TOKEN;

  if (!providedToken) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Admin authentication token or PIN required.'
    });
  }

  // 1. Check Master Token or Current Studio PIN
  if (safeCompare(providedToken, ADMIN_TOKEN) || safeCompare(providedToken, currentPin)) {
    return next();
  }

  // 2. Check Valid Cryptographic Session Token (Memory + DB)
  const isValidSession = await DB.adminSessions.validate(providedToken);
  if (isValidSession) {
    return next();
  }

  return res.status(401).json({
    success: false,
    message: 'Unauthorized: Invalid or expired admin credentials.'
  });
};

// ========================================================
// 1. ADMIN AUTHENTICATION API (with 5 Attempts / 15-Min Lockout)
// ========================================================
app.post('/api/admin/login', async (req, res) => {
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '127.0.0.1';
  const now = Date.now();

  const { pin, token } = req.body;
  const input = (pin || token || '').trim();
  const currentPin = (store.settings?.pin || ADMIN_TOKEN).trim();

  // 1. Master PIN / Valid Credentials Check (Always clears rate limit on success)
  if (safeCompare(input, ADMIN_TOKEN) || safeCompare(input, currentPin)) {
    loginRateLimiter.delete(clientIp);

    // Generate 32-byte secure session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours
    await DB.adminSessions.create(sessionToken, clientIp, expiresAt);

    return res.json({
      success: true,
      token: sessionToken,
      masterToken: ADMIN_TOKEN,
      message: '👑 Admin authenticated successfully.',
      admin: {
        name: store.settings.owner_name || 'Studio Admin',
        role: 'Owner'
      }
    });
  }

  // 2. Check Rate Limiter Lockout for Failed Attempts
  const rateRecord = loginRateLimiter.get(clientIp);
  if (rateRecord && rateRecord.lockedUntil > now) {
    const remainingSec = Math.ceil((rateRecord.lockedUntil - now) / 1000);
    return res.status(429).json({
      success: false,
      error: 'LOCKED',
      message: `🚫 Security Lockout: Too many failed login attempts. Please wait ${remainingSec} second(s).`,
      remainingSeconds: remainingSec,
      lockedUntil: rateRecord.lockedUntil
    });
  }

  // Failed Login Attempt Tracking
  const currentAttempts = rateRecord ? rateRecord.attempts + 1 : 1;
  const isLockout = currentAttempts >= MAX_ATTEMPTS;
  const lockedUntil = isLockout ? now + LOCKOUT_WINDOW_MS : 0;

  loginRateLimiter.set(clientIp, {
    attempts: isLockout ? 0 : currentAttempts,
    firstAttempt: rateRecord ? rateRecord.firstAttempt : now,
    lockedUntil
  });

  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - currentAttempts);
  res.status(isLockout ? 429 : 401).json({
    success: false,
    error: isLockout ? 'LOCKED' : 'INVALID_PIN',
    message: isLockout 
      ? '🚫 Account locked for 15 minutes due to 5 consecutive failed login attempts.'
      : `Invalid Admin PIN. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining before lockout.` : ''}`,
    remainingAttempts: isLockout ? 0 : remainingAttempts,
    remainingSeconds: isLockout ? Math.ceil(LOCKOUT_WINDOW_MS / 1000) : undefined,
    lockedUntil: isLockout ? lockedUntil : undefined
  });
});

// ========================================================
// 2. BOOKINGS API
// ========================================================

// 2a. Public: Submit Booking Request
const handleNewBooking = async (req, res) => {
  try {
    const { name, phone, email, date, preferred_date, eventType, event_type, service, location, message } = req.body;

    const bookingName = sanitizeText(name || '');
    const bookingPhone = sanitizeText(phone || '');
    const bookingEmail = sanitizeText(email || '');
    const bookingDate = sanitizeText(date || preferred_date || '');
    const bookingEventType = sanitizeText(eventType || event_type || 'Wedding / Muhurtham');
    const bookingService = sanitizeText(service || '💄 Muhurtham Bridal Makeup');
    const bookingLocation = sanitizeText(location || 'Tamil Nadu');
    const bookingMessage = sanitizeText(message || 'Please contact me regarding bridal availability.');

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

    await DB.bookings.create(newBooking);

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

// 2b. Admin: Get Bookings
const handleGetBookings = async (req, res) => {
  const { status, search } = req.query;
  const list = await DB.bookings.getAll(status, search);

  res.json({
    success: true,
    count: list.length,
    total: store.bookings.length,
    data: list
  });
};

app.get('/api/admin/bookings', authAdmin, handleGetBookings);
app.get('/api/bookings', authAdmin, handleGetBookings);

// 2c. Admin: Update Booking Status
const handleUpdateBookingStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'contacted', 'confirmed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status. Must be pending, contacted, confirmed, or cancelled.' });
  }

  const booking = await DB.bookings.updateStatus(id, status);
  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found.' });
  }

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

// 2d. Admin: Delete Booking
const handleDeleteBooking = async (req, res) => {
  const { id } = req.params;
  await DB.bookings.delete(id);
  res.json({ success: true, message: `Booking #${id} deleted successfully.`, blocked_dates: store.blocked_dates });
};

app.delete('/api/bookings/:id', authAdmin, handleDeleteBooking);
app.delete('/api/admin/bookings/:id', authAdmin, handleDeleteBooking);

// ========================================================
// 3. REVIEWS & RATINGS API (Strict Moderation Flow)
// ========================================================

// 3a. Public: Get Approved Reviews (WHERE status = 'approved')
app.get('/api/reviews', async (req, res) => {
  const approvedReviews = await DB.reviews.getApproved();

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

// 3b. Admin: Get All Reviews
app.get('/api/admin/reviews', authAdmin, async (req, res) => {
  const allReviews = await DB.reviews.getAll();
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

// 3c. Public: Submit Review -> Status = 'pending'
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
      name: sanitizeText(name),
      city: sanitizeText(city || 'Tamil Nadu'),
      rating: Math.min(5, Math.max(1, Number(rating))),
      service: sanitizeText(service || 'Bridal Makeover'),
      comment: sanitizeText(comment),
      author_token: authorToken,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    await DB.reviews.create(newReview);

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

// 3d. Admin: Moderate Review (Approve / Reject)
const handleModerateReview = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['approved', 'rejected', 'pending'];
  const targetStatus = status || 'approved';

  if (!validStatuses.includes(targetStatus)) {
    return res.status(400).json({ success: false, message: 'Status must be approved, rejected, or pending.' });
  }

  const review = await DB.reviews.updateStatus(id, targetStatus);
  if (!review) {
    return res.status(404).json({ success: false, message: 'Review not found.' });
  }

  res.json({
    success: true,
    message: `Review #${id} is now ${targetStatus}.`,
    review
  });
};

app.patch('/api/admin/reviews/:id/status', authAdmin, handleModerateReview);
app.put('/api/admin/reviews/:id/status', authAdmin, handleModerateReview);
app.put('/api/admin/reviews/:id/moderate', authAdmin, handleModerateReview);

// 3e. Admin or Author: Delete Review
const handleDeleteReview = async (req, res) => {
  const { id } = req.params;
  const adminToken = req.headers['x-admin-token'] || req.query.token;
  const authorToken = req.headers['x-author-token'];

  const currentPin = store.settings?.pin || ADMIN_TOKEN;
  const isAdmin = adminToken && (
    safeCompare(adminToken, ADMIN_TOKEN) || 
    safeCompare(adminToken, currentPin) || 
    (await DB.adminSessions.validate(adminToken))
  );

  const allReviews = await DB.reviews.getAll();
  const review = allReviews.find(r => String(r.id) === String(id));
  if (!review) {
    return res.status(404).json({ success: false, message: 'Review not found.' });
  }

  const isAuthor = authorToken && review.author_token && authorToken === review.author_token;

  if (!isAdmin && !isAuthor) {
    return res.status(403).json({ success: false, message: 'Permission denied: Admin or author token required.' });
  }

  await DB.reviews.delete(id);
  res.json({ success: true, message: `Review #${id} deleted successfully.` });
};

app.delete('/api/reviews/:id', handleDeleteReview);
app.delete('/api/admin/reviews/:id', authAdmin, handleDeleteReview);

// ========================================================
// 4. GALLERY & VIDEO SHOWCASE API
// ========================================================

// 4a. Public: Get Gallery Items
app.get('/api/gallery', async (req, res) => {
  const { category, type } = req.query;
  const items = await DB.gallery.getAll(category, type);

  res.json({
    success: true,
    count: items.length,
    data: items
  });
});

// 4b. Admin: Upload Media
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

    await DB.gallery.create(newItem);

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

// 4c. Admin: Delete Media
app.delete('/api/gallery/:id', authAdmin, async (req, res) => {
  const { id } = req.params;
  const before = (store.gallery || []).length;
  await DB.gallery.delete(id);

  if (store.gallery.length === before) {
    return res.status(404).json({ success: false, message: 'Media item not found.' });
  }

  res.json({ success: true, message: `Media item #${id} deleted successfully.` });
});

// ========================================================
// 5. SERVICES & PACKAGES API
// ========================================================

// 5a. Public: Get Services
app.get('/api/services', async (req, res) => {
  const services = await DB.services.getAll();
  res.json({
    success: true,
    count: services.length,
    data: services
  });
});

// 5b. Admin: Add Service
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

  await DB.services.create(newService);
  res.status(201).json({ success: true, message: 'Service added successfully.', service: newService });
});

// 5c. Admin: Update Service
app.put('/api/services/:id', authAdmin, async (req, res) => {
  const { id } = req.params;
  const updated = await DB.services.update(id, req.body);

  if (!updated) {
    return res.status(404).json({ success: false, message: 'Service not found.' });
  }

  res.json({ success: true, message: 'Service updated successfully.', service: updated });
});

// 5d. Admin: Delete Service
app.delete('/api/services/:id', authAdmin, async (req, res) => {
  const { id } = req.params;
  await DB.services.delete(id);
  res.json({ success: true, message: `Service #${id} deleted successfully.` });
});

// ========================================================
// 6. DATE AVAILABILITY MANAGER API
// ========================================================

// 6a. Public: Get Blocked Dates
app.get('/api/availability', async (req, res) => {
  const blockedDates = await DB.blockedDates.getAll();
  res.json({
    success: true,
    blocked_dates: blockedDates
  });
});

// 6b. Admin: Block a Date
const handleBlockDate = async (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ success: false, message: 'Date is required (YYYY-MM-DD).' });

  const updatedDates = await DB.blockedDates.block(date);
  res.json({ success: true, message: `Date ${date} marked as booked.`, blocked_dates: updatedDates });
};

app.post('/api/availability', authAdmin, handleBlockDate);
app.post('/api/availability/block', authAdmin, handleBlockDate);
app.post('/api/admin/availability', authAdmin, handleBlockDate);
app.post('/api/admin/availability/block', authAdmin, handleBlockDate);

// 6c. Admin: Unblock a Date
const handleUnblockDate = async (req, res) => {
  const date = req.params.date || (req.body && req.body.date);
  if (!date) return res.status(400).json({ success: false, message: 'Date is required.' });

  const updatedDates = await DB.blockedDates.unblock(date);
  res.json({ success: true, message: `Date ${date} unblocked.`, blocked_dates: updatedDates });
};

app.delete('/api/availability/:date', authAdmin, handleUnblockDate);
app.post('/api/availability/unblock', authAdmin, handleUnblockDate);
app.delete('/api/admin/availability/:date', authAdmin, handleUnblockDate);
app.post('/api/admin/availability/unblock', authAdmin, handleUnblockDate);

// 6d. Public: Real-time Date Availability Checker
app.get('/api/check-availability', async (req, res) => {
  const { date } = req.query;
  const blockedDates = await DB.blockedDates.getAll();
  const isBooked = blockedDates.includes(date);
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

// 7a. Public: Get Business Settings (excluding PIN)
app.get('/api/settings', async (req, res) => {
  const settings = await DB.settings.get();
  const publicSettings = { ...settings };
  delete publicSettings.pin;
  res.json({ success: true, data: publicSettings });
});

// 7b. Admin: Update Settings
app.put('/api/settings', authAdmin, async (req, res) => {
  const { phone, whatsapp, email, location, about_bio, pin, studio_name, owner_name } = req.body;
  const updates = {};
  if (phone) updates.phone = phone.trim();
  if (whatsapp) updates.whatsapp = whatsapp.replace(/[^0-9]/g, '');
  if (email) updates.email = email.trim();
  if (location) updates.location = location.trim();
  if (about_bio) updates.about_bio = about_bio.trim();
  if (pin) updates.pin = pin.trim();
  if (studio_name) updates.studio_name = studio_name.trim();
  if (owner_name) updates.owner_name = owner_name.trim();

  const updatedSettings = await DB.settings.update(updates);
  res.json({ success: true, message: 'Studio settings updated successfully.', data: updatedSettings });
});

// 8. Admin: Reset / Purge All Data
app.post('/api/admin/reset-all-data', authAdmin, async (req, res) => {
  store.gallery = [];
  store.reviews = [];
  store.bookings = [];
  store.blocked_dates = [];
  store.services = [];
  saveStore();

  if (isDbConnected) {
    await executeDbQuery('DELETE FROM bookings');
    await executeDbQuery('DELETE FROM reviews');
    await executeDbQuery('DELETE FROM gallery');
    await executeDbQuery('DELETE FROM services');
    await executeDbQuery('DELETE FROM blocked_dates');
  }

  res.json({ success: true, message: 'All store data purged successfully.' });
});

// 9. Unified Multi-Device Real-Time Sync Endpoint
app.get('/api/sync', (req, res) => {
  res.json({
    success: true,
    data: store
  });
});

app.post('/api/sync', authAdmin, async (req, res) => {
  const { bookings, reviews, gallery, services, blocked_dates, settings } = req.body;
  if (Array.isArray(bookings)) store.bookings = bookings;
  if (Array.isArray(reviews)) store.reviews = reviews;
  if (Array.isArray(gallery)) store.gallery = gallery;
  if (Array.isArray(services)) store.services = services;
  if (Array.isArray(blocked_dates)) store.blocked_dates = blocked_dates;
  if (settings && typeof settings === 'object') {
    store.settings = { ...store.settings, ...settings };
    await DB.settings.update(settings);
  }
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
