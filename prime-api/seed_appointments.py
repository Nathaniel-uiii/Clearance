from datetime import datetime, timedelta, timezone
from random import choice, randint, shuffle

from sqlalchemy import func

from app.config import settings
from app.db import Base, SessionLocal, engine
from app.models import Appointment, User
from app.security import hash_password


FIRST_NAMES = [
    "Ariel", "Beatrice", "Carlos", "Daniel", "Ella", "Francis", "Gabriela",
    "Hector", "Iris", "Jade", "Kevin", "Lina", "Miguel", "Nina", "Oscar",
    "Paola", "Quincy", "Rosa", "Samuel", "Tina", "Ulysses", "Valerie",
    "Warren", "Xenia", "Yvonne", "Zander", "Alvin", "Bianca", "Cesar",
    "Diana", "Ethan", "Fiona", "Gideon", "Hannah", "Isaac", "Julia",
    "Kara", "Leo", "Maya", "Noel", "Olivia", "Peter", "Queena", "Rafael",
    "Sofia", "Tristan", "Una", "Victor", "Willow", "Xavier", "Yara", "Zoe"
]

LAST_NAMES = [
    "Santos", "Garcia", "Torres", "Reyes", "Martinez", "Cruz", "Diaz", "Lopez",
    "Gonzales", "Rivera", "Flores", "Mendoza", "Valdez", "Navarro", "Ramos",
    "Bautista", "Delgado", "Marquez", "Ortega", "Perez", "Sarmiento", "Uy",
    "Lacson", "Quintana", "Sanchez", "Cruzado", "Casimiro", "Manalo", "Sison",
    "Pangilinan", "Yap", "Alvarez", "Baldomar", "Palco", "Garzon", "Fornilos"
]

ADDRESSES = [
    "Antonio Luna", "Bay-ang", "Bayabas", "Caasinan", "Cabinet", "Calamba",
    "Calibunan", "Comagascas", "Concepcion", "Del Pilar", "Katugasan", "Kauswagan",
    "La Union", "Mabini", "Mahaba", "Poblacion 1", "Poblacion 2", "Poblacion 3",
    "Poblacion 4", "Poblacion 5", "Poblacion 6", "Poblacion 7", "Poblacion 8",
    "Poblacion 9", "Poblacion 10", "Poblacion 11", "Poblacion 12", "Puting Bato",
    "Sanghan", "Soriano", "Tolosa"
]

LOCATIONS = [
    "Antonio Luna, Cabadbaran City", "Bay-ang, Cabadbaran City", "Bayabas, Cabadbaran City",
    "Caasinan, Cabadbaran City", "Cabinet, Cabadbaran City", "Calamba, Cabadbaran City",
    "Calibunan, Cabadbaran City", "Comagascas, Cabadbaran City", "Concepcion, Cabadbaran City",
    "Del Pilar, Cabadbaran City", "Katugasan, Cabadbaran City", "Kauswagan, Cabadbaran City",
    "La Union, Cabadbaran City", "Mabini, Cabadbaran City", "Mahaba, Cabadbaran City",
    "Poblacion 1, Cabadbaran City", "Poblacion 2, Cabadbaran City", "Poblacion 3, Cabadbaran City",
    "Poblacion 4, Cabadbaran City", "Poblacion 5, Cabadbaran City", "Poblacion 6, Cabadbaran City",
    "Poblacion 7, Cabadbaran City", "Poblacion 8, Cabadbaran City", "Poblacion 9, Cabadbaran City",
    "Poblacion 10, Cabadbaran City", "Poblacion 11, Cabadbaran City", "Poblacion 12, Cabadbaran City",
    "Puting Bato, Cabadbaran City", "Sanghan, Cabadbaran City", "Soriano, Cabadbaran City",
    "Tolosa, Cabadbaran City"
]

DOCUMENT_TYPES = [
    "Barangay Clearance",
    "Certificate of Indigency",
    "Business Permit",
    "Proof of Residency",
    "Police Clearance",
    "Marriage License",
    "Tax Clearance",
    "Barangay ID",
    "Residency Certification",
    "Senior Citizen ID"
]

STATUS_OPTIONS = [
    ("pending", None),
    ("done", None),
    ("completed", None),
    ("cancelled", "Changed plans"),
    ("cancelled", "Requested reschedule"),
    ("cancelled", "Invalid documents"),
]


def random_name() -> str:
    return f"{choice(FIRST_NAMES)} {choice(LAST_NAMES)}"


def random_date() -> tuple[str, str]:
    now = datetime.now(timezone.utc)
    offset_days = randint(-90, 20)
    future = now + timedelta(days=offset_days)
    return future.day, future.month


def user_email_from_name(name: str) -> str:
    normalized = name.lower().replace(" ", ".")
    return f"{normalized}@example.com"


def unique_email(base: str, existing: set[str]) -> str:
    email = f"{base}@example.com"
    counter = 1
    while email in existing:
        email = f"{base}{counter}@example.com"
        counter += 1
    existing.add(email)
    return email


def make_user(db, full_name: str, existing_emails: set[str]) -> User:
    email = unique_email(full_name.lower().replace(" ", "."), existing_emails)
    user = db.query(User).filter(User.email == email).first()
    if user:
        return user

    user = User(
        email=email,
        username=full_name,
        password_hash=hash_password("Test1234!"),
        gender=choice(["Male", "Female", None]),
        is_admin=False,
        is_email_verified=True,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def make_admin_user(db):
    admin_email = settings.ADMIN_EMAIL
    admin = db.query(User).filter(User.email == admin_email).first()
    if admin:
        return admin

    admin = User(
        email=admin_email,
        username="Admin User",
        password_hash=hash_password(settings.ADMIN_PASSWORD),
        gender=None,
        is_admin=True,
        is_email_verified=True,
        is_active=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def seed_appointments(total_target: int = 100) -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        admin = make_admin_user(db)

        existing_count = db.query(func.count(Appointment.id)).scalar() or 0
        if existing_count >= total_target:
            print(f"Database already has {existing_count} appointment rows; no new rows added.")
            return

        to_create = total_target - existing_count
        print(f"Seeding {to_create} appointment rows (existing: {existing_count}).")

        appointments_per_user = 5
        users_needed = (to_create + appointments_per_user - 1) // appointments_per_user
        existing_emails = {row[0] for row in db.query(User.email).all()}

        appointment_rows = []
        appointment_user_rows = []
        created_users = []
        used_names = set()
        used_emails = set(existing_emails)

        for user_index in range(users_needed):
            full_name = random_name()
            while full_name in used_names:
                full_name = random_name()
            used_names.add(full_name)

            user = make_user(db, full_name, used_emails)
            created_users.append(user)

            count_for_user = min(appointments_per_user, to_create - len(appointment_rows))
            for _ in range(count_for_user):
                day, month = random_date()
                month_name = [
                    "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"
                ][month - 1]

                status, cancel_reason = choice(STATUS_OPTIONS)
                if status == "completed":
                    status = "done"

                appointment_rows.append(
                    Appointment(
                        user_id=user.id,
                        name=user.username,
                        age=randint(18, 70),
                        address=choice(ADDRESSES),
                        day=str(day),
                        month=month_name,
                        location=choice(LOCATIONS),
                        document_type=choice(DOCUMENT_TYPES),
                        status=status,
                        cancellation_reason=cancel_reason,
                        created_at=(datetime.now(timezone.utc) - timedelta(days=randint(0, 90)))
                    )
                )
                if len(appointment_rows) >= to_create:
                    break
            if len(appointment_rows) >= to_create:
                break

        shuffle(appointment_rows)
        db.add_all(appointment_rows)
        db.commit()

        print(f"Added {len(appointment_rows)} appointments across {len(created_users)} user accounts.")
        for user in created_users[:10]:
            print(f"- {user.email} / password: Test1234! ({appointments_per_user} appointments)")
        if len(created_users) > 10:
            print(f"...and {len(created_users) - 10} more user accounts.")
        print("Each email account has up to 5 appointments, matching the per-account limit.")
        print("Login as any seeded email to view those appointments.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_appointments(200)
