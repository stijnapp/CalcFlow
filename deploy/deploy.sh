#!/usr/bin/env bash
#
# Pulls main and restarts the container if anything moved. Safe to run on a
# timer: when nothing has changed it does a network round trip and exits.
#
# What it deliberately does not do is `git clean`. The two things on the server
# that are not in the repo are the ones that matter — `.env` holds the sync
# token and `data/` holds the attempt log — and both are gitignored, which is
# exactly the set `git clean -x` would delete.

set -euo pipefail

REPO="${CALCFLOW_REPO:-/srv/calcflow}"
BRANCH="${CALCFLOW_BRANCH:-main}"
# How long the new container gets to report healthy before it is called a
# failure. The image builds the web app first, so this is only boot time.
TIMEOUT="${CALCFLOW_TIMEOUT:-90}"

log() { printf '%s  %s\n' "$(date +'%Y-%m-%d %H:%M:%S')" "$*"; }

# Everything is in a function and called at the bottom, which is not a style
# choice. `git reset --hard` below rewrites this very file, and bash reads a
# script lazily as it runs — so the second half of the run would come off a
# file that changed underneath it. A function body has to be parsed whole
# before it can be called, so by the time any of this executes, none of it is
# still on disk.
main() {
  cd "$REPO"

  # The timer and an impatient `ssh prodesk deploy.sh` can land together, and
  # two `docker compose up --build` runs on one project is a fight over the
  # same container. The second waits; by then there is usually nothing to do.
  exec 9>"$REPO/.deploy.lock"
  flock 9

  git fetch --quiet origin "$BRANCH"
  local was now failed
  was="$(git rev-parse HEAD)"
  now="$(git rev-parse "origin/$BRANCH")"

  if [ "$was" = "$now" ] && [ -z "${CALCFLOW_FORCE:-}" ]; then
    log "up to date at ${was:0:8}"
    return 0
  fi

  # A commit that failed once will fail the same way in two minutes, and trying
  # it again means a full image build every time the timer fires. So it is
  # tried once and then left alone until main moves again — or until someone
  # says otherwise with CALCFLOW_FORCE=1, the knob for "I fixed it by hand".
  failed="$REPO/.deploy-failed"
  if [ -z "${CALCFLOW_FORCE:-}" ] && [ "$now" = "$(cat "$failed" 2>/dev/null)" ]; then
    log "skipping ${now:0:8}: it already failed — push a fix, or CALCFLOW_FORCE=1 to retry"
    return 0
  fi

  log "deploying ${was:0:8} → ${now:0:8}"
  git -c advice.detachedHead=false reset --hard --quiet "$now"
  git --no-pager log --oneline "$was..$now" 2>/dev/null | sed 's/^/    /' || true

  # A failed build leaves the running container alone, which is the right
  # outcome: the old app keeps working and the next commit tries again.
  if ! docker compose up -d --build; then
    log "BUILD FAILED — checkout back to ${was:0:8}; the old container is still serving"
    echo "$now" > "$failed"
    git reset --hard --quiet "$was"
    return 1
  fi

  # The image declares a HEALTHCHECK, so "did it actually come up" is a
  # question with an answer. Worth asking: a container that builds and then
  # dies on its first import looks exactly like a good deploy from out here.
  local deadline cid state
  deadline=$(( SECONDS + TIMEOUT ))
  while :; do
    cid="$(docker compose ps -q app)"
    state="$(docker inspect -f '{{.State.Status}}:{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid" 2>/dev/null || echo 'gone:none')"
    case "$state" in
      running:healthy) log "healthy at ${now:0:8}"; break ;;
      running:none)    log "running at ${now:0:8} (no healthcheck)"; break ;;
      *)
        if [ "$SECONDS" -ge "$deadline" ]; then
          log "UNHEALTHY after ${TIMEOUT}s (state: $state) — rolling back to ${was:0:8}"
          docker compose logs --tail 40 app || true
          echo "$now" > "$failed"
          git reset --hard --quiet "$was"
          docker compose up -d --build
          return 1
        fi
        sleep 3 ;;
    esac
  done

  rm -f "$failed"
  # Every deploy builds a new image and orphans the last one. Without this the
  # disk fills up quietly and the failure arrives weeks later as a failed build.
  docker image prune -f --filter 'until=168h' >/dev/null || true
}

main "$@"
