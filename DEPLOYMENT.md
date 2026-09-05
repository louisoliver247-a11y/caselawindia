# Deployment

Use Node.js 20+, PostgreSQL 15+, TLS, managed object storage, PM2 (or an equivalent supervisor), and a reverse proxy. Create `.env` from `.env.example`, use a high-entropy JWT secret, restrict `WEB_ORIGIN`, apply migrations, then run `npm run build` and `npm start`.

The production reverse proxy should terminate TLS for `caselawindia.io`, redirect HTTP to HTTPS, redirect `www.caselawindia.io` to the apex domain, and forward application traffic to the Node service. Set both `WEB_ORIGIN` and `SITE_URL` to `https://caselawindia.io`.

Production gates include backups and restore tests, central logs, malware scanning for uploads, completed authentication and role checks, CSRF protection for cookie-authenticated writes, dependency scanning, uptime checks, and separate workers. Admin routes intentionally return `AUTH_NOT_CONFIGURED` outside development until authentication is wired.
