# Admin Panel Setup & Usage Guide

## Overview

A complete admin dashboard has been added to the Clearance system. This admin panel allows administrators to:
- View system statistics and analytics
- Manage users (view, promote to admin, demote from admin)
- Manage appointments (view, update status)
- Monitor all user activities

## Features

### 1. **Admin Dashboard** (`/admin`)
- Real-time statistics:
  - Total users count
  - Total appointments count
  - Appointments by status (pending, confirmed, completed, cancelled)
- Quick navigation links to Users and Appointments management

### 2. **User Management** (`/admin/users`)
- List all users in the system
- Search users by email or name
- View individual user details
- Promote regular users to admin status
- Demote admins back to regular users
- View all appointments for each user

### 3. **Appointment Management** (`/admin/appointments`)
- List all appointments in the system
- Filter appointments by status
- View appointment details
- Update appointment status (pending → confirmed → completed, or cancelled)
- View the user who booked each appointment

## How to Set Up

### Step 1: Database Migration

The system automatically creates the `is_admin` column on first run. However, if you have an existing database, run this SQL:

```sql
ALTER TABLE public.users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE;
```

### Step 2: Create First Admin User

You need to create at least one admin user. You can do this in two ways:

#### Option A: Using the Database
```sql
UPDATE public.users 
SET is_admin = TRUE 
WHERE email = 'your-email@example.com';
```

#### Option B: Using a Script
Create a temporary admin by directly executing SQL in your database admin panel (Supabase Dashboard or similar):

```sql
-- Get your user ID first
SELECT id FROM public.users WHERE email = 'your-email@example.com';

-- Then update them
UPDATE public.users SET is_admin = TRUE WHERE id = YOUR_USER_ID;
```

### Step 3: Access Admin Panel

1. Login to the system with your admin account: `/login`
2. Navigate to `/admin/login` for a dedicated admin login page
3. Or manually navigate to `/admin` after logging in

## API Endpoints

All admin endpoints are protected and require admin privileges. They are prefixed with `/admin/`.

### Stats
- `GET /admin/stats` - Get system statistics

### Users
- `GET /admin/users` - List all users
- `GET /admin/users/{user_id}` - Get user details
- `GET /admin/users/{user_id}/appointments` - Get user's appointments
- `POST /admin/users/{user_id}/make-admin` - Promote user to admin
- `POST /admin/users/{user_id}/remove-admin` - Demote user from admin

### Appointments
- `GET /admin/appointments` - List all appointments
- `GET /admin/appointments/{appointment_id}` - Get appointment details
- `PATCH /admin/appointments/{appointment_id}` - Update appointment status

## Frontend Structure

```
prime-next/src/app/(admin)/
├── layout.tsx              # Admin layout with navigation
├── admin.css               # All admin styling
├── page.tsx                # Dashboard
├── users/
│   ├── page.tsx            # Users list
│   └── [id]/
│       └── page.tsx        # User details
└── appointments/
    ├── page.tsx            # Appointments list
    └── [id]/
        └── page.tsx        # Appointment details
```

## Backend Structure

The admin functionality is integrated into the existing FastAPI backend:

### Models
- `User.is_admin: bool` - New field in User model

### Schemas
- `UserResponse` - Response schema for user data including admin status
- `AdminAppointmentResponse` - Response schema for appointments with user_id
- `AppointmentStatusUpdateRequest` - Request to update appointment status
- `AdminStatsResponse` - Dashboard statistics response

### Security
- `get_current_admin()` - Dependency for protecting admin endpoints
- `check_is_admin(user)` - Helper function to verify admin status

## User Roles & Permissions

### Regular Users
- Can register and login
- Can view/manage their own appointments
- Cannot access admin panel

### Admins
- Can do everything regular users can do
- Can view all users and appointments
- Can manage appointment statuses
- Can promote/demote other users
- Can access the admin panel at `/admin`

## Security Notes

1. **Admin Creation**: Only a database administrator can initially create the first admin user
2. **Admin Delegation**: Existing admins can promote other users to admin
3. **Self-Demotion Prevention**: Admins cannot demote themselves
4. **JWT Authentication**: All admin endpoints require valid JWT tokens
5. **Authorization Check**: Every admin endpoint verifies the user has `is_admin = true`

## Troubleshooting

### "Admin access required" error
- Your user account doesn't have admin privileges
- Contact a database administrator to promote your account

### Admin panel not loading
- Ensure you're logged in
- Your token might have expired; try logging out and back in
- Check browser console for error messages

### Database column missing
- Run the SQL migration from Step 1
- Restart the API server

## Future Enhancements

Possible improvements to the admin system:
1. Admin audit logs (track admin actions)
2. User activity logs
3. Bulk appointment actions
4. Email notifications for admins
5. Admin settings/preferences
6. Advanced reporting and analytics
7. User ban/suspension functionality
