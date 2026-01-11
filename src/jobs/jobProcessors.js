const Booking = require('../models/Booking');
const Event = require('../models/Event');
const User = require('../models/User');

const processBookingConfirmation = async (job) => {
  try {
    const { bookingId, customerId, eventId, quantity, bookingReference } = job.data;

    const booking = await Booking.findById(bookingId).populate('event').populate('customer');
    const event = await Event.findById(eventId).populate('organizer');
    const customer = await User.findById(customerId);

    // Simulate sending booking confirmation email
    console.log('');
    console.log('=== EMAIL NOTIFICATION ===');
    console.log(`✓ BOOKING CONFIRMATION EMAIL SENT`);
    console.log(`  To: ${customer.email}`);
    console.log(`  Subject: Booking Confirmation - ${event.title}`);
    console.log(`  Booking Reference: ${bookingReference}`);
    console.log(`  Customer: ${customer.name}`);
    console.log(`  Event: ${event.title}`);
    console.log(`  Date: ${new Date(event.date).toLocaleString()}`);
    console.log(`  Location: ${event.location}`);
    console.log(`  Quantity: ${quantity} tickets`);
    console.log(`  Total Price: $${booking.totalPrice}`);
    console.log(`  Booking Status: ${booking.status}`);
    console.log(`  Message: Your booking has been confirmed! Please check your email for details.`);
    console.log('===========================');
    console.log('');

    return { success: true, message: 'Booking confirmation sent' };
  } catch (error) {
    console.error('Error processing booking confirmation:', error);
    throw error;
  }
};

const processEventNotification = async (job) => {
  try {
    const { eventId, organizerId, changes } = job.data;

    const event = await Event.findById(eventId);
    const organizer = await User.findById(organizerId);

    // Find all customers who have booked this event
    const bookings = await Booking.find({
      event: eventId,
      status: { $in: ['confirmed', 'pending'] },
    }).populate('customer');

    // Simulate sending notifications to all booked customers
    console.log('');
    console.log('=== EVENT UPDATE NOTIFICATIONS ===');
    console.log(`✓ EVENT UPDATED BY ORGANIZER`);
    console.log(`  Event: ${event.title}`);
    console.log(`  Organizer: ${organizer.name}`);
    console.log(`  Changes: ${changes}`);
    console.log(`  Notifying ${bookings.length} customers...`);
    console.log('');

    bookings.forEach((booking, index) => {
      console.log(`  [${index + 1}/${bookings.length}] Notification sent to ${booking.customer.email}`);
      console.log(`    - Booking Reference: ${booking.bookingReference}`);
      console.log(`    - Quantity: ${booking.quantity} tickets`);
      console.log(`    - Message: Event "${event.title}" has been updated. Please check for details.`);
    });

    console.log('==================================');
    console.log('');

    return {
      success: true,
      message: `Event update notifications sent to ${bookings.length} customers`,
    };
  } catch (error) {
    console.error('Error processing event notification:', error);
    throw error;
  }
};

module.exports = {
  processBookingConfirmation,
  processEventNotification,
};
