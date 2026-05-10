# Source Workspace

All application code lives here.

## Layout

```
src {
  app {
    layout.tsx, globals.css,
    (personal) {},
    (massage) { layout.tsx, page.tsx }
  }
}
```

## Route groups

- `(personal)` and `(massage)` share the root layout but have independent pages, layouts, and components.

## Scripts

Available in `package.json`:
- `npm run dev` — local dev server
- `npm run build` — `next build`
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`
