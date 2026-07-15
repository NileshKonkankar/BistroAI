import { GoogleGenAI, Type } from "@google/genai";
import { cache } from "./cache";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

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
  },

  async analyzeFeedbackSummary(reviews: any[]) {
    if (!reviews || reviews.length === 0) {
      return {
        food: { sentiment: "neutral", score: 50, summary: "No food feedback yet." },
        service: { sentiment: "neutral", score: 50, summary: "No service feedback yet." },
        ambiance: { sentiment: "neutral", score: 50, summary: "No ambiance feedback yet." },
        value: { sentiment: "neutral", score: 50, summary: "No value feedback yet." },
        overallSummary: "No reviews to analyze."
      };
    }

    const cacheKey = `feedbackSummary:${reviews.length}:${JSON.stringify(reviews.slice(0, 5).map(r => r.id))}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Analyze these customer reviews for a restaurant:
        ${JSON.stringify(reviews.map(r => ({ rating: r.rating, comment: r.comment, sentiment: r.sentiment })))}
        
        Provide a structured analysis of the restaurant's performance in four categories:
        1. "food" (Food Quality & Taste)
        2. "service" (Staff, Speed, Cleanliness, Service)
        3. "ambiance" (Vibe, Decor, Atmosphere)
        4. "value" (Value for Money, Portion size, Pricing)
        
        For each category, return:
        - sentiment: "positive" | "neutral" | "negative"
        - score: a percentage score from 0 to 100 representing user satisfaction
        - summary: a one-sentence summary of customer opinions in this category (e.g., "Customers praise the truffle pasta but mention the pizza is average.")
        
        Also provide an "overallSummary" which is a concise 1-2 sentence overview of the general sentiment and key action points.
        
        Produce a valid JSON object.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              food: {
                type: Type.OBJECT,
                properties: {
                  sentiment: { type: Type.STRING },
                  score: { type: Type.INTEGER },
                  summary: { type: Type.STRING }
                },
                required: ["sentiment", "score", "summary"]
              },
              service: {
                type: Type.OBJECT,
                properties: {
                  sentiment: { type: Type.STRING },
                  score: { type: Type.INTEGER },
                  summary: { type: Type.STRING }
                },
                required: ["sentiment", "score", "summary"]
              },
              ambiance: {
                type: Type.OBJECT,
                properties: {
                  sentiment: { type: Type.STRING },
                  score: { type: Type.INTEGER },
                  summary: { type: Type.STRING }
                },
                required: ["sentiment", "score", "summary"]
              },
              value: {
                type: Type.OBJECT,
                properties: {
                  sentiment: { type: Type.STRING },
                  score: { type: Type.INTEGER },
                  summary: { type: Type.STRING }
                },
                required: ["sentiment", "score", "summary"]
              },
              overallSummary: { type: Type.STRING }
            },
            required: ["food", "service", "ambiance", "value", "overallSummary"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      await cache.set(cacheKey, result, 600); // 10 minutes cache
      return result;
    } catch (error) {
      console.error("Error in analyzeFeedbackSummary:", error);
      return this.fallbackFeedbackSummary(reviews);
    }
  },

  fallbackFeedbackSummary(reviews: any[]) {
    const text = reviews.map(r => (r.comment || "").toLowerCase()).join(" ");
    
    const countKeywords = (keywords: string[]) => {
      let count = 0;
      keywords.forEach(kw => {
        const matches = text.match(new RegExp(kw, 'g'));
        if (matches) count += matches.length;
      });
      return count;
    };

    const foodPos = countKeywords(["delicious", "taste", "great food", "excellent", "yummy", "tasty", "love"]);
    const foodNeg = countKeywords(["bland", "salty", "cold", "undercooked", "burnt", "poor taste", "disappointed"]);
    const foodScore = Math.max(0, Math.min(100, Math.round(55 + (foodPos - foodNeg) * 10)));

    const servicePos = countKeywords(["friendly", "fast", "attentive", "quick", "polite", "helpful", "perfect service"]);
    const serviceNeg = countKeywords(["slow", "rude", "delayed", "ignored", "cold service", "unfriendly"]);
    const serviceScore = Math.max(0, Math.min(100, Math.round(52 + (servicePos - serviceNeg) * 10)));

    const ambiancePos = countKeywords(["vibe", "cozy", "cosy", "beautiful", "music", "decor", "atmospheric", "quiet"]);
    const ambianceNeg = countKeywords(["noisy", "loud", "dark", "bright", "ugly", "crowded", "boring"]);
    const ambianceScore = Math.max(0, Math.min(100, Math.round(50 + (ambiancePos - ambianceNeg) * 10)));

    const valuePos = countKeywords(["value", "worth", "reasonable", "cheap", "generous", "affordable", "good portion"]);
    const valueNeg = countKeywords(["expensive", "overpriced", "small portion", "costly", "not worth", "rip off"]);
    const valueScore = Math.max(0, Math.min(100, Math.round(50 + (valuePos - valueNeg) * 10)));

    const getSentiment = (score: number) => {
      if (score > 60) return "positive";
      if (score < 40) return "negative";
      return "neutral";
    };

    const avgRating = reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length;

    return {
      food: {
        sentiment: getSentiment(foodScore),
        score: foodScore,
        summary: foodScore > 60 ? "Food items are highly praised for taste and quality ingredients." : foodScore < 40 ? "There are critical complaints regarding flavor profiles." : "Customer reactions to food flavors and menu choices are balanced."
      },
      service: {
        sentiment: getSentiment(serviceScore),
        score: serviceScore,
        summary: serviceScore > 60 ? "Service is reported as swift, friendly, and accommodating." : serviceScore < 40 ? "Several reviews express dissatisfaction over service speed or wait times." : "Service response and wait times are rated as satisfactory."
      },
      ambiance: {
        sentiment: getSentiment(ambianceScore),
        score: ambianceScore,
        summary: ambianceScore > 60 ? "Guests love the restaurant’s cozy vibe, decor, and setting." : ambianceScore < 40 ? "Noise levels or comfort have received some negative comments." : "Atmosphere is found standard and pleasant."
      },
      value: {
        sentiment: getSentiment(valueScore),
        score: valueScore,
        summary: valueScore > 60 ? "Portion sizes and ingredient quality represent great value." : valueScore < 40 ? "Reviews highlight high menu prices relative to portion sizes." : "The pricing is considered fair by the majority of diners."
      },
      overallSummary: `Based on ${reviews.length} reviews, the restaurant holds an average score of ${avgRating.toFixed(1)}/5.0. ${avgRating >= 4.0 ? "Customer satisfaction is robust, with highlights on taste and hospitality." : "Some areas like service speed or pricing could benefit from optimization."}`
    };
  }
};
