# EdgeTunnel

## Admin dashboard (English / فارسی)

The web control panel is a real standalone HTML file at `public/index.html`. Wrangler uploads it as a Worker Static Asset, and the Worker serves it at `/` and `/admin`. The language switcher changes between English and Persian; Persian uses a right-to-left layout. Dashboard authentication and sessions are stored in Cloudflare KV.

### 1. Web control panel files

Edit `public/index.html` to customize the English/Persian login and dashboard interface. It is deployed with the Worker through the `[assets]` configuration in `wrangler.toml`.

### 2. Create and bind the KV namespace

```bash
npx wrangler kv namespace create ADMIN_KV
```

Copy the returned namespace ID into `wrangler.toml` in the `[[kv_namespaces]]` block:

```toml
[[kv_namespaces]]
binding = "ADMIN_KV"
id = "YOUR_KV_NAMESPACE_ID"
```

### 3. Create the admin credentials

The password is stored as a PBKDF2-SHA256 hash (not plaintext). Generate one with Node.js:

```bash
node scripts/create-admin-hash.mjs admin 'use-a-long-unique-password'
```

The script prints two Wrangler commands. Run both commands to store `auth:username` and `auth:password` in your KV namespace.

### 4. Deploy

```bash
npx wrangler deploy
```

Open the Worker URL to sign in. Sessions are opaque, HttpOnly, Secure, SameSite=Strict cookies backed by KV and expire after 24 hours.

### KV keys

| Key | Purpose |
| --- | --- |
| `auth:username` | Admin username |
| `auth:password` | `pbkdf2$iterations$salt$hash` password hash |
| `session:<token>` | Short-lived authenticated session |

### Existing VLESS behavior

The existing VLESS WebSocket transport and `/<UUID>` configuration endpoint are retained. The dashboard login protects the management UI and its API; it does **not** make the VLESS client configuration endpoint private. Keep your UUID secret and use Cloudflare access/network controls if you need to restrict that endpoint.

### Existing Worker variables

- `UUID`: optional VLESS UUID override
- `PROXYIP`: optional proxy IP override
- `ADMIN_KV`: required KV namespace binding for dashboard login
- `ASSETS`: static asset binding for `public/index.html` (configured in `wrangler.toml`)
