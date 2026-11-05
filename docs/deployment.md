# Deployment

Every push to `dev` runs CI, builds the frontend and backend images, pushes them to GHCR and rolls
them out on the server over Tailscale. The app is published at https://dev-datn.nhnhn.cloud through
Cloudflare and Nginx Proxy Manager, and also with Tailscale Funnel.
`main` is reserved for production and does not deploy yet.

```
push dev ─▶ ci (frontend test+build, backend ruff+pytest)
          ─▶ build (ghcr.io/nhnnhnnnhn/datn-{frontend,backend}:<sha>, :latest)
          ─▶ deploy: runner joins the tailnet as tag:ci (ephemeral)
                     ─ Tailscale SSH ─▶ server: docker compose pull && up --wait
internet ─▶ https://dev-datn.nhnhn.cloud (Cloudflare) ─▶ :443 NPM ─▶ vivid-learn-frontend:80 ─┐
internet ─▶ https://<server>.<tailnet>.ts.net (Funnel) ─▶ 127.0.0.1:8080 frontend (nginx) ◀─┘
                                                            └─ /api/ ─▶ backend:8000 ─▶ db
internet ─▶ db.nhnhn.cloud:2101 (DNS only, router port forward) ─▶ :15432 db (TLS required)
internet ─▶ <server>.<tailnet>.ts.net:10000 (Funnel, raw TCP) ─▶ 127.0.0.1:15432 db
```

Pull requests only run `ci.yml`. The deploy workflow can also be started by hand from the Actions
tab (`workflow_dispatch`); started on any branch other than `dev`, it runs CI only.

If the new containers do not become healthy within 180 s, `deploy.sh` prints their status and
logs, rolls back to the previously deployed tag and fails the job.

| File | Purpose |
|---|---|
| `.github/workflows/ci.yml` | Tests and lint; runs on PRs and is called by `deploy.yml` |
| `.github/workflows/deploy.yml` | CI → build and push images → deploy over Tailscale SSH |
| `deploy/docker-compose.prod.yml` | Production stack: postgres on `:${DB_PORT}` (TLS only), backend, frontend on `127.0.0.1:${WEB_PORT}` and the NPM network |
| `deploy/deploy.sh` | Runs on the server: pull, `up --wait`, record the tag, prune |
| `deploy/pg_hba.conf` | Postgres client auth: TCP connections must use TLS and a password |
| `deploy/.env.example` | Template for the server's `.env` |

## One-time setup

### 1. Tailscale admin console

1. **Access controls** — add the tags, let `tag:ci` SSH into the server as the deploy user, and
   allow Funnel on the server:

   ```jsonc
   {
     "tagOwners": {
       "tag:ci": ["autogroup:admin"],
       "tag:server": ["autogroup:admin"]
     },
     "grants": [
       { "src": ["tag:ci"], "dst": ["tag:server"], "ip": ["22"] }
     ],
     "ssh": [
       { "action": "accept", "src": ["tag:ci"], "dst": ["tag:server"], "users": ["deploy"] }
     ],
     "nodeAttrs": [
       { "target": ["tag:server"], "attr": ["funnel"] }
     ]
   }
   ```

   Merge these into the existing policy; keep your own rules for team members. If the policy still
   uses `acls` instead of `grants`, use
   `{ "action": "accept", "src": ["tag:ci"], "dst": ["tag:server:22"] }`.
2. **DNS** — enable MagicDNS and HTTPS certificates (required by Funnel).
3. **Settings → OAuth clients** — create a client with the `auth_keys` (write) scope and tag
   `tag:ci`. Keep the client ID and secret for step 3.

### 2. Server (Linux with Docker)

```bash
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG docker deploy

curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --ssh --advertise-tags=tag:server --hostname=vivid-learn

sudo mkdir -p /opt/vivid-learn && sudo chown deploy:deploy /opt/vivid-learn
sudo -u deploy cp deploy/.env.example /opt/vivid-learn/.env   # or paste the template
sudo -u deploy nano /opt/vivid-learn/.env                      # fill POSTGRES_PASSWORD, SECRET_KEY, ...
sudo chmod 600 /opt/vivid-learn/.env

sudo tailscale funnel --bg 8080
tailscale funnel status
```

`--bg` makes the Funnel config persist across reboots. Use the same port as `WEB_PORT` in `.env`.
`POSTGRES_PASSWORD` must be URL-safe (`openssl rand -hex 32`) because it is embedded in
`DATABASE_URL`, and it is only read when the database volume is first created.

### 3. GitHub repository settings

**Settings → Secrets and variables → Actions**

| Kind | Name | Value |
|---|---|---|
| Secret | `TS_OAUTH_CLIENT_ID` | Tailscale OAuth client ID |
| Secret | `TS_OAUTH_SECRET` | Tailscale OAuth client secret |
| Variable | `DEPLOY_HOST` | Server's MagicDNS name, e.g. `vivid-learn` |
| Variable | `DEPLOY_USER` | `deploy` |
| Variable | `DEPLOY_PATH` | `/opt/vivid-learn` |
| Variable | `APP_URL` | `https://vivid-learn.<tailnet>.ts.net` |
| Variable | `VITE_USE_MOCK` | `true` (default) until the backend API is ready, then `false` |

`VITE_USE_MOCK` is baked into the frontend image at build time, so changing it takes effect on the
next deploy. Optionally add required reviewers to the `dev` environment
(**Settings → Environments**) to gate deploys.

Images are pushed with the workflow's `GITHUB_TOKEN`, and the server logs in to GHCR with that same
short-lived token on every deploy, so no personal access token is stored anywhere.

## Custom domain (Cloudflare + Nginx Proxy Manager)

`dev-datn.nhnhn.cloud` goes through Cloudflare to Nginx Proxy Manager (NPM), which runs in Docker on
the same server. NPM cannot reach the frontend's `127.0.0.1` port from its container, so the
frontend also joins NPM's Docker network under the name `vivid-learn-frontend`.

1. **Server**: NPM's network defaults to `nginx_default` (the network of `nginx-app-1` on
   `mgmt01`). If NPM moves, set `PROXY_NETWORK` in `.env` to the new one:

   ```bash
   docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' <npm container>
   ```

   Running the stack where that network does not exist (e.g. a local test) needs
   `docker network create nginx_default` first.
2. **Cloudflare DNS**: `A dev-datn → <server's public IP>`, Proxied. SSL/TLS mode **Full
   (strict)**.
3. **NPM → Proxy Hosts → Add**: domain `dev-datn.nhnhn.cloud`, scheme `http`, forward host
   `vivid-learn-frontend`, port `80`, Block Common Exploits on. SSL tab: request a Let's Encrypt
   certificate with **Use a DNS Challenge → Cloudflare** (an API token with `Zone → DNS → Edit` on
   the zone), because port 80 is not forwarded to the server. Force SSL on.
4. **GitHub**: set the `APP_URL` variable to `https://dev-datn.nhnhn.cloud`.

The database cannot go through Cloudflare's proxy (it carries only HTTP(S); raw TCP needs
Spectrum), so `db.nhnhn.cloud` is DNS only; see below.

## Remote database access

Postgres listens on host port 15432 on all interfaces and accepts TCP connections only over TLS
with a password (`deploy/pg_hba.conf`); the backend connects with `sslmode=require` too. Two ways in
from outside the tailnet:

- **`db.nhnhn.cloud:2101`** (main): a DNS-only Cloudflare record (`CNAME db → nhnhn.cloud`, grey
  cloud) to the home IP, and the router forwards TCP 2101 to `192.168.20.2:15432`. Any Postgres
  client works with a plain `sslmode=require`.
- **`mgmt01.tail39b71.ts.net:10000`** (backup): Tailscale Funnel. Funnel relays pick the node from
  the TLS SNI, so clients must use `sslnegotiation=direct` (Postgres 17+ protocol).

Port 2101 is open to the whole internet and will be scanned: keep every password long and random,
and restrict the router rule to known source IPs when possible.

### Server, once (before merging a deploy that enables SSL)

The `db` service fails to start without the certificate, so create it first. The certificate
names every host clients use.

```bash
cd /opt/vivid-learn
sudo mkdir -p certs
sudo openssl req -x509 -newkey rsa:4096 -nodes -days 3650 \
  -subj "/CN=db.nhnhn.cloud" \
  -addext "subjectAltName=DNS:db.nhnhn.cloud,DNS:mgmt01.tail39b71.ts.net" \
  -keyout certs/server.key -out certs/server.crt
sudo chown 999:999 certs/server.key certs/server.crt   # uid of postgres in the image
sudo chmod 600 certs/server.key

sudo tailscale funnel --bg --tcp=10000 tcp://localhost:15432
tailscale funnel status
```

The certificate is self-signed and valid for 10 years. `server.crt` is public: give it to every
client so they can verify the server (`sslmode=verify-full`). Never share `server.key`.

### One login per person

After the deploy, create a role for each person instead of sharing `vivid` (the app's owner role):

```bash
cd /opt/vivid-learn
IMAGE_TAG=$(cat .deployed-tag) docker compose -f docker-compose.prod.yml exec db psql -U vivid -d idioms
```

```sql
CREATE ROLE friend LOGIN PASSWORD '<openssl rand -hex 24>' CONNECTION LIMIT 5;
GRANT CONNECT ON DATABASE idioms TO friend;
GRANT USAGE ON SCHEMA public TO friend;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO friend;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO friend;
ALTER DEFAULT PRIVILEGES FOR ROLE vivid IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO friend;
ALTER DEFAULT PRIVILEGES FOR ROLE vivid IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO friend;
```

For read-only access grant only `SELECT`. Schema changes stay with Alembic migrations run by the
app. To revoke: `DROP OWNED BY friend; DROP ROLE friend;`. To close access for everyone: remove the
router rule and run `sudo tailscale funnel --tcp=10000 off`.

### Client settings

| Setting | Value |
|---|---|
| Host / port | `db.nhnhn.cloud` / `2101` |
| Database / user | `idioms` / the role created above |
| SSL | `sslmode=require`, or `sslmode=verify-full` with `sslrootcert=<path to server.crt>` |

```text
jdbc:postgresql://db.nhnhn.cloud:2101/idioms?sslmode=require
postgresql://friend:<password>@db.nhnhn.cloud:2101/idioms?sslmode=verify-full&sslrootcert=server.crt
```

Through Funnel instead: host `mgmt01.tail39b71.ts.net`, port `10000`, and add
`sslnegotiation=direct` (`sslNegotiation=direct` for JDBC). libpq-based clients need libpq 17 or
newer for that option.

## Operations

```bash
ssh deploy@vivid-learn                       # over Tailscale SSH
cd /opt/vivid-learn
cat .deployed-tag                            # sha currently running
export IMAGE_TAG=$(cat .deployed-tag)        # the compose file requires it for every command
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
IMAGE_TAG=<older sha> sh deploy.sh           # roll back to a previous build
```

Rolling back with an older sha works as long as that image still exists in GHCR (Packages tab of
the repository). The server's GHCR login comes from the last deploy and expires with its token; if
the pull is refused, run the `deploy` workflow once or `docker login ghcr.io` with a PAT that has
`read:packages`.

## Troubleshooting

| Symptom | Check |
|---|---|
| `tailscale/github-action` fails | OAuth client scope/tag, `tag:ci` in `tagOwners` |
| `ssh: ... Permission denied` / hangs | `ssh` rule for `tag:ci → tag:server` as `deploy`; server started with `--ssh` |
| `docker: permission denied` | `deploy` user is in the `docker` group (log in again after `usermod`) |
| `up --wait` times out | `docker compose -f docker-compose.prod.yml logs backend`; `.env` values |
| Domain returns 502 | NPM forward host `vivid-learn-frontend:80`; `docker network inspect $PROXY_NETWORK` lists the frontend |
| Domain returns 526 / 525 | NPM has a valid certificate for the domain; Cloudflare SSL mode is Full (strict) |
| Funnel URL does not load | `tailscale funnel status`; port matches `WEB_PORT`; `funnel` node attribute |
