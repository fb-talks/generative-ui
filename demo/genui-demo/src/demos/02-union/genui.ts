import { GoogleGenAI, Type, type Schema } from '@google/genai';
import type { AlertProps, UserCardProps, BarChartProps } from './components';

/**
 * DEMO 2 — anyOf + discriminated union.
 *
 * One schema per component. The discriminant is a single-value enum
 * (`enum: ['Alert']`), i.e. a literal: the model cannot pair the name of one
 * component with the props of another.
 */

const alertSchema: Schema = {
  type: Type.OBJECT,
  description: 'A short warning, error or status message',
  properties: {
    component: { type: Type.STRING, enum: ['Alert'] },
    props: {
      type: Type.OBJECT,
      properties: {
        severity: { type: Type.STRING, enum: ['info', 'warning', 'error'] },
        message: { type: Type.STRING },
      },
      required: ['severity', 'message'],
    },
  },
  required: ['component', 'props'],
};

const userCardSchema: Schema = {
  type: Type.OBJECT,
  description: 'A person: name, role and a few skills',
  properties: {
    component: { type: Type.STRING, enum: ['UserCard'] },
    props: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        role: { type: Type.STRING },
        skills: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['name', 'role', 'skills'],
    },
  },
  required: ['component', 'props'],
};

const barChartSchema: Schema = {
  type: Type.OBJECT,
  description: 'A bar chart comparing numeric values',
  properties: {
    component: { type: Type.STRING, enum: ['BarChart'] },
    props: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        bars: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              value: { type: Type.NUMBER },
            },
            required: ['label', 'value'],
          },
        },
      },
      required: ['title', 'bars'],
    },
  },
  required: ['component', 'props'],
};

const uiSchema: Schema = { anyOf: [alertSchema, userCardSchema, barChartSchema] };

/** The mirror of the schema on the TypeScript side. */
export type UISpec =
  | { component: 'Alert'; props: AlertProps }
  | { component: 'UserCard'; props: UserCardProps }
  | { component: 'BarChart'; props: BarChartProps };

export async function generateUI(prompt: string, apiKey: string): Promise<UISpec> {
  const ai = new GoogleGenAI({ apiKey });
  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction:
        'You are a UI generator. Pick the single component that best fits the request ' +
        'and fill its props with short, human-readable content.',
      responseMimeType: 'application/json',
      responseSchema: uiSchema,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  // The schema constrains the model, it does not guarantee it: in production,
  // validate here (e.g. Zod safeParse) instead of casting.
  return JSON.parse(res.text ?? '{}') as UISpec;
}
