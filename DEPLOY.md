# Deploying Qkazi to an Ubuntu server

A single-server setup: Next.js (production build) kept alive by PM2, behind
nginx for TLS, with PostgreSQL on the same box. Good for launch / closed beta.
Scale-out notes are at the bottom.

> On one server you can keep **local file storage** (disk persists) and the
> **in-process realtime bus** (single process). You only need S3 + Redis when
> you run more than one app instance — see "Scaling beyond one server".

---

## 0. Prerequisites

- Ubuntu 22.04 / 24.04 server with **≥ 2 GB RAM** (the Next build is memory
  hungry; add swap on a 1 GB box — see step 1).
- A domain pointed at the server's IP (an `A` record for `qkazi.example.com`).
- SSH access as a sudo-capable user.

Replace `qkazi.example.com` and the `deploy` username throughout.

---

## 1. Server prep

```bash
# update + essentials
sudo apt update && sudo apt -y upgrade
sudo apt -y install git curl ufw

# firewall: SSH + HTTP + HTTPS only
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# (1 GB RAM only) add 2 GB swap so `next build` doesn't OOM
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Node 20 (via nodesource)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt -y install nodejs
node -v   # v20.x
sudo npm i -g pm2
```

### nginx + certbot

```bash
sudo apt -y install nginx
sudo apt -y install certbot python3-certbot-nginx
```

---

## 2. PostgreSQL

Two options. **Native** is leanest for a single box.

### Option A — native Postgres (recommended)

```bash
sudo apt -y install postgresql
sudo -u postgres psql <<'SQL'
CREATE USER qkazi WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
CREATE DATABASE qkazi OWNER qkazi;
SQL
```

`DATABASE_URL` becomes:
`postgresql://qkazi:CHANGE_ME_STRONG_PASSWORD@localhost:5432/qkazi?schema=public`

### Option B — Docker (matches your local compose)

Install Docker, then **edit `docker-compose.yml`** before bringing it up:

- change `POSTGRES_PASSWORD` off the `qkazi` default,
- bind the port to localhost only: `"127.0.0.1:5432:5432"` (never expose
  5432 to the internet).

```bash
docker compose up -d
```

---

## 3. Get the code + configure

```bash
sudo mkdir -p /var/www && sudo chown $USER:$USER /var/www
cd /var/www
git clone <your-repo-url> qkazi   # or rsync your local folder up
cd qkazi

cp .env.example .env
nano .env
```

Fill `.env` for production. The **must-haves**:

```env
APP_URL="https://qkazi.example.com"        # used for emails + Pesapal IPN + OAuth redirect
DATABASE_URL="postgresql://qkazi:STRONG_PW@localhost:5432/qkazi?schema=public"
JWT_SECRET="$(openssl rand -base64 32)"     # paste the generated value
DEFAULT_CURRENCY="KES"
```

Then the integrations you're enabling (each is optional but unlocks a feature):

```env
RESEND_API_KEY="..."        RESEND_FROM="Qkazi <no-reply@yourdomain.com>"  # verify the domain in Resend!
GOOGLE_CLIENT_ID="..."      GOOGLE_CLIENT_SECRET="..."   # redirect URI: https://qkazi.example.com/api/auth/google/callback
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="..."        # add your domain to the key's HTTP-referrer allowlist
PESAPAL_ENV="production"    PESAPAL_CONSUMER_KEY="..."   PESAPAL_CONSUMER_SECRET="..."
```

> **`NEXT_PUBLIC_*` is baked in at build time.** The `.env` must contain the
> Maps key *before* you run `npm run build`, or the map/autocomplete won't work
> in the bundle.

Storage / Redis: leave `S3_BUCKET` and `REDIS_URL` blank for a single server
(local disk + in-process bus). Set them only if you scale out.

---

## 4. Install, migrate, build

```bash
npm ci                     # clean install from package-lock
npm run db:migrate -- --skip-generate || npx prisma migrate deploy
npx prisma generate
npm run db:seed            # seed the 14 categories
npm run build              # production build (this is the memory-hungry step)
```

Use `prisma migrate deploy` (not `migrate dev`) in production — it applies
committed migrations without prompting.

---

## 5. Run it with PM2

`ecosystem.config.js` is in the repo. Edit its `cwd` to `/var/www/qkazi`, then:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup        # run the command it prints, to start on boot
pm2 logs qkazi     # tail logs
```

The app is now on `127.0.0.1:3000` (not public yet).

---

## 6. nginx + HTTPS

```bash
sudo cp deploy/nginx-qkazi.conf /etc/nginx/sites-available/qkazi
sudo sed -i 's/qkazi.example.com/YOURDOMAIN/' /etc/nginx/sites-available/qkazi
sudo ln -s /etc/nginx/sites-available/qkazi /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# issue + auto-renew the TLS cert (rewrites the config to add 443 + redirect)
sudo certbot --nginx -d YOURDOMAIN
```

The nginx config already disables buffering on the SSE routes so live offers
and chat stream correctly through the proxy.

Visit `https://YOURDOMAIN` — you should see the homepage. The JWT cookie is
`Secure` in production, which is why HTTPS is required for login to work.

---

## 7. Create your admin + smoke test

```bash
# after registering through the UI, promote yourself:
sudo -u postgres psql -d qkazi \
  -c "UPDATE \"User\" SET role='ADMIN' WHERE email='you@example.com';"
# (Docker option B: docker exec -it qkazi-postgres psql -U qkazi -d qkazi -c "...")
```

Then run the full loop from the local testing guide: register → verify →
onboard a tasker → admin-approve → post a task → bid → accept → pay (Pesapal
live) → complete → review → request payout → admin marks paid.

**Pesapal IPN:** the first checkout auto-registers `https://YOURDOMAIN/api/webhooks/pesapal`
with Pesapal. Confirm it appears in your Pesapal dashboard. (No more ngrok —
the public HTTPS URL is real now.)

---

## 8. Redeploying after changes

```bash
cd /var/www/qkazi
git pull
npm ci
npx prisma migrate deploy        # apply any new migrations
npm run build
pm2 reload qkazi                 # zero-downtime-ish reload
```

Consider scripting this as `deploy/update.sh`.

---

## Backups (do this before real users)

```bash
# nightly DB dump via cron
sudo -u postgres bash -c 'pg_dump qkazi | gzip > /var/backups/qkazi-$(date +\%F).sql.gz'
```

If using local file storage, also back up `/var/www/qkazi/public/uploads`.

---

## Hardening checklist

- [ ] Strong `JWT_SECRET` and DB password (not the `qkazi` default).
- [ ] `next` is on a patched release. `package.json` pins `14.2.18`, which has
      a published advisory — `npm i next@14` to get the latest 14.2.x patch,
      re-test, redeploy.
- [ ] Postgres bound to `localhost` only (native is by default; Docker needs
      the `127.0.0.1:` prefix on the port mapping).
- [ ] Verified email-sending domain in Resend (SPF/DKIM) or mail lands in spam.
- [ ] Add an error monitor (Sentry) — see the "is it production-ready" notes.
- [ ] Rate-limit `/api/auth/*` and `/api/payments/start` (nginx `limit_req` or
      app middleware).

---

## Scaling beyond one server

The moment you run **2+ app instances** (PM2 cluster mode, multiple droplets
behind a load balancer, autoscaling):

1. **File storage** → set `S3_BUCKET` + creds (`saveImage` switches to S3,
   IDs served through the signed-URL proxy automatically).
2. **Realtime** → set `REDIS_URL` (the SSE bus switches from in-process Map to
   Redis pub/sub, so events fan out across instances).
3. **DB connections** → put PgBouncer (or Prisma Accelerate) in front of
   Postgres so the instances don't exhaust the connection pool.
4. **Sticky sessions** are NOT required once Redis is in place.

No code changes needed for any of these — they're all env-driven.
