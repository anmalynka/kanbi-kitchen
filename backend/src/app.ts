import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Resolve paths to handle both local dev and Docker production
// In Docker, files are in the same dir as package.json
// In local dev, they are in the root
const recipesPath = fs.existsSync(path.join(__dirname, '../../recipes.json')) 
    ? path.join(__dirname, '../../recipes.json')
    : path.join(process.cwd(), './recipes.json');

const planPath = fs.existsSync(path.join(__dirname, '../../plan.json'))
    ? path.join(__dirname, '../../plan.json')
    : path.join(process.cwd(), './plan.json');

app.use(cors());
app.use(express.json());

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// Helper to read/write plan
const getPlans = () => {
    if (!fs.existsSync(planPath)) return {};
    try {
        const data = JSON.parse(fs.readFileSync(planPath, 'utf8'));
        // Support migration from single plan to multi-week
        if (data.columns && !data.plans) {
            return { "legacy": data.columns };
        }
        return data.plans || {};
    } catch (e) {
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
    fs.writeFileSync(planPath, JSON.stringify({ plans }, null, 2));
};

// 1. Get Recipes (from recipes.json)
app.get('/api/recipes', (req, res) => {
    const data = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));
    res.json(data.recipes);
});

app.post('/api/recipes', (req, res) => {
    try {
        const newRecipe = req.body;
        const data = JSON.parse(fs.readFileSync(recipesPath, 'utf8'));
        
        // Robust ID generation: find max number after 'd'
        const maxIdNum = data.recipes.reduce((max: number, r: any) => {
            const num = parseInt(r.id.replace(/^d/, ''));
            return !isNaN(num) ? Math.max(max, num) : max;
        }, 0);
        
        newRecipe.id = `d${(maxIdNum + 1).toString().padStart(3, '0')}`;
        
        data.recipes.push(newRecipe);
        fs.writeFileSync(recipesPath, JSON.stringify(data, null, 2), 'utf8');
        
        console.log(`Successfully added recipe ${newRecipe.id}: ${newRecipe.name}`);
        res.status(201).json(newRecipe);
    } catch (err) {
        console.error("Error saving recipe:", err);
        res.status(500).json({ error: 'Failed to save recipe' });
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
    const { columns } = req.body;
    const plans = getPlans();
    plans[weekId] = columns;
    savePlans(plans);
    res.json({ message: 'Plan saved successfully' });
});

app.get('/health', (req, res) => {
    res.send('OK');
});

// 3. AI: Generate Shopping List & Prep Timeline
app.post('/api/ai/process', async (req, res) => {
    const { plan, mode } = req.body; // mode: 'shopping' | 'prep'
    
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
