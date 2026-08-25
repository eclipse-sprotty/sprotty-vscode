# Exec plan: AX remediation roadmap

- **Status**: active
- **Goal**: an agent given a real ticket here reliably reaches green verification and a reviewable diff — close the sensor gaps the 2026-08-25 AX audit found, in foundational → sophisticated order.

## Decomposition

- [x] Verified command surface, root `AGENTS.md` + `CLAUDE.md`, nested `examples/AGENTS.md`, docs nucleus (`ARCHITECTURE.md`, 4 ADRs, webview-protocol spec)
- [x] Fix proven doc rot: root README (removed classes, removed Xtext example), `sprotty-vscode-webview` README dead example link, example README dead publish command, stale `eclipse/` org URLs in package metadata
- [ ] **Introduce a test suite** — the largest sensor gap: zero tests. Start with the pure protocol/util layer (`webview-utils`, handshake types, `lsp-utils` conversions), then cover the behaviour bullets in `docs/product-specs/webview-protocol.md`, flipping them from (unverified) to enforced-by-test. Framework: vitest (maintainer decision 2026-08-25, matching sprotty).
- [ ] Lint the examples: add `lint` scripts to the three example workspaces (excluding `src/generated/`), so `yarn lint` covers all 6 workspaces.
- [ ] Modernize CI: `actions/checkout@v4`, `actions/setup-node@v4`, yarn caching.
- [ ] Structural sensor for ADR-0001: a lint/dependency rule that fails when `sprotty-vscode-protocol` imports `vscode`, DOM, or Node APIs — with a self-correction message pointing at the ADR.
- [ ] Dependency hygiene: declare `vscode-jsonrpc` where imported; replace the npm `path` package (browser shim) in `sprotty-vscode` with `node:path` or document why it stays; decide peer-dependency strategy for `sprotty`/`vscode-messenger` (semver-relevant — maintainer decision).
- [ ] Example cleanup: remove the two unused `webpack.config.js` files, replacing the webview's lost type-checking with a `tsc --noEmit` script wired into its build.
- [ ] Release automation: publish workflow in CI (the sprotty repo moved to GitHub Actions OIDC publishing — same pattern applies).
- [ ] Governance files as warranted: in-repo `dependabot.yml`, `SECURITY.md`, issue/PR templates.
- [ ] After the sprotty repo's `agent-docs` branch merges: verify the cross-repo doc paths cited in `docs/ARCHITECTURE.md` and the specs resolve on `master`.

## Progress log

- 2026-08-25: AX retrofit session. Audit (6-source analysis: codebase, Langium example, TypeFox blog, EclipseCon transcripts, sprotty `agent-docs` branch), verified command block, docs nucleus written, doc rot fixed. Items 1–2 shipped. A doc-freshness check script was trialled during the session and then removed at the maintainer's request — adding one later is a deferred decision (see open questions).

## Decision log

- 2026-08-25: No design-docs/ directory for now — the rescued rationale fits in ADRs and ARCHITECTURE.md *why* paragraphs; sprotty's `view-model-doctrine.md` stays the single source for the text-first editing doctrine.
- 2026-08-25: One product spec only (webview protocol) — the single evidence-triggered candidate (cross-repo reliance by langium-sprotty and the sprotty client-server spec).
- 2026-08-25 (maintainer): Node version stays unpinned — CI's Node 22 remains the only pin; accepted gap, not an open item.
- 2026-08-25 (maintainer): test framework is vitest; CONTRIBUTING's wiki pointer replaced with in-repo docs; cross-repo references to the sprotty repo's docs/ stay, verified after the `agent-docs` branch merges.

## Open questions

- Doc-freshness sensor: the maintainer may add a check for commands/paths cited in agent docs at a later point (2026-08-25: trialled and removed for now — maintainer decision).
- Peer-dependency strategy for `sprotty` and `vscode-messenger` — regular deps risk silent version skew downstream, but converting is a breaking change.
- CHANGELOG accuracy: the v1.1.0 entries state `vscode-messenger` 0.5.1 while dependencies are `^0.6.1`, and post-release bumps (LSP v10 / 3.18, PR #129) have no entries — correct retroactively or at next release?
- Upstream feedback: the sprotty repo's `edge-routing` product spec says "sprotty-vscode rebinds `ManhattanEdgeRouter`" — the rebind actually lives in the *States example webview* (`examples/states-langium/webview/src/di.config.ts`), not in the library packages. Report on the `agent-docs` branch before it merges.
