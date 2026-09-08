import { GoogleGenAI, Type } from '@google/genai';
import { COMPONENT_NAMES, REGISTRY, type UIProps } from './components';

/**
 * DEMO 1 — THE SCHEMA
 *
 * Structured output is what makes this safe and boring: the model cannot
 * answer with anything but { component, props }, and `component` can only
 * be one of the names in our registry.
 */
const uiSchema = {
  type: Type.OBJECT,
  properties: {
    component: {
      type: Type.STRING,
      enum: COMPONENT_NAMES as unknown as string[],
      description: 'The component to render',
    },
    props: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Short heading, or the author for a Quote' },
        text: { type: Type.STRING, description: 'One or two sentences of body copy' },
      },
      required: ['title', 'text'],
    },
  },
  required: ['component', 'props'],
};

const SYSTEM_INSTRUCTION = `You are a UI generator.
Given a user request, pick the single component that fits best:
- "Alert"    -> warnings, errors, expired sessions, anything the user must be careful about
- "UserCard" -> presenting a person or an entity
- "Quote"    -> a quotation, a testimonial, a memorable sentence (title = the author)
Fill the props with short, human-readable text. Never explain your choice.`;

export type UISpec = {
  component: keyof typeof REGISTRY;
  props: UIProps;
};

export async function generateUI(prompt: string, apiKey: string): Promise<UISpec> {
  // NOTE: for a live demo we call Gemini straight from the browser.
  // In a real app the key stays on a server and this call goes through your backend.
  const ai = new GoogleGenAI({ apiKey });

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: uiSchema,
      // no "thinking" needed for a pick-a-component task -> faster on stage
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  return JSON.parse(res.text ?? '{}') as UISpec;
}
