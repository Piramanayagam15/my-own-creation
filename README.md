# AK Bridals Website

A beautiful, responsive website for AK Bridals showcasing bridal makeup, mehndi, aari embroidery, blouse designing, hair styling, and training services.

## Features

- **Multi-page static website** (HTML, CSS, JavaScript)
- **Contact form with database storage** (Node.js/Express + MySQL)
- **Responsive design** (mobile, tablet, desktop)
- **Gallery with lightbox**
- **WhatsApp integration** for quick enquiries

## Setup Instructions

### Prerequisites

1. **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
2. **MySQL** database server - [Download here](https://dev.mysql.com/downloads/mysql/)
3. **Git** (optional, for version control)

### Step 1: Install Dependencies

Open terminal/command prompt in the project folder and run:

```bash
npm install
```

This will install:
- Express (web server)
- MySQL2 (database driver)
- CORS (for API requests)
- dotenv (for environment variables)

### Step 2: Set Up Database

1. **Create MySQL database:**
   ```sql
   CREATE DATABASE ak_bridals;
   ```

2. **Run the SQL script:**
   - Open MySQL command line or phpMyAdmin
   - Select the `ak_bridals` database
   - Run the SQL commands from `database.sql` file

   Or use command line:
   ```bash
   mysql -u root -p ak_bridals < database.sql
   ```

### Step 3: Configure Environment Variables

1. **Create `.env` file** in the project root (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file** with your database credentials:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=ak_bridals
   PORT=3000
   ```

### Step 4: Start the Server

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

### Step 5: Test the Website

1. Open your browser and go to `http://localhost:3000`
2. Navigate to the Contact page
3. Fill out the contact form and submit
4. Check your MySQL database - the booking should be saved in the `bookings` table

## Project Structure

```
ak-bridals-website/
├── index.html          # Home page
├── services.html       # Services page
├── gallery.html        # Gallery page
├── about.html          # About page
├── contact.html         # Contact/Booking page
├── server.js           # Express backend server
├── database.sql        # Database schema
├── package.json        # Node.js dependencies
├── .env                # Environment variables (create this)
├── .env.example        # Example environment file
├── assets/
│   ├── css/
│   │   └── styles.css  # All styles
│   └── js/
│       └── main.js     # Frontend JavaScript
└── README.md          # This file
```

## API Endpoints

### POST `/api/contact`
Submit a contact form booking.

**Request Body:**
```json
{
  "name": "John Doe",
  "phone": "+919876543210",
  "email": "john@example.com",
  "date": "2024-12-25",
  "service": "Bridal Makeup",
  "message": "I need bridal makeup for my wedding"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Thank you for your enquiry! We will contact you shortly.",
  "id": 1
}
```

### GET `/api/bookings`
Get all bookings (for admin use - add authentication later).

## Database Schema

The `bookings` table stores:
- `id` - Auto-increment primary key
- `name` - Customer name
- `phone` - Phone number
- `email` - Email address
- `preferred_date` - Preferred service date
- `service` - Selected service
- `message` - Customer message/details
- `status` - Booking status (pending, contacted, confirmed, cancelled)
- `created_at` - Timestamp when booking was created
- `updated_at` - Timestamp when booking was last updated

## Deployment

### Option 1: Traditional Hosting (cPanel, etc.)

1. Upload all files to your hosting server
2. Set up MySQL database through hosting control panel
3. Update `.env` with production database credentials
4. Install Node.js dependencies on server
5. Use PM2 or similar to keep server running:
   ```bash
   npm install -g pm2
   pm2 start server.js
   ```

### Option 2: Cloud Platforms

**Heroku:**
- Connect GitHub repository
- Add MySQL addon (ClearDB or JawsDB)
- Set environment variables in Heroku dashboard
- Deploy

**Railway/Render:**
- Connect repository
- Set environment variables
- Deploy

## Troubleshooting

### Database Connection Error
- Check MySQL is running: `mysql -u root -p`
- Verify database exists: `SHOW DATABASES;`
- Check `.env` file has correct credentials
- Ensure MySQL user has proper permissions

### Port Already in Use
- Change `PORT` in `.env` file
- Or kill the process using port 3000

### Form Not Submitting
- Check browser console for errors
- Verify server is running
- Check API endpoint is accessible: `http://localhost:3000/api/contact`
- Ensure CORS is enabled (already configured)

## Future Enhancements

- Admin dashboard to view/manage bookings
- Email notifications for new bookings
- Authentication for admin panel
- Booking status updates
- Calendar integration
- Payment gateway integration

## Support

For issues or questions, contact: 1508apiramanayagam@gmail.com

---

© 2024 AK Bridals. All rights reserved.


