# Project Commands

This document contains all the necessary commands to run the project. You can copy and paste these into your terminal.

## 1. Database Migrations

Whenever you update your Django models, or when you connect to a new database (like Supabase), you need to run migrations to sync the database schema.

**Step 1:** Change to the backend directory
```bash
cd backend
```

**Step 2:** Create new migrations based on model changes
```bash
python manage.py makemigrations
```

**Step 3:** Apply the migrations to the database
```bash
python manage.py migrate
```

---

## 2. Running the Backend

The backend is built with Django. To start the local server:

**Step 1:** Make sure you are in the backend directory
```bash
cd backend
```

**Step 2:** Start the Django development server
```bash
python manage.py runserver
```
*(The backend will typically run at http://127.0.0.1:8000)*

---

## 3. Running the Frontend

The frontend is built with React and Vite. To start the local server:

**Step 1:** Open a **new, separate terminal window** and change to the frontend directory
```bash
cd frontend
```

**Step 2:** Install dependencies (if you haven't already)
```bash
npm install
```

**Step 3:** Start the Vite development server
```bash
npm run dev
```
*(The frontend will typically run at http://localhost:5173)*
