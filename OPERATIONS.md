# 👑 AK BRIDALS — PRODUCTION OPERATIONS & MAINTENANCE HANDBOOK

**System Version:** 1.0.0 (Production Certified)  
**Security Standard:** Enterprise (HMAC-SHA256 Token Sessions + 15-Minute IP Lockout)  
**Architecture:** Database-First (MySQL Primary Engine + Persistent JSON Fallback)

---

## 📌 1. Core Architecture (FROZEN 🔒)

```
                            🌐 CLIENT LAYER
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
          👰 Public Website                   👑 Admin Portal
         (Home, Services,                     (Bookings, Reviews,
          Gallery, Booking,                   Availability, Services,
          Review Submission)                  Gallery, Studio Settings)
                  │                                   │
                  ▼                                   ▼
        Public REST APIs                      Protected Admin APIs
      (GET /api/services,                   (Requires Valid Session Token
       GET /api/reviews [approved],          or ADMIN_PASSWORD)
       POST /api/bookings,                            │
       POST /api/reviews [pending])                   │
                  │                                   │
                  └─────────────────┬─────────────────┘
                                    ▼
                         Express API Server (Node.js)
                                    │
                                    ▼
                  🗄️ MySQL Database (PRIMARY SOURCE OF TRUTH)
                  - bookings, reviews, gallery, services,
                    blocked_dates, studio_settings, admin_sessions
                                    │
                         (If MySQL Unavailable)
                                    ▼
                  📦 Persistent JSON Engine (store.json Fallback)
```

---

## 🔐 2. Production Environment Configuration

All production secrets must reside exclusively in `.env` (on self-hosted servers) or **Vercel Project Settings ➔ Environment Variables** (for serverless deployments).

| Environment Variable | Description | Example / Production Format |
| :--- | :--- | :--- |
| `DB_HOST` | MySQL Server Host / Cloud URI | `aws.connect.psdb.cloud` or `localhost` |
| `DB_PORT` | MySQL Connection Port | `3306` |
| `DB_USER` | MySQL Username | `ak_prod_user` |
| `DB_PASSWORD` | MySQL Database Password | *Strong 24+ character password* |
| `DB_NAME` | MySQL Database Name | `ak_bridals` |
| `PORT` | Web Application Port | `3000` |
| `ADMIN_PASSWORD` | Master Studio Admin Password | *Strong unique password* |
| `ADMIN_SESSION_SECRET` | 32-Byte Cryptographic Signing Secret | *Generated 64-char hex string* |

---

## 💾 3. Database Backup & Disaster Recovery

### A. Local / Dedicated MySQL Server Backup
```bash
# Execute daily backup snapshot:
mysqldump -h localhost -u root -p ak_bridals > backups/ak_bridals_$(date +%Y%m%d_%H%M%S).sql
```

### B. Cloud MySQL Managed Services (PlanetScale / AWS RDS / DigitalOcean / Supabase)
* **Automated Daily Backups:** Enable provider-managed automated point-in-time recovery (PITR) in your Cloud DB Console.
* **Manual Remote Snapshot Export:**
```bash
mysqldump -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME > backups/remote_prod_backup.sql
```

### C. 2-Minute Emergency Disaster Restore:
```bash
# 1. Re-import database schema & records
mysql -h $DB_HOST -u $DB_USER -p $DB_NAME < backups/remote_prod_backup.sql

# 2. Execute automated test suite to certify system integrity
npm test
```

---

## 📊 4. Daily Studio Operations SOP

### 🌅 Morning Routine (Booking Dispatch)
1. Open Admin Portal (`/admin.html`) and authenticate with `ADMIN_PASSWORD`.
2. Inspect the **Bookings** tab for new customer requests (`status: 'pending'`).
3. Click the customer's phone number to connect directly via WhatsApp.
4. Mark the booking as `Confirmed` or `Cancelled`.

### 👰 Post-Event Routine (Review Moderation)
1. Share the website review link with the bride.
2. When the bride submits her rating & review, it arrives under **Reviews ➔ Pending** tab.
3. The studio owner verifies the submission and clicks **"✅ Approve"**.
4. The review immediately goes live on the homepage with updated average 5-star ratings.

### 💍 Muhurtham Season Routine (Calendar Date Blocking)
1. Under the **Availability** tab, click any peak date on the calendar.
2. Click **"Block Date"**.
3. The public booking form immediately marks the slot as `🔴 Date Booked`, preventing booking conflicts.

---

## 🧪 5. Automated Verification & Healthchecks

Run the automated test suite at any time to verify system health:
```bash
npm test
```
*Expected Result:* `27 PASSED, 0 FAILED` (100% Core System Health).

---

## 🔄 6. Zero-Downtime Rollback Procedure

In the unlikely event of an issue after a deployment, use either of the following rollback paths:

### Path A: Vercel Instant Rollback (0-Second Downtime)
1. Go to **Vercel Dashboard ➔ Project (`my-own-creation`) ➔ Deployments**.
2. Locate the previous healthy deployment (marked with ✅ *Production*).
3. Click the three dots `...` ➔ Select **"Instant Rollback"** (or **"Promote to Production"**).
4. Live traffic routes to the previous stable release instantly with zero downtime.

### Path B: Git Repository Rollback
```bash
# Revert to previous stable commit:
git revert HEAD --no-edit
git push origin main
```

---

## 🔑 7. Security & Credential Rotation Protocol

* **Admin Password Rotation:** Update `ADMIN_PASSWORD` in your Vercel Environment Variables or `.env` file, then restart the service. All active sessions are immediately invalidated.
* **Session Secret Rotation:** Update `ADMIN_SESSION_SECRET` with a newly generated 32-byte hex string.
* **Emergency IP Unlock:** If the studio admin accidentally gets locked out from 5 wrong attempts, submitting the valid `ADMIN_PASSWORD` automatically clears the rate limiter lockout immediately.
