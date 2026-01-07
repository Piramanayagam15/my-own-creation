# Quick Setup Guide for AK Bridals Website

## 🚀 Quick Start (5 Steps)

### 1. Install Node.js
Download and install from: https://nodejs.org/ (Choose LTS version)

### 2. Install MySQL
Download and install from: https://dev.mysql.com/downloads/mysql/

### 3. Install Project Dependencies
Open terminal in project folder:
```bash
npm install
```

### 4. Create Database
Open MySQL command line or phpMyAdmin and run:
```sql
CREATE DATABASE ak_bridals;
USE ak_bridals;
```
Then copy and paste the contents of `database.sql` file and execute it.

### 5. Configure & Start
1. Create a file named `.env` in the project root
2. Copy this content into `.env`:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=ak_bridals
PORT=3000
```
3. Replace `your_mysql_password_here` with your actual MySQL password
4. Save the file
5. Start the server:
```bash
npm start
```

### 6. Open Website
Go to: http://localhost:3000

## ✅ Testing the Booking Form

1. Navigate to Contact page
2. Fill out the form
3. Click "Submit Enquiry"
4. Check your MySQL database:
   ```sql
   SELECT * FROM ak_bridals.bookings;
   ```
   You should see your test booking!

## 🔧 Common Issues

**"Cannot find module" error:**
- Run `npm install` again

**Database connection failed:**
- Check MySQL is running
- Verify password in `.env` file
- Make sure database `ak_bridals` exists

**Port 3000 already in use:**
- Change `PORT=3000` to `PORT=3001` in `.env` file

## 📞 Need Help?
Email: 1508apiramanayagam@gmail.com


