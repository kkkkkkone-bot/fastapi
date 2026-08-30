# Deploy Fast API from GitHub to Zeabur

This repository can be deployed directly from GitHub to Zeabur. Zeabur detects the root `Dockerfile`, builds both New API frontend themes and the Go server, and deploys the final container. No intermediate Docker Hub or GHCR image is required.

All New API and QuantumNous attribution, license, package, and source references remain part of the build.

## 1. Back up the current service

Before replacing an existing image-based service, back up its database and record its environment variables.

- SQLite: download the current `/data/one-api.db` file or create a complete backup of the `/data` volume.
- PostgreSQL or MySQL: create a database-native backup and verify that it can be restored.
- Export the current Zeabur environment variables from the service configuration.
- Keep the old service available until the GitHub-based service passes health and data checks.

Changing the deployment source does not automatically copy a database or volume into a new Zeabur service.

## 2. Connect the GitHub repository

1. Push the desired branch to `https://github.com/kkkkkkone-bot/fastapi`.
2. In Zeabur, open the target project and select **Add Service → GitHub**.
3. Install or authorize the Zeabur GitHub App for the repository.
4. Select the repository and the production branch.
5. Keep **Root Directory** empty because `Dockerfile` is in the repository root.
6. Do not set `ZBPACK_IGNORE_DOCKERFILE`; Zeabur should display the Docker build strategy.
7. Deploy the service. Future pushes to the selected branch trigger automatic deployments.

The root `Dockerfile` exposes port `3000`, and the application also honors Zeabur's injected `PORT` variable.

## 3. Choose persistent storage

### Recommended: Zeabur PostgreSQL

Create a PostgreSQL service in the same Zeabur project and set `SQL_DSN` on the Fast API service to the private PostgreSQL connection string.

Recommended production variables:

```dotenv
SQL_DSN=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
TZ=Asia/Shanghai
SESSION_SECRET=GENERATE_A_LONG_RANDOM_VALUE
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_TRUSTED_URL=https://www.fastapi.ltd
NODE_NAME=fast-api-zeabur
ERROR_LOG_ENABLED=true
```

Add a Zeabur Redis service only when shared caching or multi-instance deployment is required:

```dotenv
REDIS_CONN_STRING=redis://USER:PASSWORD@HOST:PORT/0
CRYPTO_SECRET=GENERATE_ANOTHER_LONG_RANDOM_VALUE
```

`CRYPTO_SECRET` must remain stable after Redis-backed encrypted values are created. Rotating it without a migration makes existing encrypted data unreadable.

### Alternative: SQLite

If the service continues to use SQLite:

1. Mount a Zeabur Volume at `/data` before the first production start.
2. Do not set `SQL_DSN`.
3. Optionally set `SQLITE_PATH=/data/one-api.db?_busy_timeout=30000` explicitly.
4. Restore the previous `one-api.db` into the mounted volume before switching production traffic.

Zeabur services are stateless without a Volume. Restarting or redeploying a SQLite service without a `/data` Volume can discard the database. Zeabur also documents that services with Volumes cannot use zero-downtime restarts, which is one reason PostgreSQL is preferred for production.

## 4. Configure the public site

In the Fast API system settings, set the server address to:

```text
https://www.fastapi.ltd
```

Bind `www.fastapi.ltd` in Zeabur and keep it as the canonical host. Configure the DNS or Cloudflare redirect layer so that:

- `http://fastapi.ltd/*` permanently redirects to `https://www.fastapi.ltd/*`.
- `https://fastapi.ltd/*` permanently redirects to `https://www.fastapi.ltd/*`.

Use a `301` or `308` permanent redirect. Do not proxy both host variants to separate 200 responses.

## 5. Validate before switching traffic

Verify the Zeabur preview domain first:

```text
GET /api/status       → 200 and success=true
GET /robots.txt       → 200 text/plain with no HTML
GET /sitemap.xml      → 200 application/xml
GET /                 → 200 with Fast API metadata in the initial HTML
GET /pricing/         → 200 with pricing metadata and canonical URL
GET /sign-in          → 200 with X-Robots-Tag: noindex, nofollow
GET /missing-seo-test → 404
```

Confirm that existing users, channels, API keys, balances, logs, and model calls use the migrated database. Then bind the production domain or update DNS.

## 6. Roll back

If the repository build or migrated database fails validation:

1. Restore traffic to the previous image-based service.
2. Rebind the production domain to the previous service if it was moved.
3. Restore the database backup only if the new service wrote incompatible data.
4. Fix the repository or variables and redeploy the GitHub service using its preview domain.

## References

- [Zeabur GitHub integration](https://zeabur.com/docs/en-US/deploy/methods/github-integration)
- [Zeabur Dockerfile deployment](https://zeabur.com/docs/en-US/deploy/methods/dockerfile)
- [Zeabur Volumes](https://zeabur.com/docs/en-US/data-management/volumes)
