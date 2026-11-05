# Controlled Vulnerability Laboratory

This lab is educational and must only target the local process. Vulnerable routes are absent unless `ENABLE_VULNERABLE_LAB=true`, and the server refuses to bind to a non-loopback address.

## Safe reproduction

1. Copy the root `.env.example` to `.env` and keep `LAB_HOST` unset.
2. In a disposable development terminal, set `ENABLE_VULNERABLE_LAB=true` and run `npm start -w security-lab`.
3. Send requests only to `http://127.0.0.1:3100` using the payloads below.
4. Stop the process after the exercise. Never reverse-proxy, publish, or deploy it.

| Weakness                   | Vulnerable demonstration                                                                                               | Secure alternative                                                                              | Impact                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| SQL injection              | `POST /vulnerable/sql-login` constructs a query from raw strings; use `{"email":"' OR '1'='1","password":"anything"}`. | `POST /secure/sql-login` compares values as data, analogous to a parameterized ORM query.       | Authentication bypass and data exposure or modification. |
| Reflected XSS              | `GET /vulnerable/xss?message=<script>alert(1)</script>` inserts untrusted HTML.                                        | `/secure/xss` context-encodes output and adds CSP with Helmet.                                  | Script execution in another user's browser.              |
| Broken access control      | `/vulnerable/records/1` looks up only the object ID.                                                                   | `/secure/records/1` also scopes the query to the session owner.                                 | Reading another user's private records.                  |
| Weak session configuration | `/vulnerable/session` emits a readable, predictable cookie without defensive attributes.                               | `/secure/session` uses an opaque session identifier, `HttpOnly`, `SameSite=Strict`, and expiry. | Session theft and account takeover.                      |
| Brute-force exposure       | `/vulnerable/login` permits unlimited attempts.                                                                        | `/secure/login` enforces a bounded attempt rate.                                                | Password guessing at high volume.                        |

These routes simulate the smallest behavior needed to compare the weakness and mitigation. They contain no real user data or credentials. Run `npm test -w security-lab` to prove the mitigations.
