# Running CalcFlow on the prodesk

The shape of it: the laptop pushes to `main`, a systemd timer on the server
notices within two minutes, pulls, rebuilds the image and swaps the container.
Nothing listens for a webhook — the server has no public address, it is only on
the tailnet, so it asks GitHub rather than waiting to be told.

Everything below is one-time except the last section.

## 1. Give the server read access to the repo

The repo is private, so the checkout needs a key of its own. On the **server**:

```bash
ssh-keygen -t ed25519 -C 'prodesk deploy' -f ~/.ssh/calcflow_deploy -N ''
cat ~/.ssh/calcflow_deploy.pub
```

Paste that into GitHub → the CalcFlow repo → Settings → Deploy keys → Add deploy
key. Leave **Allow write access** off: the server only ever reads.

Then point git at it:

```bash
cat >> ~/.ssh/config <<'EOF'

Host github.com
  IdentityFile ~/.ssh/calcflow_deploy
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config
ssh -T git@github.com   # "successfully authenticated" — it still says no shell access
```

## 2. Clone it where the unit expects it

```bash
sudo mkdir -p /srv && sudo chown "$USER:$USER" /srv
git clone git@github.com:stijnapp/CalcFlow.git /srv/calcflow
cd /srv/calcflow
```

The container runs as uid 1000 and bind-mounts `./data`, so the checkout wants
to belong to uid 1000 as well — `id -u` should say 1000. If it says something
else, either run the deploy as the user who is 1000 or add `user: "$(id -u)"`
to the service in `compose.yaml`, or the database file comes back owned by
somebody who cannot write it.

You also need to be able to talk to Docker without sudo, because the timer will
not be typing a password:

```bash
sudo usermod -aG docker "$USER"   # log out and back in
```

## 3. Set the token and start it once by hand

```bash
cp .env.example .env
openssl rand -base64 24            # paste into CALCFLOW_TOKEN=
docker compose up -d --build
curl -s localhost:8787/api/health  # {"ok":true}
```

The same token goes on every device under Settings → Sync. Without it the app
still works — everything is local first — it just never syncs.

## 4. Put it on the tailnet with a certificate

Chrome will not offer to install a PWA over plain http, and the service worker
needs a secure origin, so this is not optional if you want the app installed:

```bash
sudo tailscale serve --bg --https=443 http://localhost:8787
tailscale serve status
```

The app then lives at `https://prodesk.<your-tailnet>.ts.net`. The container
itself stays bound to `127.0.0.1:8787` and is never reachable from the LAN.

## 5. Turn on the deploy timer

```bash
sudo cp /srv/calcflow/deploy/calcflow-deploy.service /etc/systemd/system/
sudo cp /srv/calcflow/deploy/calcflow-deploy.timer   /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now calcflow-deploy.timer
```

`calcflow-deploy.service` runs as `User=stijn`. Change that line if the account
on the server is called something else.

Check it:

```bash
systemctl list-timers calcflow-deploy.timer   # when it next fires
journalctl -u calcflow-deploy -f              # what it did
sudo systemctl start calcflow-deploy.service  # run one now
```

## Day to day

Push to main from the laptop and walk away; it is live within two minutes.

If you would rather not wait, deploy on the spot — the timer and a manual run
take a lock, so it does not matter if they collide:

```bash
git config alias.ship '!git push origin main && ssh prodesk /srv/calcflow/deploy/deploy.sh'
git ship
```

### What a deploy does

`deploy/deploy.sh`, in order: fetch; stop if `main` has not moved; hard-reset
the checkout; `docker compose up -d --build`; wait for the container's own
HEALTHCHECK to pass; prune images older than a week.

It backs out on its own in the two ways a deploy goes wrong:

- **the build fails** — the running container was never touched, so the old app
  keeps serving, and the checkout goes back to the commit it was on.
- **the build succeeds and the container will not come up** — 90 seconds of
  unhealthy, then it logs the last 40 lines, resets to the previous commit and
  rebuilds that. This is the case worth having: a container that dies on its
  first import is indistinguishable from a good deploy until someone opens the
  app.

Either way it exits non-zero, so `systemctl status calcflow-deploy` and the
journal say so — and it writes the bad sha to `.deploy-failed` and refuses to
try that commit again, because a commit that fails once fails the same way in
two minutes and the retry is a full image build each time. Push a fix and it
picks straight up; to retry the same commit after changing something on the
server, `CALCFLOW_FORCE=1 ./deploy/deploy.sh`.

### Migrations

From the first deploy on, the database on the server is the only copy of the
attempt log that survives a reinstalled phone. `migrate()` in
`apps/server/src/db.ts` is forwards-only and every step must carry the existing
rows across — see the comment there. The same goes for the IndexedDB store in
`apps/web/src/state/db.ts`.

One exception, and it can only ever fire once: a database still numbered below
`user_version = 3` was written while the app was being built, and the steps that
used to carry those forward are gone. Opening one rebuilds it empty. If this
machine is already holding a `data/calcflow.db` from back then, that is what the
first deploy does to it — copy it aside first if you want to keep looking at it.

### Backing up the log

`data/` is a plain directory in the checkout, which is the point of it being a
bind mount rather than a named volume. It is WAL-mode SQLite, so copy it with
sqlite rather than `cp`:

```bash
sqlite3 /srv/calcflow/data/calcflow.db ".backup '/srv/backups/calcflow-$(date +%F).db'"
```

### If it all goes wrong

```bash
cd /srv/calcflow
docker compose logs -f app
docker compose down && docker compose up -d --build
git reset --hard <good-sha> && docker compose up -d --build   # pin an old build
```

A pinned checkout stays pinned for two minutes — the timer will fast-forward it
back to `main` on its next run. Stop the timer first if you want it to stay:
`sudo systemctl stop calcflow-deploy.timer`.
