// Everything here is optional: delete the file and the defaults below apply.
export default {
  title: 'MCP UI',
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
      args: ['run', 'dev'],
      url: 'http://localhost:5173/',
    },
  ],

  // The corner signature.
  signature: { name: 'www.fabiobiondi.dev', url: 'https://www.fabiobiondi.dev', logo: 'assets/jshd-sticker.png' },

  // Passed straight to Reveal.initialize().
  // reveal: { transition: 'fade', slideNumber: false },
};
