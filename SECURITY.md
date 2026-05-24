# Security Policy

## Reporting a vulnerability

If you discover a security issue in this repository, please report it privately
rather than opening a public issue.

Email: **lars.o.mansson@gmail.com**

Please include:

- A description of the vulnerability
- Steps to reproduce
- The impact you can demonstrate
- (Optional) a suggested fix

I will acknowledge receipt within a few days and aim to address verified
vulnerabilities promptly. Once a fix is in place we can coordinate a disclosure
timeline.

## Scope

This project fetches publicly-published PDF schedules from `domstol.se` and
renders them client-side. It has no user accounts, no database, and no secret
handling on the server beyond what Vercel provides for its serverless runtime.
Most "security" reports will be about XSS, prototype pollution, or supply-chain
risk in dependencies.

Out of scope: anything affecting the upstream `domstol.se` service itself.
