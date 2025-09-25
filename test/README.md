# Hurl tests for MCP HTTP server

Prerequisites
- Install Hurl: https://hurl.dev/
- Ensure the server is running and VAULT_PATH points to a writable directory (recommended: local example vault ./mcp-dev)

Example dev run
```bash
# From repo root
mkdir -p mcp-dev
VAULT_PATH="$(pwd)/mcp-dev" bun run dev &
SERVER_PID=$!
trap 'kill $SERVER_PID' EXIT
sleep 1

# Run tests
hurl --test test/hurl/create_delete.hurl
```

Notes
- Tests use http://127.0.0.1:8765/mcp by default.
- The test sequence initializes a session, creates a file, verifies its content, deletes it, and verifies deletion.
