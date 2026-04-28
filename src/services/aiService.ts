export const aiService = {
  // 1. Order Recommendations
  async getRecommendations(orderHistory: any[], currentMenu: any[]) {
    const res = await fetch('/api/ai/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderHistory, currentMenu })
    });
    return res.json();
  },

  // 2. Sentiment Analysis
  async analyzeSentiment(reviewText: string) {
    const res = await fetch('/api/ai/sentiment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: reviewText })
    });
    const data = await res.json();
    return data.sentiment;
  },

  // 3. Sales Forecasting
  async forecastSales(historicalData: any[]) {
    const res = await fetch('/api/ai/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ historicalData })
    });
    return res.json();
  },

  // 4. Chatbot for Ordering
  async getChatResponse(message: string, menu: any[], chatHistory: any[]) {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, menu, chatHistory })
    });
    const data = await res.json();
    return data.response;
  }
};
