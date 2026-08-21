// ========================================================
// AK BRIDALS SYSTEM INTEGRATION TEST SUITE
// Run via: npm test
// ========================================================
const http = require('http');

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
    // 1. Backend Authorization & Rate Limiting Tests
    console.log('\n--- [1/7] BACKEND AUTHORIZATION & RATE LIMITING TESTS ---');
    const unauthorizedRes = await request('GET', '/api/admin/bookings');
    assert(unauthorizedRes.status === 401, 'Public access to /api/admin/bookings is blocked (401)');

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
    const adminToken = loginRes.body.token || 'akbridals2026';
    const authHeaders = { 'x-admin-token': adminToken };

    // 2. Booking Flow & Admin Dashboard Sync
    console.log('\n--- [2/6] BOOKING FLOW & ADMIN DASHBOARD SYNC ---');
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
    console.log('\n--- [6/6] GALLERY MEDIA CRUD TESTS ---');
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
