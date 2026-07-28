const express = require('express');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'database.sqlite');

app.use(express.json());

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const basicAuth = (req, res, next) => {
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
  if (ADMIN_USER && ADMIN_PASSWORD && login === ADMIN_USER && password === ADMIN_PASSWORD) {
    return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Admin Panel"');
  res.status(401).send('Authentication required.');
};

// Protect admin.html before serving static files
app.use('/admin.html', basicAuth);
app.use(express.static(path.join(__dirname, 'public')));

function validatePhone(phone) {
  if (typeof phone !== 'string') return false;
  if (phone.includes('\n') || phone.includes('\r')) return false;
  if (phone.length < 3 || phone.length > 50) return false;
  // Allow digits, spaces, hyphens, parentheses, leading +, and optional extension
  const phoneRegex = /^\+?[0-9\s\-()]+(?:\s*(?:ext|x|ext\.)\s*[0-9]+)?$/i;
  if (!phoneRegex.test(phone)) return false;
  const basePart = phone.split(/(?:ext|x|ext\.)/i)[0];
  const digits = basePart.replace(/\D/g, '');
  if (digits.length < 3 || digits.length > 15) return false;
  
  // Reject phone numbers that contain fewer than 3 digits (e.g., rejecting strings like "---")
  const totalDigits = phone.replace(/\D/g, '');
  if (totalDigits.length < 3) return false;
  
  return true;
}

// POST /api/reservas
app.post('/api/reservas', async (req, res) => {
  try {
    const { name, date, time, phone } = req.body;
    if (!name || !date || !time || !phone) {
      return res.status(400).json({ success: false, error: 'Missing required fields: name, date, time, phone' });
    }
    // Simple validation formats
    if (typeof name !== 'string' || name.trim() === '' ||
        typeof date !== 'string' || date.trim() === '' ||
        typeof time !== 'string' || time.trim() === '' ||
        typeof phone !== 'string' || phone.trim() === '') {
      return res.status(400).json({ success: false, error: 'Invalid fields format' });
    }

    // Date Format validation: YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: 'Date must be in YYYY-MM-DD format' });
    }

    // Valid calendar date check
    const dateParts = date.split('-');
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10);
    const day = parseInt(dateParts[2], 10);
    if (month < 1 || month > 12) {
      return res.status(400).json({ success: false, error: 'Invalid date values' });
    }
    const calendarDate = new Date(year, month - 1, day);
    if (year < 100) {
      calendarDate.setFullYear(year);
    }
    if (calendarDate.getFullYear() !== year || 
        (calendarDate.getMonth() + 1) !== month || 
        calendarDate.getDate() !== day) {
      return res.status(400).json({ success: false, error: 'Invalid calendar date' });
    }

    // Past Date check
    const d = new Date();
    const localDateStr = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');

    let compareDate = date;
    if (year < 100) {
      compareDate = [
        String(2000 + year).padStart(4, '0'),
        dateParts[1],
        dateParts[2]
      ].join('-');
    }
    if (compareDate < localDateStr) {
      return res.status(400).json({ success: false, error: 'Booking date cannot be in the past' });
    }

    // Phone number format validation
    if (!validatePhone(phone)) {
      return res.status(400).json({ success: false, error: 'Invalid phone number format' });
    }

    const allowedSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
    if (!allowedSlots.includes(time)) {
      return res.status(400).json({ success: false, error: 'Invalid slot time selected. Must be one of the allowed operating slots.' });
    }

    const result = await db.addBooking({ name, date, time, phone });
    res.status(200).json(result);
  } catch (err) {
    if (err.message.includes('Double booking detected')) {
      res.status(400).json({ success: false, error: err.message });
    } else {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

// GET /admin/citas
app.get('/admin/citas', basicAuth, async (req, res) => {
  try {
    let date = req.query.date;
    if (Array.isArray(date)) {
      date = date[0];
    }
    let bookings;
    if (date) {
      bookings = await db.getBookings(date);
    } else {
      bookings = await db.getAllBookings();
    }
    res.status(200).json(bookings);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/disponibilidad
app.get('/api/disponibilidad', async (req, res) => {
  try {
    let date = req.query.date;
    if (Array.isArray(date)) {
      date = date[0];
    }
    if (!date) {
      return res.status(400).json({ success: false, error: 'Missing date parameter' });
    }
    const bookings = await db.getBookings(date);
    const bookedTimes = bookings.map(b => b.time);
    
    const allSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
    const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));
    
    res.status(200).json({ success: true, date, availableSlots });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start DB then server
db.initDb(DATABASE_PATH)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Database mode: ${db.getMode()}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
