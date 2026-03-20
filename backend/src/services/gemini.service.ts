import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const estimateNutritionGemini = async (recipeName: string, ingredients: string[]) => {
  if (!genAI) {
    // Mock response if API key is missing
    return {
      calories: Math.floor(Math.random() * (600 - 300) + 300),
      protein: 15,
      carbs: 45,
      fat: 10
    };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Estimate the nutritional values (calories, protein, carbs, fat) for one serving of a recipe named "${recipeName}" with the following ingredients: ${ingredients.join(', ')}. Return ONLY a JSON object with keys: "calories" (number), "protein" (number in grams), "carbs" (number in grams), "fat" (number in grams). Do not include any other text or markdown code blocks.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up JSON formatting
    const jsonString = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Gemini API Error estimating nutrition:', error);
    return null;
  }
};
