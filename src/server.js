require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { initJobQueues, jobQueue } = require('./services/jobQueueService');
const { processBookingConfirmation, processEventNotification } = require('./jobs/jobProcessors');
const Booking = require('./models/Booking');
const Event = require('./models/Event');

// Import routes
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database and job queues
let queues = {};
(async () => {
  try {
    await connectDB();
    queues = await initJobQueues();
    console.log('✓ Job queues initialized');
  } catch (error) {
    console.error('Error initializing:', error);
  }
})();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Event Booking API is running' });
});

// Demo endpoint to process pending jobs
app.post('/api/process-jobs', async (req, res) => {
  try {
    const { jobType } = req.body;

    if (jobType === 'booking-confirmations') {
      // Process all pending booking confirmations
      const pendingBookings = await Booking.find({ status: 'confirmed' })
        .populate('customer')
        .populate('event')
        .limit(10);

      const results = [];
      for (const booking of pendingBookings) {
        const result = await processBookingConfirmation({
          data: {
            bookingId: booking._id,
            customerId: booking.customer._id,
            eventId: booking.event._id,
            quantity: booking.quantity,
            bookingReference: booking.bookingReference,
          },
        });
        results.push(result);
      }

      res.json({
        message: 'Booking confirmations processed',
        processed: results.length,
        results,
      });
    } else if (jobType === 'event-notifications') {
      // Process event update notifications
      const eventToNotify = await Event.findOne({ status: 'published' }).populate('organizer');

      if (eventToNotify) {
        const result = await processEventNotification({
          data: {
            eventId: eventToNotify._id,
            organizerId: eventToNotify.organizer._id,
            changes: 'Event details have been updated',
          },
        });

        res.json({
          message: 'Event notifications processed',
          result,
        });
      } else {
        res.json({ message: 'No events to notify' });
      }
    } else {
      res.status(400).json({ message: 'Invalid job type' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error processing jobs', error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// 404 handling
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Event Booking System Backend API           ║');
  console.log(`║   Server running on http://localhost:${PORT}        ║`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log('API Documentation:');
  console.log('  Base URL: http://localhost:' + PORT + '/api');
  console.log('');
  console.log('Key Endpoints:');
  console.log('  POST /auth/signup - Register new user');
  console.log('  POST /auth/login - Login user');
  console.log('  GET /events - List all published events');
  console.log('  POST /events - Create event (organizer only)');
  console.log('  POST /bookings - Book tickets (customer only)');
  console.log('  GET /bookings - Get my bookings (customer only)');
  console.log('  POST /process-jobs - Process background jobs (for demo)');
  console.log('');
});

module.exports = app;
