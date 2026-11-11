# Deployment Runbook — OPD Triage Lens

**Stack:** Static site (HTML/CSS/JS, no build step, no dependencies, no backend).
**Provider:** Vercel (free Hobby tier). **No environment variables. No secrets.**

## Deploy (parent — browser or CLI)
1. Create the GitHub repo `MSAbhishek22/opd-triage-lens` and push the manifest
   (`~/workspace/hackathons/opd-triage-lens-paths`) via snapshot-push.
2. Vercel → Add New → Project → Import the repo.
   - Framework preset: **Other** (no build). Build command: none. Output: root.
   - No environment variables to set.
3. Deploy. Note the production URL (expect `https://opd-triage-lens*.vercel.app`).

## Post-deploy verification (must do, from an unauthenticated client)
- `curl -I <production URL>` → HTTP 200, real app HTML.
- Open the URL in a fresh browser session (not signed in to Vercel):
  stats show `34 / 45 / 100%`, all 34 rule cards render, triage a RED case
  (`seene me dard, saans phoolna`) → RED verdict + handoff.
- **Check Deployment Protection is OFF** (Vercel defaults it ON for new
  projects — the production URL must load without a login wall). If it is on,
  turn it off in Settings → Deployment Protection → Vercel Authentication OFF.
- Check browser console: 0 errors. Check mobile 390px: no horizontal overflow.
- Verify the deployed code matches the pushed commit (open `corpus.js` on the
  live site and confirm it contains `chest-pain-breathless`).

## Rollback
Re-deploy the previous commit from the Vercel dashboard (Deployments tab), or
push a revert to `main`. The site is static; rollback is a redeploy.

## Ownership
- Built by: M S Abhishek (solo), 12 Nov 2026.
- Repo: https://github.com/MSAbhishek22/opd-triage-lens (TBD — parent creates).
- Production URL: TBD — parent fills after deploy.
- Release manifest: to be completed after deploy (commit SHA + URL + timestamp).
