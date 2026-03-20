import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;

let openai: OpenAI | null = null;
if (apiKey) {
  openai = new OpenAI({ apiKey });
}

export const generateRecipes = async (prompt: string) => {
  if (!openai) {
    return [
      { id: 'mock-1', title: 'Mock Recipe 1', description: 'A mock recipe since OpenAI key is missing.' },
      { id: 'mock-2', title: 'Mock Recipe 2', description: 'Another mock recipe.' },
    ];
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful culinary assistant. Generate 5 recipe suggestions based on the user request. Return valid JSON array.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' } // Ensure JSON output if using newer models, or just parse
    });

    // Simplified parsing logic for demo
    const content = response.choices[0].message.content || '[]';
    return JSON.parse(content).recipes || [];
  } catch (error) {
    console.error('OpenAI Error:', error);
    throw new Error('Failed to generate recipes');
  }
};

export const generateShoppingList = async (plan: any) => {
    if (!openai) return { items: ['Mock Item 1', 'Mock Item 2'] };
    // Implementation would go here
    return { items: ['AI Generated Item 1', 'AI Generated Item 2'] };
}

export const estimateNutrition = async (recipeName: string, ingredients: string[]) => {
  if (!openai) {
    return {
      calories: 500,
      protein: 20,
      carbs: 60,
      fat: 15
    };
  }

  try {
    const prompt = `Estimate the nutritional values (calories, protein, carbs, fat) for one serving of a recipe named "${recipeName}" with the following ingredients: ${ingredients.join(', ')}. Return ONLY a JSON object with keys: "calories" (number), "protein" (number in grams), "carbs" (number in grams), "fat" (number in grams). Do not include any other text.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a nutrition expert. specific, concise, and accurate.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    const content = response.choices[0].message.content || '{}';
    // Clean up markdown code blocks if present
    const jsonString = content.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('OpenAI Error estimating nutrition:', error);
    // Fallback or rethrow
    return null;
  }
};
