import { McpServer, StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

const server = new McpServer('study-timer-server');

const WIDGET_URI = 'ui://study-timer-widget.html';

server.registerResource('study_timer_widget', WIDGET_URI, {
  'openai/widgetDescription': 'Interactive study timer and stopwatch.',
  'openai/widgetPrefersBorder': true
}, async () => {
  const filePath = path.join(process.cwd(), 'public', 'study-timer-widget.html');
  const html = fs.readFileSync(filePath, 'utf-8');
  return {
    contents: [
      {
        uri: WIDGET_URI,
        mimeType: 'text/html+skybridge',
        text: html
      }
    ]
  };
});

const inputSchema = z.object({
  mode: z.enum(['timer', 'stopwatch']).default('timer'),
  durationSeconds: z.number().int().nonnegative().optional(),
  label: z.string().optional(),
  allowUserEdit: z.boolean().optional()
});

server.registerTool('study_timer', {
  title: 'Study timer and stopwatch',
  description: 'Starts or configures an inline study timer or stopwatch.',
  inputSchema,
  _meta: {
    'openai/outputTemplate': WIDGET_URI,
    'openai/toolInvocation/invoking': 'Preparing your study timer',
    'openai/toolInvocation/invoked': 'Study timer ready',
    'openai/widgetAccessible': true
  }
}, async (args) => {
  const mode = args.mode === 'stopwatch' ? 'stopwatch' : 'timer';
  const durationSeconds = typeof args.durationSeconds === 'number' && args.durationSeconds >= 0 ? Math.floor(args.durationSeconds) : null;
  const label = typeof args.label === 'string' ? args.label : null;
  const allowUserEdit = typeof args.allowUserEdit === 'boolean' ? args.allowUserEdit : true;
  const text = mode === 'timer' ? (durationSeconds ? `Here is your ${durationSeconds} second timer.` : 'Here is your timer.') : 'Here is your stopwatch.';
  return {
    content: [
      {
        type: 'text',
        text
      }
    ],
    structuredContent: {
      mode,
      durationSeconds,
      label,
      allowUserEdit
    }
  };
});

const transport = new StreamableHTTPServerTransport();

export default async function handler(req, res) {
  await transport.handle(server, req, res);
}
