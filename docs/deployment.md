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
```

Pull requests only run `ci.yml`. The deploy workflow can also be started by hand from the Actions
tab (`workflow_dispatch`); started on any branch other than `dev`, it runs CI only.

If the new containers do not become healthy within 180 s, `deploy.sh` prints their status and
logs, rolls back to the previously deployed tag and fails the job.

| File | Purpose |
|---|---|
| `.github/workflows/ci.yml` | Tests and lint; runs on PRs and is called by `deploy.yml` |
| `.github/workflows/deploy.yml` | CI → build and push images → deploy over Tailscale SSH |
| `deploy/docker-compose.prod.yml` | Production stack: postgres, backend, frontend on `127.0.0.1:${WEB_PORT}` |
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

## Operations

```bash
ssh deploy@vivid-learn                       # over Tailscale SSH
cd /opt/vivid-learn
cat .deployed-tag                            # sha currently running
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
