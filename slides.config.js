// Everything here is optional: delete the file and the defaults below apply.
export default {
  title: 'Generative UI',
  lang: 'en',

  // Where the talk lives. Every .md in here becomes slides, in file-name order.
  decks: 'decks',

  // Folder behind a bare `<!-- demo: counter -->` marker in the Markdown.
  demos: 'demo',

  // Port `fb-slides dev` serves the deck on (`preview` uses the next one up).
  // `--port n` on the command line wins over this.
  port: 4100,

  // Side processes `fb-slides dev` starts along with the deck: the MCP server
  // (tools + UI resources, port 3010) and the React host app that renders the
  // widgets (Vite, port 5173). Both need `npm install` once inside their folder.
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

  // A `source ↗` button on every demo slide: `code serve-web` alongside the deck,
  // on port 7100, opening that demo's folder in real VS Code in a new tab. The
  // absolute path rather than `true`: the shell this is started from has no
  // /usr/local/bin in its PATH, and a bare `code` is not found there.
  // `--no-editor` turns it off for one run.
  editor: { command: '/usr/local/bin/code' },

  // The corner signature.
  signature: { name: 'www.fabiobiondi.dev', url: 'https://www.fabiobiondi.dev', logo: 'assets/jshd-sticker.png' },

  // Passed straight to Reveal.initialize().
  // `fragmentInURL: false` keeps the step number out of the address bar. The
  // bullets of a list only become fragments after init — fb-slides adds them —
  // so reloading a URL that carried a step restored that step while the fragments
  // written by hand were still the only numbered ones: a `<p class="fragment">`
  // at the foot of a slide came up already visible, ahead of its bullets. With no
  // step in the URL, a reload always starts the slide from its first build.
  reveal: { fragmentInURL: false },
};
