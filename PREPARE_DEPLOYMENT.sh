#!/bin/bash

###############################################################################
# JAEGER AI - Deployment Preparation Script (Next.js Edition)
#
# Langkah utama:
# 1. Validasi lingkungan (Node, npm, wrangler/vercel optional)
# 2. Opsional: menjalankan build Next.js (jika dependency sudah terinstal)
# 3. Membuat paket sumber "jaeger-web-next" untuk Cloudflare & Vercel
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

print_step() {
    echo -e "${CYAN}▶${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC}  $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   JAEGER AI - Deployment Preparation Tool            ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Root checks
if [ ! -d "web-next" ]; then
    print_error "web-next directory not found!"
    echo "Pastikan menjalankan script dari root repository."
    exit 1
fi

print_success "Found web-next directory"

echo ""
print_step "Step 1: Checking requirements"

if command -v node &> /dev/null; then
    print_success "Node.js detected: $(node --version)"
else
    print_warning "Node.js tidak ditemukan (diperlukan untuk build)"
fi

if command -v npm &> /dev/null; then
    print_success "npm detected: $(npm --version)"
else
    print_warning "npm tidak ditemukan"
fi

if command -v wrangler &> /dev/null; then
    print_success "Wrangler CLI detected: $(wrangler --version)"
else
    print_warning "Wrangler belum terpasang (opsional, gunakan: npm install -g wrangler)"
fi

if command -v vercel &> /dev/null; then
    print_success "Vercel CLI detected"
else
    print_warning "Vercel CLI belum terpasang (opsional, gunakan: npm install -g vercel)"
fi

echo ""
print_step "Step 2: Optional Next.js build"

if [ -d "web-next/node_modules" ]; then
    echo ""
    echo "📦 node_modules ditemukan, menjalankan build untuk verifikasi..."
    if npm run build --prefix web-next > web-next/.last-build.log 2>&1; then
        print_success "Next.js build completed (log: web-next/.last-build.log)"
    else
        print_warning "Build gagal. Periksa web-next/.last-build.log"
    fi
else
    print_warning "Dependency Next.js belum diinstal. Jalankan: npm install --prefix web-next"
fi

echo ""
print_step "Step 3: Creating deployment archives"

OUTPUT_VERCEL="jaeger-next-vercel.zip"
OUTPUT_CLOUDFLARE="jaeger-next-cloudflare.zip"

rm -f "$OUTPUT_VERCEL" "$OUTPUT_CLOUDFLARE"

zip_excludes=(
    "web-next/node_modules/*"
    "web-next/.next/cache/*"
    "web-next/.next/server/app/*"
    "web-next/.turbo/*"
    "web-next/dist/*"
    "web-next/.last-build.log"
    "web-next/.eslintcache"
)

zip -r "$OUTPUT_VERCEL" web-next \
    -x "*.DS_Store" "*.git*" "${zip_excludes[@]}" > /dev/null 2>&1
print_success "Created $OUTPUT_VERCEL ($(du -h "$OUTPUT_VERCEL" | cut -f1))"

cp "$OUTPUT_VERCEL" "$OUTPUT_CLOUDFLARE"
print_success "Created $OUTPUT_CLOUDFLARE ($(du -h "$OUTPUT_CLOUDFLARE" | cut -f1))"

cat <<SUMMARY

${CYAN}╔═══════════════════════════════════════════════════════╗${NC}
${CYAN}║              PREPARATION COMPLETE ✅                   ║${NC}
${CYAN}╚═══════════════════════════════════════════════════════╝${NC}

${GREEN}Generated packages:${NC}
  • $OUTPUT_VERCEL  → Upload ke Vercel (import project) atau jalankan di repo Git
  • $OUTPUT_CLOUDFLARE → Gunakan bersama next-on-pages + wrangler

${CYAN}Next steps${NC}
  1. Pastikan VPS MCP server siap (lihat MCP_SERVER_SETUP.md)
  2. Ikuti panduan Cloudflare/Vercel terbaru pada dokumentasi
  3. Set environment variable: NEXT_PUBLIC_MCP_URL / JAEGER_MCP_URL sesuai target
SUMMARY
