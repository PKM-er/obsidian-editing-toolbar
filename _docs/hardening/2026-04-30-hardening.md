# Hardening Pass — obsidian-editing-toolbar

- **Date:** 2026-04-30
- **Repo:** `~/brain/plugins/obsidian-editing-toolbar`
- **Branch:** `master` (fork default; upstream uses `master`)
- **HEAD before pass:** `c77c9cd` (merge from upstream `PKM-er/obsidian-editing-toolbar`)
- **Operator:** Claude (harden-plugin skill — first pass + follow-ups #1-5)

## Remote safety

```
origin    https://github.com/yepjules/obsidian-editing-toolbar.git    (push/fetch)
upstream  https://github.com/PKM-er/obsidian-editing-toolbar.git      (push/fetch)
```

Pushes go to `origin` only. Upstream is read-only by convention.
Fork is **0 commits behind upstream/master** at audit time.

---

## Round 1 — initial audit (no edits)

### P0 / P1 — none

### P2 — advisory items
1. Version drift `package.json` 3.2.2 vs `manifest.json` 4.0.7 → CI rewrites manifest from tag at release; functional. No action (fork-sync rule: no version bumps).
2. `.gitignore:23-39` lists vault test artifacts already tracked → ignore is dead. See follow-up #5 below.
3. CI workflow uses Node 16, `actions/checkout@v3`, `actions/setup-node@v3` → EOL. See follow-up #3.
4. `.claude/settings.local.json` committed (permissions only, no secrets). No action.
5. Dependabot disabled at the GitHub repo level. See follow-up #4.

### Code-level
- Secret scan over the repo: 1 false positive (`src/ai/types.ts:262 customModelApiKey` is a settings *key name*, not a value). No real secrets.
- Semgrep `p/typescript p/javascript p/security-audit p/owasp-top-ten` over `src/`: **0 findings on 68 files / 335 rules**.

---

## Round 2 — follow-ups #1-5

### Follow-up #1: AI subsystem deep-dive

**Files reviewed:** `src/ai/AIService.ts`, `src/ai/PKMerAuthService.ts`, `src/ai/types.ts`, `src/ai/pkmerWeb.ts`, `src/ai/editorContext.ts`, `src/modals/AIConsentModal.ts`.

**Strengths:**
- OAuth uses **PKCE with S256** (`PKMerAuthService.ts:281` — `crypto.subtle.digest('SHA-256', ...) → base64url`).
- State + code-verifier generated via `crypto.getRandomValues(Uint8Array(32))` (32 bytes → 64-hex).
- State validated on callback (`isPendingStateMatch` at `:302, :234`).
- Tokens stored via Obsidian's `secretStorage` (Electron safeStorage / OS keychain) with graceful fallback notice when unavailable (`:162`).
- Custom-model API key migrated from settings → secretStorage on load (`:107`); legacy plaintext field cleared.
- Localhost callback (`:286`) bound to `127.0.0.1:10891` with `/editing-toolbar/callback` path filter and 5-minute idle timeout.
- AI consent modal explicitly enumerates privacy implications before enabling (`AIConsentModal.ts:53-62`).
- Note content payloads bounded: completion ≤ 2000 prefix + 800 suffix chars; rewrite uses local block ± 1200/900 chars (`editorContext.ts:122, 195-198`). No whole-doc exfiltration.
- OAuth client ID is public — expected for PKCE flows.

**P2 finding — Reflected HTML in OAuth callback error page** *(FIXED)*
- **Location:** `src/ai/PKMerAuthService.ts:311-321`
- **Issue:** `error` query-param (`?error=...`) interpolated straight into the success-page HTML response on the localhost callback server.
- **Threat model:** narrow but real — an attacker would have to lure a victim's browser to `http://localhost:10891/editing-toolbar/callback?error=<script>...` while Obsidian was running and accepting login. Reflected XSS in the resulting page.
- **Fix:** HTML-escape `& < > " '` before interpolating. 8-line patch.
- **Diff applied:**
  ```ts
  } else {
    const error = url.searchParams.get("error") || "unknown error";
    const escapedError = error.replace(/[&<>"']/g, (ch: string) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    }[ch] as string));
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<html><body><h2>Login failed: ${escapedError}</h2></body></html>`);
    resolve(null);
  }
  ```
- **Verified:** `pnpm build` succeeds after the change.

**P3 — informational, not fixed:**
- `console.error("Token exchange failed:", error)` at `:402, :437, :488` and similar log full error objects. Obsidian's `requestUrl` errors don't normally include `Authorization` headers, but a future audit should assert that. Low priority.
- The success-page HTML at `:308` runs `<script>window.close()</script>` on the localhost-served page. It's static content, no injection vector, but inline `<script>` tags are a code-smell; not changing.

### Follow-up #2: Build / typecheck verification

```
$ pnpm install --frozen-lockfile     # 8.1s, exit 0
$ pnpm build                         # rollup OK, exit 0, output → Editing-Toolbar-Test-Vault/.obsidian/plugins/editing-toolbar
$ pnpm build                         # re-run after XSS fix → still passes
$ npx tsc --noEmit                   # 7 errors total
```

**TSC errors are not introduced by this hardening pass.** They split as:
- **4 upstream** in `node_modules/.pnpm/obsidian@0.15.9.../obsidian.d.ts` — pinned version's `.d.ts` is incompatible with TS 4.9's stricter implements check (`MarkdownEditView`/`MarkdownPreviewView`/`MarkdownSourceView` missing `applyFoldInfo`/`getFoldInfo`; `TextFileView.getMode` property/method mismatch). Cosmetic; rollup TS plugin tolerates and emits.
- **3 pre-existing** in `src/types/obsidian.d.ts:20, 21, 251` (overload signature optionality, missing return-type annotation). Pre-existing on upstream.

Rollup build itself does not fail and produces `main.js`/`styles.css` cleanly.

### Follow-up #3: CI workflow bump

**Status: NOT applied — blocked by project security hook.**

Attempted `Edit` on `.github/workflows/release.yml` was blocked by a `PreToolUse:Edit` security-reminder hook (the hook flags any workflow-file edit and refuses without explicit override). I did not override the hook.

**Recommended diff (please apply manually):**
```diff
@@ .github/workflows/release.yml
-            - uses: actions/checkout@v3
+            - uses: actions/checkout@v4
               with:
                 fetch-depth: 0  # 获取完整的提交历史，用于生成 changelog
             - name: Use Node.js
-              uses: actions/setup-node@v3
+              uses: actions/setup-node@v4
               with:
-                  node-version: 16
+                  node-version: 20
```

**Pre-existing additional concern (not in scope this pass):**
The same workflow has a workflow-injection shape at lines 94-97:
```yaml
echo "${{ github.event.inputs.release_notes }}" > CHANGELOG.md
echo "${{ github.event.inputs.release_notes }}" >> $GITHUB_OUTPUT
```
`workflow_dispatch` inputs are operator-controlled (only repo writers can trigger it), so the blast radius is limited. Still — the safe pattern is `env: NOTES: ${{ github.event.inputs.release_notes }}` then `echo "$NOTES"`. Recommend fixing in a follow-up alongside the action-version bumps.

### Follow-up #4: Dependabot enabled

**Status: APPLIED (GitHub repo settings change, not a file edit).**

```
$ gh api -X PUT repos/yepjules/obsidian-editing-toolbar/vulnerability-alerts
  → 204 (enabled)
$ gh api -X PUT repos/yepjules/obsidian-editing-toolbar/automated-security-fixes
  → 204 (enabled)
$ gh api repos/yepjules/obsidian-editing-toolbar/automated-security-fixes
  → {"enabled":true,"paused":false}
```

Dependabot alerts + automated security fixes are now active on the fork. New advisories on `react@17`, `react-dom@17`, `feather-icons@4`, `sortablejs`, `terser`, etc. will surface as PRs/alerts.

### Follow-up #5: Gitignore hygiene

**Status: NOT applied — needs commit, deferred to user.**

`git ls-files` confirms 3 tracked files matching `.gitignore` entries:
```
Editing-Toolbar-Test-Vault/.obsidian/appearance.json
Editing-Toolbar-Test-Vault/.obsidian/community-plugins.json
Editing-Toolbar-Test-Vault/.obsidian/workspace.json
```

The ignore rules at `.gitignore:23-32` are no-ops because git already tracks these files; subsequent edits keep getting committed.

**Recommended action (one of):**
- **Option A — purge from index:**
  ```
  git rm --cached \
    Editing-Toolbar-Test-Vault/.obsidian/appearance.json \
    Editing-Toolbar-Test-Vault/.obsidian/community-plugins.json \
    Editing-Toolbar-Test-Vault/.obsidian/workspace.json
  git commit -m "Untrack test-vault state files (already in .gitignore)"
  ```
- **Option B — keep tracked, drop the dead ignore lines:**
  Edit `.gitignore` and remove lines 23-32 + 36-37 + the duplicate `.DS_Store` at 22.

Decide based on whether the embedded test vault's state is meant to be reproducible across contributors. I did not pick because it's a project-policy call.

**No edits made for this follow-up.**

---

## Files changed this pass

```
src/ai/PKMerAuthService.ts             |  +8 / -1   (XSS fix)
_docs/hardening/2026-04-30-hardening.md|  new file  (this report)
```

## Files NOT changed despite recommendations

- `.github/workflows/release.yml` (blocked by security hook — see #3)
- `.gitignore` and tracked test-vault files (deferred to user — see #5)
- `package.json` version (intentional drift per fork-sync rule)
- `src/types/obsidian.d.ts` (pre-existing TSC errors; cosmetic)

## Commands run (this pass)

```
git remote -v
git branch --show-current                        # master
git status --short                               # clean (now: M src/ai/PKMerAuthService.ts)
git fetch upstream master
git log HEAD..upstream/master --oneline | wc -l  # 0

# secret scan
Grep over repo for sk-/ghp_/github_pat_/xox*/AKIA*/PEM/api_key=/secret=/password=/bearer

# semgrep
semgrep --config=p/typescript --config=p/javascript \
        --config=p/security-audit --config=p/owasp-top-ten \
        --metrics=off --no-git-ignore \
        --exclude=node_modules --exclude=Editing-Toolbar-Test-Vault src/

# install + build + typecheck
pnpm install --frozen-lockfile && pnpm build && npx tsc --noEmit
pnpm build                                       # second pass after XSS fix

# Dependabot
gh api -X PUT repos/yepjules/obsidian-editing-toolbar/vulnerability-alerts
gh api -X PUT repos/yepjules/obsidian-editing-toolbar/automated-security-fixes
```

## Tests

No project test suite. Build is the smoke test.

## PR

None opened. Code change to `src/ai/PKMerAuthService.ts` is local; commit/push when you're ready.

## Hardening Summary: obsidian-editing-toolbar

- **Remote safety:** origin=yepjules fork, upstream=PKM-er (read-only); 0 behind upstream.
- **Findings:** 0 P0/P1. **1 P2 fixed (OAuth callback reflected XSS)**. 4 P2 advisory items (version drift left intentional, CI action bump pending hook override, gitignore cleanup deferred to user, `.claude/settings.local.json` committed). Multiple P3 informational notes.
- **Changes applied:** 1 source edit (`src/ai/PKMerAuthService.ts` +8/-1), 1 GitHub-side setting change (Dependabot enabled).
- **Commands run:** git remote/log + upstream sync probe, Grep secret-scan, semgrep 4 packs, pnpm install/build (×2), npx tsc --noEmit, gh api Dependabot enable.
- **Build:** ✅ rollup builds clean both before and after the XSS fix.
- **Tests:** none configured; build is the smoke test.
- **Files written:** `_docs/hardening/2026-04-30-hardening.md`, `src/ai/PKMerAuthService.ts` (modified).
- **PR:** none opened — commit/push deferred to operator.
