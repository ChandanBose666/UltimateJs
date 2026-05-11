# Releasing BlazeFW packages

How to publish the `@blazefw/*` packages (and `create-blazefw`) to npm.

> **Why this doc exists:** `@blazefw/compiler` has never been published — it's a 404
> on npm — and the published `create-blazefw` / `@blazefw/vite-plugin` predate the
> JSX-parsing, scaffold, and distribution fixes. Until that's corrected,
> `npx create-blazefw` is broken for everyone. This is the launch gate.

---

## Prerequisites

- **npm auth with publish rights to the `@blazefw` org.** Check: `npm whoami` (should print your username) and `npm access list packages @blazefw` (should list the existing packages). If not logged in: `npm login`.
- **wasm-pack installed** — `@blazefw/compiler`'s `prepack` runs `wasm-pack build` to bake the real WASM into the tarball. Check: `wasm-pack --version`. If missing: `cargo install wasm-pack --locked`. (Without it, `prepack` falls back to the throwing stub — a broken publish.)
- **Clean working tree on `main`**, fully up to date: `git switch main && git pull && git status` (should be clean).
- Dependencies installed: `pnpm install --frozen-lockfile`.

---

## What ships in this release

| Package | npm now | this release | why it changed |
|---|---|---|---|
| `@blazefw/compiler` | *(unpublished — 404)* | **0.1.2** | TSX parsing fix, `Result` instead of panic, WASM panic hook, `prepack` builds the WASM into the tarball, build-stub |
| `@blazefw/vite-plugin` | 0.1.1 | **0.1.2** | `bridge.ts` binary-path fix, now declares `@blazefw/compiler` as a dependency, `[blazefw]` branding |
| `create-blazefw` | 0.1.1 | **0.1.2** | `ultimatePlugin()` (not `()()`), `@vitejs/plugin-react` + `@blazefw/compiler` in generated deps, `viteConfig(features)`, BlazeFW branding, `files`, scaffold tests |

Version bumps for these three are already committed (see `git log`). The other
~10 `@blazefw/*` packages stay at `0.1.1` — the scaffold's `^0.1.0` ranges still
resolve them, and they have no functional changes that block launch. If you'd
rather keep everything in lockstep, see **Option B** below.

---

## Release steps

### 1. Verify everything is green

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test                                              # 13 task suites
cargo test --manifest-path packages/compiler/Cargo.toml # 44 tests
pnpm --filter @blazefw/compiler build:wasm             # the published-consumer artifact
node scripts/scaffold-e2e.mjs                          # scaffold → slice, both code paths
```

All must pass. (The `scaffold-e2e` CI job runs the same sequence.)

### 2. Tag

```bash
git tag -a v0.1.2 -m "Release v0.1.2 — compiler JSX fix, scaffold fixes, distribution"
```

### 3. Dry-run the publish

```bash
pnpm -r publish --dry-run --no-git-checks
```

`pnpm -r publish` walks the workspace in dependency order and publishes only the
packages whose version isn't already on npm — so this will show exactly
`@blazefw/compiler@0.1.2`, `@blazefw/vite-plugin@0.1.2`, `create-blazefw@0.1.2`
(the rest are skipped). Inspect the file lists, especially that
`@blazefw/compiler` includes `pkg-node/compiler_bg.wasm`.

You can also pack `@blazefw/compiler` standalone to be sure the WASM is in it:

```bash
cd packages/compiler && pnpm pack && tar -tzf blazefw-compiler-*.tgz && rm blazefw-compiler-*.tgz && cd -
# expect: package/pkg-node/compiler_bg.wasm  + compiler.js + the .d.ts files
```

### 4. Publish

```bash
pnpm -r publish
```

- Order is automatic: `@blazefw/compiler` first (it has no `@blazefw/*` deps), then
  `@blazefw/vite-plugin` (its `workspace:*` dep on `@blazefw/compiler` is rewritten to
  `^0.1.2` in the published manifest), then `create-blazefw`.
- `@blazefw/compiler`'s `prepack` runs `wasm-pack build --target nodejs` — that's why
  wasm-pack must be installed.
- Scoped packages publish as `public` via each package's `publishConfig.access` — no
  `--access` flag needed.
- If the working tree isn't pristine (e.g. you're mid-flow), add `--no-git-checks`.

### 5. Post-publish smoke (the real launch gate)

In a scratch directory, **outside** this repo:

```bash
npx create-blazefw@latest blazefw-smoke
cd blazefw-smoke
pnpm install
pnpm build          # tsc + vite build — must produce dist/
pnpm dev            # optional: open the browser, see the demo render
```

If `pnpm build` is green, BlazeFW is launch-ready. If it 404s on a `@blazefw/*`
package, that package needs publishing too.

### 6. Push

```bash
git push origin main --follow-tags
```

---

## Option B — coordinated bump (everything to the same version)

The `18d38db` "bump all packages to 0.1.1" commit set a precedent for releasing
the whole workspace in lockstep. To do that for 0.1.2:

```bash
# bump every package.json "version" to 0.1.2 (do this however you like — sed, an editor, or):
pnpm -r exec npm version 0.1.2 --no-git-tag-version --allow-same-version
git add -A && git commit -m "chore: bump all packages to 0.1.2"
git tag -a v0.1.2 -m "Release v0.1.2"
# then steps 1, 3, 4, 5, 6 above — `pnpm -r publish` now publishes the full set
```

Heavier (more publishes, more to go wrong), but no "which packages are stale on
npm" ambiguity. Note `@blazefw/crdt` (build-stub), `@blazefw/web` (added
`framer-motion`), and `@blazefw/email` (test config) also have small unpublished
changes since `0.1.1`, so a coordinated bump cleans those up too.

---

## If something goes wrong

- **A publish half-failed** (e.g. `@blazefw/compiler` went up but `@blazefw/vite-plugin`
  errored): fix the cause, then re-run `pnpm -r publish` — it skips what's already on
  npm and resumes.
- **Published a bad version:** `npm unpublish @blazefw/<pkg>@0.1.2` works within 72h
  of publishing *and* if nothing depends on it yet. Otherwise `npm deprecate
  @blazefw/<pkg>@0.1.2 "broken — use 0.1.3"` and ship a patch.
- **`prepack` shipped the stub instead of real WASM** (wasm-pack wasn't installed):
  `npm deprecate` it, install wasm-pack, bump the patch, re-publish.

---

## Conventions

- Scoped packages (`@blazefw/*`) carry `"publishConfig": { "access": "public" }`.
- `@blazefw/compiler` and `@blazefw/vite-plugin` build their `dist`/`pkg-node` via
  `prepack`, so a publish always ships fresh artifacts even from a clean checkout.
- The Rust crate version in `packages/compiler/Cargo.toml` is independent of the npm
  package version and isn't published — leave it unless you have a reason to sync it.
- `create-blazefw`'s generated projects reference `@blazefw/*` with `^0.1.0` ranges, so
  patch/minor bumps of the runtime packages don't require regenerating the templates.
