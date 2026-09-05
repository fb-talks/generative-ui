---
marp: true
title: Progressive examples
section: Examples
---

# Four widgets

One at a time, each adding **one** thing.

---

## The ladder

| | widget | what's new |
| --- | --- | --- |
| 1 | `hello_world` | render and nothing else: the full round trip, no way back |
| 2 | `weather_dashboard` | typed data, the widget **negotiates its space** and talks to the model |
| 3 | `buildings_list` | input from the model, real data, **selection → conversation** |
| 4 | `color_picker` | the widget **drives the host app**, and waits for its answer |

Note: same architecture every time. All that changes is how many channels we open.

---

# 1 · hello_world

The bare minimum: the full round trip, one direction only.

---

## The tool

```ts [1-2|4-8|10-16|17-21]
const htmlPath = path.join(__dirname, "hello-widget.html");
const htmlString = fs.readFileSync(htmlPath, "utf8");

const helloUI = createUIResource({
  uri: "ui://hello-server/hello-template",
  encoding: "text",
  content: { type: "rawHtml", htmlString },
});

registerAppTool(server, "hello_world", {
  description: "Shows a minimal 'Hello world' widget…",
  inputSchema: {
    name: z.string().optional().describe("Name to greet, e.g. 'Fabio'"),
  },
  _meta: { ui: { resourceUri: helloUI.resource.uri } },
},
  async ({ name }) => ({
    content: [{ type: "text", text: `Hello widget shown (${name}).` }],
    structuredContent: { name: name || "world" },
  }),
);
```

Note: two results in one. `content` is for the model, `structuredContent` is for the widget. The model reads the sentence, the widget reads the object.

---

## The widget

```html [1-3|6|8-12|14-15]
<div class="hw-root">
  <div class="hw-title" id="hw-title">Hello, world!</div>
</div>

<script type="module">
  import { App } from "http://localhost:3010/ext-apps.js";

  const app = new App({ name: "hello-widget", version: "1.0.0" });
  app.ontoolresult = (result) => {
    const name = result.structuredContent?.name;
    if (name) hwTitle.textContent = "Hello, " + name + "!";
  };

  // callbacks first, then the ui/initialize handshake
  await app.connect();
</script>
```

No actions, no buttons: **display only**.

---

<!-- demo: http://localhost:5173/ -->

## Live

> "say hello to Fabio"

---

## What we learned

- a widget is **an HTML file**, not a component you have to build
- `structuredContent` is the contract between tool and widget
- the callbacks go **before** `connect()`, always

Note: 90% of blank widgets are those two lines in the wrong order — the notifications arrive right after the handshake, and a callback registered late has already missed them.

---

# 2 · weather_dashboard

The widget starts talking back.

---

## An output with a shape

```ts [5-11]
async ({ location }) => {
  const temperature = 23;
  const condition = "Sunny";
  return {
    content: [{ type: "text", text: `${location}: ${temperature}° (${condition})` }],
    structuredContent: {
      location,
      temperature,
      unit: "°C",
      condition,
    },
  };
}
```

The model gets the sentence. The widget gets the **fields**.

---

## New A — the widget asks for space

The host has no idea how big a widget is. The widget tells it.

```js [1-3|5-6|8-9]
// in the widget — autoResize off: this widget drives its size by hand
const app = new App({ name: "weather-widget", version: "1.0.0" },
                    {}, { autoResize: false });

// every click on "Resize Widget"
app.sendSizeChanged({ width: 560, height: 380 });

// host side
onSizeChanged={(d) => setWidgetSize({ width: d.width, height: d.height })}
```

Note: on the wire it's a `ui/notifications/size-changed` notification — the `App` class writes the JSON-RPC for you. By default the class also does this on its own: `autoResize: true` installs a ResizeObserver and keeps sending the measured content size (that's how hello and the color picker get sized without a single line). This widget wants to *choose* sizes, so it opts out. The demo's "Resize Widget" button cycles three sizes, so you can actually watch the host container move.

---

## New B — the widget writes to the chat

```js [1-4|6-11]
app.sendMessage({
  role: "user",
  content: [{ type: "text", text: "Hello from the Weather Tool!" }],
});

// host side
onMessage={async (params) => {
  const text = params.content.filter(c => c.type === "text").map(c => c.text).join("\n");
  setMessages(m => [...m, { role: "user", text }]);
  return { isError: false };
}}
```

A click inside the widget becomes **a conversation turn**.

---

<!-- demo: http://localhost:5173/ -->

## Live

> "what's the weather in Rome?" → then **Resize** and **Send Message**

---

# 3 · buildings_list

The model fills in the parameters, the widget shows the result.

---

## The inputSchema is the real prompt

```ts [2-6|8-12]
inputSchema: {
  city: z.string().optional().describe("Filter by city, e.g. 'Roma' or 'Milano'"),
  type: z.enum(["apartment", "house", "commercial"]).optional().describe("Property type"),
  maxPrice: z.number().optional().describe("Maximum price in euros"),
  minRooms: z.number().optional().describe("Minimum number of rooms"),
},
```

> "find houses in Rome under 300,000 with at least 3 rooms"

```json
{ "city": "Roma", "type": "house", "maxPrice": 300000, "minRooms": 3 }
```

Note: we wrote no parsing at all. The `describe()` strings are what the model reads to decide how to fill the call.

---

## Real data, two readings

```ts [1-3|5-13]
const res = await fetch(BUILDINGS_URL);
const all = await res.json();
const buildings = all.filter(/* city, type, maxPrice, minRooms */);

return {
  content: [{
    type: "text",
    text: `${buildings.length} of ${all.length} properties match.\n${summary}`,
  }],
  structuredContent: {
    buildings,
    total: all.length,
    filters: { city, type, maxPrice, minRooms },
  },
};
```

A text summary for the model, the **array** to draw for the widget.

---

## New — the selection travels back

```js [1-5|7-11]
blRoot.addEventListener("click", (e) => {
  const el = e.target.closest(".bl-card");
  const b = buildings.find((x) => String(x.id) === el.dataset.id);
  el.classList.add("is-selected");

  app.sendMessage({
    role: "user",
    content: [{ type: "text",
      text: `Selected property: ${b.address}, ${b.city} — ${b.mq} m², ${b.price} EUR` }],
  });
});
```

I click a card → the model **knows** which one I picked and can carry on from there.

Note: this is the key pattern. The UI does not replace the conversation — it feeds it.

---

<!-- demo: http://localhost:5173/ -->

## Live

> "show me properties in Rome" → click a card → "what's the price per m²?"

---

# 4 · color_picker

The widget stops talking to the model and starts **driving the app**.

---

## The model pre-configures the UI

```ts [2-8|12-15]
inputSchema: {
  initialColor: z.string().optional().describe(
    "Hex code (e.g. '#3366ff') to preselect in the picker. If the user mentioned " +
    "a color by name or by hex, convert it to hex and pass it here."
  ),
},
```

```js
// in the widget
app.ontoolinput = ({ arguments: args }) => {
  if (args?.initialColor) {
    picker.value = normalize(args.initialColor);
    applyColor(picker.value);   // applied immediately
  }
};
```

> "I want a blue background" → the picker opens **already** on `#0000ff`, colour already applied.

---

## New — request/response towards the host

A method that is **not** in the protocol: the host receives it in `onFallbackRequest`.

```js [1|3-4|6-8]
const SET_BG_METHOD = "x/host/set-background-color";

// pass-through result schema: the host decides the payload
const AnyResult = { safeParse: (value) => ({ success: true, data: value }) };

function callHost(method, params) {
  return app.request({ method, params }, AnyResult, { timeout: 5000 });
}
```

`request()` instead of a notification → there is **an answer to wait for** (or a timeout).

---

## The host decides what it accepts

```tsx [1-4|5-8|9]
onFallbackRequest={async (request) => {
  if (request.method === "x/host/set-background-color") {
    const color = String(request.params?.color ?? "");
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
      throw new Error(`Invalid color: ${color}`);
    }
    setBgColor(color);
    return { applied: true, color };
  }
  throw new Error(`Unknown method: ${request.method}`);
}}
```

- the widget **asks**, it does not execute
- the host **validates**, then applies
- the error travels back and the widget shows it

Note: this is the difference between a widget and an injected script. The widget never touches the host DOM — it sends a command the host is free to refuse.

---

## Both directions at once

```js [1-8|10]
async function applyColor(color) {
  status.textContent = "Applying " + color + "…";
  try {
    await callHost(SET_BG_METHOD, { color });   // → the app changes its background
    status.textContent = "Host background set to " + color;
  } catch (err) {
    status.textContent = "Could not update the host: " + err.message;
  }
}

picker.addEventListener("change", () => notifyModel(color)); // → the chat records it
```

`input` drives the app in real time · `change` tells the model once the choice is made.

Note: splitting the two events keeps the conversation from filling up with one message per pixel dragged in the picker.

---

<!-- demo: http://localhost:5173/ -->

## Live

> "change the site background color" → drag → watch **the whole page**

---

## Recap

| widget | channel opened |
| --- | --- |
| `hello_world` | host → widget (`tool-result`) |
| `weather_dashboard` | + widget → host (`size-changed`), widget → model (`ui/message`) |
| `buildings_list` | + model → tool (`inputSchema`), selection → model |
| `color_picker` | + widget ⇄ host (custom request with a response) |

Same architecture, four levels of ambition.

Note: if one thing survives the talk: `structuredContent` for the widget, `content` for the model, and every user action is a postMessage the host is free to refuse.
