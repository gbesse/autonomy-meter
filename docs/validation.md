# Release validation

This document records what was verified for the initial public alpha.

- Node.js 24.11.1 on macOS: source syntax checks, TypeScript 5.9.3 declaration-consumer checks, unit/integration tests, and offline demo.
- GitHub Actions is configured for Node.js 22 and 24; results are available on the repository Actions page.
- No local, production or remote build is configured or required.
- No live Jev API call or accuracy benchmark was performed: no TypeSafe credential was available in the implementation environment.
- Samples are synthetic and can be reproduced from the committed source.
- Tests verify held-out selection, missing labels, Wilson bounds, score boundaries, subgroup escaping, CLI exit codes and HTML output.
- The report slider script is tested in an isolated JavaScript context with a minimal DOM model. Visual browser inspection was unavailable because the browser policy rejected the local file URL; no visual QA claim is made.
