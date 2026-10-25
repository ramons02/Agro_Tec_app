#!/usr/bin/env bash
# Lighthouse mobile (spec 027, SC-006) contra o build de produção em `vite preview`.
# Uso: scripts/responsivo/lighthouse.sh <pasta-de-saida> [rota ...]
# Telas internas exigem sessão: informe TOKEN e PAPEL (de um login local) nas variáveis de ambiente.
set -euo pipefail
SAIDA="${1:?informe a pasta de saida}"; shift || true
ROTAS=("${@:-/login}")
PORTA=4173
mkdir -p "$SAIDA"
bun run build >/dev/null
bunx vite preview --port "$PORTA" --strictPort >/dev/null 2>&1 &
PREVIEW=$!
trap 'kill $PREVIEW 2>/dev/null || true' EXIT
sleep 3
for ROTA in "${ROTAS[@]}"; do
  NOME="$(echo "$ROTA" | tr '/' '_')"
  bunx lighthouse "http://localhost:$PORTA$ROTA" \
    --form-factor=mobile --throttling-method=simulate \
    --only-categories=performance --disable-storage-reset \
    --chrome-flags="--headless=new --no-sandbox" \
    --output=json --output-path="$SAIDA/lighthouse$NOME.json" --quiet
  bun -e "const r=JSON.parse(require('fs').readFileSync('$SAIDA/lighthouse$NOME.json','utf8'));console.log('$ROTA','desempenho',Math.round(r.categories.performance.score*100),'CLS',r.audits['cumulative-layout-shift'].numericValue.toFixed(3))"
done
