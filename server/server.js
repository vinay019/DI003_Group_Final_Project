import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

import pg from "pg";
const db = new pg.Pool({
  connectionString: process.env.DATABASE_CONNECTION_STRING,
});

const app = express();
app.use(cors());

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const PORT = 8080;

const systemInstruction = `
You are GreenIt, an intelligent plant care assistant.

Your task:
1. Identify the plant species from the user's prompt and/or image.
2. Analyse for visible or described plant health problems (if any).
3. Provide structured, beginner-friendly plant care guidance.
4. Always respond in valid JSON exactly following the schema below.
5. Automatically detect the user's input language and reply fully in that language.
6. If the language cannot be detected (e.g. when the user uploads only an image), default to British English.

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
    "language": "string",
    "language_name": "string",
    "Watering": "string",
    "Light": "string",
    "Soil": "string",
    "Pruning": "string",
    "Common issues": "string"
  }
}

Constraints:
- Always return valid JSON only.
- Do not include explanations outside the JSON.
- Make the care guide beginner-friendly and concise.
- Detect the user's input language automatically and write the entire careGuide in that language.
- If the language cannot be detected, default to British English.
`;

app.get("/", function (_req, res) {
  res.send("Ouch! You’ve hit my roots!");
});

// Accepts text, image, or both
app.post("/analyse", async function (req, res) {
  const prompt = (req.body && req.body.prompt) || "";
  const image = req.body && req.body.image;
  const mimeType = (req.body && req.body.mimeType) || "image/jpeg";

  if (!prompt && !image) {
    return res
      .status(400)
      .json({ error: "Please provide a prompt or an image." });
  }

  try {
    const parts = [];

    if (prompt) {
      parts.push({ text: prompt });
    } else {
      parts.push({
        text: "Please analyse the plant image and return the required JSON strictly following the schema.",
      });
    }

    if (image) {
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: image,
        },
      });
    }

    const geminiResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const text = geminiResponse.text;
    const data = JSON.parse(text);

    let plantName = data.plant_common_name;
    if (typeof plantName === "string") {
      plantName = plantName.trim();
      if (plantName) {
        await db.query(
          `INSERT INTO plant_searches (plant_name, count)
       VALUES ($1, 1)
       ON CONFLICT (plant_name)
       DO UPDATE SET count = plant_searches.count + 1`,
          [plantName]
        );
      } else {
        console.log("Skipping count: empty plant_common_name.");
      }
    } else {
      console.log("Skipping count: plant_common_name not provided by Gemini.");
    }

    return res.json(data);
  } catch (err) {
    console.error("Analyse error:", err);
    return res.status(500).json({ error: "Analysis failed" });
  }
});

app.get("/stats/top", async (req, res) => {
  try {
    const r = await db.query(
      `SELECT plant_name, count FROM plant_searches
       ORDER BY count DESC, plant_name ASC
       LIMIT 10`
    );
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Could not fetch stats" });
  }
});

app.listen(PORT, function () {
  console.log(`Running on http://localhost:${PORT}`);
});
