// Everything here is optional: delete the file and the defaults below apply.
export default {
  title: 'Generative UI',
  lang: 'en',

  // Where the talk lives. Every .md in here becomes slides, in file-name order.
  decks: 'decks',

  // Folder behind a bare `<!-- demo: counter -->` marker in the Markdown.
  demos: 'demo',

  // ── Theme ─────────────────────────────────────────────────────────────────
  // With both keys below commented out the deck wears this package's base look.
  // To change it, uncomment ONE of the two — not both: layered together you get
  // neither look, just whichever rule comes last. Run `fb-slides dev` and use
  // the theme button in the toolbar to preview every option live; the popover
  // prints the exact line to paste here.
  //
  // 1. A pack — one of this package's own named themes, a whole skin over the
  //    base look. Available packs:
  //      custom-aurora, custom-editoriale
  // themePack: 'custom-aurora',
  //
  // 2. A reveal.js theme, served from this project rather than from a CDN — the
  //    deck's chrome follows it. Available themes:
  //      beige, black, black-contrast, blood, dracula, league, moon, night,
  //      serif, simple, sky, solarized, white, white-contrast
  // revealTheme: 'dracula',
  //
  // Either way, `theme.css` next to this file is still loaded last, so your own
  // overrides sit on top of whatever you picked.

  // Six of those themes ask fonts.googleapis.com for their typefaces. Those
  // requests are stripped out, so a deck never depends on the room's wifi; the
  // theme falls back to the next font in its own stack. Set this to true to let
  // them through and get the typography of revealjs.com/themes exactly.
  // webfonts: true,

  // Port `fb-slides dev` serves the deck on (`preview` uses the next one up).
  // `--port n` on the command line wins over this.
  port: 4100,

  // Side processes `fb-slides dev` starts along with the deck — a demo that is a
  // real app rather than a static page. Drop this key, the folder and the slide
  // that embeds it if the talk has no framework demo in it.
  // Here: the MCP server (tools + UI resources, port 3010) and the React host
  // app that renders the widgets (Vite, port 5173). Both need `npm install`
  // once inside their folder.
  servers: [
    {
      name: 'mcp-server',
      cwd: 'demo/mcp-ui-demo/server',
      command: 'npm',
      args: ['run', 'demo-simplified:watch'],
      url: 'http://localhost:3010/sandbox_proxy.html',
    },
    {
      name: 'mcp-ui-demo',
      cwd: 'demo/mcp-ui-demo',
      command: 'npm',
      args: ['run', 'dev', '--', '--port', '5173', '--strictPort'],
      url: 'http://localhost:5173/',
    },
    // The generative-UI playground (Gemini + React). Tab 3 is function calling.
    {
      name: 'genui-demo',
      cwd: 'demo/genui-demo',
      command: 'npm',
      args: ['run', 'dev', '--', '--port', '5174', '--strictPort'],
      url: 'http://localhost:5174/tools',
    },
  ],

  // A `source ↗` button on every demo slide, opening that demo's folder in real
  // VS Code in a new tab. It is `code serve-web` — the web server built into the
  // editor you already have — started alongside the deck, so nothing is installed
  // and nothing is embedded. Off by default because the very first run downloads
  // VS Code's server half (~100 MB) and you do not want to discover that on
  // stage: run `dev` once at your desk, and it is cached from then on.
  // `{ port: 7300, command: 'code' }` to change either — the default is 7100,
  // which is clear of the ports the demos want. `--no-editor` turns it off for
  // one run, and a built deck never has it: the link is a localhost address and
  // a path on disk.
  // The absolute path rather than `true`: the shell this is started from has no
  // /usr/local/bin in its PATH, and a bare `code` is not found there.
  editor: { command: '/usr/local/bin/code' },

  // The corner signature, shown on every slide: name and logo, linking to url.
  // Swap the values for your own, or delete the whole key to have no footer.
  signature: { name: 'www.fabiobiondi.dev', url: 'https://www.fabiobiondi.dev', logo: 'assets/jshd-sticker.png' },

  // Passed straight to Reveal.initialize().
  // reveal: { transition: 'fade', slideNumber: false },
  // `fragmentInURL: false` keeps the step number out of the address bar. The
  // bullets of a list only become fragments after init — fb-slides adds them —
  // so reloading a URL that carried a step restored that step while the fragments
  // written by hand were still the only numbered ones: a `<p class="fragment">`
  // at the foot of a slide came up already visible, ahead of its bullets. With no
  // step in the URL, a reload always starts the slide from its first build.
  reveal: { fragmentInURL: false },
};
