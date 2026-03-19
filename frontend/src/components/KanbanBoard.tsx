import React, { useRef, useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import RecipeCard from './RecipeCard';
import { Recipe } from '../types';
import html2canvas from 'html2canvas';

interface KanbanBoardProps {
  data: any;
  deleteMeal: (columnId: string, index: number) => void;
  clearPlan: () => void;
  currentDate: Date;
  onNextWeek: () => void;
  onPrevWeek: () => void;
  calorieTarget: number;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ data, deleteMeal, clearPlan, currentDate, onNextWeek, onPrevWeek, calorieTarget }) => {
  const planRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isGroceryModalOpen, setIsGroceryModalOpen] = useState(false);

  // Derive unique categories from the recipe bank
  const categories = Array.from(new Set((data.columns.bank.items || []).map((r: Recipe) => r.category))).sort() as string[];

  const getMonday = (d: Date) => {
    d = new Date(d);
    var day = d.getDay(),
        diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  }

  const monday = getMonday(currentDate);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const formatDateRange = (start: Date, end: Date) => {
    const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
    const startStr = start.toLocaleDateString('en-US', options);
    const endStr = end.getDate();
    const year = end.getFullYear();
    return `${startStr} - ${endStr}, ${year}`;
  };

  const getColumnDate = (dayOffset: number) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + dayOffset);
    return date.getDate();
  };

  const getColumnDayFull = (dayOffset: number) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + dayOffset);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const calculateMacros = (items: Recipe[]) => {
    return items.reduce((acc, item) => ({
      calories: acc.calories + (item.macros?.calories || 0),
      protein: acc.protein + (item.macros?.protein || 0),
      carbs: acc.carbs + (item.macros?.carbs || 0),
      fat: acc.fat + (item.macros?.fat || 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  const downloadAsImage = async () => {
    const exportNode = document.getElementById('plan-export-view');
    if (exportNode) {
      exportNode.style.display = 'flex';
      try {
        const canvas = await html2canvas(exportNode, {
          background: '#ffffff',
          scale: 2,
          useCORS: true,
          logging: false,
        } as any);
        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = `weekly-plan-${monday.toISOString().split('T')[0]}.png`;
        link.click();
      } catch (err) {
        console.error("Error generating image:", err);
        alert("Failed to generate image.");
      } finally {
        exportNode.style.display = 'none';
      }
    }
  };

  const getSmartShoppingList = () => {
    const aggregated: { [key: string]: { quantity: number; unit: string } } = {};
    
    ['mon', 'tue', 'wed', 'thu', 'fri'].forEach(day => {
      data.columns[day].items.forEach((item: Recipe) => {
        item.ingredients?.forEach(ingStr => {
          // Normalizing spaces and parsing: "200 g - Chicken" or "10 ml - Milk" or "2 - Tortillas"
          const normalized = ingStr.replace(/\s+/g, ' ').trim();
          const match = normalized.match(/^([\d.]+)\s*([a-zA-Z]*)\s*-\s*(.*)$/);
          
          if (match) {
            const qty = parseFloat(match[1]);
            const unitStr = match[2].trim();
            const name = match[3].trim();
            const key = `${name.toLowerCase()}|${unitStr.toLowerCase()}`;
            
            if (aggregated[key]) {
              aggregated[key].quantity += qty;
            } else {
              aggregated[key] = { quantity: qty, unit: unitStr };
            }
          } else {
            // Fallback for items without quantity pattern
            const key = `${normalized.toLowerCase()}|`;
            if (!aggregated[key]) {
              aggregated[key] = { quantity: 0, unit: '' };
            }
          }
        });
      });
    });

    return Object.entries(aggregated).map(([key, val]) => {
      const [name] = key.split('|');
      const displayName = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      if (val.quantity === 0) return displayName;
      return `${val.quantity}${val.unit ? ' ' + val.unit : ''} - ${displayName}`;
    }).sort();
  };

  const copyToClipboard = () => {
    const list = getSmartShoppingList().join('\n');
    navigator.clipboard.writeText(list);
    alert('Grocery list copied to clipboard!');
  };

  return (
    <main className="flex flex-1 overflow-hidden h-[calc(100vh-65px-40px)]">
      {/* Grocery Modal */}
      {isGroceryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Smart Grocery List</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Aggregated for the week</p>
              </div>
              <button onClick={() => setIsGroceryModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <ul className="space-y-3">
                {getSmartShoppingList().map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 text-sm font-bold text-slate-700 dark:text-slate-300">
                    <div className="size-5 border-2 border-primary/30 rounded-md flex-shrink-0 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[14px]">check</span>
                    </div>
                    {item}
                  </li>
                ))}
                {getSmartShoppingList().length === 0 && (
                  <li className="text-center py-12 text-slate-400 italic">No items in your list. Add meals to the board first!</li>
                )}
              </ul>
            </div>
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <button 
                onClick={copyToClipboard}
                className="flex-1 bg-primary text-white font-black uppercase text-xs py-4 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">content_copy</span>
                Copy to Clipboard
              </button>
              <button 
                onClick={() => setIsGroceryModalOpen(false)}
                className="px-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black uppercase text-xs py-4 rounded-xl hover:bg-slate-50 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Export View - Improved for clean export */}
      <div 
        id="plan-export-view" 
        style={{ display: 'none' }}
        className="fixed top-0 left-0 w-[1200px] bg-white p-12 flex gap-12 font-display"
      >
        <div className="flex-1">
          <div className="mb-10 border-b-4 border-primary pb-4">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Weekly Meal Plan</h1>
            <p className="text-slate-500 font-bold tracking-widest text-sm mt-1 uppercase">{formatDateRange(monday, friday)}</p>
          </div>
          <div className="grid grid-cols-5 gap-6">
            {['mon', 'tue', 'wed', 'thu', 'fri'].map((day, idx) => (
              <div key={day} className="flex flex-col">
                <h3 className="text-xs font-black text-primary uppercase mb-4 tracking-tighter border-b-2 border-primary/20 pb-2">
                  {getColumnDayFull(idx)} ({getColumnDate(idx)})
                </h3>
                <div className="space-y-3">
                  {data.columns[day].items.map((item: Recipe) => (
                    <div key={item.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-2">
                      <div className="text-[13px] font-black text-slate-900 leading-tight border-b border-slate-200 pb-1.5">
                        {item.name}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest">Ingredients</span>
                        <ul className="space-y-0.5">
                          {item.ingredients?.map((ing, idx) => (
                            <li key={idx} className="text-[10px] font-medium text-slate-600 flex items-start gap-1.5">
                              <div className="size-1 rounded-full bg-slate-300 mt-1 shrink-0" />
                              {ing}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                  {data.columns[day].items.length === 0 && <span className="text-xs text-slate-300 italic">No meals scheduled</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-[320px] bg-slate-50 rounded-3xl p-8 border border-slate-100">
           <h2 className="text-2xl font-black mb-8 text-slate-900 uppercase tracking-tight border-b-2 border-slate-200 pb-2">
             Ingredients
           </h2>
           <ul className="space-y-3">
             {getSmartShoppingList().map((ing, idx) => (
               <li key={idx} className="text-[13px] font-medium text-slate-600 flex items-start gap-3">
                 <div className="size-4 border-2 border-slate-300 rounded-md mt-0.5 flex-shrink-0"></div>
                 {ing}
               </li>
             ))}
             {getSmartShoppingList().length === 0 && <li className="text-sm text-slate-400 italic">Plan meals to see ingredients</li>}
           </ul>
        </div>
      </div>

      <aside className="w-[320px] min-w-[320px] border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-900/50">
        <div className="p-[16px] space-y-[16px]">
          <div className="flex flex-col">
            <h1 className="text-slate-900 dark:text-slate-100 text-[20px] font-bold leading-[28px]">Dish Bank</h1>
            <p className="text-slate-500 dark:text-slate-400 text-[14px] leading-[20px]">Drag dishes to your schedule</p>
          </div>

          <div className="pt-2">
            <div className="relative group">
              <select 
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-[12px] py-[10px] text-[14px] font-bold text-slate-700 dark:text-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer transition-all shadow-sm pr-[36px]"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div className="absolute right-[12px] top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                <span className="material-symbols-outlined text-[18px]">expand_more</span>
              </div>
            </div>
          </div>

          <div className="space-y-[12px]">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center px-[13px] py-[9px] rounded-xl shadow-sm w-full focus-within:border-primary transition-all">
              <span className="material-symbols-outlined text-[18px] text-slate-400">search</span>
              <input 
                className="flex-1 border-none bg-transparent focus:ring-0 text-[14px] px-[12px] placeholder:text-slate-400 dark:text-white" 
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-primary">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-[16px] pb-[16px] space-y-[24px]">
          {categories
            .filter(cat => !selectedCategory || selectedCategory === cat)
            .map(cat => {
            const recipes = (data.columns.bank.items || [])
              .filter((r: Recipe) => r.category === cat)
              .filter((r: Recipe) => r.name.toLowerCase().includes(searchQuery.toLowerCase()));

            if (recipes.length === 0) return null;

            return (
              <section key={cat} className="space-y-[12px]">
                <h3 className="text-[12px] font-bold uppercase tracking-[0.6px] text-slate-400 px-[4px] leading-[16px]">{cat}</h3>
                <Droppable droppableId={`bank-${cat}`}>
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="min-h-[40px]">
                      {recipes.map((recipe: Recipe, index: number) => (
                        <RecipeCard 
                          key={`bank-${recipe.id}`} 
                          recipe={{...recipe, id: `bank-item-${recipe.id}`}} 
                          index={index} 
                        />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </section>
            );
          })}
          {selectedCategory && (data.columns.bank.items || [])
            .filter((r: Recipe) => r.category === selectedCategory)
            .filter((r: Recipe) => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .length === 0 && (
              <div className="text-center py-10">
                <p className="text-slate-400 text-sm">No recipes found in this category</p>
              </div>
          )}
        </div>
      </aside>

      <section ref={planRef} className="flex-1 flex flex-col overflow-hidden bg-background-light dark:bg-background-dark p-[24px]">
        <div className="flex justify-between items-center mb-[24px]">
           <div className="flex items-center gap-[16px]">
              <div className="flex items-center gap-2">
                <button onClick={onPrevWeek} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                  <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">chevron_left</span>
                </button>
                <h2 className="text-[20px] font-bold text-slate-900 dark:text-white min-w-[220px] text-center">{formatDateRange(monday, friday)}</h2>
                <button onClick={onNextWeek} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                  <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">chevron_right</span>
                </button>
              </div>
           </div>
           <div className="flex items-center gap-[12px]">
             <button 
               onClick={clearPlan}
               className="flex items-center gap-[8px] rounded-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-[16px] py-[8px] text-[14px] font-bold text-slate-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all shadow-sm"
             >
                <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                Clear
             </button>
             <button 
               onClick={downloadAsImage}
               className="flex items-center gap-[8px] rounded-[12px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-[16px] py-[8px] text-[14px] font-bold text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-all shadow-sm"
             >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Download
             </button>
             <button 
               onClick={() => setIsGroceryModalOpen(true)}
               className="flex items-center gap-[8px] rounded-[12px] bg-[#ec5b13] px-[16px] py-[8px] text-[14px] font-bold text-white shadow-lg shadow-primary/20 hover:bg-[#d95411] transition-all"
             >
                <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                Generate Grocery List
             </button>
           </div>
        </div>

        <div className="flex-1 grid grid-cols-5 gap-[8px] overflow-hidden">
          {['mon', 'tue', 'wed', 'thu', 'fri'].map((dayKey, idx) => {
            const col = data.columns[dayKey];
            const macros = calculateMacros(col.items || []);
            const caloriesPercent = Math.min((macros.calories / calorieTarget) * 100, 100);

            return (
              <div key={col.id} className="flex flex-col gap-[8px] h-full bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl p-[8px] relative border border-slate-200/50 dark:border-slate-700/50">
                <div className={`text-center pb-[4px] border-b-2 ${dayKey === 'mon' ? 'border-primary' : 'border-transparent'} shrink-0`}>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-[14px] mb-1">{getColumnDayFull(idx)} ({getColumnDate(idx)})</p>
                </div>

                {/* Macro Progress - Now at the Top */}
                <div className="shrink-0">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-xl w-full shadow-sm">
                    {/* Top Row: Status and Total Calories */}
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px] text-emerald-600 font-bold">auto_awesome</span>
                        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tight">Macros</span>
                      </div>
                      <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400">
                        {macros.calories} kkal
                      </span>
                    </div>

                    {/* Middle Row: Progress Bars */}
                    <div className="flex gap-1 h-[4px] w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 mb-2">
                      {macros.calories > 0 ? (
                        <>
                          <div 
                            className={`h-full transition-all duration-500 ${caloriesPercent > 100 ? 'bg-red-500' : 'bg-blue-400'}`} 
                            style={{ width: `${(macros.protein * 4 / (macros.protein * 4 + macros.carbs * 4 + macros.fat * 9)) * 100}%` }}
                          />
                          <div 
                            className={`h-full transition-all duration-500 ${caloriesPercent > 100 ? 'bg-red-500' : 'bg-orange-400'}`} 
                            style={{ width: `${(macros.carbs * 4 / (macros.protein * 4 + macros.carbs * 4 + macros.fat * 9)) * 100}%` }}
                          />
                          <div 
                            className={`h-full transition-all duration-500 ${caloriesPercent > 100 ? 'bg-red-500' : 'bg-yellow-400'}`} 
                            style={{ width: `${(macros.fat * 9 / (macros.protein * 4 + macros.carbs * 4 + macros.fat * 9)) * 100}%` }}
                          />
                        </>
                      ) : (
                        <div className="h-full w-full bg-slate-100 dark:bg-slate-700" />
                      )}
                    </div>

                    {/* Bottom Row: Macro Percentages */}
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] font-bold text-slate-400 uppercase">P: {macros.calories > 0 ? Math.round((macros.protein * 4 / (macros.protein * 4 + macros.carbs * 4 + macros.fat * 9)) * 100) : 0}%</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">C: {macros.calories > 0 ? Math.round((macros.carbs * 4 / (macros.protein * 4 + macros.carbs * 4 + macros.fat * 9)) * 100) : 0}%</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">F: {macros.calories > 0 ? Math.round((macros.fat * 9 / (macros.protein * 4 + macros.carbs * 4 + macros.fat * 9)) * 100) : 0}%</span>
                    </div>
                  </div>
                </div>
                
                {/* Scrollable Meal List */}
                <div 
                  className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 pr-1 custom-scrollbar"
                  style={{ maxHeight: '100%' }}
                >
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex flex-col gap-2 min-h-[100%] transition-colors pb-4 ${snapshot.isDraggingOver ? 'bg-primary/5 rounded-xl' : ''}`}
                      >
                        {col.items?.map((recipe: Recipe, index: number) => (
                          <RecipeCard key={recipe.id} recipe={recipe} index={index} onDoubleClick={() => deleteMeal(col.id, index)} />
                        ))}
                        {provided.placeholder}
                        
                        {/* Always show a "Drop here" area at the end */}
                        <div className="border-2 border-slate-300 dark:border-slate-700 border-dashed rounded-xl p-[14px] flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 hover:border-primary/50 hover:bg-primary/5 transition-all min-h-[80px] shrink-0">
                           <span className="material-symbols-outlined text-[18px] mb-1">add_circle</span>
                           <span className="text-[9px] uppercase font-bold leading-[12px]">Drop here</span>
                        </div>
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
};

export default KanbanBoard;
