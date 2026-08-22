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
*Expected Standard:* **All automated test suites must pass with 0 failures.** *(Current Baseline: 27 PASSED, 0 FAILED).*

---

## 🔄 6. Near-Instant Rollback Procedure

In the unlikely event of an unexpected issue following a production deployment, use either of the following rollback paths:

### Path A: Vercel Production Rollback (Fast Traffic Re-routing)
1. Go to **Vercel Dashboard ➔ Project (`my-own-creation`) ➔ Deployments**.
2. Locate the previous healthy deployment (marked with ✅ *Production*).
3. Click the three dots `...` ➔ Select **"Promote to Production"** (or **"Instant Rollback"**).
4. Edge routing points live traffic to the previous stable build within seconds.

### Path B: Git Repository Rollback
```bash
# Create a safe revert commit and push:
git revert HEAD --no-edit
git push origin main
```

---

## 🔑 7. Security & Credential Rotation Protocol

* **Admin Password Rotation:** Update `ADMIN_PASSWORD` in your Vercel Environment Variables or `.env` file, then redeploy/restart. All active sessions are automatically invalidated.
* **Session Secret Rotation:** Update `ADMIN_SESSION_SECRET` with a newly generated 32-byte hex string.
* **Rate-Limiter Reset on Successful Authentication:** If a client IP enters lockout from 5 consecutive failed attempts, authenticating successfully with the valid `ADMIN_PASSWORD` immediately clears the rate-limiter record and grants access.

---

## 🛡️ 8. Future Changes & Maintenance Security Checklist

Before merging or deploying any future update, always execute this 6-point verification gatekeeper:

1. **Targeted Scope:** Is the change strictly confined to a specific bug fix or confirmed requirement? (No random architectural rewrites).
2. **Zero Secrets in Code:** Are all API keys, database credentials, and passwords kept exclusively in `.env` / environment variables and absent from Git history?
3. **Dual-Engine Compatibility:** Does the data change work identically across MySQL Database and `store.json` fallback?
4. **Input Sanitization & Injection Defense:** Are all user-supplied parameters sanitized (XSS protection) and parameterized in SQL (`?` placeholders)?
5. **Admin Route Protection:** Are all new admin endpoints protected by the `authAdmin` session middleware?
6. **Automated Test Gate:** Does `npm test` execute with **0 failures** *(Current Baseline: 27/27 PASS)*?

---

## 🔒 9. GitHub Branch Protection Setup (True Automated Enforcement)

To convert CI test checks into a mandatory blocking gate on GitHub:

1. Open your repository on GitHub: `https://github.com/Piramanayagam15/my-own-creation`
2. Navigate to **Settings ➔ Branches** (or **Rules ➔ Rulesets**).
3. Under *Branch protection rules*, click **Add rule** for branch pattern: `main`.
4. Check the following recommended security rules:
   * ✅ **Require a pull request before merging**
   * ✅ **Require status checks to pass before merging**
   * ✅ Search and select: `Automated Integration & Security Tests` (from `.github/workflows/test.yml`)
   * ✅ **Require branches to be up to date before merging**
   * ✅ **Do not allow bypassing the above settings**
*Result:* Direct pushes to `main` and merging failing PRs are permanently blocked. Production code is 100% safeguarded.

---

## 10. Final Production Sign-Off

### Production Verification Gates

Before declaring AK Bridals fully production-verified, confirm all applicable gates below:

- [ ] **Source Integrity:** Intended production commit is deployed; no hardcoded secrets or credentials exist in client-side code.
- [ ] **Authentication & Authorization:** Admin APIs reject unauthenticated/invalid sessions with `401`; valid sessions are accepted.
- [ ] **Security Regression:** No client-side PIN/password fallbacks, secret storage, or administrative bypasses are present.
- [ ] **Automated Tests:** `npm test` completes with **0 failures** *(Current Baseline: 46/46 PASS)*.
- [ ] **CI Enforcement:** Required GitHub Actions status checks pass successfully.
- [ ] **Branch Protection:** `main` is protected by the required PR and status-check rules.
- [ ] **Production Deployment:** Vercel Production deployment is `Ready` and matches the intended verified revision.
- [ ] **Public Isolation:** Public pages and APIs expose no administrative credentials or internal secrets.
- [x] **Review E2E Flow:** Public Review → `POST /api/reviews` → Pending Queue → subsequent request/refresh persistence verified successfully (**Result A / PASS**).
- [ ] **Rollback Readiness:** Documented rollback procedure has been reviewed and remains operational.
- [ ] **Operations Documentation:** This handbook reflects the current production architecture and security controls.

### Review E2E Verification Evidence

```text
Public Review Submission
        ↓
POST /api/reviews → 201 Created
        ↓
status = pending
        ↓
Admin Authentication → 200 OK
        ↓
GET /api/admin/reviews → Review Found
        ↓
Refresh / Subsequent Request → Review Persisted
        ↓
RESULT A — PASS

Verified Test: Test Customer — Review ID 101
Cleanup: Test review removed after verification.
```

### Final Sign-Off Rule

Production Security Sign-Off may be declared **VERIFIED** only after all applicable Production Verification Gates above are independently confirmed.

* **Current Status:** 🟡 Production Verification In Progress
* **Review E2E:** 🟢 VERIFIED — Result A / PASS
