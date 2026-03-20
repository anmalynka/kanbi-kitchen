const fs = require('fs');
const path = require('path');

const getFilePath = (fileName) => {
    const paths = [
        path.join(__dirname, `../../${fileName}`),
        path.join(process.cwd(), `../${fileName}`),
        path.join(process.cwd(), `./${fileName}`),
        path.join(__dirname, `../${fileName}`)
    ];
    for (const p of paths) {
        console.log('Checking path:', p);
        if (fs.existsSync(p)) {
            console.log('Found:', p);
            return p;
        }
    }
    return path.join(process.cwd(), fileName); // Fallback
};

const recipesPath = getFilePath('recipes.json');
const planPath = getFilePath('plan.json');

console.log('Final recipesPath:', recipesPath);
console.log('Final planPath:', planPath);

try {
    const recipesContent = fs.readFileSync(recipesPath, 'utf8');
    const recipes = JSON.parse(recipesContent);
    console.log('Recipes parsed successfully, count:', recipes.recipes.length);
} catch (e) {
    console.error('Error parsing recipes.json:', e);
}

try {
    const planContent = fs.readFileSync(planPath, 'utf8');
    const plan = JSON.parse(planContent);
    console.log('Plan parsed successfully');
} catch (e) {
    console.error('Error parsing plan.json:', e);
}
