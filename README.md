# Event Booking System Backend API

## Overview

A comprehensive backend API for an Event Booking System that supports two types of users (Event Organizers and Customers), role-based access control, and background job processing for notifications.

## Architecture & Design Decisions

### Tech Stack
- **Framework**: Node.js with Express.js
- **Database**: MongoDB (NoSQL for flexible event and booking schema)
- **Authentication**: JWT (JSON Web Tokens) with bcryptjs password hashing
- **Job Queue**: BullMQ with Redis fallback (with in-memory queue support)
- **Validation**: Joi for request schema validation
- **API Style**: RESTful with role-based access control

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
   ┌────▼─────┐            ┌─────▼────┐
   │ Organizer │            │ Customer │
   └────┬─────┘            └─────┬────┘
        │                         │
        └────────────┬────────────┘
                     │
        ┌────────────▼────────────┐
        │   Express.js API Server │
        └────────────┬────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
   ┌────▼──┐   ┌────▼────┐  ┌───▼────┐
   │ Auth  │   │ Events  │  │Bookings│
   │Routes │   │ Routes  │  │Routes  │
   └────┬──┘   └────┬────┘  └───┬────┘
        │            │            │
        └────────────┼────────────┘
                     │
        ┌────────────▼────────────┐
        │  MongoDB Database       │
        │  (Users, Events,        │
        │   Bookings collections) │
        └────────────────────────┘
        
        ┌────────────────────────┐
        │   Job Queue Service    │
        │  (BullMQ/In-Memory)    │
        │                        │
        │ - Booking Confirmation │
        │ - Event Notifications  │
        └────────────────────────┘
```

### Database Schema

#### User Model
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: 'customer' | 'organizer',
  phone: String,
  address: String,
  timestamps: true
}
```

#### Event Model
```javascript
{
  title: String,
  description: String,
  organizer: ObjectId (ref: User),
  date: Date,
  location: String,
  totalTickets: Number,
  availableTickets: Number,
  ticketPrice: Number,
  status: 'draft' | 'published' | 'cancelled',
  category: String,
  timestamps: true
}
```

#### Booking Model
```javascript
{
  customer: ObjectId (ref: User),
  event: ObjectId (ref: Event),
  quantity: Number,
  totalPrice: Number,
  status: 'pending' | 'confirmed' | 'cancelled',
  bookingReference: String (unique),
  timestamps: true
}
```

### Key Features

#### 1. User Authentication & Authorization
- JWT-based token authentication
- Bcryptjs password hashing
- Role-based access control (RBAC) for two user types:
  - **Organizer**: Can create, update, delete, and publish events; view all bookings for their events
  - **Customer**: Can browse events and book tickets; manage their own bookings

#### 2. Event Management
- **Organizers can**:
  - Create events in draft status
  - Update event details (title, description, date, tickets, price)
  - Publish events to make them visible to customers
  - Delete events
  - View all bookings for their events
  
- **Customers can**:
  - Browse published events
  - Filter events by category
  - View event details

#### 3. Booking System
- Customers can book tickets for published events
- Automatic ticket availability tracking
- Booking reference generation (BK + timestamp + random)
- Cancel bookings (restores available tickets)
- Organizers can view all bookings for their events

#### 4. Background Job Processing

Two types of background jobs implemented:

**Job 1: Booking Confirmation**
- Triggered when a customer successfully books tickets
- Simulates sending a confirmation email
- Logs to console with booking details:
  - Customer email and name
  - Event details (title, date, location)
  - Booking reference
  - Quantity and total price
  - Booking status

**Job 2: Event Update Notification**
- Triggered when an organizer updates an event
- Notifies all customers who have booked tickets for that event
- Logs to console:
  - Event title and organizer name
  - Changes made
  - List of all affected customers with their booking details
  - Booking references for each notification

#### 5. Job Queue Implementation
- Uses BullMQ for reliable job processing
- Falls back to in-memory job queue if Redis is unavailable
- Supports both immediate processing and deferred execution
- `/api/process-jobs` endpoint for manual job processing

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### Events
- `GET /api/events` - List all published events (public)
- `GET /api/events?status=published&category=tech` - Filter events
- `GET /api/events/:id` - Get event details (public)
- `POST /api/events` - Create event (organizer only)
- `PUT /api/events/:id` - Update event (organizer only)
- `DELETE /api/events/:id` - Delete event (organizer only)
- `POST /api/events/:id/publish` - Publish event (organizer only)

### Bookings
- `POST /api/bookings` - Book tickets (customer only)
- `GET /api/bookings` - Get my bookings (customer only)
- `GET /api/bookings/:id` - Get booking details
- `PUT /api/bookings/:id/cancel` - Cancel booking (customer only)
- `GET /api/bookings/event/:eventId/bookings` - Get event bookings (organizer only)

### Utility
- `GET /api/health` - Health check
- `POST /api/process-jobs` - Process pending background jobs (for demo)

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (running on localhost:27017)
- Redis (optional - system will use in-memory queue if not available)

### Installation Steps

1. **Clone/Navigate to project directory**
   ```bash
   cd backend_hiring_test_11_jan_2026
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   The `.env` file is already set up with default values:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/event-booking
   JWT_SECRET=your_jwt_secret_key_change_this_in_production
   JWT_EXPIRY=7d
   REDIS_URL=redis://localhost:6379
   ```

4. **Start MongoDB** (if running locally)
   ```bash
   # Windows (if MongoDB is installed)
   net start MongoDB
   
   # Or use Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Start the server**
   ```bash
   npm start
   # For development with auto-reload:
   npm run dev
   ```

   You should see:
   ```
   ╔══════════════════════════════════════════════╗
   ║   Event Booking System Backend API           ║
   ║   Server running on http://localhost:3000    ║
   ╚══════════════════════════════════════════════╝
   ```

## Testing the System

### Quick Test Flow

1. **Register a Customer**
   ```bash
   POST http://localhost:3000/api/auth/signup
   {
     "name": "John Doe",
     "email": "john@example.com",
     "password": "password123",
     "role": "customer"
   }
   ```
   Save the returned token as `CUSTOMER_TOKEN`

2. **Register an Organizer**
   ```bash
   POST http://localhost:3000/api/auth/signup
   {
     "name": "Jane Smith",
     "email": "jane@example.com",
     "password": "password123",
     "role": "organizer"
   }
   ```
   Save the returned token as `ORGANIZER_TOKEN`

3. **Create an Event** (as organizer, use ORGANIZER_TOKEN)
   ```bash
   POST http://localhost:3000/api/events
   Authorization: Bearer {ORGANIZER_TOKEN}
   {
     "title": "Tech Conference 2026",
     "description": "Annual technology conference",
     "date": "2026-02-15T10:00:00Z",
     "location": "Convention Center",
     "totalTickets": 100,
     "ticketPrice": 50,
     "category": "technology"
   }
   ```
   Save the returned event `id`

4. **Publish the Event** (as organizer)
   ```bash
   POST http://localhost:3000/api/events/{EVENT_ID}/publish
   Authorization: Bearer {ORGANIZER_TOKEN}
   ```

5. **Browse Events** (public)
   ```bash
   GET http://localhost:3000/api/events
   ```

6. **Book Tickets** (as customer, use CUSTOMER_TOKEN)
   ```bash
   POST http://localhost:3000/api/bookings
   Authorization: Bearer {CUSTOMER_TOKEN}
   {
     "eventId": "{EVENT_ID}",
     "quantity": 2
   }
   ```
   This will trigger the **Booking Confirmation** background job
   Check the console for email simulation output

7. **View My Bookings** (as customer)
   ```bash
   GET http://localhost:3000/api/bookings
   Authorization: Bearer {CUSTOMER_TOKEN}
   ```

8. **Update Event** (as organizer) - This will trigger notification job
   ```bash
   PUT http://localhost:3000/api/events/{EVENT_ID}
   Authorization: Bearer {ORGANIZER_TOKEN}
   {
     "ticketPrice": 75
   }
   ```

9. **Process Background Jobs** (demo endpoint)
   ```bash
   POST http://localhost:3000/api/process-jobs
   {
     "jobType": "booking-confirmations"
   }
   ```
   or
   ```bash
   POST http://localhost:3000/api/process-jobs
   {
     "jobType": "event-notifications"
   }
   ```

## Background Job Processing Flow

### Booking Confirmation Job
1. **Trigger**: Customer successfully books tickets
2. **Output**: Console log with email simulation showing:
   - Customer email and name
   - Event details
   - Booking reference
   - Quantity and price
3. **Console Output Example**:
   ```
   === EMAIL NOTIFICATION ===
   ✓ BOOKING CONFIRMATION EMAIL SENT
     To: john@example.com
     Subject: Booking Confirmation - Tech Conference 2026
     Booking Reference: BK1736595032789ABCD123
     Customer: John Doe
     Event: Tech Conference 2026
     Date: 2/15/2026, 10:00:00 AM
     Location: Convention Center
     Quantity: 2 tickets
     Total Price: $100
   ```

### Event Update Notification Job
1. **Trigger**: Organizer updates an event
2. **Output**: Console log showing:
   - Event and organizer details
   - List of all customers who booked
   - Their booking references and quantities
3. **Console Output Example**:
   ```
   === EVENT UPDATE NOTIFICATIONS ===
   ✓ EVENT UPDATED BY ORGANIZER
     Event: Tech Conference 2026
     Organizer: Jane Smith
     Changes: ticketPrice updated
     Notifying 5 customers...
     
     [1/5] Notification sent to john@example.com
       - Booking Reference: BK1736595032789ABCD123
       - Quantity: 2 tickets
   ```

## Error Handling

The API includes comprehensive error handling:
- Validation errors with specific field details
- Authentication failures
- Authorization checks for role-based access
- Resource not found errors
- Business logic validation (e.g., insufficient tickets)
- Database and server errors with meaningful messages

## Security Features

1. **Password Security**: Bcryptjs hashing with 10 salt rounds
2. **JWT Tokens**: Signed tokens with 7-day expiry
3. **Role-Based Access Control**: Middleware enforces permissions
4. **Input Validation**: Joi schema validation on all requests
5. **MongoDB Injection Prevention**: Using Mongoose ORM
6. **CORS**: Enabled for cross-origin requests

## Assumptions & Implementation Notes

### Development Assumptions
1. **Single MongoDB Instance**: Using MongoDB on localhost:27017 for development
2. **JWT Secret**: Using simple secret in .env (should be secured in production)
3. **Redis/Job Queue**: System gracefully falls back to in-memory queue if Redis unavailable
4. **Email Simulation**: Console logs instead of actual email service
5. **Notification Simulation**: Console logs instead of push/SMS service
6. **No Payment Processing**: Booking system tracks price but doesn't process actual payments

### Implementation Choices
1. **Synchronous Job Processing**: Uses `/api/process-jobs` endpoint for demo purposes
2. **In-Memory Fallback**: Allows system to work without Redis for development
3. **Booking Confirmation**: Automatic on successful booking creation
4. **Event Notifications**: Manual trigger via `/api/process-jobs` endpoint (can be integrated with job queue)
5. **Status Codes**: Standard HTTP status codes (201 for create, 400 for validation, 403 for authorization, 404 for not found)

### Future Enhancements
1. Integrate real email service (SendGrid, AWS SES)
2. Implement push notifications with Firebase
3. Add payment processing (Stripe, PayPal)
4. Implement event cancellation with automatic refunds
5. Add user reviews and ratings
6. Implement ticket resale marketplace
7. Add QR code generation for tickets
8. Implement analytics dashboard
9. Add webhook support for third-party integrations
10. Implement real-time notifications with WebSockets

## Project Structure

```
backend_hiring_test_11_jan_2026/
├── src/
│   ├── controllers/          # Request handlers
│   │   ├── authController.js
│   │   ├── eventController.js
│   │   └── bookingController.js
│   ├── models/              # Database schemas
│   │   ├── User.js
│   │   ├── Event.js
│   │   └── Booking.js
│   ├── routes/              # API routes
│   │   ├── authRoutes.js
│   │   ├── eventRoutes.js
│   │   └── bookingRoutes.js
│   ├── middleware/          # Custom middleware
│   │   └── auth.js
│   ├── services/            # Business logic services
│   │   └── jobQueueService.js
│   ├── jobs/               # Background job processors
│   │   └── jobProcessors.js
│   ├── utils/              # Utility functions
│   │   └── db.js
│   └── server.js           # Main application file
├── .env                     # Environment configuration
├── package.json            # Project dependencies
└── README.md              # This file
```

## Demo Video Recording Guide

For the demo video (2-5 minutes, 3-4 minutes ideal):

1. **Setup (30 seconds)**
   - Show the project folder structure
   - Show the `.env` file
   - Show MongoDB running

2. **Start the Server (15 seconds)**
   - Run `npm start` and show the startup message

3. **Testing Flow (2-3 minutes)**
   - Register a customer account
   - Register an organizer account
   - Create an event as organizer
   - Publish the event
   - View published events
   - Book tickets as customer (show booking confirmation job output)
   - View bookings
   - Update event as organizer (show notification job output)

4. **Conclusion (15 seconds)**
   - Explain the key features
   - Mention the background job processing

Remember to:
- Show your face
- Speak in English
- Keep the demo clear and concise
- Highlight the role-based access control
- Demonstrate both background jobs

## Support & Troubleshooting

### MongoDB Connection Issues
If you see "MongoDB connection failed", make sure:
1. MongoDB is running (`mongod` on Windows/Mac or `service mongodb start` on Linux)
2. MongoDB is accessible on localhost:27017
3. Update MONGODB_URI in .env if using a different host

### Job Queue Issues
If jobs aren't processing:
1. System will use in-memory queue if Redis is unavailable
2. Use `/api/process-jobs` endpoint to manually trigger processing
3. Check console output for job execution logs

### Port Already in Use
If port 3000 is already in use:
1. Change PORT in .env file
2. Or stop the application using port 3000

## License
ISC

## Author
Event Booking System - Backend Hiring Test

---

**Last Updated**: January 11, 2026
**Version**: 1.0.0
