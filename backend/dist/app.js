"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Resolve paths to handle both local dev and Docker production
// In Docker, files are in the same dir as package.json
// In local dev, they are in the root
const recipesPath = fs_1.default.existsSync(path_1.default.join(__dirname, '../../recipes.json'))
    ? path_1.default.join(__dirname, '../../recipes.json')
    : path_1.default.join(process.cwd(), './recipes.json');
const planPath = fs_1.default.existsSync(path_1.default.join(__dirname, '../../plan.json'))
    ? path_1.default.join(__dirname, '../../plan.json')
    : path_1.default.join(process.cwd(), './plan.json');
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const openai = process.env.OPENAI_API_KEY ? new openai_1.default({ apiKey: process.env.OPENAI_API_KEY }) : null;
// Helper to read/write plan
const getPlan = () => {
    const defaultPlan = {
        columns: {
            mon: { id: 'mon', title: 'Monday', items: [] },
            tue: { id: 'tue', title: 'Tuesday', items: [] },
            wed: { id: 'wed', title: 'Wednesday', items: [] },
            thu: { id: 'thu', title: 'Thursday', items: [] },
            fri: { id: 'fri', title: 'Friday', items: [] }
        }
    };
    if (!fs_1.default.existsSync(planPath))
        return defaultPlan;
    try {
        return JSON.parse(fs_1.default.readFileSync(planPath, 'utf8'));
    }
    catch (e) {
        return defaultPlan;
    }
};
const savePlan = (plan) => {
    fs_1.default.writeFileSync(planPath, JSON.stringify(plan, null, 2));
};
// 1. Get Recipes (from recipes.json)
app.get('/api/recipes', (req, res) => {
    const data = JSON.parse(fs_1.default.readFileSync(recipesPath, 'utf8'));
    res.json(data.recipes);
});
// 2. Get/Update Weekly Plan
app.get('/api/plan', (req, res) => {
    res.json(getPlan());
});
app.post('/api/plan', (req, res) => {
    savePlan(req.body);
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
    }
    catch (error) {
        res.status(500).json({ error: "AI failed to process" });
    }
});
app.listen(port, () => {
    console.log(`Backend running at http://localhost:${port}`);
});
exports.default = app;
