import {
  GoogleGenAI,
  Type,
  FunctionCallingConfigMode,
  type FunctionDeclaration,
} from '@google/genai';
import type { AlertProps, UserCardProps, BarChartProps } from './components';
import type { SalesReportProps } from './SalesReport';

/**
 * DEMO 3 — function calling: one tool per component.
 *
 * Same components as demo 2. What changes:
 *  - each component self-describes (`description`) -> better selection
 *  - the model can emit SEVERAL calls -> a composed UI, not a single node
 *  - { name, description, parameters } is already the shape of an MCP tool
 */

const tools: FunctionDeclaration[] = [
  {
    name: 'Alert',
    description: 'Show a short warning, error or status message',
    parameters: {
      type: Type.OBJECT,
      properties: {
        severity: { type: Type.STRING, enum: ['info', 'warning', 'error'] },
        message: { type: Type.STRING },
      },
      required: ['severity', 'message'],
    },
  },
  {
    name: 'UserCard',
    description: 'Introduce a person: name, role and a few skills',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        role: { type: Type.STRING },
        skills: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['name', 'role', 'skills'],
    },
  },
  {
    name: 'BarChart',
    description: 'Compare numeric values as a bar chart',
    parameters: {
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
  {
    name: 'SalesReport',
    description:
      'Total sales / revenue for one calendar year, broken down by month. Use it whenever ' +
      'the user asks about sales, revenue or turnover of a given year. Send ONLY the year ' +
      '(and the category, if the user named one): the component queries the database ' +
      'itself. Never put sales figures in a BarChart — you do not have them.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        year: { type: Type.NUMBER, description: 'The calendar year, e.g. 2024' },
        category: {
          type: Type.STRING,
          enum: ['all', 'shoes', 'clothing', 'accessories'],
          description: "Product category; omit or 'all' when the user did not name one",
        },
      },
      required: ['year'],
    },
  },
];

export type UISpec =
  | { component: 'Alert'; props: AlertProps }
  | { component: 'UserCard'; props: UserCardProps }
  | { component: 'BarChart'; props: BarChartProps }
  | { component: 'SalesReport'; props: SalesReportProps };

export async function generateUI(prompt: string, apiKey: string): Promise<UISpec[]> {
  const ai = new GoogleGenAI({ apiKey });
  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction:
        'You are a UI generator. Call the tools that best answer the request. ' +
        'Call more than one when the request needs more than one component.',
      tools: [{ functionDeclarations: tools }],
      toolConfig: {
        // ANY = the model MUST call a tool, it can't reply with prose.
        functionCallingConfig: { mode: FunctionCallingConfigMode.ANY },
      },
    },
  });

  return (res.functionCalls ?? []).map(
    (call) => ({ component: call.name, props: call.args }) as UISpec,
  );
}
