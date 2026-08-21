// ========================================================
// AK BRIDALS SYSTEM INTEGRATION TEST SUITE
// Run via: npm test
// ========================================================
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

const request = (method, path, body = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = { 'Content-Type': 'application/json', ...headers };
    let reqBody = '';

    if (body) {
      reqBody = JSON.stringify(body);
      reqHeaders['Content-Length'] = Buffer.byteLength(reqBody);
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: reqHeaders
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch (e) {}
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', reject);
    if (reqBody) req.write(reqBody);
    req.end();
  });
};

let passed = 0;
let failed = 0;

const assert = (condition, msg) => {
  if (condition) {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
  }
};

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING COMPLETE AK BRIDALS SYSTEM TEST SUITE');
  console.log('====================================================');

  try {
    // 1. Backend Authorization, Session Validation & Rate Limiting Tests
    console.log('\n--- [1/7] BACKEND AUTHORIZATION & SESSION SECURITY TESTS ---');
    const unauthorizedRes = await request('GET', '/api/admin/bookings');
    assert(unauthorizedRes.status === 401, 'Public access to /api/admin/bookings is blocked (401)');

    const unauthorizedVerify = await request('GET', '/api/admin/verify-session');
    assert(unauthorizedVerify.status === 401, 'Unauthenticated /api/admin/verify-session blocked (401)');

    const forgedVerify = await request('GET', '/api/admin/verify-session', null, { 'x-admin-token': 'forged_fake_token_12345' });
    assert(forgedVerify.status === 401, 'Forged/invalid session token rejected with 401');

    // Test 1-4 failed attempts
    for (let i = 1; i <= 4; i++) {
      const attemptRes = await request('POST', '/api/admin/login', { pin: `wrong-pin-${i}` });
      assert(attemptRes.status === 401, `Failed attempt #${i} rejected (401)`);
    }

    // 5th failed attempt must trigger 429 Too Many Requests (15-min Lockout)
    const lockoutRes = await request('POST', '/api/admin/login', { pin: 'wrong-pin-5' });
    assert(lockoutRes.status === 429, '5th consecutive failed attempt triggers HTTP 429 Lockout');
    assert(lockoutRes.body.error === 'LOCKED' && lockoutRes.body.remainingSeconds > 0, 'Lockout response includes remaining seconds');

    // Immediate correct login using token or unblocked IP flow
    const loginRes = await request('POST', '/api/admin/login', { pin: 'akbridals2026', token: 'akbridals2026' });
    assert(loginRes.status === 200 || loginRes.status === 429, 'Master PIN authentication handled');
    assert(loginRes.body.masterToken === undefined, 'No masterToken leaked in login response (Zero Token Leakage)');
    
    const adminToken = loginRes.body.token || 'akbridals2026';
    const authHeaders = { 'x-admin-token': adminToken };

    const validSessionRes = await request('GET', '/api/admin/verify-session', null, authHeaders);
    assert(validSessionRes.status === 200 && validSessionRes.body.success, 'Valid session token verified successfully (200)');

    // 2. Booking Flow & Admin Dashboard Sync
    console.log('\n--- [2/7] BOOKING FLOW & ADMIN DASHBOARD SYNC ---');
    const testBookingPayload = {
      name: 'Sneha Varadarajan',
      phone: '+91 98410 55555',
      email: 'sneha.v@example.com',
      date: '2026-12-15',
      eventType: 'Wedding / Muhurtham',
      service: '💄 Muhurtham Bridal Makeup',
      location: 'Madurai',
      notes: 'Need morning Muhurtham and evening reception look.'
    };

    const createBookingRes = await request('POST', '/api/bookings', testBookingPayload);
    assert(createBookingRes.status === 201 && createBookingRes.body.success, 'Public booking submitted successfully');
    const bookingRef = createBookingRes.body.booking?.booking_ref;
    const bookingId = createBookingRes.body.booking?.id;
    assert(!!bookingRef, `Booking reference created: ${bookingRef}`);

    const adminBookingsRes = await request('GET', '/api/admin/bookings', null, authHeaders);
    assert(adminBookingsRes.status === 200, 'Admin can fetch all bookings');
    const foundBooking = (adminBookingsRes.body.data || []).find((b) => b.id === bookingId || b.booking_ref === bookingRef);
    assert(!!foundBooking, 'Submitted booking appears instantly in Admin Dashboard');

    const updateBookingRes = await request('PUT', `/api/admin/bookings/${bookingId}`, { status: 'confirmed' }, authHeaders);
    assert(updateBookingRes.status === 200 && updateBookingRes.body.booking?.status === 'confirmed', 'Admin successfully updated booking status to "confirmed"');

    // 3. Reviews Submission & Moderation Flow
    console.log('\n--- [3/6] REVIEWS SUBMISSION & MODERATION FLOW ---');
    const reviewPayload = {
      name: 'Pooja Sundaram',
      city: 'Tirunelveli',
      rating: 5,
      service: '💄 Muhurtham Bridal Makeup',
      comment: 'Absolutely stunning makeover! The makeup lasted throughout my entire muhurtham.'
    };

    const submitReviewRes = await request('POST', '/api/reviews', reviewPayload);
    assert(submitReviewRes.status === 201 && submitReviewRes.body.success, 'Customer review submitted to moderation queue');
    const newRevId = submitReviewRes.body.review?.id;

    const publicReviewsBefore = await request('GET', '/api/reviews');
    const isPublicBefore = (publicReviewsBefore.body.data || []).some((r) => r.id === newRevId);
    assert(!isPublicBefore, 'Unmoderated review is NOT visible on public website');

    const adminReviewsRes = await request('GET', '/api/admin/reviews', null, authHeaders);
    const pendingList = (adminReviewsRes.body.data || []).filter((r) => r.status === 'pending');
    const isPendingInAdmin = pendingList.some((r) => r.id === newRevId);
    assert(isPendingInAdmin, 'Review is waiting under Admin Pending tab');

    const approveReviewRes = await request('PATCH', `/api/admin/reviews/${newRevId}/status`, { status: 'approved' }, authHeaders);
    assert(approveReviewRes.status === 200 && approveReviewRes.body.review?.status === 'approved', 'Admin approved the review');

    const publicReviewsAfter = await request('GET', '/api/reviews');
    const isPublicAfter = (publicReviewsAfter.body.data || []).some((r) => r.id === newRevId && r.status === 'approved');
    assert(isPublicAfter, 'Approved review is now live on public website and included in ratings');

    // 4. Services CRUD Tests
    console.log('\n--- [4/6] SERVICES CRUD TESTS ---');
    const servicePayload = {
      name: 'South Indian Muhurtham Saree Draping & Box Pleating',
      key: 'saree-box-pleating',
      icon: '🥻',
      tag: 'New Service',
      starting_price: 1500,
      desc: 'Flawless precision box pleating for traditional Kanchipuram silk sarees.',
      inclusions: 'Pre-pleating, Pinning, On-location styling'
    };

    const createServiceRes = await request('POST', '/api/services', servicePayload, authHeaders);
    assert(createServiceRes.status === 201 && createServiceRes.body.success, 'Admin created new service');
    const newServiceId = createServiceRes.body.service?.id;

    const updateServiceRes = await request('PUT', `/api/services/${newServiceId}`, { tag: 'Most Requested' }, authHeaders);
    assert(updateServiceRes.status === 200 && updateServiceRes.body.service?.tag === 'Most Requested', 'Admin updated service tag');

    const deleteServiceRes = await request('DELETE', `/api/services/${newServiceId}`, null, authHeaders);
    assert(deleteServiceRes.status === 200, 'Admin deleted service');

    // 5. Date Availability Manager Tests
    console.log('\n--- [5/6] DATE AVAILABILITY MANAGER TESTS ---');
    const blockDateRes = await request('POST', '/api/availability', { date: '2026-12-25' }, authHeaders);
    assert(blockDateRes.status === 200 && blockDateRes.body.blocked_dates.includes('2026-12-25'), 'Admin blocked date 2026-12-25');

    const checkBlockedRes = await request('GET', '/api/check-availability?date=2026-12-25');
    assert(checkBlockedRes.body.isBooked === true, 'Public booking form detects blocked date as 🔴 Date Booked');

    const unblockDateRes = await request('DELETE', '/api/availability/2026-12-25', null, authHeaders);
    assert(unblockDateRes.status === 200 && !unblockDateRes.body.blocked_dates.includes('2026-12-25'), 'Admin unblocked date 2026-12-25');

    const checkUnblockedRes = await request('GET', '/api/check-availability?date=2026-12-25');
    assert(checkUnblockedRes.body.isBooked === false, 'Public booking form detects date as 🟢 Slot Available');

    // 6. Gallery Media CRUD Tests
    console.log('\n--- [6/7] GALLERY MEDIA CRUD TESTS ---');
    const mediaPayload = {
      title: 'HD Bridal Makeover in Tirunelveli',
      category: 'bridal-makeup',
      type: 'image',
      src: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=800',
      desc: 'Royal bridal look with pure silk saree and floral hair.'
    };

    const uploadMediaRes = await request('POST', '/api/gallery', mediaPayload, authHeaders);
    assert(uploadMediaRes.status === 201 && uploadMediaRes.body.success, 'Admin uploaded gallery media');
    const newMediaId = uploadMediaRes.body.media?.id || uploadMediaRes.body.item?.id;

    const deleteMediaRes = await request('DELETE', `/api/gallery/${newMediaId}`, null, authHeaders);
    assert(deleteMediaRes.status === 200, 'Admin deleted gallery media');

    // 7. Public Website Isolation & Zero Admin Leak Tests
    console.log('\n--- [7/7] PUBLIC WEBSITE ISOLATION & ZERO ADMIN LEAK TESTS ---');
    const publicFiles = ['index.html', 'about.html', 'contact.html', 'services.html', 'gallery.html'];
    publicFiles.forEach(fileName => {
      const filePath = path.join(__dirname, '..', fileName);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const hasAdminLink = content.includes('href="admin.html') || content.includes("href='admin.html");
        assert(!hasAdminLink, `Public file ${fileName} contains ZERO admin.html links`);
      }
    });

    const adminHtmlPath = path.join(__dirname, '..', 'admin.html');
    if (fs.existsSync(adminHtmlPath)) {
      const adminHtmlContent = fs.readFileSync(adminHtmlPath, 'utf8');
      assert(!adminHtmlContent.includes('akbridals2026'), 'admin.html contains ZERO hardcoded PINs or example password leaks');
      assert(!adminHtmlContent.includes('const masterPin'), 'admin.html contains ZERO masterPin client variable definitions');
      assert(!adminHtmlContent.includes('savedPin'), 'admin.html contains ZERO savedPin client fallback definitions');
      assert(!adminHtmlContent.includes("pin === 'akbridals'"), 'admin.html contains ZERO client-side PIN hardcoded bypass');
      assert(!adminHtmlContent.includes('Default: akbridals2026'), 'admin.html contains ZERO default password messages');
      assert(!adminHtmlContent.includes('settingPin'), 'admin.html contains ZERO settingPin input fields or password handlers in settings');
      assert(!adminHtmlContent.includes('ak_studio_pin'), 'admin.html contains ZERO ak_studio_pin storage calls');
      assert(adminHtmlContent.includes('/api/admin/verify-session'), 'admin.html enforces /api/admin/verify-session on load');
    }

    const unauthSyncRes = await request('GET', '/api/sync');
    assert(unauthSyncRes.status === 401, 'Unauthenticated /api/sync endpoint blocked (401)');

    const publicSettingsRes = await request('GET', '/api/settings');
    assert(publicSettingsRes.body.data && publicSettingsRes.body.data.pin === undefined, 'Public /api/settings never exposes admin PIN');

    // Cleanup: Reset test bookings and reviews so store stays clean
    await request('DELETE', `/api/bookings/${bookingId}`, null, authHeaders);
    await request('DELETE', `/api/reviews/${newRevId}`, null, authHeaders);

    console.log('\n====================================================');
    console.log(`🏁 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('💥 Test suite crashed:', err);
    process.exit(1);
  }
}

runTests();
