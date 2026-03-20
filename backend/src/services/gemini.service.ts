import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from both local and root (for various dev setups)
dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('GEMINI_API_KEY found:', !!apiKey);
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
};

export const estimateNutritionGemini = async (recipeName: string, ingredients: string[]) => {
  const genAI = getGenAI();
  if (!genAI) {
    console.error('Gemini API Key missing, cannot estimate nutrition');
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Estimate the total nutritional values (calories, protein, carbs, fat) for one serving based STRICTLY on this list of ingredients and their quantities: ${ingredients.join(', ')}. 

    IMPORTANT: 
    1. Ignore the recipe name "${recipeName}" if it contradicts the ingredients. 
    2. Calculate based ONLY on the provided ingredients and their specific volumes/weights. 
    3. If an ingredient is "water" or has 0 calories, reflect that accurately.
    4. For EACH ingredient in the list, determine if it's recognizable and has measurable nutritional value.
    5. Return a JSON object with:
       - "calories" (number), "protein" (number), "carbs" (number), "fat" (number) - TOTALS for one serving.
       - "ingredientStatus" - an array of objects for EACH input ingredient: {"name": string (original name), "status": "ok" | "unknown"}. Use "unknown" if the ingredient is gibberish or non-food.
    6. Return ONLY the JSON object. No explanations.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log('Gemini raw response:', text);
    
    // Improved JSON extraction
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    
    if (startIdx === -1 || endIdx === -1) {
       console.error('No JSON found in Gemini response:', text);
       return null;
    }
    
    const jsonString = text.substring(startIdx, endIdx + 1);
    try {
      const parsed = JSON.parse(jsonString);
      // Ensure it has the expected structure
      return {
          calories: Number(parsed.calories) || 0,
          protein: Number(parsed.protein) || 0,
          carbs: Number(parsed.carbs) || 0,
          fat: Number(parsed.fat) || 0,
          ingredientStatus: Array.isArray(parsed.ingredientStatus) ? parsed.ingredientStatus : []
      };
    } catch (parseError) {
      console.error('Failed to parse Gemini JSON:', jsonString);
      return null;
    }
  } catch (error: any) {
    console.error('Gemini API Error estimating nutrition:', error.message || error);
    if (error.response?.data) {
        console.error('Gemini error details:', error.response.data);
    }
    return null;
  }
};
