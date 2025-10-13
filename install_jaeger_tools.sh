#!/usr/bin/env bash
set -euo pipefail

sudo apt-get update
sudo apt-get install -y wget curl git build-essential unzip python3-pip golang

# Ensure PATH exports remain consistent
if ! grep -q '.cargo/env' "$HOME/.bashrc"; then
  echo 'source "$HOME/.cargo/env"' >> "$HOME/.bashrc"
fi
if ! grep -q '$HOME/go/bin' "$HOME/.bashrc"; then
  echo 'export PATH="$HOME/go/bin:$PATH"' >> "$HOME/.bashrc"
fi

# Install Rust toolchain if missing (feroxbuster)
if ! command -v cargo >/dev/null 2>&1; then
  echo "Installing Rust toolchain"
  curl -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env"
else
  source "$HOME/.cargo/env"
fi

if ! command -v feroxbuster >/dev/null 2>&1; then
  echo "Installing feroxbuster"
  cargo install feroxbuster
fi

export GOPATH="$HOME/go"
export PATH="$GOPATH/bin:$PATH"

# Katana
if ! command -v katana >/dev/null 2>&1; then
  echo "Installing katana"
  GO111MODULE=on go install github.com/projectdiscovery/katana/v2/cmd/katana@latest
fi

# httpx latest (v2 uses threads flag differently)
GO111MODULE=on go install github.com/projectdiscovery/httpx/v2/cmd/httpx@latest

# Nuclei + templates
if ! command -v nuclei >/dev/null 2>&1; then
  echo "Installing nuclei"
  GO111MODULE=on go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
fi
mkdir -p "$HOME/.config/nuclei"
touch "$HOME/.config/nuclei/.nuclei-ignore"
$HOME/go/bin/nuclei -update-templates

# Gobuster wordlist
if [ ! -f /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt ]; then
  sudo mkdir -p /usr/share/wordlists/dirbuster
  sudo wget -qO /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt \
    https://raw.githubusercontent.com/daviddias/node-dirbuster/master/lists/directory-list-2.3-medium.txt
fi

# sqlmap via pip (latest)
if ! command -v sqlmap >/dev/null 2>&1; then
  sudo pip3 install sqlmap
fi

# wpscan (Ruby gem) optional if not present
if ! command -v wpscan >/dev/null 2>&1; then
  echo "Installing wpscan"
  sudo apt-get install -y ruby-full
  sudo gem install wpscan
fi

# feroxbuster already installed above; ensure katana/httpx/nuclei path available
source "$HOME/.bashrc"

echo "All Jaeger tools installed/updated. Restart MCP & Jaeger to apply."
