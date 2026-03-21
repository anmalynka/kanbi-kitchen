import React from 'react';
import { Recipe } from '../types';

interface RecipeCardDetailedProps {
  recipe: Recipe;
  onEdit?: (recipe: Recipe) => void;
  onDelete?: (recipeId: string) => void;
  onToggleFavorite?: (recipe: Recipe) => void;
}

const RecipeCardDetailed: React.FC<RecipeCardDetailedProps> = ({ recipe, onEdit, onDelete, onToggleFavorite }) => {
  const macros = recipe.macros;
  const totalCalories = macros.protein * 4 + macros.carbs * 4 + macros.fat * 9;
  
  const proteinPercent = Math.round((macros.protein * 4 / totalCalories) * 100);
  const carbsPercent = Math.round((macros.carbs * 4 / totalCalories) * 100);
  const fatPercent = Math.round((macros.fat * 9 / totalCalories) * 100);

  const getCategoryColor = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('meat') || cat.includes('chicken') || cat.includes('beef')) return 'border-rose-200 text-rose-500 dark:border-rose-900/50 dark:text-rose-400';
    if (cat.includes('fish') || cat.includes('seafood') || cat.includes('salmon')) return 'border-sky-200 text-sky-500 dark:border-sky-900/50 dark:text-sky-400';
    if (cat.includes('veg')) return 'border-teal-200 text-teal-500 dark:border-teal-900/50 dark:text-teal-400';
    if (cat.includes('pasta') || cat.includes('italian')) return 'border-orange-200 text-orange-500 dark:border-orange-900/50 dark:text-orange-400';
    if (cat.includes('pizza')) return 'border-amber-200 text-amber-500 dark:border-amber-900/50 dark:text-amber-400';
    if (cat.includes('salad')) return 'border-emerald-200 text-emerald-500 dark:border-emerald-900/50 dark:text-emerald-400';
    if (cat.includes('dessert') || cat.includes('sweet')) return 'border-fuchsia-200 text-fuchsia-500 dark:border-fuchsia-900/50 dark:text-fuchsia-400';
    if (cat.includes('breakfast')) return 'border-violet-200 text-violet-500 dark:border-violet-900/50 dark:text-violet-400';
    if (cat.includes('soup')) return 'border-indigo-200 text-indigo-500 dark:border-indigo-900/50 dark:text-indigo-400';
    if (cat.includes('side') || cat.includes('snack')) return 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400';
    return 'border-zinc-200 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400';
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/30 transition-all flex flex-col h-full group relative">
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 border ${getCategoryColor(recipe.category)} text-[11px] font-bold tracking-wider rounded-md`}>
              {recipe.category}
            </span>
            <div className="flex items-center gap-1 text-slate-500">
              <span className="material-symbols-outlined text-sm">schedule</span>
              <span className="text-[12px] font-bold">{recipe.prepTime} min</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {(onEdit || onDelete) && (
              <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-700 pr-3 mr-1">
                {onEdit && (
                  <button 
                    onClick={() => onEdit(recipe)}
                    className="text-slate-400 hover:text-primary transition-colors flex items-center"
                    title="Edit recipe"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                )}
                {onDelete && (
                  <button 
                    onClick={() => onDelete(recipe.id)}
                    className="text-slate-400 hover:text-orange-500 transition-colors flex items-center"
                    title="Delete recipe"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                )}
              </div>
            )}

            <button 
              onClick={() => onToggleFavorite?.(recipe)}
              className={`size-8 flex items-center justify-center rounded-full transition-all ${recipe.isFavorite ? 'bg-amber-50 text-amber-500 shadow-sm' : 'bg-slate-50 text-slate-300 hover:text-amber-400 hover:bg-white'}`}
            >
              <span className={`material-symbols-outlined text-[20px] ${recipe.isFavorite ? 'fill-1' : ''}`} style={{ fontVariationSettings: recipe.isFavorite ? "'FILL' 1" : "'FILL' 0" }}>
                star
              </span>
            </button>
          </div>
        </div>

        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight mb-3 group-hover:text-primary transition-colors">
          {recipe.name}
        </h3>

        <div className="mb-4 flex-1">
          <p className="text-[12px] font-bold text-slate-500 tracking-widest mb-1.5">INGREDIENTS</p>
          <ul className="space-y-1.5">
            {recipe.ingredients.map((ing, idx) => (
              <li key={idx} className="text-[12px] text-slate-700 dark:text-slate-400 flex items-start gap-2">
                <div className="size-1 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                <span className="leading-tight">{ing}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-[12px] font-bold text-slate-500 tracking-widest mb-0.5">Energy</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">
                {macros.calories} <span className="text-[12px] text-slate-500">kcal</span>
              </p>
            </div>
            <div className="flex gap-2.5 text-right">
               <div className="flex flex-col">
                  <span className="text-[12px] font-bold text-blue-500">P</span>
                  <span className="text-[12px] font-bold dark:text-slate-300">{macros.protein}g</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-[12px] font-bold text-orange-500">C</span>
                  <span className="text-[12px] font-bold dark:text-slate-300">{macros.carbs}g</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-[12px] font-bold text-yellow-500">F</span>
                  <span className="text-[12px] font-bold dark:text-slate-300">{macros.fat}g</span>
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
