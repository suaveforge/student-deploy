# W01 portless frontend bundle

- Built from private `suaveforge/student` frontend at source `ef3c7f73b7d5d5d3ea1f8701eb605be6daea9887` (only public static browser assets).
- Full-state Node/SQLite/role authentication/recording API remains **server123**, independent Nginx on `api-student.suaveforge.com:19444`.
- User-facing domain: `https://student.suaveforge.com`, without port. **DO NOT declare live until Pages custom domain + Spaceship CNAME + Chrome 13-step tests pass.**
- Frontend makes credentialed API requests to explicit allowlisted backend origin; uses `SameSite=Strict` HttpOnly sessions. No actual student PII, credentials, keys or server sources published.
- Do not use Caddy or publish a mock static frontend. Every button requires real API.
- Pages source is `main` `/(root)`. CNAME and DNS to be committed/switched only after separate backend works.
