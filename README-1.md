# Priority Todo

A no-build static todo app: priorities, categories, due date/time, reminders, per-task timers, search, sort, dark/light mode. Accounts and data live in [Supabase](https://supabase.com), so your tasks sync across devices.

## Files
- `index.html`, `style.css`, `app.js` - the app
- `config.js` - your Supabase URL and anon key
- `supabase/schema.sql` - database table and security rules

## 1. Set up Supabase (free)
1. Create a project at supabase.com.
2. SQL Editor -> New query -> paste `supabase/schema.sql` -> Run.
3. Project Settings -> API: copy the **Project URL** and the **anon / publishable key** into `config.js`.
4. Authentication -> Providers: Email is on by default. For quick testing you can turn off "Confirm email".

## 2. Put it on GitHub
```
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/todo-app.git
git push -u origin main
```

## 3. Deploy on Render
1. render.com -> New -> **Static Site** -> connect the GitHub repo.
2. Build Command: leave empty. Publish Directory: `.`
3. Create Static Site. You get a `https://your-app.onrender.com` link.
4. In Supabase: Authentication -> URL Configuration -> set **Site URL** to your Render link (used in confirmation emails).

## Security notes
- Each user can only read and change their own rows (row-level security).
- Never commit the `service_role` key.
- Reminders fire only while the page is open.
