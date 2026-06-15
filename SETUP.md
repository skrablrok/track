# ToolTrack — Setup Guide

## Requirements
- Node.js 18+
- npm 9+

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
# Edit .env.local and change the NEXTAUTH_SECRET

# 3. Create the database and tables
npm run db:push

# 4. Seed with demo data and accounts
npm run db:seed

# 5. Start development server
npm run dev
```

Open http://localhost:3000

## Demo Accounts

| Role     | Email                    | Password     |
|----------|--------------------------|--------------|
| Admin    | admin@company.com        | Admin123!    |
| Manager  | manager@company.com      | Manager123!  |
| Employee | employee@company.com     | Employee123! |

## Features

### For Employees
- View all tools and their availability
- Check out tools by selecting from the list or scanning a QR code
- Return tools by scanning the QR code again
- View your checkout history with duration tracking

### For Managers
- All employee features
- Add and edit tools
- Create and manage projects/construction sites
- View reports and usage analytics
- See all user checkouts

### For Admins
- All manager features
- Manage users (create, enable/disable)
- View full audit log
- Delete/deactivate tools

## Security Features
- JWT session-based authentication (8 hour sessions)
- bcrypt password hashing (12 rounds)
- Role-based access control (ADMIN / MANAGER / EMPLOYEE)
- Full audit logging of all actions
- Internal-only access (no public registration)

## Production Deployment

1. Set a strong `NEXTAUTH_SECRET` (min 32 characters)
2. Set `NEXTAUTH_URL` to your production domain
3. Run `npm run build` then `npm start`
4. Use a process manager like PM2

## Mobile / PWA
The app is a Progressive Web App. On mobile:
- Open in Chrome/Safari
- Tap "Add to Home Screen"
- Use like a native app with QR scanning

## QR Codes
Each tool gets a unique QR code. To print:
1. Go to any tool's detail page
2. Click "Download QR" to save the PNG
3. Print and attach to the physical tool
