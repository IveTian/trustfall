# Security policy

TrustFall is software you deploy yourself. There is no hosted instance and no
central deployment to patch: a fix lands as a commit on `master` and reaches
your status page when you redeploy.

## Supported versions

`master`, and only `master`. The project is pre-1.0 and unreleased — there are
no tags, no release branches, and no backports. If you are running an older
commit, the remedy for any vulnerability is to rebase onto `master` and run
`pnpm deploy`.

## Reporting a vulnerability

Report privately, through GitHub:

**[Open a draft security advisory](https://github.com/IveTian/trustfall/security/advisories/new)**

The report is visible only to the maintainers. Do not open a public issue, a
pull request, or a discussion for a suspected vulnerability, and do not attach a
working exploit against someone else's deployment.

Include, as far as you have it:

- the commit SHA you tested
- how the deployment runs — one-click Cloudflare deploy, `wrangler deploy`, or
  local `pnpm dev` / `pnpm preview`
- the request or interaction that triggers it, ideally as a `curl` command
- what an attacker gets: which data, whose data, and whether authentication is
  required
- anything you had to configure to make it work

What to expect:

| Stage                                    | Target      |
| ---------------------------------------- | ----------- |
| First response acknowledging the report   | 7 days      |
| Assessment, severity, and a plan          | 14 days     |
| Fix on `master` for a confirmed issue     | 90 days     |

This is a small project maintained in spare time. If a deadline slips you will
be told, not ignored.

## Scope

In scope — the things worth a report:

- **Authentication and sessions.** Better Auth configuration, session fixation
  or forgery, the closed sign-up being reopened, an owner account being created
  on a deployment that already has one.
- **Authorisation on the API.** Any path that lets an unauthenticated visitor
  read or write operator-only data through the Hono API, including the OpenAPI
  document at `/api/openapi.json` and the docs at `/api/docs`.
- **Injection.** SQL reaching D1 unparameterised, or stored XSS on the public
  page through operator input — incident titles and updates, component and group
  names.
- **Secret exposure.** `BETTER_AUTH_SECRET`, session tokens, or D1 contents
  appearing in a response, a log line, a build artifact, or the public page.
- **Background work.** The cron handler, the `Dispatcher` durable object, or the
  queue consumer doing work an operator never asked for, or being reachable from
  outside the Worker.
- **Supply chain in this repository.** A workflow in `.github/workflows`, a
  lockfile entry, or a build step that executes untrusted input.

Out of scope:

- The auth secret stored in the D1 `settings` table when `BETTER_AUTH_SECRET` is
  unset. That is documented behaviour for the one-click deploy — see
  [README](README.md#auth-secret) — and the fix is to set a Worker secret.
- Anything that first requires a compromised Cloudflare account, Worker secret,
  or direct D1 query access.
- Findings against a deployment you do not operate. Do not test other people's
  status pages.
- Volumetric denial of service. That sits with Cloudflare, in front of the
  Worker.
- Missing hardening headers, cookie flags, or scanner output with no
  demonstrated impact.
- Dependency versions flagged by an advisory database with no exploit path
  through this codebase.
- Vulnerabilities in Cloudflare Workers, D1, or Astro themselves — report those
  upstream.
- Social engineering, phishing, and physical attacks.

## Disclosure

Coordinated. The fix lands on `master`, a GitHub Security Advisory is published
describing the issue and the commit that fixes it, and you are credited by the
name or handle you ask for — or not credited, if you would rather not be. Please
hold public details until the advisory is out, or for 90 days from the report,
whichever comes first.

## Hardening your deployment

Not vulnerabilities, but the four things that make a TrustFall deployment
meaningfully safer:

1. Set the auth secret yourself: `wrangler secret put BETTER_AUTH_SECRET`
   (32+ characters), instead of letting the first boot generate one into D1.
2. On a custom domain, set `BETTER_AUTH_URL` to the public origin.
3. Leave sign-up closed after the owner account exists. It closes itself; do not
   reopen it to add operators.
4. Keep the deployment on a recent `master` — that is the only patch channel.
