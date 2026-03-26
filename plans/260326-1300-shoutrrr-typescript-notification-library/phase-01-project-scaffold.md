# Phase 1: Project Scaffold & Tooling

## Context Links
- [Plan Overview](./plan.md)
- [Architecture Recommendations](../reports/architecture-recommendations.md)

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** 2h
- **Description:** Initialize repo, configure TypeScript, tsup, Vitest, ESLint, and project structure.

## Key Insights
- Zero runtime deps is a hard constraint; devDependencies only
- ESM+CJS dual output via tsup
- Node.js 18+ means native fetch, no polyfill needed
- Vitest chosen over Jest for speed and native ESM support

## Requirements

### Functional
- Git repo initialized with .gitignore
- package.json with correct fields for npm publishing
- TypeScript strict mode
- tsup config for dual ESM/CJS output
- Vitest config
- ESLint + Prettier (minimal, not harsh)

### Non-functional
- Build time < 5s
- Zero runtime dependencies in final bundle

## Architecture

```
shoutrrr/
  src/
    core/
    services/
    strategies/
    index.ts
  tests/
    unit/
    integration/
  package.json
  tsconfig.json
  tsup.config.ts
  vitest.config.ts
  .eslintrc.cjs
  .prettierrc
  .gitignore
  LICENSE
  README.md
```

## Related Code Files

### Files to Create
- `package.json` -- name: "shoutrrr", type: "module", exports for ESM+CJS
- `tsconfig.json` -- strict, ES2022 target, NodeNext module
- `tsup.config.ts` -- entry: src/index.ts, format: [esm, cjs], dts: true
- `vitest.config.ts` -- globals: true, coverage provider
- `.eslintrc.cjs` -- typescript-eslint, minimal rules
- `.prettierrc` -- singleQuote, trailingComma, semi
- `.gitignore` -- node_modules, dist, coverage, .env
- `LICENSE` -- MIT
- `src/index.ts` -- placeholder export

## Implementation Steps

1. `npm init` with package name "shoutrrr"
2. Configure package.json fields:
   ```json
   {
     "name": "shoutrrr",
     "version": "0.1.0",
     "description": "Notification library for Node.js. Send messages to Slack, Discord, Telegram, Email, and more through URL-based configuration.",
     "type": "module",
     "main": "./dist/index.cjs",
     "module": "./dist/index.js",
     "types": "./dist/index.d.ts",
     "exports": {
       ".": {
         "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
         "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs" }
       }
     },
     "files": ["dist"],
     "engines": { "node": ">=18.0.0" },
     "keywords": ["notifications", "slack", "discord", "telegram", "email", "webhook", "ntfy", "shoutrrr", "apprise"]
   }
   ```
3. Install devDependencies:
   - `typescript` `tsup` `vitest` `@vitest/coverage-v8`
   - `eslint` `@typescript-eslint/eslint-plugin` `@typescript-eslint/parser`
   - `prettier`
4. Configure tsconfig.json: strict, ES2022, NodeNext moduleResolution, outDir: dist
5. Configure tsup: entry src/index.ts, format [esm, cjs], dts true, clean true
6. Configure Vitest: globals true, coverage v8
7. Add npm scripts: `build`, `test`, `test:coverage`, `lint`, `format`, `prepublishOnly`
8. Create directory structure: `src/core/`, `src/services/`, `src/strategies/`, `tests/unit/`, `tests/integration/`
9. Create placeholder `src/index.ts`
10. Verify: `npm run build` produces dist/ with .js, .cjs, .d.ts

## Todo List

- [ ] Initialize package.json
- [ ] Install devDependencies
- [ ] Configure TypeScript (tsconfig.json)
- [ ] Configure tsup (tsup.config.ts)
- [ ] Configure Vitest (vitest.config.ts)
- [ ] Configure ESLint + Prettier
- [ ] Create directory structure
- [ ] Create .gitignore, LICENSE
- [ ] Create placeholder src/index.ts
- [ ] Verify build succeeds
- [ ] Verify test runner works

## Success Criteria
- `npm run build` produces ESM + CJS + .d.ts in dist/
- `npm test` runs (even if 0 tests)
- `npm run lint` passes
- Zero runtime dependencies in package.json

## Risk Assessment
- **tsup config for dual output**: Well-documented, low risk
- **ESM/CJS interop**: Test both import styles in Phase 6

## Next Steps
- Proceed to Phase 2: Core Infrastructure
