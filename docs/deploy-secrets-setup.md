# Deploy secrets — one-time setup

When you push to `main`, `.github/workflows/deploy.yml` SSHes into the
CyberPanel server, pulls, rebuilds, and reloads PM2. This doc is the
one-time prep that enables that flow.

## 1. On the CyberPanel server — create the app directory & user

```bash
# As the vhost owner (usually the cyberpanel-created user for staging.droptix.co.uk):
mkdir -p ~/apps/droptix
cd ~/apps/droptix
git clone https://github.com/dijitul/Droptix.git .
```

Install Node 22 + pnpm + PM2 (covered in `deploy-cyberpanel.md`).

## 2. Generate a dedicated deploy SSH key

On the CyberPanel server, as the vhost user:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/droptix_deploy -N "" -C "droptix-ci"
cat ~/.ssh/droptix_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Print the PRIVATE key — you'll paste this into GitHub Actions
cat ~/.ssh/droptix_deploy
```

## 3. Grab the server's public host key

```bash
# From your laptop (or any machine that can reach the server):
ssh-keyscan -t rsa,ecdsa,ed25519 <SERVER_IP_OR_HOSTNAME>
```

Copy the output — you'll need it as `CYBERPANEL_KNOWN_HOSTS`.

## 4. Add GitHub Actions secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**

| Name                   | Value                                                 |
|------------------------|-------------------------------------------------------|
| `CYBERPANEL_HOST`      | server IP or hostname (e.g. `staging.droptix.co.uk`)  |
| `CYBERPANEL_USER`      | vhost user that owns `~/apps/droptix`                 |
| `CYBERPANEL_APP_DIR`   | absolute path, e.g. `/home/staging.droptix.co.uk/apps/droptix` |
| `CYBERPANEL_SSH_KEY`   | the private key from step 2 (full file contents)      |
| `CYBERPANEL_KNOWN_HOSTS` | the `ssh-keyscan` output from step 3                |

## 5. First-time server bootstrap (before relying on auto-deploy)

On the server, from `~/apps/droptix`:

```bash
cp .env.example .env.production
# Edit .env.production and set:
#   DATABASE_URL=mysql://droptix:<PWD>@127.0.0.1:3306/droptix_new
#   AUTH_SECRET=<openssl rand -base64 32>
#   INTEGRATIONS_ENCRYPTION_KEY=<openssl rand -base64 32>
#   NEXT_PUBLIC_APP_URL=https://staging.droptix.co.uk
#   AUTH_URL=https://staging.droptix.co.uk

pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:push       # creates tables on droptix_new
pnpm db:seed
pnpm build
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup       # follow printed command to enable boot-start
```

## 6. OpenLiteSpeed proxy rule

CyberPanel → the staging vhost → **Manage → Rewrite Rules**:

```
RewriteEngine On
RewriteCond %{REQUEST_URI} !^/.well-known/
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
```

Or, cleaner: **External App** of type "Web Server" pointing at
`http://127.0.0.1:3000`, set as the vhost's default handler.

## 7. Test the pipeline

Any commit to `main` now triggers auto-deploy. Watch it under
**Actions** on GitHub. The deploy job is idempotent — you can re-run
it any time without data loss.

## What auto-deploy does on each push

1. SSH in as `CYBERPANEL_USER` to `CYBERPANEL_APP_DIR`
2. `git fetch --all && git reset --hard origin/main`
3. `pnpm install --frozen-lockfile`
4. `pnpm db:generate && pnpm db:migrate:deploy`
5. `pnpm build`
6. `pm2 reload droptix --update-env` (zero-downtime)

DB migrations run automatically. If you add a schema change, commit the
generated migration from `pnpm db:migrate` locally (or `db:push` on the
server once and move to migrations before prod traffic).
