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
