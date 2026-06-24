# Deployment guide — Supabase + GitHub + Hostry

Read this before starting: Hostry is a general-purpose hosting company (shared/VPS/dedicated/cloud), not a git-push Next.js platform like Vercel. There's no evidence of a one-click "connect GitHub, auto-build Next.js with API routes" pipeline on Hostry. The realistic path is their **Cloud or VPS plan**, where you run a persistent Node.js process yourself behind Nginx, with GitHub Actions handling the redeploy. That's what this guide walks through. If at any point this feels like more ops work than you want, Vercel does steps 4-6 below automatically for about $20/month — worth keeping in mind as you go.

## Step 1 — Supabase: provision the database

1. Create a project at supabase.com. Note the project's connection string (Settings → Database → Connection string, use the "Transaction" pooler mode for serverless-friendly connections).
2. In the SQL editor, enable PostGIS: `CREATE EXTENSION IF NOT EXISTS postgis;` (also included at the top of `schema.sql`, but enabling it explicitly first avoids permission surprises on some plans).
3. Run `database/schema.sql`, then `database/seed.sql`, either by pasting into the SQL editor or via `psql $DATABASE_URL -f database/schema.sql`.
4. Create a Storage bucket named `property-images` (Storage → New bucket → set to public, since listing photos need to be publicly viewable). Add a storage policy allowing authenticated `agent`/`admin` users to `INSERT`, and `SELECT` for everyone — the upload helper in `lib/supabase/client.ts` assumes this bucket name and public access.
5. Under Authentication, enable email/password sign-in (or whatever providers you want). Create your first admin user, then manually set their `role` to `'admin'` in the `users` table — there's no self-service "become an admin" flow by design.
6. Copy `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from Settings → API. Keep the service role key out of anything that ships to the browser.

## Step 2 — GitHub: get the code into a repo

1. Push this project to a new GitHub repository (`git init`, `git add .`, `git commit`, create the repo on GitHub, `git push`).
2. Add a `.gitignore` if one isn't already present, covering `node_modules`, `.next`, and `.env.local` — never commit real credentials.
3. This repo is what both Hostry (via GitHub Actions, below) and Supabase migrations key off of going forward.

## Step 3 — Hostry: provision a server that can run Node.js

1. Choose a Cloud or VPS plan (shared hosting plans typically only run PHP — confirm Node.js support on whichever plan you pick before buying).
2. Provision an Ubuntu-based instance, SSH in, and install Node.js 20+ and `pm2` (a process manager that keeps your app running and restarts it on crash):
   ```
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo npm install -g pm2
   ```
3. Install and configure Nginx as a reverse proxy in front of the Next.js app (Next.js runs on, say, port 3000; Nginx handles port 80/443 and forwards to it). A minimal Nginx server block:
   ```
   server {
     listen 80;
     server_name yourdomain.com;
     location / {
       proxy_pass http://localhost:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```
4. Install Certbot and run `sudo certbot --nginx -d yourdomain.com` for free SSL.

## Step 4 — first deploy

1. On the server: `git clone <your-repo-url>`, `cd davao-property-finder`, `npm install`, create `.env.local` with the values from Step 1 plus your Mapbox token and Anthropic API key.
2. `npm run build`, then start it under pm2: `pm2 start npm --name davao-property-finder -- start`, then `pm2 save` and `pm2 startup` so it survives a server reboot.
3. Visit your domain — you should see the home page rendering live neighborhood data from Supabase.

## Step 5 — automate redeploys with GitHub Actions

Hostry doesn't auto-detect pushes the way Vercel does, so wire up a simple SSH-deploy action. Add `.github/workflows/deploy.yml`:
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.HOSTRY_HOST }}
          username: ${{ secrets.HOSTRY_USER }}
          key: ${{ secrets.HOSTRY_SSH_KEY }}
          script: |
            cd davao-property-finder
            git pull
            npm install
            npm run build
            pm2 restart davao-property-finder
```
Add `HOSTRY_HOST`, `HOSTRY_USER`, and `HOSTRY_SSH_KEY` (a private key with access to the server) as GitHub repo secrets. Every push to `main` now rebuilds and restarts the app.

## Step 6 — post-launch checklist

Point your domain's DNS A record at the Hostry server IP, confirm `robots.ts`/`sitemap.ts` are reachable at `/robots.txt` and `/sitemap.xml`, submit the sitemap to Google Search Console, and set up basic uptime monitoring (even a free tier like UptimeRobot) so you find out about a crashed pm2 process before your users do.

## If you reconsider Hostry

Given that this app leans on Next.js's SSR and API routes (not a static site), a managed platform removes most of Steps 3-5 entirely: connect the GitHub repo to Vercel, set the same environment variables in its dashboard, and every push to `main` deploys automatically with zero server management. Worth a try on the free tier before committing to the VPS path, especially while you're still iterating on features.
