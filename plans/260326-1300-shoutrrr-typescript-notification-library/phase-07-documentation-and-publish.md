# Phase 7: Documentation & Publish

## Context Links
- [Plan Overview](./plan.md)

## Overview
- **Priority:** P2
- **Status:** pending
- **Effort:** 1h
- **Description:** Write README, add examples, prepare for npm publish.

## Key Insights
- README is the #1 adoption driver for npm packages
- Show the one-liner first, details later
- Service URL reference table is critical
- Examples should be copy-pasteable

## Requirements

### Functional
- README.md with: badges, install, quick start, API reference, services table, custom service guide
- Example files in `examples/` directory
- CHANGELOG.md
- CONTRIBUTING.md (brief)

### Non-functional
- README < 300 lines
- Examples runnable with `npx tsx examples/basic.ts`

## Related Code Files

### Files to Create
- `README.md`
- `CHANGELOG.md`
- `CONTRIBUTING.md`
- `examples/basic-send.ts`
- `examples/multi-service-sender.ts`
- `examples/custom-service.ts`
- `examples/fallback-strategy.ts`

## Implementation Steps

### Step 1: README.md

Structure:
1. **Title + tagline**: "Send notifications to Slack, Discord, Telegram, and more with a single URL"
2. **Badges**: npm version, license, CI status, bundle size
3. **Install**: `npm install shoutrrr`
4. **Quick Start**: The one-liner + createSender
5. **Services Table**: scheme, example URL, docs link
6. **Strategies**: fallback, broadcast, round-robin
7. **Custom Services**: registerService() example
8. **API Reference**: send(), createSender(), Sender, types
9. **Shoutrrr Compatibility**: note on Go Shoutrrr URL compatibility
10. **Contributing**: link to CONTRIBUTING.md

### Step 2: Examples

**basic-send.ts:**
```typescript
import { send } from 'shoutrrr';
const result = await send('ntfy://my-topic', 'Deployment complete!');
console.log(result.success ? 'Sent!' : `Failed: ${result.error?.message}`);
```

**multi-service-sender.ts:**
```typescript
import { createSender } from 'shoutrrr';
const sender = createSender([
  'slack://hook:token@webhook',
  'discord://token@webhookId',
  'ntfy://alerts',
], { strategy: 'broadcast' });
const results = await sender.send('Server alert: CPU > 90%');
results.forEach(r => console.log(`${r.service}: ${r.success}`));
```

### Step 3: npm Publish Prep

1. Verify package.json fields (name, version, description, keywords, repository, license)
2. Add `prepublishOnly: "npm run build && npm test"` script
3. Verify `.npmignore` or `files` field limits published files to `dist/`, `README.md`, `LICENSE`
4. Dry run: `npm publish --dry-run`
5. Publish: `npm publish --access public`

### Step 4: GitHub Repo Setup

1. Create repo: `gh repo create shoutrrr --public`
2. Add topics: typescript, notifications, slack, discord, telegram
3. Add CI workflow: `.github/workflows/ci.yml` (build + test on push)
4. Add release workflow: `.github/workflows/release.yml` (npm publish on tag)

## Todo List

- [ ] Write README.md
- [ ] Write CHANGELOG.md (v0.1.0)
- [ ] Write CONTRIBUTING.md
- [ ] Create example files (4)
- [ ] Add GitHub Actions CI workflow
- [ ] Verify npm publish dry-run
- [ ] Create GitHub repo
- [ ] Initial commit and push
- [ ] Publish v0.1.0 to npm

## Success Criteria
- README clearly explains installation, usage, and services
- Examples are runnable
- `npm publish --dry-run` succeeds
- CI workflow passes
- Package installable: `npm install shoutrrr`

## Risk Assessment
- **npm name "shoutrrr"**: May already be taken. Check `npm view shoutrrr`. Fallback names: `@shoutrrr/core`, `shoutrrrjs`, `shoutrrr-node`.

## Next Steps
- Post-MVP: Add more services (Teams, Pushover, Gotify, Matrix, etc.)
- Post-MVP: Message templates
- Post-MVP: Retry/backoff configuration
- Post-MVP: Per-service timeout configuration
