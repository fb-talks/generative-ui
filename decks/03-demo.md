---
marp: true
title: Demos
section: Demo
---


## Every screen you have ever shipped…

# …was designed **before** you knew the question

Note: ask the room: how many screens in your app exist only because of one edge case? The filter panel nobody uses. The 12 tabs. The dashboard with 40 widgets because we could not decide which 6 mattered.

---


## The problem we actually have

- We design **one UI for every user**, then hide 90% of it behind filters, tabs and menus
- Every new use case = a new screen, a new route, a new sprint
- The user knows what they want — they just can't **say** it to a form
- Search boxes return links. Dashboards return everything. Neither returns *an answer*

<p class="fragment">Chat solved the <b>input</b> problem.<br>It gave us back a <b>wall of text</b> as output.</p>

Note: this is the setup for the whole talk. Chat was a huge UX regression in one specific way: we replaced rich, clickable, scannable interfaces with a paragraph. Generative UI is the attempt to get the interface back without going back to the static screen.

---

## Text is a terrible output format

<div style="display: flex; gap: 2.5rem; align-items: flex-start;">
  <div style="flex: 1;">
    <p><strong>What the model says</strong></p>
    <blockquote>Running shoes made €6,700 this month, up 12% on last month. Week one was €1,200, week two €1,810, week three €1,640 and week four €2,050. Your last order, A-99213, was delivered on the 14th.</blockquote>
    <p style="font-size: 0.7em; opacity: 0.7;">To compare two of those weeks — or to report that order — the user must now <b>type another sentence</b>, and wait for another paragraph.</p>
  </div>
  <div style="flex: 1;">
    <p><strong>What the user needs</strong></p>
    <div style="padding: 1em 1.2em; border: 1px solid rgba(148, 163, 184, 0.4); border-radius: 8px;">
      <div style="font-size: 0.75em; opacity: 0.75;">Running shoes — revenue, by week</div>
      <div style="display: flex; align-items: flex-end; gap: 0.8rem; height: 130px; margin: 0.8em 0 0.4em;">
        <div style="flex: 1; height: 59%; background: #14b8a6; border-radius: 4px 4px 0 0;"></div>
        <div style="flex: 1; height: 88%; background: #14b8a6; border-radius: 4px 4px 0 0;"></div>
        <div style="flex: 1; height: 80%; background: #14b8a6; border-radius: 4px 4px 0 0;"></div>
        <div style="flex: 1; height: 100%; background: #14b8a6; border-radius: 4px 4px 0 0;"></div>
      </div>
      <div style="display: flex; gap: 0.8rem; font-size: 0.65em; opacity: 0.7;">
        <div style="flex: 1; text-align: center;">1200</div>
        <div style="flex: 1; text-align: center;">1810</div>
        <div style="flex: 1; text-align: center;">1640</div>
        <div style="flex: 1; text-align: center;">2050</div>
      </div>
      <div style="margin-top: 1em; padding: 0.5em 0.9em; border: 1px solid #14b8a6; border-radius: 6px; font-size: 0.8em; display: inline-block;">Download PDF</div>
    </div>
    <p style="font-size: 0.7em; opacity: 0.7;">One chart, one button. Zero sentences.</p>
  </div>
</div>

Note: this is the single slide that explains the whole idea. Same information, same model, same tool call — the difference is only what we do with the result. Keep this one on screen a few seconds longer than feels comfortable. Same shape as the JSON we will look at later in the talk — promise the room we will build exactly this, then keep the promise.

---

<!-- demo: https://stage.mokup.dev/embed/95ff8eab-3c34-4eaf-9f53-e263ee1c6062 -->

<div class="mockup-frame">
  <iframe src="https://stage.mokup.dev/embed/95ff8eab-3c34-4eaf-9f53-e263ee1c6062" width="800" height="500" style="border:0;" allowfullscreen></iframe>
</div>

Note: same chat, same question, same data. On the left the model answers with a paragraph; on the right it answers with an interface. Scroll the mockup live if the room wants to see the rest — everything after this slide is about how the right-hand side is built.

---

## Demo Hashbrown: generated dashboard

<video src="assets/hashbrown/DashboardDemo6.mp4" controls muted playsinline preload="metadata" style="width: 80%; aspect-ratio: 1920 / 1080; display: block; margin: 0 auto;"></video>

Note: the model does not draw this dashboard — it picks the widgets and the app renders them. Same components you already ship, assembled at runtime around the question that was actually asked.

---

## Demo MCP UI: Custom App with Gemini SDK

<video src="assets/demo-mcp-ui.mp4" controls muted playsinline preload="metadata" style="width: 90%; aspect-ratio: 1616 / 808; display: block; margin: 0 auto;"></video>

Note: real MCP tools rendering live widgets inside a chat. Everything in this video is what we build in the next forty minutes.

---

## Demo MCP UI: in chatbot

<video src="assets/demo-video-mcp-jam.mp4" controls muted playsinline preload="metadata" style="width: 62%; aspect-ratio: 1920 / 1292; display: block; margin: 0 auto;"></video>

Note: real MCP tools rendering live widgets inside a chat. Everything in this video is what we build in the next forty minutes.
