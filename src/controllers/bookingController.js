const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Joi = require('joi');
const { jobQueue } = require('../services/jobQueueService');

const bookingSchema = Joi.object({
  eventId: Joi.string().required(),
  quantity: Joi.number().integer().min(1).required(),
});

const generateBookingReference = () => {
  return 'BK' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
};

const bookTickets = async (req, res) => {
  try {
    const { error, value } = bookingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const event = await Event.findById(value.eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.status !== 'published') {
      return res.status(400).json({ message: 'Event is not published' });
    }

    if (event.availableTickets < value.quantity) {
      return res.status(400).json({
        message: `Not enough tickets available. Only ${event.availableTickets} remaining`,
      });
    }

    const bookingReference = generateBookingReference();
    const totalPrice = event.ticketPrice * value.quantity;

    const booking = new Booking({
      customer: req.user.id,
      event: value.eventId,
      quantity: value.quantity,
      totalPrice,
      bookingReference,
      status: 'confirmed',
    });

    await booking.save();

    // Update available tickets
    event.availableTickets -= value.quantity;
    await event.save();

    // Add job to queue for booking confirmation email
    await jobQueue.addJob('booking-confirmation', {
      bookingId: booking._id,
      customerId: req.user.id,
      eventId: value.eventId,
      quantity: value.quantity,
      bookingReference,
    });

    res.status(201).json({
      message: 'Booking created successfully',
      booking: {
        id: booking._id,
        bookingReference: booking.bookingReference,
        quantity: booking.quantity,
        totalPrice: booking.totalPrice,
        status: booking.status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error booking tickets', error: error.message });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ customer: req.user.id })
      .populate('event', 'title date location')
      .sort('-createdAt');

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bookings', error: error.message });
  }
};

const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('event')
      .populate('customer', 'name email');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user is customer or the event organizer
    if (booking.customer._id.toString() !== req.user.id) {
      const event = await Event.findById(booking.event._id);
      if (event.organizer.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to view this booking' });
      }
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching booking', error: error.message });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled' });
    }

    booking.status = 'cancelled';
    await booking.save();

    // Restore available tickets
    const event = await Event.findById(booking.event);
    event.availableTickets += booking.quantity;
    await event.save();

    res.json({
      message: 'Booking cancelled successfully',
      booking,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error cancelling booking', error: error.message });
  }
};

const getEventBookings = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view bookings for this event' });
    }

    const bookings = await Booking.find({ event: req.params.eventId })
      .populate('customer', 'name email phone')
      .sort('-createdAt');

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bookings', error: error.message });
  }
};

module.exports = {
  bookTickets,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getEventBookings,
};
