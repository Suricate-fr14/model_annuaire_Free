#!/bin/sh
# Build pour l'hébergement mutualisé N0C (CloudLinux limite le nombre de processus et de fils par compte).
# Lancé sans npm (npm garde ses propres fils actifs pendant le build) et avec un seul fil par outil.
# Usage : sh scripts/build-n0c.sh   (le site en ligne peut rester démarré)
cd "$(dirname "$0")/.." || exit 1
export RAYON_NUM_THREADS=1 ROLLDOWN_WORKER_THREADS=1 ROLLDOWN_MAX_BLOCKING_THREADS=1 TOKIO_WORKER_THREADS=1
export UV_THREADPOOL_SIZE=1 GOMAXPROCS=1
# Restes éventuels d'un build interrompu (processus esbuild orphelins) : ils occupent des fils inutilement.
pkill -u "$(id -u)" -x esbuild 2>/dev/null
exec node --v8-pool-size=1 node_modules/astro/bin/astro.mjs build
