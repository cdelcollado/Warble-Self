# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.9.x   | :white_check_mark: |
| 0.1.x   | :x: |

## Reporting a Vulnerability

If you discover a security vulnerability within Warble, please send an email to the maintainers. All security vulnerabilities will be promptly addressed.

**Please do not open public issues for security vulnerabilities.**

## Security Measures

### Input Validation

- **File Size Limits**: Uploaded files are limited to 10MB to prevent memory exhaustion
- **File Type Validation**: Only `.img` and `.csv` files are accepted
- **Buffer Validation**: Binary buffers are validated for corruption before processing
- **Frequency Validation**: All frequency inputs are validated against hardware limits

### XSS Prevention

- Channel names are sanitized to prevent HTML/JavaScript injection
- All user input is escaped before being displayed in the UI
- CSV exports escape formulas to prevent formula injection attacks

### Data Security

- Codeplug files are stored server-side in MinIO (S3-compatible)
- Warble-Self is a **single-user, self-hosted** app — there is no authentication layer. Deploy it on a trusted network or behind a VPN/firewall; do not expose it directly to the public internet
- Admin endpoints (`/api/admin/*`) are protected by the `ADMIN_SECRET` bearer token; keep this value secret
- No sensitive data is stored in localStorage
- Serial port access requires explicit user permission via Web Serial API
- Local radio programming (read/write) happens entirely client-side; files only leave the browser when the user explicitly uploads to the repository

### Rate Limiting

The Fastify backend applies `@fastify/rate-limit` globally (100 requests/minute per IP by default).

## Best Practices for Users

1. **Always backup your radio** before writing new data
2. **Verify channel data** before writing to your radio
3. **Use HTTPS** when deploying Warble to a public server
4. **Keep your browser updated** for latest Web Serial API security patches
5. **Never run Warble from untrusted sources**

## Dependency Security

We use `npm audit` to monitor dependencies for known vulnerabilities. Run locally with:

```bash
npm audit
```

To fix vulnerabilities automatically:

```bash
npm audit fix
```

## Web Serial API Security

The Web Serial API requires:
- User permission for each serial port access
- Secure context (HTTPS or localhost)
- Browser support (Chrome/Edge only)

This provides several layers of security against unauthorized serial port access.
