import { GoogleGenAI, Type } from "@google/genai";
import { cache } from "./cache";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const aiServerService = {
  async getRecommendations(orderHistory: any[], currentMenu: any[]) {
    const cacheKey = `recommendations:${JSON.stringify(orderHistory).slice(-50)}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on this order history: ${JSON.stringify(orderHistory)}, 
      recommend 3 items from this menu: ${JSON.stringify(currentMenu)}. 
      Return only JSON array of item names.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const result = JSON.parse(response.text || "[]");
    await cache.set(cacheKey, result, 300); // 5 min cache
    return result;
  },

  async analyzeSentiment(reviewText: string) {
    const cacheKey = `sentiment:${Buffer.from(reviewText).toString('base64').slice(0, 50)}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the sentiment of this review: "${reviewText}". 
      Classify as "positive", "negative", or "neutral". Return only the classification.`,
    });

    const result = response.text?.toLowerCase().trim() || "neutral";
    await cache.set(cacheKey, result, 3600); // 1 hour cache
    return result;
  },

  async forecastSales(historicalData: any[]) {
    const cacheKey = `forecast:${JSON.stringify(historicalData).slice(-50)}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze these daily sales records: ${JSON.stringify(historicalData)}. 
      Predict total sales for the next 7 days. Return a JSON object with "prediction" (number) and "reasoning" (string).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prediction: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
          }
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    await cache.set(cacheKey, result, 1800); // 30 min cache
    return result;
  },

  async getChatResponse(message: string, menu: any[]) {
    // Chat responds are usually too dynamic to cache effectively per message
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: message,
      config: {
        systemInstruction: `You are a friendly restaurant assistant named BistroBot. 
        Here is the current menu: ${JSON.stringify(menu)}. 
        Help customers choose items, take orders, and answer queries. 
        Keep responses concise and helpful.`,
      }
    });
    return response.text;
  }
};
