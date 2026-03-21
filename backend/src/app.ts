import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load env vars from both local and root (for various dev setups)
dotenv.config({ override: true });
dotenv.config({ path: path.join(__dirname, '../../.env'), override: true });

console.log('--- Server Environment Check ---');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);
if (process.env.GEMINI_API_KEY) {
    console.log('GEMINI_API_KEY starts with:', process.env.GEMINI_API_KEY.substring(0, 8));
}
console.log('OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);
console.log('-------------------------------');

import rateLimit from 'express-rate-limit';
import { estimateNutritionGemini } from './services/gemini.service';

const app = express();
const port = process.env.PORT || 3000;

// Rate limiter for AI endpoints
const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // limit each IP to 10 requests per windowMs
    message: { error: 'Too many AI requests from this IP, please try again after an hour' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Resolve paths to handle both local dev and Docker production
const getFilePath = (fileName: string) => {
    const paths = [
        path.join(__dirname, `../../${fileName}`),
        path.join(process.cwd(), `../${fileName}`),
        path.join(process.cwd(), `./${fileName}`),
        path.join(__dirname, `../${fileName}`)
    ];
    for (const p of paths) {
        if (fs.existsSync(p)) return p;
    }
    return path.join(process.cwd(), fileName); // Fallback
};

const recipesPath = getFilePath('recipes.json');
const planPath = getFilePath('plan.json');

console.log('Using recipesPath:', recipesPath);
console.log('Using planPath:', planPath);

app.use(cors());
app.use(express.json({ limit: '100kb' }));

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// Helper to sanitize and validate
const sanitizeString = (str: any, maxLength = 100) => {
    if (typeof str !== 'string') return '';
    return str.replace(/<[^>]*>?/gm, '').trim().slice(0, maxLength);
};

const validateRecipe = (recipe: any) => {
    if (!recipe || typeof recipe !== 'object') return null;
    return {
        id: recipe.id ? sanitizeString(recipe.id, 50) : undefined,
        name: sanitizeString(recipe.name, 50) || 'Untitled Recipe',
        category: sanitizeString(recipe.category, 30) || 'Other',
        isFavorite: Boolean(recipe.isFavorite),
        prepTime: typeof recipe.prepTime === 'number' ? Math.max(0, Math.min(recipe.prepTime, 1440)) : 15,
        macros: {
            calories: typeof recipe.macros?.calories === 'number' ? Math.max(0, Math.min(recipe.macros.calories, 10000)) : 0,
            protein: typeof recipe.macros?.protein === 'number' ? Math.max(0, Math.min(recipe.macros.protein, 1000)) : 0,
            carbs: typeof recipe.macros?.carbs === 'number' ? Math.max(0, Math.min(recipe.macros.carbs, 1000)) : 0,
            fat: typeof recipe.macros?.fat === 'number' ? Math.max(0, Math.min(recipe.macros.fat, 1000)) : 0,
        },
        ingredients: Array.isArray(recipe.ingredients) 
            ? recipe.ingredients.map((i: any) => sanitizeString(i, 150)).filter(Boolean).slice(0, 50)
            : []
    };
};

const areMacrosZero = (recipe: any) => {
    if (!recipe.macros) return true;
    return recipe.macros.calories === 0 && 
           recipe.macros.protein === 0 && 
           recipe.macros.carbs === 0 && 
           recipe.macros.fat === 0;
};

// Helper to read/write plan
const getPlans = () => {
    if (!fs.existsSync(planPath)) return {};
    try {
        const fileContent = fs.readFileSync(planPath, 'utf8');
        if (!fileContent.trim()) return {};
        const data = JSON.parse(fileContent);
        // Support migration from single plan to multi-week
        if (data.columns && !data.plans) {
            return { "legacy": data.columns };
        }
        return data.plans || {};
    } catch (e) {
        console.error('Error reading plans:', e);
        return {};
    }
};

const getDefaultColumns = () => ({
    mon: { id: 'mon', title: 'Monday', items: [] },
    tue: { id: 'tue', title: 'Tuesday', items: [] },
    wed: { id: 'wed', title: 'Wednesday', items: [] },
    thu: { id: 'thu', title: 'Thursday', items: [] },
    fri: { id: 'fri', title: 'Friday', items: [] },
    sat: { id: 'sat', title: 'Saturday', items: [] },
    sun: { id: 'sun', title: 'Sunday', items: [] }
});

const savePlans = (plans: any) => {
    try {
        fs.writeFileSync(planPath, JSON.stringify({ plans }, null, 2));
    } catch (e) {
        console.error('Error saving plans:', e);
    }
};

// 1. Get Recipes (from recipes.json)
app.get('/api/recipes', (req, res) => {
    try {
        if (!fs.existsSync(recipesPath)) {
            console.warn('recipes.json not found, returning empty list');
            return res.json([]);
        }
        const fileContent = fs.readFileSync(recipesPath, 'utf8');
        if (!fileContent.trim()) return res.json([]);
        const data = JSON.parse(fileContent);
        res.json(data.recipes || []);
    } catch (err) {
        console.error('Error in GET /api/recipes:', err);
        res.status(500).json({ error: 'Failed to fetch recipes' });
    }
});

app.post('/api/recipes', (req, res) => {
    try {
        const validatedRecipe = validateRecipe(req.body);
        if (!validatedRecipe) return res.status(400).json({ error: 'Invalid recipe data' });

        if (areMacrosZero(validatedRecipe)) {
            return res.status(400).json({ error: 'Nutritional information is required' });
        }

        const data = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));
        
        // Prevent abuse: limit total number of recipes
        if (data.recipes.length >= 200) {
            return res.status(400).json({ error: 'Maximum recipe limit reached' });
        }

        // Robust ID generation: find max number after 'd'
        const maxIdNum = data.recipes.reduce((max: number, r: any) => {
            const num = parseInt(r.id.replace(/^d/, ''));
            return !isNaN(num) ? Math.max(max, num) : max;
        }, 0);
        
        const newRecipe = {
            ...validatedRecipe,
            id: `d${(maxIdNum + 1).toString().padStart(3, '0')}`
        };
        
        data.recipes.push(newRecipe);
        fs.writeFileSync(recipesPath, JSON.stringify(data, null, 2), 'utf8');
        
        console.log(`Successfully added recipe ${newRecipe.id}: ${newRecipe.name}`);
        res.status(201).json(newRecipe);
    } catch (err) {
        console.error("Error saving recipe:", err);
        res.status(500).json({ error: 'Failed to save recipe' });
    }
});

app.put('/api/recipes/:id', (req, res) => {
    try {
        const { id } = req.params;
        const validatedRecipe = validateRecipe(req.body);
        if (!validatedRecipe) return res.status(400).json({ error: 'Invalid recipe data' });

        if (areMacrosZero(validatedRecipe)) {
            return res.status(400).json({ error: 'Nutritional information is required' });
        }

        const data = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));
        const index = data.recipes.findIndex((r: any) => r.id === id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        data.recipes[index] = {
            ...validatedRecipe,
            id // keep original ID
        };
        
        fs.writeFileSync(recipesPath, JSON.stringify(data, null, 2), 'utf8');
        
        console.log(`Successfully updated recipe ${id}: ${data.recipes[index].name}`);
        res.json(data.recipes[index]);
    } catch (err) {
        console.error("Error updating recipe:", err);
        res.status(500).json({ error: 'Failed to update recipe' });
    }
});

app.delete('/api/recipes/:id', (req, res) => {
    try {
        const { id } = req.params;
        const data = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));
        const index = data.recipes.findIndex((r: any) => r.id === id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        const deletedName = data.recipes[index].name;
        data.recipes.splice(index, 1);
        
        fs.writeFileSync(recipesPath, JSON.stringify(data, null, 2), 'utf8');
        
        console.log(`Successfully deleted recipe ${id}: ${deletedName}`);
        res.json({ message: 'Recipe deleted successfully', id });
    } catch (err) {
        console.error("Error deleting recipe:", err);
        res.status(500).json({ error: 'Failed to delete recipe' });
    }
});

// 2. Get/Update Weekly Plan
app.get('/api/plan', (req, res) => {
    const weekId = req.query.week as string || 'legacy';
    const plans = getPlans();
    res.json({ columns: plans[weekId] || getDefaultColumns() });
});

app.post('/api/plan', (req, res) => {
    const weekId = req.query.week as string || 'legacy';
    
    // Validate weekId
    if (weekId !== 'legacy' && !/^\d{4}-\d{2}-\d{2}$/.test(weekId)) {
        return res.status(400).json({ error: 'Invalid week ID' });
    }

    const { columns } = req.body;
    if (!columns || typeof columns !== 'object') {
        return res.status(400).json({ error: 'Invalid columns data' });
    }

    const plans = getPlans();
    
    // Limit number of stored plans to prevent disk abuse
    if (Object.keys(plans).length >= 50 && !plans[weekId]) {
        return res.status(400).json({ error: 'Storage limit reached' });
    }

    // Basic structure validation for columns
    const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const validatedColumns: any = {};
    
    for (const key of dayKeys) {
        if (columns[key]) {
            validatedColumns[key] = {
                id: key,
                title: columns[key].title || '',
                items: Array.isArray(columns[key].items) 
                    ? columns[key].items.map((r: any) => validateRecipe(r)).filter(Boolean)
                    : []
            };
        }
    }

    plans[weekId] = validatedColumns;
    savePlans(plans);
    res.json({ message: 'Plan saved successfully' });
});

app.get('/health', (req, res) => {
    res.send('OK');
});

// 3. AI: Generate Shopping List & Prep Timeline
// New Route: Estimate Nutrition
app.post('/api/ai/estimate', aiLimiter, async (req, res) => {
    const { recipeName, ingredients } = req.body;

    if (!recipeName || typeof recipeName !== 'string') {
        return res.status(400).json({ error: 'Recipe name is required' });
    }
    
    // Limit input length
    if (recipeName.length > 100) {
        return res.status(400).json({ error: 'Recipe name too long' });
    }
    
    const safeIngredients = Array.isArray(ingredients) 
        ? ingredients.filter(i => typeof i === 'string').map(i => i.slice(0, 100))
        : [];
        
    if (safeIngredients.length > 20) {
        return res.status(400).json({ error: 'Too many ingredients' });
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const hasKey = !!process.env.GEMINI_API_KEY;

    try {
        // Kill AI on production or if key is missing
        if (isProduction || !hasKey) {
            console.log(`Bypassing AI (Prod: ${isProduction}, Key: ${hasKey}). Generating random nutrition data.`);
            return res.json({
                calories: Math.floor(Math.random() * 400) + 200,
                protein: Math.floor(Math.random() * 25) + 10,
                carbs: Math.floor(Math.random() * 50) + 20,
                fat: Math.floor(Math.random() * 20) + 5,
                ingredientStatus: safeIngredients.map(name => ({ name, status: 'ok' }))
            });
        }

        const result = await estimateNutritionGemini(recipeName, safeIngredients);
        if (!result) {
             return res.status(500).json({ error: 'Failed to estimate nutrition from AI' });
        }
        res.json(result);
    } catch (err) {
        console.error("AI Estimate Error:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/ai/process', async (req, res) => {
    const { plan, mode } = req.body; // mode: 'shopping' | 'prep'
    
    if (mode !== 'shopping' && mode !== 'prep') {
        return res.status(400).json({ error: 'Invalid mode' });
    }

    if (!plan || typeof plan !== 'object') {
        return res.status(400).json({ error: 'Invalid plan' });
    }

    if (!openai) {
        return res.json({ 
            output: "AI Key missing. Here is a mock list: 1. Onions (3), 2. Chicken, 3. Olive Oil." 
        });
    }

    const prompt = mode === 'shopping' 
        ? `Given this weekly meal plan: ${JSON.stringify(plan)}. 
           1. Extract all ingredients. 
           2. CONSOLIDATE them (e.g., if multiple recipes use onions, sum them up).
           3. Optimize for a two-person household. 
           Return a clean, categorized shopping list.`
        : `Given this weekly meal plan: ${JSON.stringify(plan)}. 
           1. Build a prep timeline for the week.
           2. BATCH similar tasks (e.g., "Chop 4 onions for Mon, Wed, Fri meals at once").
           3. Suggest what can be prepared on Sunday. 
           Keep it concise and actionable.`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
        });
        res.json({ output: completion.choices[0].message.content });
    } catch (error) {
        res.status(500).json({ error: "AI failed to process" });
    }
});

// Serve frontend static files from 'public' or 'dist'
const frontendPath = path.join(__dirname, '../public');
if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(frontendPath, 'index.html'));
        }
    });
}

app.listen(port, () => {
    console.log(`Backend running at http://localhost:${port}`);
});

export default app;
