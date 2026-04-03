#!/bin/bash
# Apply VaultChat patches to node_modules after install.
node patches/apply-ink-patch.cjs 2>/dev/null || true
