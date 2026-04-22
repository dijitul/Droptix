# Deploying Droptix to CyberPanel

Target: CyberPanel (OpenLiteSpeed) on Linux, Node LTS 22, Postgres 16, Redis 7.
Fronted by Cloudflare for CDN, WAF, and image optimisation.

## 1. One-time server prep

### Install Node 22 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # v22.x
```

### Install pnpm + PM2

```bash
sudo corepack enable
sudo corepack prepare pnpm@9.12.0 --activate
sudo npm install -g pm2
pm2 startup    # follow the printed instructions to run pm2 on boot
```

### Database — reuse the existing CyberPanel MariaDB

CyberPanel ships with MariaDB. We create a **new database** (`droptix_new`)
alongside the legacy one and reuse the server-level credentials pattern.
Do NOT touch the legacy DB — keep it as a read-only reference.

```bash
# Using the existing root or cyberpanel-managed MariaDB user:
mysql -u root -p <<SQL
CREATE DATABASE droptix_new CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Option A: reuse the existing 'droptix' user (same password as legacy script)
GRANT ALL PRIVILEGES ON droptix_new.* TO 'droptix'@'localhost';
-- Option B: new dedicated user (recommended for cleanliness):
-- CREATE USER 'droptix_new'@'localhost' IDENTIFIED BY '<strong secret>';
-- GRANT ALL PRIVILEGES ON droptix_new.* TO 'droptix_new'@'localhost';
FLUSH PRIVILEGES;
SQL
```

Final `DATABASE_URL` on the server:
`mysql://droptix:<PASSWORD>@127.0.0.1:3306/droptix_new`

### Install Redis

```bash
sudo apt install -y redis-server
sudo systemctl enable --now redis-server
```

## 2. Create the CyberPanel website

1. Log into CyberPanel → **Websites → Create Website**
2. Domain: `staging.droptix.co.uk` (keep the old Laravel script on the apex domain until cutover)
3. PHP: None required; Droptix is pure Node
4. SSL: Issue Let's Encrypt
5. Note the document root (typically `/home/staging.droptix.co.uk/public_html`)

## 3. Proxy rules in OpenLiteSpeed

Edit the vhost config so `/` proxies to the Node process listening on 127.0.0.1:3000.
In CyberPanel → **Websites → list → rewrite rules**:

```
RewriteEngine On
# Proxy everything to local Node
RewriteCond %{REQUEST_URI} !^/.well-known/
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
```

Or, cleaner: use OpenLiteSpeed's **External App** (type = Web Server) pointing at
`http://127.0.0.1:3000`, and set it as the vhost's default handler.

## 4. Check out the app

```bash
sudo su - cyberpanel-user      # whichever user owns the vhost
cd /home/staging.droptix.co.uk
git clone git@github.com:dijitul/Droptix.git droptix
cd droptix

cp .env.example .env.production
# edit secrets (DATABASE_URL, AUTH_SECRET, INTEGRATIONS_ENCRYPTION_KEY)
# generate them: openssl rand -base64 32

pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:migrate:deploy
pnpm db:seed
pnpm build
```

## 5. Start under PM2

```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
```

Verify: `curl http://127.0.0.1:3000/api/health` should return `{"status":"ok",...}`.

## 6. Cloudflare proxying

- Add `staging.droptix.co.uk` as an orange-clouded A record pointing at the CyberPanel IP
- **SSL/TLS → Full (strict)** (we already issued LE on the origin)
- **Rules → Page Rules**: cache `*.droptix.co.uk/*.{css,js,woff2,avif,webp,svg}` edge TTL 1 month
- **Images** product enabled for CDN resizing (replaces Imgproxy)

## 7. GitHub Actions secrets

Set under repo **Settings → Environments → staging**:

- `CYBERPANEL_HOST` — server IP or hostname
- `CYBERPANEL_USER` — SSH user that owns the vhost
- `CYBERPANEL_APP_DIR` — absolute path to the checkout
- `CYBERPANEL_SSH_KEY` — private key authorised to push
- `CYBERPANEL_KNOWN_HOSTS` — output of `ssh-keyscan <host>`

Pushes to `main` now redeploy automatically.

## 8. Cutover to apex (later)

When Phase 3 ships and we're ready to replace the old Laravel:

1. Create a CyberPanel website for `droptix.co.uk` (apex)
2. Point its proxy rule at `127.0.0.1:3000` (same Node process)
3. Update Cloudflare DNS so apex + www hit the new vhost
4. Archive the Laravel vhost; keep the DB dump for data migration
