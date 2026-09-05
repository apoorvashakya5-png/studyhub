# StudyHub Real Version

This version includes a real server-side account system using Express, SQLite, bcrypt password hashing and sessions.

## Run locally
1. Install Node.js.
2. Open a terminal in this folder.
3. Run `npm install`
4. Set a strong `SESSION_SECRET` environment variable.
5. Run `npm start`
6. Open `http://localhost:3000`

## Real public deployment
For production, use HTTPS and a persistent database/storage. The included SQLite database is excellent for learning/local use, but many cloud hosts use temporary disks. For a multi-student production site, migrate the database to PostgreSQL (or a managed database such as Supabase) and use a production session store.

Never publish real passwords, database secrets, or SESSION_SECRET in frontend code or GitHub.
