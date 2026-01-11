const Event = require('../models/Event');
const Booking = require('../models/Booking');
const Joi = require('joi');

const createEventSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  date: Joi.date().iso().required(),
  location: Joi.string().required(),
  totalTickets: Joi.number().integer().min(1).required(),
  ticketPrice: Joi.number().min(0).required(),
  category: Joi.string().optional(),
});

const updateEventSchema = Joi.object({
  title: Joi.string().optional(),
  description: Joi.string().optional(),
  date: Joi.date().iso().optional(),
  location: Joi.string().optional(),
  totalTickets: Joi.number().integer().min(1).optional(),
  ticketPrice: Joi.number().min(0).optional(),
  status: Joi.string().valid('draft', 'published', 'cancelled').optional(),
  category: Joi.string().optional(),
});

const createEvent = async (req, res) => {
  try {
    const { error, value } = createEventSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const event = new Event({
      ...value,
      organizer: req.user.id,
      availableTickets: value.totalTickets,
    });

    await event.save();

    res.status(201).json({
      message: 'Event created successfully',
      event,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating event', error: error.message });
  }
};

const getEvents = async (req, res) => {
  try {
    const { status = 'published', category } = req.query;
    const filter = { status };
    if (category) {
      filter.category = category;
    }

    const events = await Event.find(filter).populate('organizer', 'name email');
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching events', error: error.message });
  }
};

const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('organizer', 'name email');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching event', error: error.message });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { error, value } = updateEventSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }

    // Update available tickets if total tickets changed
    if (value.totalTickets && value.totalTickets !== event.totalTickets) {
      const difference = value.totalTickets - event.totalTickets;
      value.availableTickets = event.availableTickets + difference;
    }

    Object.assign(event, value);
    await event.save();

    res.json({
      message: 'Event updated successfully',
      event,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating event', error: error.message });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }

    await Event.deleteOne({ _id: req.params.id });
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting event', error: error.message });
  }
};

const publishEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to publish this event' });
    }

    event.status = 'published';
    await event.save();

    res.json({
      message: 'Event published successfully',
      event,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error publishing event', error: error.message });
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  publishEvent,
};
