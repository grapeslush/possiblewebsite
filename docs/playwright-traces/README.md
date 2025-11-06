# Playwright trace artifacts

This directory stores reference traces generated from the end-to-end suite. Each trace captures a full browser session and can be opened with the Playwright Trace Viewer.

## Viewing a trace

First decode the base64 artifact to a zip file:

```bash
base64 --decode docs/playwright-traces/help-center.trace.base64 > docs/playwright-traces/help-center.trace.zip
```

Then launch the viewer:

```bash
npx playwright show-trace docs/playwright-traces/help-center.trace.zip
```

## Regenerating traces

To refresh the artifacts locally run:

```bash
pnpm --filter web test:e2e -- --trace on --project=chromium
find apps/web/test-results -name '*.zip' -exec bash -c 'base64 "$0" > "docs/playwright-traces/$(basename "$0" .zip).base64"' {} \;
```

Keep only the most relevant traces to avoid bloating the repository.
