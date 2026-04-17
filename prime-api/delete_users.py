#!/usr/bin/env python3
"""
Delete all users except the admin user (admin@admin.com).
"""

import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, "/Users/Ken/Clearance/prime-api")

from app.config import settings
from app.models import User

# Connect to database
engine = create_engine(settings.DATABASE_URL)
Session = sessionmaker(bind=engine)
db = Session()

# Find admin user
admin = db.query(User).filter(User.email == "admin@admin.com").first()

if not admin:
    print("❌ Admin user (admin@admin.com) not found!")
    sys.exit(1)

# Delete all other users
deleted_count = db.query(User).filter(User.id != admin.id).delete()
db.commit()

print(f"✅ Deleted {deleted_count} user(s)")
print(f"✅ Admin user (admin@admin.com) preserved")

db.close()
