import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Recipe } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
  index: number;
  onDoubleClick?: () => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, index, onDoubleClick }) => {
  return (
    <Draggable draggableId={recipe.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onDoubleClick={onDoubleClick}
          className={`group cursor-grab active:cursor-grabbing p-[13px] rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-primary flex items-center gap-[12px] ${
            snapshot.isDragging ? 'shadow-lg border-primary/50 z-50' : 'transition-all'
          }`}
          style={{
            ...provided.draggableProps.style,
          }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 leading-[18px] line-clamp-3 overflow-hidden">
              {recipe.name}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
              <span className="text-[12px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                {recipe.macros?.calories || 0} kcal
              </span>
              <span className="text-[12px] text-slate-600 dark:text-slate-400">
                P: <span className="font-medium text-slate-700 dark:text-slate-300">{recipe.macros?.protein}g</span>
              </span>
              <span className="text-[12px] text-slate-600 dark:text-slate-400">
                C: <span className="font-medium text-slate-700 dark:text-slate-300">{recipe.macros?.carbs}g</span>
              </span>
              <span className="text-[12px] text-slate-600 dark:text-slate-400">
                F: <span className="font-medium text-slate-700 dark:text-slate-300">{recipe.macros?.fat}g</span>
              </span>
            </div>
          </div>
          <span className="material-symbols-outlined text-slate-300 group-hover:text-primary shrink-0 text-[18px]">drag_indicator</span>
        </div>
      )}
    </Draggable>
  );
};

export default RecipeCard;
