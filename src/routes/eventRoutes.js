const express = require('express');
const {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  publishEvent,
} = require('../controllers/eventController');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getEvents);
router.get('/:id', getEventById);

// Organizer routes
router.post('/', authenticateToken, authorize('organizer'), createEvent);
router.put('/:id', authenticateToken, authorize('organizer'), updateEvent);
router.delete('/:id', authenticateToken, authorize('organizer'), deleteEvent);
router.post('/:id/publish', authenticateToken, authorize('organizer'), publishEvent);

module.exports = router;
