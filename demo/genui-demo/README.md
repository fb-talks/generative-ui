# Generative UI — three demos, from trivial to MCP-shaped

Gemini + TypeScript + React. The model **never generates code**: it picks a
component from a whitelist and fills its props. Three routes show the same idea
at three levels of maturity.

```
prompt ──▶ Gemini (JSON / tool call) ──▶ { component, props } ──▶ <Component {...props} />
```

## Run it

```bash
npm install
npm run dev
```

Paste a **Gemini API key** ([get one here](https://aistudio.google.com/apikey)).
It lives in the browser's `localStorage` — never in the code, never in a `.env`.
"change API key" clears it.

## Layout

Each demo is a **self-contained folder**: same three files, so you can open the
same file in each one and diff them live on stage.

```
src/
├── main.tsx                 router: / → /flat, /union, /tools
├── App.tsx                  shell: API key gate + tabs + <Outlet />
├── useApiKey.ts             the key, in localStorage
├── styles.css
├── shared/
│   ├── ApiKeyContext.ts     the key, handed down to the demos
│   └── DemoRunner.tsx       prompt box + examples + "rendered | raw JSON" panel
└── demos/
    ├── 01-flat/             route /flat
    │   ├── components.tsx   the catalog (all components share the same props)
    │   ├── genui.ts         the schema + the Gemini call
    │   └── Demo.tsx         the renderer: a registry lookup
    ├── 02-union/            route /union
    │   ├── components.tsx   3 components, 3 different signatures
    │   ├── genui.ts         one schema each, combined with anyOf
    │   └── Demo.tsx         the renderer: an exhaustive switch
    └── 03-tools/            route /tools
        ├── components.tsx   same catalog (duplicated on purpose: the folder stands alone)
        ├── genui.ts         one tool per component + functionCalling mode ANY
        └── Demo.tsx         the renderer: a registry, over a LIST of components
```

## The three demos

### 1 · Flat schema — `/flat`

One schema for everything: `{ component: enum, props: { title, text } }`.
All components share the same props, so rendering is a 4-line registry lookup:

```tsx
const Component = REGISTRY[spec.component];
return Component ? <Component {...spec.props} /> : null;
```

The simplest thing that works — and the honest limit to show next.

### 2 · `anyOf` discriminated union — `/union`

`Alert`, `UserCard`, `BarChart`, with **three different signatures**. One schema
each, combined with `anyOf`, discriminated by a single-value enum:

```ts
component: { type: Type.STRING, enum: ['Alert'] }   // a literal
```

The model can no longer pair one component's name with another's props. The
registry lookup stops typechecking, so the renderer becomes an exhaustive
`switch` — add a fourth component and TypeScript tells you where to go.

### 3 · Function calling — `/tools`

Same components, one **tool** each. `functionCallingConfig.mode = ANY` forces
the model to call a tool instead of replying with prose.

Three things you get for free:

1. every component self-describes (`description` per tool) → better selection as the catalog grows;
2. the model can emit **several calls** → a composed UI, not a single node (try *"introduce Ada Lovelace and chart her three main contributions"*);
3. `{ name, description, parameters }` **is** the shape of an MCP tool — this demo is the slide right before the MCP UI section.

## Talking points

- **The model chooses, it doesn't write JSX** → no `eval`, no arbitrary HTML, attack surface ≈ 0.
- **The schema is the contract** → an `enum` of component names means it can't invent a `<Foo>`.
- **The renderer still validates** → `if (!Component) return null`. Never trust the model blindly.
- **The casts are a lie at runtime.** `as UISpec` says nothing about what actually arrived.
  In production, validate with Zod (`safeParse`) and fall back to a plain-text component.
- **Don't hand-sync types and schemas.** With Zod v4: `z.toJSONSchema(props)` into
  `parametersJsonSchema` / `responseJsonSchema` (both accepted by `@google/genai`),
  `z.infer` for the TS type. One source of truth.

## Production note

The demo calls Gemini straight from the browser so it stays a single app. In a
real product the key lives on a server and the browser calls your backend, which
returns the same `{ component, props }` payload.
