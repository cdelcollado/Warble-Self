# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

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

- All data processing happens client-side (no server communication except RepeaterBook API)
- No sensitive data is stored in localStorage
- Serial port access requires explicit user permission via Web Serial API

### Rate Limiting

Production deployments should implement rate limiting on the RepeaterBook proxy to prevent abuse:

```javascript
// Example Vercel serverless function with rate limiting
import rateLimit from '@vercel/rate-limit';

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

export default async function handler(req, res) {
  try {
    await limiter.check(res, 10, 'CACHE_TOKEN'); // 10 requests per minute
    // ... proxy logic
  } catch {
    res.status(429).json({ error: 'Rate limit exceeded' });
  }
}
```

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
