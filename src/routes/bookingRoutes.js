const express = require('express');
const {
  bookTickets,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getEventBookings,
} = require('../controllers/bookingController');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Customer routes
router.post('/', authenticateToken, authorize('customer'), bookTickets);
router.get('/', authenticateToken, authorize('customer'), getMyBookings);
router.get('/:id', authenticateToken, getBookingById);
router.put('/:id/cancel', authenticateToken, authorize('customer'), cancelBooking);

// Organizer routes
router.get('/event/:eventId/bookings', authenticateToken, authorize('organizer'), getEventBookings);

module.exports = router;
