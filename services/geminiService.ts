import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Medicine, Sale } from '../types';

// Safely access API Key. In standard Vite/Browser env, process might be undefined.
const getApiKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY || '';
    }
    // Fallback for Vite environments using import.meta (if configured)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env.VITE_API_KEY || '';
    }
  } catch (e) {
    return '';
  }
  return '';
};

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey });

export const geminiService = {
  chat: async (history: { role: 'user' | 'model', text: string }[], message: string, context?: string) => {
    if (!apiKey) {
      return "API Key is missing or invalid. Please check your configuration.";
    }

    try {
      const chat: Chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: `You are HMWTECH.LTD Pharma AI, an intelligent assistant for a pharmacy management system.
          You are helpful, precise, and professional.
          
          Context about the current pharmacy state:
          ${context || 'No specific context provided.'}
          
          If asked about specific medicines, use general medical knowledge but advise checking the official inventory.
          If asked to analyze sales, look at the provided data patterns.
          Keep responses concise and suitable for a busy pharmacist.`,
        },
        history: history.map(h => ({
          role: h.role,
          parts: [{ text: h.text }]
        }))
      });

      const response: GenerateContentResponse = await chat.sendMessage({ message });
      return response.text;
    } catch (error) {
      console.error("Gemini Error:", error);
      return "I'm having trouble connecting to the network right now. Please try again later.";
    }
  },

  analyzeTrends: async (sales: Sale[], medicines: Medicine[]) => {
    if (!apiKey) return ["API Key missing. Cannot perform analysis."];

    const salesSummary = sales.slice(-50).map(s => ({
      date: new Date(s.timestamp).toLocaleDateString(),
      total: s.totalAmount,
      items: s.items.map(i => i.name).join(', ')
    }));

    const inventorySummary = medicines.map(m => ({
      name: m.name,
      stock: m.stock,
      category: m.category
    }));

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze this pharmacy data and provide 3 key insights in a JSON format.
        
        Sales Data (Last 50): ${JSON.stringify(salesSummary)}
        Inventory Data: ${JSON.stringify(inventorySummary)}
        
        Return ONLY a raw JSON array of strings, e.g., ["Insight 1", "Insight 2", "Insight 3"]. No markdown formatting.`,
      });
      
      const text = response.text || "[]";
      // Clean up if model adds markdown blocks
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error(e);
      return ["Could not analyze data at this time.", "Ensure you have an internet connection.", "Try again later."];
    }
  }
};