# 1031 Exchange Dashboard

Professional dashboard for WealthBuilder 1031 exchange automation.

## Features
- Secure login / signup / password reset (Supabase Auth)
- View all active exchange deals
- Add new deals with auto-calculated deadlines
- One-click AI property matching
- One-click broker outreach
- Real-time stats

## Deploy to Vercel

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/1031-dashboard.git
git push -u origin main
```

### Step 2 — Import to Vercel
1. Go to vercel.com → New Project
2. Import your GitHub repo
3. Add Environment Variables:
   - `REACT_APP_SUPABASE_URL` = your Supabase URL
   - `REACT_APP_SUPABASE_ANON_KEY` = your Supabase anon key
4. Click Deploy

### Step 3 — Enable Auth in Supabase
1. Go to Supabase → Authentication → Settings
2. Set Site URL to your Vercel URL
3. Enable email confirmations if needed
