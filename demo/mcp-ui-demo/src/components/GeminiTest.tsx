import { useState, useEffect, useRef, useMemo } from "react";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { GoogleGenAI, mcpToTool, type Chat } from "@google/genai";
import { AppRenderer } from "@mcp-ui/client";
import { createMcpClient } from "../mcp-client";

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

// Fallback size used until a widget announces its own via
// ui/notifications/size-changed. Reset on every new tool so a widget never
// inherits the size of the previous one.
const DEFAULT_WIDGET_SIZE = { width: 560, height: 400 };

// One example prompt per tool exposed by the MCP server: they are shown as
// small clickable labels under the Run button so the user can discover what
// each widget does without reading the tool list.
const EXAMPLE_PROMPTS = [
  { label: "Hello world", prompt: "Say hello to Fabio" },
  { label: "Weather", prompt: "What is the weather in Rome?" },
  { label: "Background color", prompt: "Change the background color of the page" },
  { label: "Real estate", prompt: "Show apartments for sale in Roma under 500000 euros" },
];

export function GeminiTest() {
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("gemini_api_key") || "",
  );
  const [prompt, setPrompt] = useState("What is the weather in Rome?");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [tools, setTools] = useState<any[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [toolData, setToolData] = useState<{
    callId: number;
    name: string;
    input: any;
    result?: any;
  } | null>(null);
  // EXPERIMENT: one AppRenderer instance per tool call. callId keys the
  // AppRenderer so every call remounts it with a fresh sandbox iframe and a
  // fresh handshake (the simple document.write proxy renders one widget per
  // iframe instance). The result update reuses the same callId: no remount.
  const callIdRef = useRef(0);
  // Size of the widget container: the widget asks for it via
  // ui/notifications/size-changed and the host applies it for real.
  const [widgetSize, setWidgetSize] = useState(DEFAULT_WIDGET_SIZE);
  // Background color of the host app, driven by the color_picker widget
  // through the custom "x/host/set-background-color" JSON-RPC command.
  const [bgColor, setBgColor] = useState("#ffffff");

  const chatSessionRef = useRef<{ chat: Chat; apiKey: string } | null>(null);

  // A new tool means a new widget: drop the previous widget's size, otherwise
  // e.g. buildings_list would render inside the color_picker's 420px box until
  // (and unless) it announces a size of its own.
  useEffect(() => {
    setWidgetSize(DEFAULT_WIDGET_SIZE);
  }, [toolData?.name]);

  // Propagate the widget-driven color to the whole document
  useEffect(() => {
    document.body.style.backgroundColor = bgColor;
  }, [bgColor]);

  // Save API Key to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("gemini_api_key", apiKey);
  }, [apiKey]);

  // Initialize MCP Client
  useEffect(() => {
    let currentClient: Client | null = null;

    const initClient = async () => {
      try {
        const mcpClient = await createMcpClient("http://localhost:3010/mcp");
        currentClient = mcpClient;
        setClient(mcpClient);
      } catch (err) {
        console.error("Failed to connect to MCP server:", err);
        setConnectionError("Error connecting to MCP server");
      }
    };
    initClient();

    // Close the client on unmount/navigation. Without this every reload/HMR
    // leaves a zombie SSE stream open; after 6 of them Chrome's per-host
    // connection limit is reached and new requests hang forever.
    const closeClient = () => {
      currentClient?.close().catch(() => {});
      currentClient = null;
    };
    window.addEventListener("pagehide", closeClient);
    return () => {
      window.removeEventListener("pagehide", closeClient);
      closeClient();
    };
  }, []);

  // List available tools once connected
  useEffect(() => {
    if (!client) return;
    client
      .listTools({})
      .then((res) => setTools(res.tools))
      .catch((err) => console.error("Failed to list tools:", err));
  }, [client]);

  const getOrCreateChat = () => {
    if (!client) return null;
    if (!chatSessionRef.current || chatSessionRef.current.apiKey !== apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      const chat = ai.chats.create({
        model: "gemini-2.5-flash",
        config: {
          tools: [mcpToTool(client)],
          automaticFunctionCalling: {
            disable: true,
          },
        },
      });
      chatSessionRef.current = { chat, apiKey };
    }
    return chatSessionRef.current.chat;
  };

  const handleSend = async () => {
    if (!apiKey) {
      alert("Please enter an API Key");
      return;
    }
    if (!client) {
      alert("MCP Client not connected");
      return;
    }
    if (!prompt.trim()) return;

    const userText = prompt;
    setMessages((m) => [...m, { role: "user", text: userText }]);
    setPrompt("");
    setLoading(true);
    // EXPERIMENT: with key={callId} on the AppRenderer every tool call now
    // remounts it deliberately (fresh sandbox iframe + fresh handshake).
    // The original design kept one AppRenderer alive because a remount
    // handshake used to fail in Chrome (event.source no longer matched
    // iframe.contentWindow) — retesting that with the cross-origin proxy.

    try {
      const chat = getOrCreateChat()!;
      let result = await chat.sendMessage({ message: userText });

      // Helper to get function call from response
      const getFunctionCall = (res: any) => {
        return res.candidates?.[0]?.content?.parts?.find(
          (part: any) => part.functionCall,
        )?.functionCall;
      };

      let functionCall = getFunctionCall(result);

      while (functionCall) {
        const { name, args } = functionCall;

        // Show Tool UI with input
        const callId = ++callIdRef.current;
        setToolData({ callId, name, input: args });

        // Execute Tool
        const toolResult = await client.callTool({
          name,
          arguments: args,
        });

        // Update Tool UI with result
        setToolData({ callId, name, input: args, result: toolResult });

        // Send result back to Gemini
        result = await chat.sendMessage({
          message: [
            {
              functionResponse: {
                name,
                response: toolResult,
              },
            },
          ],
        });

        functionCall = getFunctionCall(result);
      }

      const text = result.candidates?.[0]?.content?.parts?.find(
        (p: any) => p.text,
      )?.text;
      setMessages((m) => [
        ...m,
        { role: "model", text: text || JSON.stringify(result, null, 2) },
      ]);
    } catch (e) {
      console.error(e);
      setMessages((m) => [
        ...m,
        {
          role: "model",
          text: "Error: " + (e instanceof Error ? e.message : String(e)),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Stable object identity: a new URL/object per render would re-trigger the
  // AppRenderer's internal iframe effect and can abort the sandbox handshake.
  // The proxy is served by the MCP server (a DIFFERENT origin than this app):
  // cross-origin isolation is the recommended security setup and also avoids
  // a Chrome WindowProxy-identity bug that breaks the postMessage
  // event.source checks between same-origin sandboxed iframes.
  const sandbox = useMemo(
    () => ({ url: new URL("http://localhost:3010/sandbox_proxy.html") }),
    [],
  );
  const started = messages.length > 0;

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100%",
        textAlign: "left",
        color: "#000000",
        backgroundColor: bgColor,
        transition: "background-color .25s ease",
      }}
    >
      {/* LEFT COLUMN: API Key + Chat */}
      <div
        style={{
          flex: "0 0 380px",
          height: "100%",
          overflowY: "auto",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          padding: "20px",
          borderRight: "1px solid #ddd",
        }}
      >
        <div
          style={{
            padding: "20px",
            border: "1px dashed #999",
            borderRadius: "8px",
            backgroundColor: "#f9f9f9",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Gemini MCP Chat</h3>

          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>
              API Key:
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter Gemini API Key"
              style={{
                width: "100%",
                padding: "8px",
                boxSizing: "border-box",
                color: "#000000",
                backgroundColor: "#ffffff",
                border: "1px solid #ccc",
              }}
            />
          </div>

          {messages.length > 0 && (
            <div
              style={{
                marginBottom: "10px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                padding: "8px",
                backgroundColor: "white",
              }}
            >
              {messages.map((m, i) => (
                <div key={i} style={{ marginBottom: "8px" }}>
                  <strong>{m.role === "user" ? "You" : "Gemini"}:</strong>
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Prompt:
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter prompt"
              style={{
                width: "100%",
                padding: "8px",
                minHeight: "60px",
                boxSizing: "border-box",
                color: "#000000",
                backgroundColor: "#ffffff",
                border: "1px solid #ccc",
              }}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={loading}
            style={{
              padding: "10px 20px",
              backgroundColor: loading ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Running..." : started ? "Send" : "Run Gemini"}
          </button>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginTop: "10px",
            }}
          >
            {EXAMPLE_PROMPTS.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => setPrompt(ex.prompt)}
                title={ex.prompt}
                style={{
                  padding: "3px 8px",
                  fontSize: "11px",
                  lineHeight: 1.4,
                  color: "#0056b3",
                  backgroundColor: "#eef5ff",
                  border: "1px solid #b8d4ff",
                  borderRadius: "999px",
                  cursor: "pointer",
                }}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CENTER COLUMN: Component results */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          height: "100%",
          overflowY: "auto",
          boxSizing: "border-box",
          padding: "20px",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Results</h3>
        {toolData && client ? (
          <div
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              borderRadius: "4px",
              backgroundColor: "white",
            }}
          >
            <h4 style={{ color: "black", marginTop: 0 }}>
              Tool Invocation: {toolData.name}
            </h4>
            <div
              style={{
                position: "relative",
                width: widgetSize.width,
                maxWidth: "100%",
                height: widgetSize.height,
                // A border + background make the widget's real size visible
                border: "2px solid #007bff",
                borderRadius: "6px",
                backgroundColor: "#eef5ff",
                overflow: "hidden",
                transition: "width .25s ease, height .25s ease",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  padding: "2px 6px",
                  fontSize: "11px",
                  color: "#0056b3",
                  backgroundColor: "rgba(255,255,255,.85)",
                  borderBottomLeftRadius: "6px",
                  zIndex: 1,
                  pointerEvents: "none",
                }}
              >
                {widgetSize.width} x {widgetSize.height}
              </div>
              <AppRenderer
                key={toolData.callId}
                client={client}
                toolName={toolData.name}
                toolInput={toolData.input}
                toolResult={toolData.result}
                sandbox={sandbox}
                onMessage={async (params) => {
                  const text = params.content
                    ?.filter((c: any) => c.type === "text")
                    .map((c: any) => c.text)
                    .join("\n");
                  setMessages((m) => [
                    ...m,
                    { role: "user", text: text || JSON.stringify(params) },
                  ]);
                  return {
                    isError: false,
                  };
                }}
                onFallbackRequest={async (request: any) => {
                  // Custom widget -> host commands. This is how a widget can
                  // drive the main application instead of just talking to the LLM.
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
                onSizeChanged={(dimensions) => {
                  // Actually resize the container the widget lives in
                  setWidgetSize((prev) => ({
                    width: dimensions.width ?? prev.width,
                    height: dimensions.height ?? prev.height,
                  }));
                }}
              />
            </div>
          </div>
        ) : (
          <p style={{ color: "#666" }}>
            No component rendered yet. Send a prompt that triggers a tool to
            see its result here.
          </p>
        )}
      </div>
      {/* RIGHT COLUMN: Available tools */}
      <div
        style={{
          flex: "0 0 320px",
          height: "100%",
          overflowY: "auto",
          boxSizing: "border-box",
          padding: "20px",
          borderLeft: "1px solid #ddd",
        }}
      >
        <h4 style={{ marginTop: 0 }}>Available Tools</h4>
        {connectionError ? (
          <p style={{ color: "red" }}>{connectionError}</p>
        ) : tools.length === 0 ? (
          <p style={{ color: "#666" }}>
            {client ? "No tools available." : "Connecting to MCP server..."}
          </p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "20px" }}>
            {tools.map((tool) => (
              <li key={tool.name} style={{ marginBottom: "6px" }}>
                <strong>{tool.name}</strong>
                {tool.description && (
                  <div style={{ color: "#666", fontSize: "0.9em" }}>
                    {tool.description}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
