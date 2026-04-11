#!/usr/bin/env python3
"""
Admin user setup script for Clearance system.
Creates an admin user with email: admin@admin.com and password: admin123
"""

import sys
from passlib.context import CryptContext

# Initialize password context (same as in app/security.py)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Credentials to create
email = "admin@admin.com"
username = "Admin User"
password = "admin123"
gender = None
security_q1 = None
security_q2 = None

# Hash the password
password_hash = pwd_context.hash(password)

print("=" * 70)
print("ADMIN USER SETUP")
print("=" * 70)
print(f"\nEmail: {email}")
print(f"Username: {username}")
print(f"Password: {password}")
print(f"Password Hash: {password_hash}")
print("\n" + "=" * 70)
print("SQL COMMAND - Run this in your database:")
print("=" * 70)

sql = f"""
INSERT INTO public.users (email, username, password_hash, gender, security_q1, security_q2, is_admin)
VALUES ('{email}', '{username}', '{password_hash}', {gender}, {security_q1}, {security_q2}, TRUE);
"""

print(sql)
print("=" * 70)
print("\nInstructions:")
print("1. Copy the SQL command above")
print("2. Go to your Supabase dashboard → SQL Editor")
print("3. Paste and execute the command")
print("4. Login with: admin@admin.com / admin123")
print("5. Go to /admin to access the admin panel")
print("=" * 70)
