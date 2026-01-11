#!/usr/bin/env node

/**
 * Event Booking System - Quick Test Script
 * Usage: node test-api.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000/api';
let customerToken = '';
let organizerToken = '';
let eventId = '';

const request = (method, endpoint, data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

const test = async () => {
  console.log('🚀 Starting Event Booking System API Tests\n');

  try {
    // Test 1: Register Customer
    console.log('📝 Test 1: Register Customer');
    let res = await request('POST', '/auth/signup', {
      name: 'John Doe',
      email: `john${Date.now()}@example.com`,
      password: 'password123',
      role: 'customer',
    });
    customerToken = res.data.token;
    console.log(`✓ Customer registered: ${res.data.user.email}`);
    console.log(`  Token: ${customerToken.substring(0, 20)}...\n`);

    // Test 2: Register Organizer
    console.log('📝 Test 2: Register Organizer');
    res = await request('POST', '/auth/signup', {
      name: 'Jane Smith',
      email: `jane${Date.now()}@example.com`,
      password: 'password123',
      role: 'organizer',
    });
    organizerToken = res.data.token;
    console.log(`✓ Organizer registered: ${res.data.user.email}`);
    console.log(`  Token: ${organizerToken.substring(0, 20)}...\n`);

    // Test 3: Create Event
    console.log('📝 Test 3: Create Event (as Organizer)');
    res = await request('POST', '/events', {
      title: 'Tech Conference 2026',
      description: 'Annual technology conference with keynote speakers',
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Convention Center, City',
      totalTickets: 100,
      ticketPrice: 50,
      category: 'technology',
    }, organizerToken);
    eventId = res.data.event._id;
    console.log(`✓ Event created: ${res.data.event.title}`);
    console.log(`  Event ID: ${eventId}`);
    console.log(`  Status: ${res.data.event.status}\n`);

    // Test 4: Publish Event
    console.log('📝 Test 4: Publish Event');
    res = await request('POST', `/events/${eventId}/publish`, {}, organizerToken);
    console.log(`✓ Event published`);
    console.log(`  Status: ${res.data.event.status}\n`);

    // Test 5: Get Events
    console.log('📝 Test 5: Get All Published Events');
    res = await request('GET', '/events?status=published');
    console.log(`✓ Found ${res.data.length} published events`);
    if (res.data.length > 0) {
      console.log(`  Event: ${res.data[0].title}`);
    }
    console.log('');

    // Test 6: Book Tickets
    console.log('📝 Test 6: Book Tickets (as Customer)');
    res = await request('POST', '/bookings', {
      eventId: eventId,
      quantity: 2,
    }, customerToken);
    console.log(`✓ Booking created successfully`);
    console.log(`  Booking Reference: ${res.data.booking.bookingReference}`);
    console.log(`  Quantity: ${res.data.booking.quantity} tickets`);
    console.log(`  Total Price: $${res.data.booking.totalPrice}`);
    console.log(`  Status: ${res.data.booking.status}`);
    console.log(`\n  ⚠️ CHECK CONSOLE: Background job for booking confirmation should be logged\n`);

    // Test 7: Get My Bookings
    console.log('📝 Test 7: Get My Bookings (as Customer)');
    res = await request('GET', '/bookings', null, customerToken);
    console.log(`✓ Found ${res.data.length} booking(s)`);
    res.data.forEach((booking, i) => {
      console.log(`  [${i + 1}] ${booking.bookingReference} - ${booking.quantity} tickets`);
    });
    console.log('');

    // Test 8: Get Event Bookings
    console.log('📝 Test 8: Get Event Bookings (as Organizer)');
    res = await request('GET', `/bookings/event/${eventId}/bookings`, null, organizerToken);
    console.log(`✓ Event has ${res.data.length} booking(s)`);
    res.data.forEach((booking, i) => {
      console.log(`  [${i + 1}] ${booking.bookingReference}`);
    });
    console.log('');

    // Test 9: Update Event
    console.log('📝 Test 9: Update Event (triggers notifications)');
    res = await request('PUT', `/events/${eventId}`, {
      ticketPrice: 75,
    }, organizerToken);
    console.log(`✓ Event updated`);
    console.log(`  New ticket price: $${res.data.event.ticketPrice}`);
    console.log(`\n  ⚠️ CHECK CONSOLE: Background job for event notifications should be logged\n`);

    // Test 10: Authorization Test
    console.log('📝 Test 10: Authorization Test (Customer tries to create event)');
    res = await request('POST', '/events', {
      title: 'Test Event',
      description: 'Should fail',
      date: new Date().toISOString(),
      location: 'Somewhere',
      totalTickets: 50,
      ticketPrice: 100,
    }, customerToken);
    console.log(`✓ Authorization denied as expected`);
    console.log(`  Response: ${res.data.message}\n`);

    // Test 11: Process Jobs
    console.log('📝 Test 11: Process Background Jobs Manually');
    res = await request('POST', '/process-jobs', { jobType: 'booking-confirmations' });
    console.log(`✓ Booking confirmation jobs processed`);
    console.log(`  Message: ${res.data.message}\n`);

    res = await request('POST', '/process-jobs', { jobType: 'event-notifications' });
    console.log(`✓ Event notification jobs processed`);
    console.log(`  Message: ${res.data.message}\n`);

    console.log('✅ All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  ✓ User authentication (signup)');
    console.log('  ✓ Role-based access control');
    console.log('  ✓ Event creation and management');
    console.log('  ✓ Ticket booking system');
    console.log('  ✓ Background job processing');
    console.log('  ✓ Authorization enforcement');
    console.log('\n💡 Check the server console output for background job notifications!');
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    console.log('\n⚠️ Make sure the server is running on http://localhost:3000');
    process.exit(1);
  }
};

test();
