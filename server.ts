import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { aiServerService } from "./server/ai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI API Routes (Proxied and Cached)
  app.post("/api/ai/recommendations", async (req, res) => {
    try {
      const { orderHistory, currentMenu } = req.body;
      const result = await aiServerService.getRecommendations(orderHistory, currentMenu);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ai/sentiment", async (req, res) => {
    try {
      const { text } = req.body;
      const result = await aiServerService.analyzeSentiment(text);
      res.json({ sentiment: result });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ai/forecast", async (req, res) => {
    try {
      const { historicalData } = req.body;
      const result = await aiServerService.forecastSales(historicalData);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, menu } = req.body;
      const result = await aiServerService.getChatResponse(message, menu);
      res.json({ response: result });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
