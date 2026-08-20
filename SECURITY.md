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

## Dependency audit — accepted risk (`@vercel/node` build tooling)

`npm audit` reports several high/moderate advisories (e.g. in `undici`,
`minimatch`, `path-to-regexp`, `ajv`, `smol-toml`). All of them are transitive
dependencies of **`@vercel/node`**, which this project uses only for its
TypeScript types (`import type { VercelRequest, VercelResponse }`) — the builder
itself is supplied by the Vercel platform at deploy time. `@vercel/node` is
therefore a `devDependency`, so `npm audit --omit=dev` (the production-relevant
scope) reports clean.

These advisories are ReDoS/DoS-class issues that require attacker-controlled
input reaching the vulnerable parser. In this project those parsers only ever
process the repo's own developer-controlled config at build time; the serverless
request path uses Node's native `fetch` (not the bundled `undici`) against the
trusted `domstol.se` origin. They are not reachable at runtime.

There is currently no forward fix: the affected versions are only patched in new
majors that `@vercel/node@5.x` was not built against, and the latest
`@vercel/node` still pins the vulnerable versions. Rather than force unvalidated
major overrides onto Vercel's build tooling, we accept these and will pick up the
fixes when `@vercel/node` bumps them upstream.
