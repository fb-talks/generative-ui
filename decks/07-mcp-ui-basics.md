---
marp: true
title: MCP UI — the basics
section: MCP UI
---

# MCP UI & MCP Apps

When a tool answers with an **interface** instead of text.

Note: the title of the talk is also the title of this section — everything up to here was the why, from here it is the how. From tools that answer with text to tools that answer with interfaces.

---

## The problem

An MCP tool can return exactly one thing: text. JSON at best, which the model then summarises… as text.

```json
{
  "content": [
    { "type": "text", "text": "Rome: 23°, clear sky" }
  ]
}
```

- perfect for a single value
- useless for components (lists, maps, ...) and apps
- the user can **re-read**, not **act**

Note: this is not about looks. A conversation is an extremely narrow interface: every interaction costs a full round trip through the model.

---

## The idea

Along with the result, the tool declares **a UI to render**.

```mermaid
flowchart LR
  U[User] --> H[Host / Chat]
  H -->|tool call| S[MCP Server]
  S -->|result + ui://…| H
  H -->|sandboxed iframe| W[Widget]
  W -->|postMessage| H
```

The host knows nothing about the widget: it downloads it from the server and runs it **isolated**.


---

![Host app anatomy: browser window → host app → widget container → AppRenderer proxy layer → sandboxed iframe → widget HTML](assets/mcp_ui_nested_mockup_1788469651956.jpg)

Note: same layers, seen in a full host application. The numbers walk outside-in: browser window, host app (localhost:5173), the widget container, the `AppRenderer` proxy layer, and the sandboxed `iframe` on the server's origin (localhost:3010) running `buildings-widget.html`. Keep these layers in mind — the next slide is the same picture as an architecture diagram.



---

![Widget embedded in a chat message: bubble → host UI container → AppRenderer → sandboxed iframe → widget](assets/mcp_ui_chat_inline_mockup_1788469813154.jpg)

Note: this is the classic placement — the widget rendered inline in the conversation stream. From the outside in: the chat message bubble, the host's UI container, the `AppRenderer`, the sandboxed `iframe`, and finally the widget itself with its property cards. **Next slide is the live demo** — the same picture, running: ask it *"immobili a Roma sotto i 500.000"* and let the widget appear inside the conversation. Then come back and we build it.



---

<!-- demo: http://localhost:5173/#/ -->

## MCP Demo

> "immobili a Roma sotto i 500.000 euro"

---



## MCP UI → MCP Apps


```json [1-6|8-12]
// server/package.json — exposes the tools and the UI resources
{ 
  "@mcp-ui/server": "*.*.*", 
  "@modelcontextprotocol/sdk": "*.*.*",
  "@modelcontextprotocol/ext-apps": "*.*.*"
}

// client/package.json — calls the tool, mounts the widget
{ 
  "@mcp-ui/client": "*.*.*",
  "@modelcontextprotocol/sdk": "*.*.*"
}
```



Note: `ext-apps` is the official MCP package; `@mcp-ui/*` builds on it. Server side the demo uses both: `createUIResource` from mcp-ui, `registerAppTool` / `registerAppResource` from `@modelcontextprotocol/ext-apps/server`. Client side it's gone — nothing under `src/` imports it. It does come back inside the **widget**, but over HTTP: the server serves the `app-with-deps` bundle at `/ext-apps.js` and the iframe imports the `App` class from there, so the widget needs no build step at all.

---

## The three pieces

| | |
| --- | --- |
| **Server** | exposes the tool **and** the UI resource (`@mcp-ui/server`) |
| **Host** | calls the tool and mounts the widget (`@mcp-ui/client`) |
| **Widget** | HTML/JS running inside a sandboxed iframe |

<p class="fragment">The widget cannot touch the host's DOM, the host's network, or the model.<br>It only speaks using <code>postMessage</code>.</p>

---

## The server: one endpoint

An Express route. One `McpServer` per session, tools registered into it.

```ts [1-2|4-7|9-12|14]
// Handle POST requests for client-to-server communication.
app.post("/mcp", async (req, res) => {
  let transport: StreamableHTTPServerTransport;
  // … 

  const server = new McpServer({
    name: "mcp-apps-demo",
    version: "1.0.0",
  });

  registerHelloTool(server);        // ← one tool + its UI resource
  registerWeatherTool(server);
  registerColorTool(server);
  registerBuildingsTool(server);

  await server.connect(transport);
});
```

Nothing here knows about UI yet. Everything that follows lives inside **one** of those `register…Tool` lines.

Note:
- this is `server/src/_index-simplified.ts`, trimmed of the session bookkeeping. The route itself is ordinary Express — MCP rides on `POST /mcp` and the `StreamableHTTPServerTransport` speaks the protocol; the same file also has `GET /mcp` (the server→client stream) and `DELETE /mcp` (session teardown), both one-liners onto the same transport
- **why inside the handler**: a new `McpServer` per session, kept in a map keyed by the `mcp-session-id` header. Sessions are stateful because the transport can push notifications back; a stateless variant exists if you don't need that
- `name` and `version` are what the client sees in the `initialize` response — the server's identity card, nothing more
- the four `register…Tool` are just my own functions, one file each: inside, `registerAppTool` + `registerAppResource`. The next slides open one of them
- this same Express app serves two more files on `3010`: `sandbox_proxy.html` and `ext-apps.js`. Both come back later — and the fact that they are served **here** and not from the host app is the whole security story

---

## The smallest possible widget

### Step1: Register the tool

```ts [1|3|5-12|14-15]
import { createUIResource } from "@mcp-ui/server";

function registerHelloTool(server: McpServer) {
  //  1. create the resource
  const helloUI = createUIResource({
    // the address: free-form after ui://
    uri: "ui://fb-server/hello-widget",  
    // content encoding: text or blob (base64)
    encoding: "text",
    // One inline HTML string. Can be a full HTML/JS app. No Build or frameworks. 
    content: { type: "rawHtml", htmlString: `<h1>Hello from MCP UI 👋</h1>` },
  });

  // 2...
  // 3...
}
```

That URI is an **address**, not a file: nothing resolves `fb-server` or `hello-widget`, they're just a made-up unique string. 

Note:
On its own this resource does nothing, until it gets published and pointed at by a tool — steps 2 and 3, coming up.

 this is the whole trick in five lines — a string of HTML wrapped in an MCP resource with a `ui://` URI. In the demo `htmlString` comes from an `.html` file sitting next to the tool (`readFileSync`): same resource, different source. A static `<h1>` needs nothing else: no handshake, no postMessage, no JS at all. Everything that follows (files on disk, tool data, the `App` class) is this, plus layers. On the options: `encoding: "text"` means plain HTML, `"blob"` means base64; there is also an `adapters` option that injects a compatibility shim for widgets written against **other** protocols (the legacy MCP-UI postMessage messages, or ChatGPT's Apps SDK) — a widget that speaks native MCP Apps, like all of ours, doesn't need it.

---

## Two ways to ship the UI

| `type` | what you send | when |
| --- | --- | --- |
| `rawHtml` | an HTML string | self-contained widgets, zero build |
| `externalUrl` | a URL in an iframe | a real app, already deployed |

```ts
content: { type: "rawHtml", htmlString: "<h1>Hello from MCP UI 👋</h1>" }

content: { type: "externalUrl", iframeUrl: "https://www.fabiobiondi.dev" }
```

Same `content` field, two shapes: the `type` decides which second key it takes — `htmlString` or `iframeUrl`.

Note: every example here uses rawHtml, read from an .html file sitting next to the tool — you edit it like an ordinary page. The union is discriminated: with `rawHtml` the payload key is `htmlString`, with `externalUrl` it is `iframeUrl`, and TypeScript will not let you mix them.

---

## Publishing the resource

Step 2: give the UI an address the host can fetch.

```ts [1-7|3|4|6]
// 2. the resource: the host fetches it with resources/read
registerAppResource(server,
  "hello_world_ui",       // a label for resources/list — links nothing
  helloUI.resource.uri,   // "ui://fb-server/hello-widget" — the address
  {},                     // optional: CSP, sandbox permissions, border
  async () => ({ contents: [helloUI.resource] }),
);
```

An ordinary MCP resource that happens to live at a `ui://` address. Still nobody points at it.

Note:
- resource and tool are **two different MCP primitives**. MCP UI invents nothing new, it just ties them together — the tie is the next slide
- the resource is an ordinary resource that happens to use a `ui://` URI: the host fetches it with `resources/read` exactly like any other
- the `_meta` here (4th argument, empty in the demo) is optional: per spec (`McpUiResourceMeta`) it carries `csp`, `permissions`, `domain`, `prefersBorder` — security and rendering, **not** the link. What marks the resource as a UI is the mimeType `text/html;profile=mcp-app`, which `registerAppResource` sets by default, plus the `ui://` scheme — the client checks both before mounting
- where does that label (`"hello_world_ui"`) actually show up? Only in the `resources/list` response, as the `name` field next to `uri` and `mimeType` — so in the MCP Inspector (`npm run inspector`), in a host's resource picker, or to a widget that asks the host for the resource list. **Never** on the rendering path: the host goes `tools/list` → `_meta.ui.resourceUri` → `resources/read`, and never calls `resources/list` at all. Which is why the demo's `weather_dashboard_ui2` — left over from renames — could stay wrong forever without anyone noticing
- the URI's shape is convention too: only `ui://` is enforced (`@mcp-ui/client` throws `Invalid UI resource URI` otherwise). Nothing resolves what comes after — it just has to be unique within the server
- `registerAppTool` / `registerAppResource` come from `@modelcontextprotocol/ext-apps`, not from mcp-ui: thin wrappers over `registerTool` / `registerResource` that take care of the `_meta`. You can do it by hand
- the last argument is the read callback: it runs on every `resources/read`, but the HTML was read from disk with `readFileSync` **once**, at registration time — the widget is not rebuilt on every call (in dev `tsx watch` restarts the server for you)

---

## Binding the tool to the UI

Step 3: the tool says **where** its UI lives — and answers.

```ts [1|2|3-7|9-16|14]
registerAppTool(server,
  "hello_world",          // the tool name: what the model calls
  { 
    description: "Shows a minimal 'Hello world' widget…",
    inputSchema: { name: z.string().optional() },
    _meta: { ui: { resourceUri: helloUI.resource.uri } } 
  },   

  async ({ name }) => {
    return {
      content: [
        { type: "text", text: `Hello ${name}` },   // ← for the model
      ],
      structuredContent: { name: name || "world" },  // ← for the widget
    };
  },
);
```

Three different strings, **one** of them does the binding — and **two** answers: prose for the model, data for the widget.

Note:
- **only the URI binds**, and it has to appear identical in two places: the address the resource is registered at (previous slide) and `_meta.ui.resourceUri` here. If the two don't match character for character the host finds nothing and silently falls back to text — the most annoying failure mode there is
- the three strings are **unrelated on purpose**: `"hello_world_ui"` is just the resource label, `"hello_world"` is the tool name the model calls, and the URI is the address. They could be pippo, pluto and topolino — the official ext-apps example pairs `"Weather View"` with `ui://weather/view.html`
- the handler is an **ordinary tool handler** — nothing UI-specific in it. The two channels leave together and go to different readers: `content` is prose the **model** will read, `structuredContent` is data the **widget** will read. Same call, two audiences
- **`structuredContent` is optional** in the protocol (`CallToolResult` declares it so), and a widget can technically read `content[0].text` too — don't. That string is written for the model and changes whenever you reword it; a widget that parses it is back to parsing prose, which is the problem we started from
- also worth knowing if someone asks: neither `structuredContent` nor the listeners are required for a widget to **appear**. A static `<h1>` with no `App` class renders perfectly (slide "The smallest possible widget"). The listeners are how a widget learns something about the call, not how it gets on screen
- host-side the order is `tools/list` → sees the `_meta` → `resources/read` → mounts the iframe. The resource is fetched once and reused: **N tools can point at the same UI**
- the point worth saying out loud: a host that knows nothing about MCP Apps ignores the `_meta` and still gets the textual `content`. **The tool keeps working everywhere** — you are adding a layer, not breaking compatibility

---

## The tool in one file

```ts [1-2|4-8|10-12|14-22]
const htmlPath = path.join(__dirname, "hello-widget.html");   // a plain .html file
const htmlString = fs.readFileSync(htmlPath, "utf8");

const helloUI = createUIResource({            // 1. create
  uri: "ui://fb-server/hello-widget",         //    the address, made up but unique
  encoding: "text",
  content: { type: "rawHtml", htmlString },
});

registerAppResource(server, "hello_world_ui", helloUI.resource.uri, {},
  async () => ({ contents: [helloUI.resource] }),   // 2. publish it for resources/read
);

registerAppTool(server, "hello_world", {      // 3. bind + answer
  description: "Shows a minimal 'Hello world' widget…",
  inputSchema: { name: z.string().optional() },
  _meta: { ui: { resourceUri: helloUI.resource.uri } },   // ← same address as above
},
  async ({ name }) => ({
    content: [{ type: "text", text: `Hello widget shown (${name}).` }],
    structuredContent: { name: name || "world" },
  }),
);
```

Note: the recap — the three steps we just built one at a time, as they really sit in a single file (`server/src/hello-tool.ts`). Nothing here is new except the first two lines: in the demo `htmlString` is read from `hello-widget.html` sitting next to the tool, so you edit the widget like an ordinary page. Worth saying: step 2, `registerAppResource`, is the one people forget — without it the host asks `resources/read` for that URI and gets nothing, so the widget never appears even though the tool answers fine. This is the whole server side: from here on we cross to the host, and then into the widget itself.

---

## What the host does

1. calls the tool
2. sees `_meta.ui.resourceUri` in the tool definition
3. fetches the resource with `resources/read`
4. mounts it in a sandboxed iframe and hands it the data

Note: four steps, zero hand-rolled routing. Next we open the thing that gets mounted at step 4 — the widget itself — and only after that the piece that ties all four together on the host side: `AppRenderer`.

---

## The widget: `hello-widget.html`

An ordinary HTML file. No build, no framework, no bundler.

```html [1-4|8-10|18-19|22|12-15]
<div class="hw-root">
  <div class="hw-title" id="hw-title">Hello, world!</div>
  <div class="hw-sub">Rendered by the MCP server — display only, no actions.</div>
</div>

<script type="module">
  // the App class, served by the MCP server itself
  import { App } from "http://localhost:3010/ext-apps.js";

  const app = new App({ name: "hello-widget", version: "1.0.0" });

  function greet(name) {
    if (!name) return;
    document.getElementById("hw-title").textContent = "Hello, " + name + "!";
  }

  // the model's arguments, then the server's structuredContent
  app.addEventListener("toolinput", (input) => greet(input?.arguments?.name));
  app.addEventListener("toolresult", (result) => greet(result?.structuredContent?.name));

  // listeners BEFORE connect() — from here on the host pushes the data
  await app.connect();
</script>
```

Note: this is `server/src/hello-widget.html`, the file `readFileSync` picked up on the recap slide — minus its `<style>` block, which is only cosmetics. Points to make: it is a plain page, opened in an editor like any other; the only import is the `App` class, and it comes over HTTP from our own MCP server (`/ext-apps.js`), so the widget needs no build step and the talk needs no network. `toolinput` fires first with what the model decided (it arrives while the tool is still running), `toolresult` second with what the server actually returned — `structuredContent` wins, which is why `greet` is called twice and the second call is the authoritative one. And the order rule again: listeners registered before `connect()`, or the first notifications land in the void. If you meet the `app.ontoolinput = …` setters in older examples: same payload, but deprecated since 1.7.x — `addEventListener` composes with other listeners and can be removed.

On `connect()`: it performs the `ui/initialize` handshake over postMessage with the host, and only after that does the host start pushing `ui/notifications/tool-input` and `ui/notifications/tool-result`. That is the whole reason the order matters. The class comes from `http://localhost:3010/ext-apps.js` — the `app-with-deps` bundle shipped inside the package and served by our own MCP server, so the widget needs no build step and the talk needs no network. And if you ever meet the old hand-rolled protocol (`ui-lifecycle-iframe-ready` / `render-data`): it is deprecated, and it is exactly what the `adapters` shim translates.

---

## Where that import comes from

The widget's only dependency, served by the MCP server itself.

```ts [1-4|6-8]
// the App class as a self-contained ESM bundle, shipped inside the package
const extAppsBundle = require.resolve(
  "@modelcontextprotocol/ext-apps/app-with-deps",
);

app.get("/ext-apps.js", (_req, res) => {
  res.sendFile(extAppsBundle);
});
```

Six lines of Express. The widget writes `import { App } from "http://localhost:3010/ext-apps.js"` — **no build, no bundler, no CDN**.

Note: this is the other half of the widget's import line, and it lives in `server/src/_index-simplified.ts` right next to the `/mcp` route. Points worth making:

- it is **the same file that sits in `node_modules`** — `app-with-deps` is a prebuilt, self-contained ESM bundle (~330 KB) that the package ships precisely for this. Nothing is compiled at runtime
- the `cors({ origin: "*" })` a few lines above is not decoration: the iframe is on a **different origin**, so without those headers the `import` is blocked. Same reason the MCP endpoint needs them
- **why the server and not the host app**: the widget belongs to the server, so its dependency should too. The host stays ignorant — it does not bundle anything for a widget it has never seen, which is the whole point of embedding third-party UI
- you *could* import from a CDN (esm.sh, unpkg) and skip this route entirely — but then a conference room with bad wifi kills your demo, and the sandbox CSP has to allow that origin. In production: serve it from your own domain, versioned and cached
- **on stage**: open `http://localhost:3010/ext-apps.js` in a tab. It is just a JS file. That usually removes the last bit of magic

---


## The host, in React

Those four steps, in code: connect, call the tool, hand the result to `AppRenderer`. Nothing else.
 
```tsx [1|2|5-6|8-13|18-23]
const TOOL = { name: "hello_world", input: { name: "Fabio" } };
const SANDBOX = { url: new URL("http://localhost:3010/sandbox_proxy.html") };

export function MinimalTool() {
  const [client, setClient] = useState<Client | null>(null);
  const [result, setResult] = useState<any>();

  useEffect(() => {
    createMcpClient("http://localhost:3010/mcp").then(async (c) => {
      setClient(c);
      setResult(await c.callTool({ name: TOOL.name, arguments: TOOL.input }));
    });
  }, []);

  if (!client) return <p>Connecting to MCP server…</p>;

  return (
    <AppRenderer
      client={client}
      toolName={TOOL.name}
      toolInput={TOOL.input}
      toolResult={result}
      sandbox={SANDBOX}
    />
  );
}
```

Note: worth saying out loud, because the words collide: **this component is the host** — it owns the conversation, decides to call the tool and mounts the widget. The MCP **client** is one line inside it, the object `createMcpClient` returns: a single connection to a single server. Host = the app, client = its connection. This is `MinimalTool.tsx` from the demo, trimmed only of the unmount cleanup (`mcp?.close()`). No `onMessage`, `onSizeChanged`, `onFallbackRequest`: a widget that just displays data doesn't need them — they show up in the next examples, once the widget starts talking back. `createMcpClient` is three lines: `new Client(...)` with `@mcp-ui/client`'s `UI_EXTENSION_CAPABILITIES`, then `connect()` over a `StreamableHTTPClientTransport`.

---

## Host ↔ widget communication

Two directions, one channel: `postMessage` across the sandbox boundary.

```mermaid
flowchart LR
  H[Host - AppRenderer] -->|tool-input, tool-result| W[Widget - App]
  W -->|message, size-changed, open-link, tool call| H
```

| | |
| --- | --- |
| **host → widget** | the host **pushes**. The widget can only listen |
| **widget → host** | the widget **asks**. The host decides — and may refuse |

No DOM, no network, no model: everything the widget wants, it has to request.

Note: this is the frame for the next two slides — first the catalogue of what a widget can ask for, then one request end to end. The sentence to land: the widget never *performs* anything outside its own iframe. It cannot resize itself, cannot open a tab, cannot write in the chat. It asks, and the host is free to say no — which is precisely why you can embed a widget written by someone else. Incoming we already saw: `toolinput` and `toolresult`. This slide is about the arrow going the other way.

---

## From the widget outwards

Every `App` method is JSON-RPC over `postMessage` underneath.

| call | wire method | effect |
| --- | --- | --- |
| `app.sendMessage(…)` | `ui/message` | writes into the conversation, the model replies |
| `app.sendSizeChanged(…)` | `ui/notifications/size-changed` | asks the host to resize it |
| `app.openLink(…)` | `ui/open-link` | opens a URL |
| `app.callServerTool(…)` | `tools/call` | calls an MCP tool |
| `app.request({ method: "x/…" })` | *custom* | lands in `onFallbackRequest`: drives **the host app** |

Note: the first four are standard. The last one is the side door — the host decides what it accepts. Three of these five come back with a slide of their own in the examples: `sendSizeChanged`, `sendMessage` and the custom `request`. `openLink` and `callServerTool` you will only meet here — worth one sentence each: `callServerTool` lets the widget call an MCP tool **directly**, without a round trip through the model (no tokens, no latency, deterministic), while `sendMessage` goes through the model on purpose, when you *want* it to decide.

---

## One request, both sides

The widget **asks**; the host receives it as a prop and decides.

<div style="display: flex; gap: 2rem; align-items: flex-start;">
<div style="flex: 1;">

**In the widget** — `hello-widget.html`

```js
card.onclick = () => {
  app.openLink({
    url: "https://www.fabiobiondi.dev",
  });
};
```

</div>
<div style="flex: 1;">

**In the host** — `AppRenderer`

```tsx
<AppRenderer
  onOpenLink={async ({ url }) => {
    if (!allowed(url)) throw new Error("no");
    window.open(url, "_blank");
    return {};
  }}
/>
```

</div>
</div>

No `window.open` inside the iframe: it is sandboxed, cross-origin, and it would not work. `ui/open-link` travels, the host opens the tab.

Note: the shape is the same for all of them — a method on `App` in the widget, a matching `on…` prop on `AppRenderer` in the host: `sendMessage` → `onMessage`, `sendSizeChanged` → `onSizeChanged`, `openLink` → `onOpenLink`, `callServerTool` → `onCallTool`, and any custom method → `onFallbackRequest`. Two things to say out loud here. First: the host handler is where the **policy** lives — that `if (!allowed(url))` is not decoration, it is the whole reason this is a request and not an action; a widget from a third-party server cannot open anything it likes in your app. Second: the handler is `async` and returns a value, so the widget gets an answer back — the same mechanism the colour picker uses in the examples to drive the host's own background.

---

## The whole picture

```mermaid
flowchart LR
  subgraph PAGE[Web page - origin A]
    CL[MCP Client]
    AR[AppRenderer]
    subgraph IFR[sandbox iframe - origin B]
      WD[sandbox_proxy.html, then the widget]
    end
  end
  subgraph SRV[MCP Server - origin B]
    TL[tools]
    RS[UI resources - ui://...]
  end
  CL -->|tools/call| TL
  CL -->|resources/read| RS
  RS -->|widget HTML| AR
  AR -->|html, then tool-input / tool-result| WD
  WD -->|ui/message, size-changed| AR
```

**Two origins** (A can't touch B) and **two transports**: HTTP on the left, `postMessage` on the right.

Note: the one thing worth pointing at out loud — after step 3 the proxy **is** the widget: `document.write` replaced that document, so steps 4 and 5 are the widget talking to the host **directly**, `window.parent` with no relay in between. The proxy's whole job is steps 1 and 2. Note also that server and sandbox share origin B here only because it's a demo on localhost: what matters is that they are *not* origin A.

---

## Sandbox

`AppRenderer` doesn't put the widget straight into the page: it mounts an iframe pointing at a **proxy**.

```tsx [1|3-8|7]
const SANDBOX = { url: new URL("http://localhost:3010/sandbox_proxy.html") };

<AppRenderer
  client={client}
  toolName={TOOL.name}
  toolResult={result}
  sandbox={SANDBOX}     // ← the iframe points here, not at the widget
/>
```

- the proxy is served from a **different origin** than the app (`3010` vs the host) — that's what actually isolates it, not the `sandbox` attribute
- no cookies, no storage, no host DOM reachable from the widget: only `postMessage`

Note: `@mcp-ui/client` still sets `allow-scripts allow-same-origin allow-forms` on the proxy iframe — "same-origin" here means "keep your own origin," not "share the parent's." The real isolation comes from that origin being `localhost:3010`, different from the host's: the proxy's cookies and storage stay invisible to the host and vice versa. Cross-origin also works around a Chrome bug in WindowProxy identity between same-origin iframes.

---

## The proxy is a blank page

`public/sandbox_proxy.html` — served static by the MCP server. That's all of it.

```html
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Sandbox Proxy</title>
    <style>
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <script>
      /* twenty lines — next slide */
    </script>
  </body>
</html>
```

An empty page whose only two qualities are: it lives on **the server's origin**, and it knows how to receive HTML.

Note: this is the actual file from the demo, `demo/mcp-ui-demo/public/sandbox_proxy.html`, served by `app.get("/sandbox_proxy.html", …)` next to the `/mcp` and `/ext-apps.js` routes. Two things to say. First, there is genuinely nothing here — no framework, no dependency, no styling beyond "fill the iframe": people expect the sandbox to be a heavy piece of machinery, and it is a blank page. Second, and this is the part that matters: the file is trivial, but **who serves it is not**. It is on `localhost:3010`, the server's origin, not the host app's — that single fact is what makes the widget unable to touch the host's cookies, storage and DOM. The isolation is in the URL, not in the code.

---

## Inside the sandbox proxy

Minimal handshake: the proxy says "ready", the host hands it the HTML, it writes it.

```js [1-3|5-13|15-19]
window.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.method === "ui/notifications/sandbox-resource-ready") {
    const { html } = data.params || {};
    if (html) {
      document.open();
      document.write(html);
      document.close();
    }
  }
});

// Signal that the sandbox proxy is ready
window.parent.postMessage(
  { method: "ui/notifications/sandbox-proxy-ready", params: {} },
  "*",
);
```

Note: this is (almost) all of `sandbox_proxy.html` — the minimal version from the official mcpui.dev walkthrough, simplified today from an earlier version with a nested iframe. `@mcp-ui/client` listens for exactly that first `postMessage` (`ui/notifications/sandbox-proxy-ready`) before sending the widget's HTML, with a 10s timeout: if the proxy never sends it, `AppRenderer` errors out with "Timed out waiting for sandbox proxy iframe to be ready" and the widget never loads. `document.write()` replaces the entire document — listeners included — so this minimal version can't receive a second widget in the same iframe.

---

## One proxy, one widget

Direct consequence of `document.write()`: the proxy has to be **remounted** on every tool call.

```tsx
<AppRenderer key={toolData.callId} … />
```

One prop more than before — and it is the whole architecture.

- `key={callId}` forces React to throw away the old iframe and mount a fresh one
- every widget starts from a clean `document.write()`, never a recycled one

Note: this is today's simplification trade-off. The earlier version used a nested iframe (`srcdoc`) inside the proxy, so the proxy itself survived multiple tool calls and only the inner iframe got swapped. Here that reuse is lost, but you gain a ~20-line file readable in a single slide — and that's exactly what a live demo needs, where every tool call is already a fresh `<AppRenderer key={callId}>` anyway.
