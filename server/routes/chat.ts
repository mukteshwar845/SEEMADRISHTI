import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

export const chatRouter = Router();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

chatRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const formattedHistory = (history || []).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    formattedHistory.push({ role: 'user', parts: [{ text: message }] });

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3.1-pro-preview',
      contents: formattedHistory,
      config: {
        systemInstruction: "You are Seemadrishti Help Bot, an AI assistant for the Seemadrishti AI border surveillance application. You help users understand the platform, dispatch parallel Swarm tasks, and explain the roles of the 4 specialized agents (Sentinel, Pathfinder, Commander, Lex Forensic). Keep your answers helpful, concise, and focused on the project.",
      }
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Chat API Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message || 'Internal Server Error' })}\n\n`);
      res.end();
    }
  }
});
