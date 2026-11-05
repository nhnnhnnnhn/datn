# Deployment

Every push to `dev` runs CI, builds the frontend and backend images, pushes them to GHCR and rolls
them out on the server over Tailscale. The app is published to the internet with Tailscale Funnel.
`main` is reserved for production and does not deploy yet.

```
push dev ─▶ ci (frontend test+build, backend ruff+pytest)
          ─▶ build (ghcr.io/nhnnhnnnhn/datn-{frontend,backend}:<sha>, :latest)
          ─▶ deploy: runner joins the tailnet as tag:ci (ephemeral)
                     ─ Tailscale SSH ─▶ server: docker compose pull && up --wait
internet ─▶ https://<server>.<tailnet>.ts.net (Funnel) ─▶ 127.0.0.1:8080 frontend (nginx)
                                                            └─ /api/ ─▶ backend:8000 ─▶ db
internet ─▶ <server>.<tailnet>.ts.net:10000 (Funnel, raw TCP) ─▶ 127.0.0.1:15432 db (TLS required)
```

Pull requests only run `ci.yml`. The deploy workflow can also be started by hand from the Actions
tab (`workflow_dispatch`); started on any branch other than `dev`, it runs CI only.

If the new containers do not become healthy within 180 s, `deploy.sh` prints their status and
logs, rolls back to the previously deployed tag and fails the job.

| File | Purpose |
|---|---|
| `.github/workflows/ci.yml` | Tests and lint; runs on PRs and is called by `deploy.yml` |
| `.github/workflows/deploy.yml` | CI → build and push images → deploy over Tailscale SSH |
| `deploy/docker-compose.prod.yml` | Production stack: postgres on `127.0.0.1:${DB_PORT}` (TLS), backend, frontend on `127.0.0.1:${WEB_PORT}` |
| `deploy/deploy.sh` | Runs on the server: pull, `up --wait`, record the tag, prune |
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

## Remote database access

People outside the tailnet connect straight to Postgres through Funnel on TCP port 10000. Funnel
relays pick the destination node from the TLS SNI, so a connection must open with a TLS handshake:
clients use `sslnegotiation=direct` (Postgres 17+ protocol), and Postgres terminates TLS itself
with its own certificate. Plain-text connections cannot reach the server through Funnel at all.

### Server, once (before merging a deploy that enables SSL)

The `db` service fails to start without the certificate, so create it first. Replace the host
name with the server's MagicDNS name.

```bash
cd /opt/vivid-learn
HOST=mgmt01.tail39b71.ts.net
sudo mkdir -p certs
sudo openssl req -x509 -newkey rsa:4096 -nodes -days 3650 \
  -subj "/CN=$HOST" -addext "subjectAltName=DNS:$HOST" \
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
app. To revoke: `DROP OWNED BY friend; DROP ROLE friend;`. To close the port for everyone:
`sudo tailscale funnel --tcp=10000 off`.

### Client settings

| Setting | Value |
|---|---|
| Host / port | `mgmt01.tail39b71.ts.net` / `10000` |
| Database / user | `idioms` / the role created above |
| SSL | `sslmode=verify-full`, `sslrootcert=<path to server.crt>`, `sslnegotiation=direct` |

```bash
psql "host=mgmt01.tail39b71.ts.net port=10000 dbname=idioms user=friend sslmode=verify-full sslrootcert=server.crt sslnegotiation=direct"
```

```text
postgresql://friend:<password>@mgmt01.tail39b71.ts.net:10000/idioms?sslmode=verify-full&sslrootcert=server.crt&sslnegotiation=direct
```

- `psql`, psycopg and other libpq-based clients need libpq 17 or newer (older ones reject
  `sslnegotiation`).
- DBeaver and other JDBC clients: driver properties `sslmode=verify-full`,
  `sslrootcert=<path>`, `sslNegotiation=direct`.

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
| Funnel URL does not load | `tailscale funnel status`; port matches `WEB_PORT`; `funnel` node attribute |
