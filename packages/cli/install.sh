#!/bin/sh
set -e

# Soma CLI installer
# Usage: curl -fsSL https://soma.example/install.sh | sh

REPO="REPLACE_ME/soma"   # GitHub repo hosting the release binaries
BINARY_NAME="soma"
INSTALL_DIR="$HOME/.local/bin"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RESET='\033[0m'
info() { printf "${CYAN}>${RESET} %s\n" "$1"; }
success() { printf "${GREEN}✓${RESET} %s\n" "$1"; }
warn() { printf "${YELLOW}!${RESET} %s\n" "$1"; }
error() { printf "${RED}✗${RESET} %s\n" "$1" >&2; exit 1; }

detect_platform() {
  OS=$(uname -s | tr '[:upper:]' '[:lower:]')
  ARCH=$(uname -m)
  case "$OS" in
    darwin) OS="darwin" ;;
    linux)  OS="linux" ;;
    *)      error "Unsupported OS: $OS" ;;
  esac
  case "$ARCH" in
    x86_64|amd64)  ARCH="x64" ;;
    aarch64|arm64) ARCH="arm64" ;;
    *)             error "Unsupported architecture: $ARCH" ;;
  esac
}

detect_platform
ASSET="${BINARY_NAME}-${OS}-${ARCH}"
URL="https://github.com/${REPO}/releases/latest/download/${ASSET}"

info "Downloading ${ASSET}…"
mkdir -p "$INSTALL_DIR"
curl -fsSL "$URL" -o "$INSTALL_DIR/$BINARY_NAME" || error "Download failed: $URL"
chmod +x "$INSTALL_DIR/$BINARY_NAME"
success "Installed to $INSTALL_DIR/$BINARY_NAME"

case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *) warn "Add $INSTALL_DIR to your PATH: export PATH=\"$INSTALL_DIR:\$PATH\"" ;;
esac
success "Run '${BINARY_NAME} --help' to get started."
