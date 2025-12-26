<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: <https://ai.studio/apps/drive/1j2B3vpbU5GIKIXfUSuVG_2bp9RYjKCUY>

## Run Locally

**Prerequisites:** Node.js

## Backend Setup (Supabase)

1. Create a new project on [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Copy the contents of [`supabase/schema.sql`](supabase/schema.sql) and run it to create the database tables.
4. (Optional) Run [`supabase/seed.sql`](supabase/seed.sql) to insert initial demo data.
5. In **Project Settings > API**, find your `URL` and `anon` Key.

## Local Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create settings file:

   ```bash
   cp .env.example .env.local
   ```

3. Set your Supabase keys in `.env.local`:

   ```env
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   GEMINI_API_KEY=your-gemini-key
   ```

4. Run the app:

   ```bash
   npm run dev
   ```

## Deployment (AWS Amplify)

1. Push this repository to GitHub.
2. Log in to [AWS Amplify Console](https://aws.amazon.com/amplify/).
3. Choose **"Host web app"** and connect your GitHub repository.
4. In the **Build settings**, Amplify should automatically detect `amplify.yml`.
5. Under **Environment variables**, add:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key
   - `GEMINI_API_KEY`: Your Gemini API Key
6. Click **Save and Deploy**.

7. Install dependencies:
   `npm install`
8. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
9. Run the app:
   `npm run dev`
