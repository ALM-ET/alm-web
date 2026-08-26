# alm-web

The agency application — everything an agency's staff use day to day.

React 19 · Vite · Tailwind v4 · shadcn-style components · TanStack Query · React Router

## White-labelling rule

**Never write a literal colour class.** No `bg-indigo-600`, no `text-slate-900`.
Every colour comes from a semantic token (`bg-primary`, `text-muted-foreground`,
`bg-sidebar`) defined as a CSS custom property in `src/index.css`.

M4 rewrites those properties at runtime from a palette extracted out of the
agency's logo. A hard-coded colour is a white-labelling bug: it will survive
rebranding and look wrong for every agency but the one it was written for.

The same applies to layout: use logical properties (`ps-`/`pe-`, `start`/`end`)
rather than `pl-`/`pr-`/`left`/`right`, so enabling an RTL locale in M5 mirrors
the app without touching components.

## Navigation

`src/app/navigation.ts` is the single source of truth for the sidebar and the
⌘K palette. Each entry declares the module and permission that gate it, so a
disabled module or a restricted role removes it from both surfaces at once.
Route guards on the API re-check the same permission — the UI hiding an entry is
never the control.

## Auth

The access token lives only in `AlmClient`'s memory, never in `localStorage`, so
injected script cannot read a credential. Session continuity comes from an
httpOnly refresh cookie. On a cold load the first `/bootstrap` call 401s, the
SDK refreshes once from the cookie, and replays it.
