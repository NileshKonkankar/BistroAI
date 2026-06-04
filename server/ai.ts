import { GoogleGenAI, Type } from "@google/genai";
import { cache } from "./cache";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const aiServerService = {
  async getRecommendations(orderHistory: any[], currentMenu: any[], inventory: any[]) {
    const cacheKey = `recommendations:${JSON.stringify(orderHistory).slice(-30)}:${JSON.stringify(inventory).slice(-30)}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are Bistro AI, an elite kitchen sommelier and smart recommender.
      Review the customer's previous order items (if any):
      ${JSON.stringify(orderHistory)}
      
      Review our available menu dishes:
      ${JSON.stringify(currentMenu)}
      
      Review our present raw ingredients/inventory levels:
      ${JSON.stringify(inventory)}
      
      Suggest up to 4 excellent menu items that:
      1. Align on taste profile, ingredients, or styles with what is in their recent orderHistory (if orderHistory is empty, recommend popular/balanced items from different categories).
      2. Are optioned as available = true in currentMenu.
      3. Do NOT recommend a menu item if any critical ingredient it depends on is depleted, extremely low, or below minimum safety threshold in inventory (e.g., if a dish contains "Truffle Oil" or "Basil", check the inventory for "Truffle Oil" or "Basil" levels. If qty <= minThreshold, avoid recommending that dish).
      
      For each suggestion, return:
      - name: The exact name of the menu item (must match the name in currentMenu exactly!)
      - reason: An enticing, brief, and personalized reason for this selection (e.g. "Inspired by your preference for rich Italian pasta!", or "Crafted featuring freshly-stocked Arborio Rice today!").
      - matchScore: Integer percentage match rating (e.g. 96, 92).
      
      Produce a valid JSON array of these items.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              reason: { type: Type.STRING },
              matchScore: { type: Type.INTEGER }
            },
            required: ["name", "reason", "matchScore"]
          }
        }
      }
    });

    const result = JSON.parse(response.text || "[]");
    await cache.set(cacheKey, result, 120); // 2 min cache
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
