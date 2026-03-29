# Step-by-step: appointments saved to Supabase

Your website **never** talks to Supabase directly. It talks to **PRIME API** (Python). The API uses **`DATABASE_URL`** in **`prime-api/.env`**. If that points to Supabase, every new booking is stored in your Supabase database and appears in **Table Editor**.

---

## Part A — What you need installed

| Tool | Why |
|------|-----|
| **Node.js** | Run the Next.js site (`prime-next`) |
| **Python 3.11+** | Run the API (`prime-api`) |
| A **Supabase** project | Hosted Postgres database |

---

## Part B — Supabase (get the connection info)

### Step 1 — Open your project
1. Go to [supabase.com](https://supabase.com) and open your project.

### Step 2 — Database password
1. **Project Settings** (gear) → **Database**.
2. Find your **database password** (the one you chose when creating the project).  
   - If you forgot it: **Reset database password** here and save the new one somewhere safe.

### Step 3 — Copy the URI
1. Still under **Database**, find **Connection string**.
2. Choose **URI** (sometimes labeled “Postgres” / “Direct”).
3. Copy the string. Example shape:

   `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`

### Step 4 — Encode the password (if needed)
If your password has characters like **`,`**, **`?`**, **`$`**, **`@`**, **`#`**, they **break** the URL unless encoded.

1. Open [urlencoder.org](https://www.urlencoder.org/) (or similar).
2. Paste **only your password**, encode it, copy the result.
3. Use that **encoded** password in the URI (see Part C).

---

## Part C — Configure the API (`prime-api`)

### Step 1 — Go to the API folder
```text
.../Another System-.../prime-api
```

### Step 2 — Python virtual environment (first time only)
```powershell
cd prime-api
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

### Step 3 — Create `.env`
1. Copy **`.env.example`** to **`.env`** in the same `prime-api` folder.
2. Edit **`.env`** and set:

**`DATABASE_URL`** — must use **`postgresql+psycopg://`** (note the **`+psycopg`**), not plain `postgresql://`.

Example using **direct** host and port **5432** (use **your** host from Supabase):

```env
DATABASE_URL=postgresql+psycopg://postgres:ENCODED_PASSWORD@db.nflthhighikkwteeonol.supabase.co:5432/postgres
```

- Replace **`ENCODED_PASSWORD`** with the **URL-encoded** password from Part B Step 4 (or the plain password if it has no special characters).
- Replace the **host** if yours is different.

Also set:

```env
JWT_SECRET=put-a-long-random-string-at-least-32-characters-here
```

Keep **`CORS_ORIGINS`** listing the URL where your site runs, e.g.:

```env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

(Add port **3001** too if Next.js uses that port.)

3. **Save** the file. **Never commit `.env`** to Git.

### Step 4 — Start the API
From `prime-api` (with venv activated):

```powershell
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or from the **repo root**:

```powershell
npm run api
```

### Step 5 — Confirm the API is running
In the browser open:

`http://localhost:8000/health`

You should see: `{"ok":true}`

If the terminal shows **database connection errors**, fix `DATABASE_URL` (password encoding, typo, SSL) and restart.

---

## Part D — Configure the website (`prime-next`)

### Step 1 — API URL
1. Open **`prime-next/.env.local`** (create from **`.env.local.example`** if needed).
2. Set:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Use **the same port** your API uses (here **8000**).

### Step 2 — Start the site
```powershell
cd prime-next
npm install
npm run dev
```

Open the URL Next prints (usually `http://localhost:3000`).

---

## Part E — Book an appointment (browser)

1. **Register** a new account (or **log in** if you already have one).  
   - This creates a row in **`public.users`** in Supabase (once the API uses Supabase).
2. Scroll to **Make An Appointment**, fill the form, click **Make An Appointment**.
3. If it succeeds, you should see it under **Your Appointments** on the same page.

---

## Part F — See it in Supabase

1. Supabase → **Table Editor** → schema **`public`** → table **`appointments`**.
2. Click **Refresh** if needed.
3. You should see **one new row per successful booking** (new `id` each time).

Also check **`users`** if you just registered — a new user row should appear.

---

## Part G — Why you might see only one row

| Situation | Explanation |
|-----------|-------------|
| Bookings **before** you set `DATABASE_URL` to Supabase | They were saved in **SQLite** (`prime_local.db`), not in Supabase. |
| API **not restarted** after editing `.env` | Still using the old database. |
| Wrong **`.env`** file or wrong folder | `DATABASE_URL` must live in **`prime-api/.env`**. |
| **Login** required | Without a token, the API does not create an appointment. |

**Test:** After Supabase is configured, make **one new** booking with a **unique name**, then refresh **`appointments`** in Supabase. If a **second** row appears, everything is connected.

---

## Part H — If tables already exist but look wrong

If `appointments` was created earlier with **different columns** (e.g. `user_id` as UUID), this app may not match. Options:

- Drop conflicting tables in **SQL Editor** (only if you don’t need that data), then restart the API so tables are recreated, **or**
- Use a **new** Supabase project and point `DATABASE_URL` there.

Optional manual SQL: see **`supabase_schema.sql`** in this folder.

---

## Part I — Row Level Security (RLS)

If inserts fail with permission errors, in Supabase turn **RLS off** for **`public.users`** and **`public.appointments`**, or add policies. The API uses the **database password**, not the `anon` key.

---

## Quick reference — file locations

| File | Purpose |
|------|---------|
| `prime-api/.env` | **`DATABASE_URL`**, `JWT_SECRET`, `CORS_ORIGINS` |
| `prime-next/.env.local` | **`NEXT_PUBLIC_API_BASE_URL`** |

---

## Summary in one sentence

**Put your Supabase Postgres URL into `DATABASE_URL` in `prime-api/.env` (with `postgresql+psycopg://` and an encoded password), restart the API, keep `NEXT_PUBLIC_API_BASE_URL` pointing at that API, then every successful booking inserts into Supabase automatically.**
