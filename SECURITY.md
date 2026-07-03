# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in NexMess, please report it responsibly:

1. **Email**: Open a private issue or contact the maintainer directly
2. **Do NOT** open a public issue for security vulnerabilities
3. You should receive a response within **48 hours**

## Scope

The following are in scope:

- Authentication and authorization bypasses
- Row-Level Security (RLS) policy violations
- Data exposure via API endpoints
- Cross-site scripting (XSS) in user inputs
- Supabase Edge Function vulnerabilities

## Security Measures

NexMess implements the following security practices:

- **Supabase Row-Level Security (RLS)** on all 11+ database tables
- **VAPID-based Web Push** — server-side key validation
- **Input sanitization** — message length limits, file type/size validation
- **OAuth 2.0** via Supabase Auth (Google provider)
- **Secure password recovery** flow with email verification
- **Environment variable isolation** — secrets never bundled in client code
