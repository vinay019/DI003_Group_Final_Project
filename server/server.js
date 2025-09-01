import express from "express";
import cors from "cors";
import pg from "pg"; // For future database use
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);
app.options("/analyse", cors());
app.use(express.json());
const PORT = process.env.PORT || 8080;

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const systemInstruction = `
You are GreenIt, an intelligent plant care assistant.

Your task:
1. Identify the plant species from the uploaded image.
2. Analyse the image for visible health problems (if any).
3. Provide structured, beginner-friendly plant care guidance.
4. Always respond in valid JSON exactly following the schema below.

Required JSON schema:
{
  "plant_common_name": "string",
  "plant_scientific_name": "string",
  "problem": "string",
  "possible_causes": {
    "environmental_problems": ["string", "string"],
    "health_problems": ["string", "string"]
  },
  "recommended_actions": ["string", "string"],
  "prevention_tips": ["string", "string"],
  "careGuide": {
    "language": "en",
    "Watering": "string",
    "Light": "string",
    "Soil": "string",
    "Pruning": "string",
    "Common issues": "string"
  }
}

Constraints:
- Always return valid JSON only. Do not include explanations outside the JSON.
- If uncertain, provide your best guess and flag uncertainty inside the relevant fields.
- Make the care guide beginner-friendly and concise.
- If a requested output language is provided (e.g., "pl" for Polish, "es" for Spanish), translate the entire careGuide values into that language.
- If no language is provided, default to British English ("en").
`;

app.get("/", (req, res) => {
  res.send("Ouch! You've hit my roots!");
});

// Analyse plant issues and provide advice
app.post("/analyse", async (req, res) => {
  try {
    const { prompt, language = "en" } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return res
        .status(400)
        .json({ error: "Please provide a 'prompt' string." });
    }

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `language: ${language}\n${prompt}`,
      config: {
        responseMimeType: "application/json",
        systemInstruction,
      },
    });

    const text = response.text || "";
    try {
      res.json(JSON.parse(text));
    } catch {
      res.status(502).json({
        error: "The model did not return valid JSON.",
        raw: text,
      });
    }
  } catch (err) {
    console.error("Analyse route error:", err?.message || err);
    res.status(500).json({ error: "Analysis failed." });
  }
});

app.listen(PORT, () => {
  console.log(`Running on ${PORT}`);
});
