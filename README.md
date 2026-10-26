# strategoi

TypeScript platform monorepo: a Node API, a React front end and shared packages, so configuration
logic is written once and runs on both sides. See the portfolio's decision 0012 and
`plans/strategoi-platform.md`.

```
apps/       things you run (server, web, scripts)
packages/   shared code the apps import
```

## Run

```bash
pnpm install
pnpm build
pnpm test
pnpm start
```
