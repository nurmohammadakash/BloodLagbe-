# 🩸 Blood Lagbe

## A Real-Time Web-Based Blood Donation Management System

### Overview

Blood Lagbe is a full-stack web application designed to connect blood donors, recipients, and blood banks in real time.

The platform includes:

- User Dashboard
- Blood Bank Dashboard
- Admin Dashboard
- Real-time Notifications
- Blood Donation Management
- AI-powered Donor Matching
- Social Newsfeed
- Blood Inventory Management

---

## Technologies

### Frontend

- HTML5
- CSS3
- SCSS
- JavaScript
- GSAP

### Backend

- Node.js
- Express.js
- Socket.io
- GraphQL

### Database

- MySQL

### Machine Learning

- Python
- TensorFlow
- Flask

---

## Team Members

- Nur Mohammad Akash
- Niloy Das
- Apurba Dey

---

## Current Status

🟢 Sprint 1 — Project Initialization

## Final project update — August 2026

The project now includes:
- GSAP-driven landing-page motion and 3D floating navigation.
- Animated ECG hero line.
- 5 km blood-donor map filtering by selected blood group and browser location.
- Address geocoding on donor and blood-bank registration.
- Cross-account username availability checks.
- One shared login endpoint for Users and Blood Banks with role-aware redirects.
- A complete Facebook-style Blood Bank dashboard with Newsfeed, Community and Profile tabs.
- Blood stock meters, urgent banners, comments, likes, notifications, lightbox, and dashboard dark mode.
- Improved light-mode readability across authentication and blood-bank registration pages.
- `database/final_project_updates.sql` for donor-search indexing and inventory initialization.

### Run

1. Start MySQL in XAMPP and make sure the `blood_lagbe` database exists.
2. Apply `database/schema.sql` if creating the database from scratch.
3. For an existing database, apply `database/final_project_updates.sql`.
4. Verify `.env` contains the database values and `GOOGLE_MAPS_API_KEY`.
5. Run `npm install` if `node_modules` is not present.
6. Run `npm start`.
7. Open `http://localhost:5000/`.

Blood Bank registration still uses the existing email OTP verification flow. After verification, a Blood Bank can use the same `/login` page as a normal user; the server identifies the account type and the frontend redirects to the correct dashboard.
