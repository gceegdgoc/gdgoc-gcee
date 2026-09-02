# GDGoC GCEE Website

Official website of **Google Developer Groups on Campus (GDGoC) – Government College of Engineering, Erode (GCEE)**.

A full-stack community website for showcasing GDGoC GCEE activities, events, registrations, announcements, and community information.

🌐 **Live Website:** https://gdgoc-gcee.vercel.app/

---

## Table of Contents

* [Features](#features)
* [Technology Stack](#technology-stack)
* [Project Structure](#project-structure)
* [Running Locally](#running-locally)
* [Environment Variables](#environment-variables)
* [Email / SMTP Configuration](#email--smtp-configuration)
* [Student Registration Flow](#student-registration-flow)
* [Admin Panel](#admin-panel)
* [Event Management](#event-management)
* [Event Registration Flow](#event-registration-flow)
* [Event Email Flow](#event-email-flow)
* [Managing Students](#managing-students)
* [Updating Website Content](#updating-website-content)
* [Deploying](#deploying)
* [Design System](#design-system)
* [Adding New Pages or Sections](#adding-new-pages-or-sections)
* [Troubleshooting](#troubleshooting)
* [Contributing](#contributing)
* [Contact](#contact)

---

# Features

### Public Website

* GDGoC GCEE homepage
* About GDGoC GCEE
* Community information
* Upcoming events
* Past events
* Event details
* Event posters
* Event photos
* Student registration
* Contact information
* Responsive design

### Admin Dashboard

* Secure admin login
* Dashboard overview
* Student registrations
* Student management
* Event creation
* Event editing
* Event deletion
* Event registration management
* Event email sending
* Event completion management
* Search and filtering
* Database-backed data management

### Email System

The website uses **SMTP/Nodemailer** for sending emails.

Email functionality can be used for:

* Student registration emails
* OTP/email verification
* Event registration links
* Event announcements
* Event-related communication

No n8n automation is required for the email workflow.

---

# Technology Stack

| Technology              | Purpose             |
| ----------------------- | ------------------- |
| React                   | Frontend UI         |
| Vite                    | Frontend build tool |
| JavaScript / TypeScript | Application logic   |
| Tailwind CSS            | Styling             |
| GSAP                    | Animations          |
| Node.js                 | Backend runtime     |
| Express.js              | Backend API         |
| MongoDB                 | Database            |
| Mongoose                | MongoDB ODM         |
| Nodemailer              | SMTP email service  |
| Gmail SMTP              | Email delivery      |
| Vercel                  | Frontend deployment |
| GitHub                  | Source control      |

> **Note:** This project does **not use Next.js**.

---

# Project Structure

```text
gdgoc-gcee/
├── public/
│   ├── events/
│   │   ├── posters/
│   │   └── photos/
│   │
│   ├── images/
│   ├── logos/
│   └── favicon.*
│
├── src/
│   ├── assets/
│   │   └── images/
│   │
│   ├── components/
│   │   ├── Navbar.*
│   │   ├── Footer.*
│   │   ├── Hero.*
│   │   ├── About.*
│   │   ├── Events.*
│   │   ├── Community.*
│   │   ├── Contact.*
│   │   └── PageLoader.*
│   │
│   ├── pages/
│   │   ├── Home.*
│   │   ├── Events.*
│   │   ├── EventDetails.*
│   │   ├── Register.*
│   │   └── Contact.*
│   │
│   ├── admin/
│   │   ├── AdminLogin.*
│   │   ├── AdminDashboard.*
│   │   ├── Students.*
│   │   ├── Events.*
│   │   └── Settings.*
│   │
│   ├── services/
│   │   ├── api.*
│   │   └── email.*
│   │
│   ├── data/
│   │   └── events.*
│   │
│   ├── App.*
│   ├── main.*
│   └── index.css
│
├── backend/
│   ├── models/
│   │   ├── Student.*
│   │   ├── Event.*
│   │   └── Registration.*
│   │
│   ├── routes/
│   │   ├── auth.*
│   │   ├── students.*
│   │   ├── events.*
│   │   ├── registrations.*
│   │   └── email.*
│   │
│   ├── controllers/
│   │   ├── authController.*
│   │   ├── studentController.*
│   │   ├── eventController.*
│   │   └── emailController.*
│   │
│   ├── middleware/
│   │   └── auth.*
│   │
│   ├── config/
│   │   └── db.*
│   │
│   ├── utils/
│   │   └── mailer.*
│   │
│   └── server.*
│
├── .env
├── .env.example
├── .gitignore
├── package.json
├── vite.config.*
├── tailwind.config.*
└── README.md
```

> The exact folder names may differ depending on the implementation. Keep the README structure synchronized with the actual repository.

---

# Running Locally

## Requirements

Install the following before running the project:

* Node.js 18+
* npm
* MongoDB Atlas account or local MongoDB
* Gmail account with SMTP/App Password
* Git

---

## 1. Clone the repository

```bash
git clone <your-github-repository-url>
cd gdgoc-gcee
```

---

## 2. Install dependencies

```bash
npm install
```

If the backend has a separate package:

```bash
cd backend
npm install
cd ..
```

---

## 3. Configure environment variables

Create the required `.env` files and add the MongoDB and SMTP configuration.

See the [Environment Variables](#environment-variables) section.

---

## 4. Start the frontend

```bash
npm run dev
```

The Vite development server will normally run at:

```text
http://localhost:5173
```

---

## 5. Start the backend

If the backend runs separately:

```bash
cd backend
npm run dev
```

The API will normally run at a backend URL such as:

```text
http://localhost:5000
```

---

# Environment Variables

Create the required environment variables.

Example:

```env
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>"

PORT=5000

CLIENT_URL="http://localhost:5173"

ADMIN_PASSWORD="your_secure_admin_password"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false

SMTP_USER="yourclub@gmail.com"
SMTP_PASSWORD="your_gmail_app_password"

SMTP_FROM="GDGoC GCEE <yourclub@gmail.com>"
```

### Important

Never commit real credentials to GitHub.

Add the following to `.gitignore`:

```text
.env
.env.local
.env.*.local
node_modules/
dist/
```

---

# Email / SMTP Configuration

The website uses **Nodemailer with SMTP** for email delivery.

For Gmail SMTP, use:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="yourclub@gmail.com"
SMTP_PASSWORD="your_app_password"
```

## Gmail App Password

The SMTP password should be a **Google App Password**, not your normal Gmail password.

General process:

1. Open your Google Account.
2. Enable 2-Step Verification.
3. Open App Passwords.
4. Create an application password.
5. Copy the generated password.
6. Add it to the server environment variables.

Example:

```env
SMTP_USER="gdgocgcee@gmail.com"
SMTP_PASSWORD="xxxx xxxx xxxx xxxx"
```

> Never expose the SMTP password in frontend code.

---

# Student Registration Flow

The student registration flow works through the website backend.

```text
Student
   │
   ▼
Open GDGoC GCEE Website
   │
   ▼
Registration Form
   │
   ├── Name
   ├── Gmail
   ├── Phone
   ├── Department
   ├── Year
   └── Other required information
   │
   ▼
Submit Registration
   │
   ▼
Backend API
   │
   ├── Validate data
   ├── Store data in MongoDB
   └── Send email through SMTP
   │
   ▼
Registration Successful
```

The backend is responsible for database operations and email delivery.

---

# Admin Panel

The admin dashboard provides administrative controls for the GDGoC GCEE website.

Admin access should be protected and must not expose sensitive credentials to the frontend.

## Admin Login

```text
/admin/login
```

The admin enters the configured administrator credentials.

After successful authentication:

```text
Admin Login
     │
     ▼
Authentication
     │
     ▼
Admin Session
     │
     ▼
Admin Dashboard
```

---

# Admin Dashboard

The dashboard can display:

* Total students
* Total event registrations
* Upcoming events
* Completed events
* Recent registrations
* Database status
* Event statistics

Example:

```text
Admin Dashboard
│
├── Overview
├── Students
├── Events
│   ├── Create Event
│   ├── Edit Event
│   ├── Delete Event
│   ├── Registrations
│   └── Send Event
└── Settings
```

---

# Event Management

All event management is handled through the admin dashboard.

## Create Event

Admin can create an event with information such as:

```text
Event Title
Event Description
Event Date
Event Time
Venue
Handled By
Event Type
Registration Link
Poster
```

Example event data:

```js
{
  title: "Introduction to Git and GitHub",
  date: "15-09-2026",
  time: "10:00 AM - 12:00 PM",
  venue: "GCEE Campus",
  handledBy: "GDGoC GCEE",
  type: "Workshop",
  description: "A practical workshop on Git and GitHub.",
  registrationLink: "https://forms.google.com/..."
}
```

---

# Event Lifecycle

```text
CREATE EVENT
     │
     ▼
UPCOMING EVENT
     │
     ▼
SEND EVENT / REGISTRATION LINK
     │
     ▼
STUDENTS REGISTER
     │
     ▼
EVENT DAY
     │
     ▼
EVENT COMPLETED
     │
     ▼
PAST EVENTS
```

Past events should automatically appear in the Past Events section according to the event date.

---

# Event Registration Flow

```text
Admin
 │
 ├── Create Event
 │
 ▼
Event Published
 │
 ▼
Admin Sends Event
 │
 ▼
Email Sent Through SMTP
 │
 ▼
Student Receives Email
 │
 ▼
Student Opens Registration Link
 │
 ▼
Google Form / Registration Page
 │
 ▼
Student Submits Registration
 │
 ▼
Registration Stored / Retrieved
 │
 ▼
Admin Views Registrations
```

The admin dashboard should display the number of registered students and available registration information.

---

# Event Email Flow

The event email system uses SMTP/Nodemailer.

```text
Admin Dashboard
      │
      ▼
Select Event
      │
      ▼
Click "Send Event"
      │
      ▼
Backend Email API
      │
      ▼
Nodemailer
      │
      ▼
Gmail SMTP
      │
      ▼
Students' Gmail
```

The frontend should never directly contain the SMTP username/password.

---

# Managing Students

The admin dashboard provides student management functionality.

Admin can:

* View students
* Search students
* Filter students
* View registration details
* Delete student records when required

Example:

```text
Students
────────────────────────────────────
Name       Email              Year
────────────────────────────────────
Student 1  student@gmail.com  II
Student 2  student@gmail.com  III
Student 3  student@gmail.com  IV
```

---

# Updating Website Content

## Homepage

Homepage sections should be maintained inside the React components/pages.

Typical sections:

```text
Navbar
Hero
About
Community
Events
What We Do
Join / Community CTA
Contact
Footer
```

---

## Navbar

Update navigation links inside the Navbar component.

Example:

```text
Home
About
Events
Community
Contact
```

---

## Events

Add or update event information through the event management system or the project's event data source.

Recommended fields:

```text
Title
Date
Time
Venue
Handled By
Description
Poster
Registration Link
Photos
```

---

## Event Posters

Store event posters in:

```text
public/events/posters/
```

Example:

```text
public/events/posters/git-workshop.jpg
```

Then reference the image from the event.

---

## Event Photos

After an event is completed, add event photos to:

```text
public/events/photos/
```

Example:

```text
public/events/photos/git-workshop-01.jpg
public/events/photos/git-workshop-02.jpg
```

---

# Deployment

The frontend is deployed on Vercel.

Live website:

https://gdgoc-gcee.vercel.app/

---

## Build Before Deployment

Always test the production build locally:

```bash
npm run build
```

If the build succeeds:

```bash
git add .
git commit -m "Update website"
git push
```

Vercel can then automatically deploy the latest commit from the configured branch.

---

# Vercel Environment Variables

Production environment variables must be configured in Vercel.

Add:

```text
MONGODB_URI
PORT
CLIENT_URL
ADMIN_PASSWORD
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASSWORD
SMTP_FROM
```

Do not put SMTP credentials inside frontend environment variables that are exposed to the browser.

---

# Important Deployment Architecture

If the frontend and backend are deployed separately:

```text
                 ┌─────────────────────┐
                 │   GDGoC GCEE User   │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │   React + Vite      │
                 │     Frontend        │
                 └──────────┬──────────┘
                            │ API
                            ▼
                 ┌─────────────────────┐
                 │ Node.js + Express   │
                 │      Backend        │
                 └──────┬─────────┬────┘
                        │         │
                        ▼         ▼
                 ┌──────────┐  ┌────────────┐
                 │ MongoDB  │  │ SMTP/Gmail │
                 └──────────┘  └────────────┘
```

This keeps database credentials and SMTP credentials on the server side.

---

# Design System

The website uses a modern developer-community visual style with a clean, responsive interface.

## Design Principles

* Responsive design
* Mobile-first layouts
* Glassmorphism elements where appropriate
* Smooth GSAP animations
* Clear typography
* Accessible buttons and forms
* Consistent spacing
* Developer/community-focused visual identity

---

# Fonts

Recommended font usage:

```text
Primary: Inter
Code / Technical: JetBrains Mono
```

---

# Animations

GSAP is used for:

* Page loading
* Hero animations
* Scroll animations
* Event card animations
* Section transitions
* Interactive UI elements

Avoid adding excessive animations that negatively affect page performance.

---

# Adding New Pages or Sections

## New Homepage Section

1. Create a new React component.

Example:

```text
src/components/YourSection.jsx
```

2. Add the section to the homepage.

3. Give the section a unique ID:

```html
<section id="your-section">
```

4. Add the navigation link if required.

---

# New Public Page

Create a page inside the project's pages/routes structure.

Example:

```text
src/pages/Community.jsx
```

Then configure the route using the application's routing system.

Example:

```text
/community
```

---

# New Admin Page

Create a new admin page and protect it using the existing admin authentication middleware/route protection.

Example:

```text
/admin/events
/admin/students
/admin/settings
```

---

# API Structure

Typical API structure:

```text
/api/auth
/api/students
/api/events
/api/registrations
/api/email
```

Example:

```text
POST /api/events
GET  /api/events
PUT  /api/events/:id
DELETE /api/events/:id

GET  /api/students
DELETE /api/students/:id

GET  /api/registrations
POST /api/registrations

POST /api/email/send-event
```

---

# Troubleshooting

## Frontend Does Not Start

Run:

```bash
npm install
npm run dev
```

Check that Node.js is installed:

```bash
node -v
npm -v
```

---

## Backend Does Not Connect

Check:

```text
Backend URL
MongoDB URI
Environment variables
Network connection
MongoDB Atlas Network Access
```

---

## MongoDB Connection Error

Verify:

```env
MONGODB_URI="mongodb+srv://..."
```

Also check MongoDB Atlas:

```text
Database Access
Network Access
Database Cluster
```

Make sure the deployment environment is allowed to connect.

---

## SMTP Email Not Sending

Check:

```text
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
SMTP_SECURE
```

For Gmail:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
```

Make sure the SMTP password is a **Google App Password**.

Do not use the normal Gmail account password.

---

## CORS Error

If frontend and backend are deployed separately, make sure the backend allows the frontend origin.

Example:

```text
https://gdgoc-gcee.vercel.app
```

Do not use `*` unnecessarily when authentication or credentials are involved.

---

## 404 Error

Check:

* Frontend routes
* Backend API URL
* Vercel routing configuration
* React Router configuration
* API deployment status
* Environment variables

---

## Event Not Found

Check:

```text
Event ID
Event database record
API endpoint
Frontend API URL
```

Make sure the event exists in MongoDB before requesting its details.

---

## Build Failure

Run:

```bash
npm run build
```

Then inspect the first actual error.

Also check:

```bash
npm install
npm run build
```

Avoid ignoring TypeScript/ESLint/build errors before deployment.

---

# Security

Never commit:

```text
.env
.env.local
SMTP passwords
MongoDB passwords
Admin passwords
API secrets
Private keys
```

Use environment variables for all sensitive configuration.

---

# Performance

Before deploying:

* Optimize event posters
* Compress event photos
* Avoid unnecessary API requests
* Lazy-load large images
* Minimize unnecessary animations
* Use production builds
* Keep MongoDB queries efficient

Recommended image formats:

```text
WebP
JPG
PNG
```

---

# Contributing

Contributions are welcome.

Before submitting changes:

```bash
npm install
npm run build
```

Then:

```bash
git add .
git commit -m "Describe your change"
git push
```

For larger changes:

1. Create an issue.
2. Create a feature branch.
3. Implement the change.
4. Test locally.
5. Run the production build.
6. Submit a pull request.

Keep commits focused and descriptive.

---

# Development Workflow

```text
Clone Repository
       │
       ▼
Install Dependencies
       │
       ▼
Configure .env
       │
       ▼
Start Backend
       │
       ▼
Start Vite Frontend
       │
       ▼
Develop / Test
       │
       ▼
npm run build
       │
       ▼
Git Commit
       │
       ▼
Git Push
       │
       ▼
Vercel Deployment
       │
       ▼
Production Website
```

---

# Event Management Workflow

```text
Admin Login
    │
    ▼
Admin Dashboard
    │
    ▼
Create Event
    │
    ▼
Publish Event
    │
    ▼
Send Event
    │
    ▼
SMTP / Gmail
    │
    ▼
Students Receive Email
    │
    ▼
Student Registration
    │
    ▼
Admin Views Registrations
    │
    ▼
Event Day
    │
    ▼
Complete Event
    │
    ▼
Past Event
```

---

# Technology Architecture

```text
┌─────────────────────────────────────────┐
│              GDGoC GCEE                  │
│              Website                    │
└───────────────────┬─────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│          React + Vite + Tailwind        │
│              Frontend                   │
└───────────────────┬─────────────────────┘
                    │ REST API
                    ▼
┌─────────────────────────────────────────┐
│          Node.js + Express              │
│              Backend                    │
└──────────────┬───────────────┬──────────┘
               │               │
               ▼               ▼
       ┌──────────────┐  ┌──────────────┐
       │   MongoDB    │  │ Nodemailer   │
       │   Database   │  │ SMTP/Gmail   │
       └──────────────┘  └──────────────┘
```

---

# License

This project is maintained for the **GDGoC GCEE community at Government College of Engineering, Erode**.

Refer to the repository license file for the applicable licensing terms.

---

# Contact

For website bugs, feature requests, improvements, or documentation changes:

* Open a GitHub issue.
* Submit a pull request for code improvements.
* Contact the GDGoC GCEE organizing team through the official community channels.

---

## GDGoC GCEE

**Google Developer Groups on Campus – Government College of Engineering, Erode**

🌐 Live Website: https://gdgoc-gcee.vercel.app/

Built for the student developer community at **Government College of Engineering, Erode**.
