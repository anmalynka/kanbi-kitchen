import React from 'react';
import { Recipe } from '../types';

interface RecipeCardDetailedProps {
  recipe: Recipe;
}

const RecipeCardDetailed: React.FC<RecipeCardDetailedProps> = ({ recipe }) => {
  const macros = recipe.macros;
  const totalCalories = macros.protein * 4 + macros.carbs * 4 + macros.fat * 9;
  
  const proteinPercent = Math.round((macros.protein * 4 / totalCalories) * 100);
  const carbsPercent = Math.round((macros.carbs * 4 / totalCalories) * 100);
  const fatPercent = Math.round((macros.fat * 9 / totalCalories) * 100);

  const getCategoryColor = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('meat') || cat.includes('chicken') || cat.includes('beef')) return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
    if (cat.includes('fish') || cat.includes('seafood') || cat.includes('salmon')) return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';
    if (cat.includes('veg')) return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300';
    if (cat.includes('pasta') || cat.includes('italian')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
    if (cat.includes('pizza')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    if (cat.includes('salad')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    if (cat.includes('dessert') || cat.includes('sweet')) return 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300';
    if (cat.includes('breakfast')) return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300';
    if (cat.includes('soup')) return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
    if (cat.includes('side') || cat.includes('snack')) return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/30 transition-all flex flex-col h-full group">
      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-3">
          <span className={`px-2 py-0.5 ${getCategoryColor(recipe.category)} text-[10px] font-bold uppercase tracking-wider rounded-md`}>
            {recipe.category}
          </span>
          <div className="flex items-center gap-1 text-slate-400">
            <span className="material-symbols-outlined text-sm">schedule</span>
            <span className="text-[10px] font-bold uppercase">{recipe.prepTime} min</span>
          </div>
        </div>

        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight mb-3 group-hover:text-primary transition-colors">
          {recipe.name}
        </h3>

        <div className="mb-4 flex-1">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Ingredients</p>
          <ul className="space-y-1.5">
            {recipe.ingredients.map((ing, idx) => (
              <li key={idx} className="text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
                <div className="size-1 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                <span className="leading-tight">{ing}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Energy</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">
                {macros.calories} <span className="text-[10px] uppercase text-slate-400">kcal</span>
              </p>
            </div>
            <div className="flex gap-2.5 text-right">
               <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-blue-500 uppercase">P</span>
                  <span className="text-[10px] font-bold dark:text-slate-300">{macros.protein}g</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-orange-500 uppercase">C</span>
                  <span className="text-[10px] font-bold dark:text-slate-300">{macros.carbs}g</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-yellow-500 uppercase">F</span>
                  <span className="text-[10px] font-bold dark:text-slate-300">{macros.fat}g</span>
               </div>
            </div>
          </div>

          <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 shadow-inner">
            <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${proteinPercent}%` }} title={`Protein: ${proteinPercent}%`} />
            <div className="h-full bg-orange-400 transition-all duration-500" style={{ width: `${carbsPercent}%` }} title={`Carbs: ${carbsPercent}%`} />
            <div className="h-full bg-yellow-400 transition-all duration-500" style={{ width: `${fatPercent}%` }} title={`Fat: ${fatPercent}%`} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeCardDetailed;
