// Express server for AK Bridals - Full Operational Backend & Admin Management
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
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
  services: [
    {
      id: 'srv-1',
      key: 'bridal-makeup',
      name: 'Muhurtham Bridal Makeup',
      icon: '💄',
      tag: 'Signature',
      starting_price: 0,
      price_display: 'Customized Bridal Package',
      desc: 'Flawless HD airbrush and traditional bridal makeover with 24hr waterproof finish, customized for your skin tone and event lighting.',
      inclusions: ['HD / Airbrush Makeup', 'Skin Prep & Primer', 'Lashes & Lenses', 'Touch-up Kit']
    },
    {
      id: 'srv-2',
      key: 'reception-glam',
      name: 'Reception Glam Makeup',
      icon: '✨',
      tag: 'Trending',
      starting_price: 0,
      price_display: 'Customized Reception Glam',
      desc: 'Modern, glowing evening transformation with shimmering eye accents and contemporary styling for reception & sangeet.',
      inclusions: ['Reception Glow Makeup', 'Hairstyling / Bun', 'Accessory Setting', 'Waterproof Formulation']
    },
    {
      id: 'srv-3',
      key: 'combo-package',
      name: 'Royal Muhurtham & Reception Combo',
      icon: '👑',
      tag: 'Best Value',
      starting_price: 0,
      price_display: 'Full Event Bridal Combo',
      desc: 'Complete bridal look package covering Muhurtham ceremony and Reception transformation with saree draping and hair jadai.',
      inclusions: ['2 Event Makeovers', 'Complete Hair Styling', 'Saree Pleating & Draping', 'Jewelry Styling Assistance']
    },
    {
      id: 'srv-4',
      key: 'mehndi',
      name: 'Bridal Organic Mehndi',
      icon: '🌿',
      tag: 'Natural',
      starting_price: 0,
      price_display: 'Customized Mehndi Pattern',
      desc: 'Intricate traditional and modern bridal henna using 100% pure organic herbal cones for deep maroon and long-lasting stain.',
      inclusions: ['Full Hands (Front & Back)', 'Feet Bridal Pattern', 'After-care Essential Oil', 'Bridal Figures & Motifs']
    },
    {
      id: 'srv-5',
      key: 'aari-embroidery',
      name: 'Handcrafted Aari Silk Blouse',
      icon: '🪡',
      tag: 'Custom',
      starting_price: 0,
      price_display: 'Boutique Custom Stitching',
      desc: 'Custom bridal blouse designing with gold zari, cutdana, pearls, and 3D zardozi embroidery handcrafted to match your wedding saree.',
      inclusions: ['Custom Neck & Sleeves Design', 'Zardozi & Gold Zari', 'Custom Color Matching', 'Precision Tailoring Fitting']
    },
    {
      id: 'srv-6',
      key: 'hair-draping',
      name: 'Hair Styling & Saree Draping',
      icon: '💇‍♀️',
      tag: 'Essential',
      starting_price: 0,
      price_display: 'Professional Styling',
      desc: 'Traditional poola jada, flower veni setting, modern reception messy buns, and box-pleated Kanchipuram silk saree draping.',
      inclusions: ['Poola Jada Setting', 'Ironing & Pre-pleating', 'Jewelry Fixation', 'Long-hold Hair Setting']
    },
    {
      id: 'srv-7',
      key: 'academy-makeup',
      name: 'Professional Bridal Academy Course',
      icon: '🎓',
      tag: 'Academy',
      starting_price: 0,
      price_display: 'Certified Masterclass',
      desc: 'Comprehensive hands-on bridal certification masterclass covering skin anatomy, color correction, HD airbrush, and live model practice.',
      inclusions: ['Intensive Training Batch', 'Hands-on Live Models', 'Certificate of Completion', 'Starter Kit Guidance']
    }
  ],
  gallery: [],
  blocked_dates: ['2026-09-15', '2026-10-22', '2026-11-08'],
  bookings: [
    {
      id: 101,
      booking_ref: 'AKB-101',
      name: 'Priya Raman',
      phone: '+91 98765 43210',
      email: 'priya.raman@example.com',
      preferred_date: '2026-09-20',
      event_type: 'Wedding / Muhurtham',
      service: '💄 Muhurtham Bridal Makeup',
      location: 'Chennai (T. Nagar)',
      message: 'Looking for HD Airbrush makeup for Muhurtham & Reception in Chennai.',
      status: 'pending',
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 102,
      booking_ref: 'AKB-102',
      name: 'Ananya Sundaram',
      phone: '+91 94432 10987',
      email: 'ananya.s@example.com',
      preferred_date: '2026-10-05',
      event_type: 'Reception',
      service: '🌿 Bridal Organic Mehndi',
      location: 'Madurai',
      message: 'Bridal peacock pattern henna for hands and feet.',
      status: 'contacted',
      created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 103,
      booking_ref: 'AKB-103',
      name: 'Deepika Natarajan',
      phone: '+91 97890 12345',
      email: 'deepika.n@example.com',
      preferred_date: '2026-11-12',
      event_type: 'Engagement',
      service: '🪡 Handcrafted Aari Silk Blouse',
      location: 'Coimbatore',
      message: 'Custom gold zari zardozi bridal blouse embroidery.',
      status: 'confirmed',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString()
    }
  ],
  reviews: [
    {
      id: 201,
      name: 'Keerthana Rajesh',
      city: 'Chennai',
      rating: 5,
      service: '💄 Muhurtham Bridal Makeup',
      comment: 'AK Bridals made my wedding day truly magical! The HD airbrush makeup stayed completely fresh, sweat-proof, and glowing from 5 AM Muhurtham until the evening rituals.',
      author_token: 'auth_keerthana_201',
      status: 'approved',
      created_at: '2026-08-15T09:30:00.000Z',
      moderated_at: '2026-08-15T10:00:00.000Z'
    },
    {
      id: 202,
      name: 'Soundarya Manoharan',
      city: 'Madurai',
      rating: 5,
      service: '🌿 Bridal Organic Mehndi',
      comment: 'The organic henna was breathtaking! The bridal peacock and temple motifs were so sharp and intricate. The color developed into an intense dark maroon stain that lasted over two weeks.',
      author_token: 'auth_soundarya_202',
      status: 'approved',
      created_at: '2026-08-16T11:20:00.000Z',
      moderated_at: '2026-08-16T12:00:00.000Z'
    },
    {
      id: 203,
      name: 'Divya Venkatesh',
      city: 'Coimbatore',
      rating: 5,
      service: '🪡 Handcrafted Aari Silk Blouse',
      comment: 'Superb zardozi needlework and gold zari detailing on my wedding saree blouse. The precision tailoring fit was 100% flawless and perfectly matched my antique bridal jewelry.',
      author_token: 'auth_divya_203',
      status: 'approved',
      created_at: '2026-08-17T14:15:00.000Z',
      moderated_at: '2026-08-17T15:00:00.000Z'
    },
    {
      id: 204,
      name: 'Sangeetha Ramesh',
      city: 'Tirunelveli',
      rating: 5,
      service: '💇‍♀️ Hair Styling & Saree Draping',
      comment: 'The traditional poola jada floral setting and box-pleated Kanchipuram silk saree draping was immaculate. It stayed perfectly in place through all wedding rituals with zero discomfort.',
      author_token: 'auth_sangeetha_204',
      status: 'approved',
      created_at: '2026-08-18T08:45:00.000Z',
      moderated_at: '2026-08-18T09:30:00.000Z'
    },
    {
      id: 205,
      name: 'Aarthi Subramanian',
      city: 'Bengaluru',
      rating: 5,
      service: '👑 Royal Muhurtham & Reception Combo',
      comment: 'Booked AK Bridals for both my Muhurtham and Reception. Loved how they gave two completely distinct looks — pure traditional muhurtham bride for morning and glamorous dewy glow for night!',
      author_token: 'auth_aarthi_205',
      status: 'approved',
      created_at: '2026-08-19T16:00:00.000Z',
      moderated_at: '2026-08-19T17:00:00.000Z'
    },
    {
      id: 206,
      name: 'Janani Vijay',
      city: 'Trichy',
      rating: 4,
      service: '🎓 Professional Academy Course',
      comment: 'Attended the bridal masterclass. Excellent practical training with live models and clear product guidance. Gave me immense confidence to take on bridal makeup bookings independently.',
      author_token: 'auth_janani_206',
      status: 'approved',
      created_at: '2026-08-20T10:10:00.000Z',
      moderated_at: '2026-08-20T11:00:00.000Z'
    }
  ]
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
// MySQL Database Pool (Optional zero-downtime integration)
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

// Admin Token Authentication Middleware
const authAdmin = (req, res, next) => {
  const providedToken = req.headers['x-admin-token'] || req.query.token;
  const currentPin = store.settings?.pin || ADMIN_TOKEN;
  if (!providedToken || (providedToken !== ADMIN_TOKEN && providedToken !== currentPin)) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid admin credentials.'
    });
  }
  next();
};

// ========================================================
// 1. ADMIN AUTHENTICATION API
// ========================================================
app.post('/api/admin/login', (req, res) => {
  const { pin, token } = req.body;
  const input = (pin || token || '').trim();
  const currentPin = (store.settings?.pin || ADMIN_TOKEN).trim();

  if (input === ADMIN_TOKEN || input === currentPin) {
    return res.json({
      success: true,
      token: ADMIN_TOKEN,
      message: 'Admin authenticated successfully.',
      admin: {
        name: store.settings.owner_name || 'Studio Admin',
        role: 'Owner'
      }
    });
  }

  res.status(401).json({
    success: false,
    message: 'Invalid Admin PIN or Token.'
  });
});

// ========================================================
// 2. BOOKINGS API
// ========================================================

// 2a. Public: Submit Booking Request (POST /api/bookings or /api/contact)
const handleNewBooking = (req, res) => {
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

    // Background MySQL insert if available
    if (pool && isDbConnected) {
      pool.execute(
        `INSERT INTO bookings (name, phone, email, preferred_date, service, message, status, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
        [bookingName, bookingPhone, bookingEmail, bookingDate, bookingService, `${bookingEventType} | ${bookingLocation} | ${bookingMessage}`]
      ).catch(() => {});
    }

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
const handleGetBookings = (req, res) => {
  const { status, search } = req.query;
  let list = [...store.bookings];

  if (status && status !== 'all') {
    list = list.filter(b => b.status === status);
  }

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(b => 
      b.name.toLowerCase().includes(q) ||
      b.phone.toLowerCase().includes(q) ||
      (b.location && b.location.toLowerCase().includes(q)) ||
      (b.service && b.service.toLowerCase().includes(q))
    );
  }

  res.json({
    success: true,
    count: list.length,
    data: list
  });
};

app.get('/api/bookings', authAdmin, handleGetBookings);
app.get('/api/admin/bookings', authAdmin, handleGetBookings);

// 2c. Admin: Update booking status (PATCH /api/bookings/:id/status & PUT /api/admin/bookings/:id)
const handleUpdateBookingStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'contacted', 'confirmed', 'cancelled'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid booking status.' });
  }

  const booking = store.bookings.find(b => String(b.id) === String(id) || b.booking_ref === String(id));
  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found.' });
  }

  if (status) booking.status = status;
  booking.updated_at = new Date().toISOString();
  saveStore();

  res.json({
    success: true,
    message: `Booking #${id} status updated to ${status || booking.status}.`,
    booking
  });
};

app.patch('/api/bookings/:id/status', authAdmin, handleUpdateBookingStatus);
app.put('/api/bookings/:id', authAdmin, handleUpdateBookingStatus);
app.put('/api/admin/bookings/:id', authAdmin, handleUpdateBookingStatus);

// 2d. Admin: Delete booking (DELETE /api/bookings/:id)
app.delete('/api/bookings/:id', authAdmin, (req, res) => {
  const { id } = req.params;
  const beforeCount = store.bookings.length;
  store.bookings = store.bookings.filter(b => String(b.id) !== String(id) && b.booking_ref !== String(id));

  if (store.bookings.length === beforeCount) {
    return res.status(404).json({ success: false, message: 'Booking not found.' });
  }

  saveStore();
  res.json({ success: true, message: `Booking #${id} deleted successfully.` });
});
app.delete('/api/admin/bookings/:id', authAdmin, (req, res) => {
  const { id } = req.params;
  const beforeCount = store.bookings.length;
  store.bookings = store.bookings.filter(b => String(b.id) !== String(id) && b.booking_ref !== String(id));

  if (store.bookings.length === beforeCount) {
    return res.status(404).json({ success: false, message: 'Booking not found.' });
  }

  saveStore();
  res.json({ success: true, message: `Booking #${id} deleted successfully.` });
});

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
app.post('/api/reviews', (req, res) => {
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
const handleModerateReview = (req, res) => {
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
app.delete('/api/reviews/:id', (req, res) => {
  const { id } = req.params;
  const adminToken = req.headers['x-admin-token'] || req.query.token;
  const authorToken = req.headers['x-author-token'];

  const isAdmin = adminToken && (adminToken === ADMIN_TOKEN || adminToken === store.settings?.pin);

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
app.post('/api/gallery', authAdmin, (req, res) => {
  try {
    const { title, category, type, src, desc } = req.body;

    if (!title || !category || !src) {
      return res.status(400).json({ success: false, message: 'Title, category, and image/video are required.' });
    }

    const nextId = (store.gallery && store.gallery.length > 0)
      ? Math.max(...store.gallery.map(g => Number(g.id) || 100)) + 1
      : 101;

    const newItem = {
      id: nextId,
      title: title.trim(),
      category: category.trim(),
      type: type === 'video' ? 'video' : 'image',
      src: src.trim(),
      desc: (desc || '').trim(),
      created_at: new Date().toISOString()
    };

    if (!store.gallery) store.gallery = [];
    store.gallery.unshift(newItem);
    saveStore();

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
app.delete('/api/gallery/:id', authAdmin, (req, res) => {
  const { id } = req.params;
  const before = (store.gallery || []).length;
  store.gallery = (store.gallery || []).filter(g => String(g.id) !== String(id));

  if (store.gallery.length === before) {
    return res.status(404).json({ success: false, message: 'Media item not found.' });
  }

  saveStore();
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
app.post('/api/services', authAdmin, (req, res) => {
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

  res.status(201).json({ success: true, message: 'Service added successfully.', service: newService });
});

// 5c. Admin: Update Service (PUT /api/services/:id)
app.put('/api/services/:id', authAdmin, (req, res) => {
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
  res.json({ success: true, message: 'Service updated successfully.', service });
});

// 5d. Admin: Delete Service (DELETE /api/services/:id)
app.delete('/api/services/:id', authAdmin, (req, res) => {
  const { id } = req.params;
  store.services = (store.services || []).filter(s => String(s.id) !== String(id) && s.key !== String(id));
  saveStore();
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
const handleBlockDate = (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ success: false, message: 'Date is required (YYYY-MM-DD).' });

  if (!store.blocked_dates) store.blocked_dates = [];
  if (!store.blocked_dates.includes(date)) {
    store.blocked_dates.push(date);
    saveStore();
  }

  res.json({ success: true, message: `Date ${date} marked as booked.`, blocked_dates: store.blocked_dates });
};

app.post('/api/availability', authAdmin, handleBlockDate);
app.post('/api/availability/block', authAdmin, handleBlockDate);

// 6c. Admin: Unblock a Date (DELETE /api/availability/:date & POST /api/availability/unblock)
const handleUnblockDate = (req, res) => {
  const date = req.params.date || (req.body && req.body.date);
  if (!date) return res.status(400).json({ success: false, message: 'Date is required.' });

  store.blocked_dates = (store.blocked_dates || []).filter(d => d !== date);
  saveStore();
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
app.put('/api/settings', authAdmin, (req, res) => {
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
  res.json({ success: true, message: 'Studio settings updated successfully.', data: store.settings });
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
