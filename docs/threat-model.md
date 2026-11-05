# SecureGuard Threat Model

## Scope and assets

The secured application protects account credentials, session identifiers, user identities and roles, assessment records, and database availability. The loopback-only laboratory is a separate trust zone and contains synthetic data only.

## Trust boundaries

1. Browser to Express API: untrusted HTTP input crosses into server-side code.
2. Express to Prisma/MySQL: validated application data crosses into persistence.
3. Session cookie to server-side session store: an opaque bearer value references authenticated state.
4. Developer workstation to security lab: intentionally unsafe behavior is available only after explicit local enablement.

## Threats and controls

| STRIDE category        | Example                                 | Current control                                              | Residual risk                                            |
| ---------------------- | --------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------- |
| Spoofing               | Credential guessing or stolen session   | bcrypt, generic failures, rate limit, opaque cookies, expiry | MFA and breach-password service absent                   |
| Tampering              | Parameter manipulation or SQL injection | Zod validation, Prisma data API, authorization scoping       | Future assessment features require equivalent validation |
| Repudiation            | User denies administrative action       | No complete audit trail yet                                  | High; audit events are future work                       |
| Information disclosure | XSS, IDOR, verbose errors               | Helmet/CSP, encoding, RBAC, generic errors                   | CSP needs validation against final UI; ZAP not yet run   |
| Denial of service      | Oversized JSON or login flood           | 16 KiB JSON cap and rate limiting                            | General API throttling and distributed store absent      |
| Elevation of privilege | Normal user calls admin API             | server-side role middleware                                  | Role lifecycle and admin provisioning require governance |

## Abuse cases

- An unauthenticated caller requests `/api/me` or `/api/admin`: rejected with 401.
- An authenticated user calls `/api/admin`: rejected with 403 unless the stored session role is `ADMIN`.
- An attacker reuses a pre-login session: authentication regenerates the session identifier.
- A caller repeatedly guesses credentials: failures receive 429 after the configured allowance.
- A developer accidentally enables lab routes on a public interface: the lab server rejects non-loopback bind addresses.

## Assumptions

Production uses HTTPS at a trusted reverse proxy, secrets are supplied outside source control, MySQL is not public, migrations run under controlled credentials, and administrative roles are provisioned out of band. Invalidating any assumption requires revisiting this model.
