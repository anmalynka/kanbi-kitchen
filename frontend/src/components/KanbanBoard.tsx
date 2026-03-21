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
  viewMode: 5 | 7;
  onViewModeChange: (mode: 5 | 7) => void;
  isMobile: boolean;
  addMealToDay: (dayId: string, recipe: Recipe) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
  data, 
  deleteMeal, 
  clearPlan, 
  currentDate, 
  onNextWeek, 
  onPrevWeek, 
  calorieTarget,
  viewMode,
  onViewModeChange,
  isMobile,
  addMealToDay
}) => {
  const planRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isGroceryModalOpen, setIsGroceryModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  
  // Mobile specific state
  const [isAddMealModalOpen, setIsAddMealModalOpen] = useState(false);
  const [activeDayForAdd, setActiveDayForAdd] = useState<string | null>(null);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [mobileSelectedCategory, setMobileSelectedCategory] = useState<string | null>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Derive unique categories from the recipe bank
  const categories = Array.from(new Set((data.columns.bank.items || []).map((r: Recipe) => r.category))).sort() as string[];

  const getMonday = (d: Date) => {
    d = new Date(d);
    var day = d.getDay(),
        diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  }

  const monday = getMonday(currentDate);
  const endDate = new Date(monday);
  endDate.setDate(monday.getDate() + (viewMode - 1));

  const formatDateRange = (start: Date, end: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startStr = `${months[start.getMonth()]} ${start.getDate()}`;
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
    return date.toLocaleDateString('en-US', { weekday: isMobile ? 'short' : 'long' });
  };

  const calculateMacros = (items: Recipe[]) => {
    return items
      .filter(item => item && item.id)
      .reduce((acc, item) => ({
        calories: Math.round(acc.calories + (item.macros?.calories || 0)),
        protein: Math.round(acc.protein + (item.macros?.protein || 0)),
        carbs: Math.round(acc.carbs + (item.macros?.carbs || 0)),
        fat: Math.round(acc.fat + (item.macros?.fat || 0)),
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
    const activeDays = viewMode === 5 
      ? ['mon', 'tue', 'wed', 'thu', 'fri'] 
      : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    
    activeDays.forEach(day => {
      (data.columns[day]?.items || []).forEach((item: Recipe) => {
        item.ingredients?.forEach(ingStr => {
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
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const daysToRender = viewMode === 5 
    ? ['mon', 'tue', 'wed', 'thu', 'fri'] 
    : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  const filteredRecipes = (data.columns.bank.items || [])
    .filter((r: Recipe) => !mobileSelectedCategory || r.category === mobileSelectedCategory)
    .filter((r: Recipe) => r.name.toLowerCase().includes(mobileSearchQuery.toLowerCase()));

  return (
    <main className="flex flex-1 overflow-hidden flex-col xl:flex-row">
      {/* Grocery Modal */}
      {isGroceryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Smart Grocery List</h2>
                <p className="text-xs text-slate-500 font-bold tracking-widest mt-1">Aggregated for the week</p>
              </div>
              <button onClick={() => setIsGroceryModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
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
                  <li className="text-center py-12 text-slate-500 italic text-[12px]">No items in your list. Add meals to the board first!</li>
                )}
              </ul>
            </div>
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <button 
                onClick={copyToClipboard}
                className="flex-1 bg-primary text-white font-black text-xs py-4 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">content_copy</span>
                Copy to Clipboard
              </button>
              <button 
                onClick={() => setIsGroceryModalOpen(false)}
                className="px-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs py-4 rounded-xl hover:bg-slate-50 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Add Meal Modal (Bottom Sheet) */}
      {isAddMealModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm xl:hidden">
          <div className="bg-white dark:bg-slate-900 w-full h-[80vh] max-h-[80vh] rounded-t-[32px] shadow-2xl flex flex-col animate-slide-up">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight truncate">Add to {getColumnDayFull(daysToRender.indexOf(activeDayForAdd!))}</h2>
                <button onClick={() => setIsAddMealModalOpen(false)} className="size-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex-shrink-0">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              
              {/* Search */}
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center px-4 py-3 rounded-2xl relative">
                <span className="material-symbols-outlined text-slate-500 mr-3">search</span>
                <input 
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-500 pr-[70px]"
                  placeholder="Search recipes..."
                  value={mobileSearchQuery}
                  onChange={(e) => setMobileSearchQuery(e.target.value)}
                />
                {mobileSearchQuery && (
                  <div className="absolute right-4 inset-y-0 flex items-center gap-2">
                    <span className="text-[12px] font-bold text-slate-500 bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded shadow-sm">
                      {filteredRecipes.length}
                    </span>
                    <button onClick={() => setMobileSearchQuery('')} className="text-slate-500 hover:text-primary flex items-center">
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Categories */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                <button 
                  onClick={() => setMobileSelectedCategory(null)}
                  className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all border ${!mobileSelectedCategory ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}
                >
                  All
                </button>
                {categories.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setMobileSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all border ${mobileSelectedCategory === cat ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {filteredRecipes.map((recipe: Recipe) => (
                <div 
                  key={recipe.id}
                  onClick={() => {
                    addMealToDay(activeDayForAdd!, recipe);
                    setIsAddMealModalOpen(false);
                  }}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4 active:scale-95 transition-all"
                >
                  <div className="flex-1">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight mb-1">{recipe.name}</h3>
                    <div className="flex gap-3">
                      <span className="text-[12px] font-bold text-primary">{recipe.macros.calories} kcal</span>
                      <span className="text-[12px] font-bold text-slate-500">P: {recipe.macros.protein}g / C: {recipe.macros.carbs}g / F: {recipe.macros.fat}g</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-slate-300">add_circle</span>
                </div>
              ))}
              {filteredRecipes.length === 0 && (
                <div className="py-20 text-center text-slate-500 italic text-[12px]">No recipes found matching your search</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden Export View */}
      <div 
        id="plan-export-view" 
        style={{ display: 'none' }}
        className="fixed top-0 left-0 w-[1600px] bg-white p-12 flex flex-col gap-12 font-display"
      >
        <div className="flex flex-col">
          <div className="mb-10 border-b-4 border-primary pb-4 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Weekly Meal Plan</h1>
              <p className="text-slate-500 font-bold tracking-widest text-[14px] mt-2 uppercase">{formatDateRange(monday, endDate)}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 font-black text-[12px] tracking-[4px] uppercase">Kanbi Kitchen</p>
            </div>
          </div>
          <div className={`grid gap-4 ${viewMode === 5 ? 'grid-cols-5' : 'grid-cols-7'}`}>
            {daysToRender.map((day, idx) => (
              <div key={day} className="flex flex-col bg-slate-50/50 rounded-2xl border border-slate-100 p-4 min-h-[600px]">
                <h3 className="text-[14px] font-black text-primary mb-6 tracking-widest border-b-2 border-primary/20 pb-3 uppercase text-center">
                  {getColumnDayFull(idx)} <br/>
                  <span className="text-slate-400 text-[20px]">{getColumnDate(idx)}</span>
                </h3>
                <div className="space-y-4">
                  {(data.columns[day]?.items || []).map((item: Recipe, recipeIdx: number) => (
                    <div key={`${item.id}-${recipeIdx}`} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
                      <div className="text-[14px] font-black text-slate-900 leading-tight border-b border-slate-100 pb-2 uppercase">
                        {item.name}
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-black text-primary tracking-[2px] uppercase">INGREDIENTS</span>
                        <ul className="space-y-1">
                          {item.ingredients?.map((ing, idx) => (
                            <li key={idx} className="text-[11px] font-bold text-slate-600 flex items-start gap-2">
                              <div className="size-1 rounded-full bg-primary/30 mt-1.5 shrink-0" />
                              <span className="leading-tight">{ing}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="mt-1 pt-2 border-t border-slate-50 flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{item.macros.calories} KCAL</span>
                      </div>
                    </div>
                  ))}
                  {(data.columns[day]?.items || []).length === 0 && (
                    <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl">
                      <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest rotate-[-45deg]">Rest Day</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grocery Panel for Export */}
        <div className="w-full bg-slate-900 p-10 rounded-[40px] flex flex-col">
          <div className="mb-8 flex justify-between items-center border-b border-white/10 pb-6">
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Shopping List</h2>
            <p className="text-primary font-black tracking-[3px] text-[12px] uppercase">{getSmartShoppingList().length} Items Needed</p>
          </div>
          <div className="columns-3 gap-12 space-y-4">
            {getSmartShoppingList().map((item, idx) => (
              <div key={idx} className="flex items-start gap-4 text-[13px] font-bold text-slate-300 break-inside-avoid py-1">
                <div className="size-4 border-2 border-primary/50 rounded-md mt-0.5 shrink-0" />
                <span className="uppercase tracking-tight">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className="hidden xl:flex w-[320px] min-w-[320px] border-r border-slate-200 dark:border-slate-800 flex-col bg-slate-50 dark:bg-slate-900/50">
        <div className="p-[16px] space-y-[16px]">
          <div className="flex flex-col">
            <h1 className="text-slate-900 dark:text-slate-100 text-[20px] font-bold leading-[28px]">Dish Bank</h1>
            <p className="text-slate-500 dark:text-slate-400 text-[14px] leading-[20px]">Drag dishes to your schedule</p>
          </div>

          <div className="pt-2 relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`w-full h-[40px] flex items-center justify-between bg-white dark:bg-slate-800 border ${isDropdownOpen ? 'border-primary ring-4 ring-primary/10' : 'border-slate-200 dark:border-slate-700'} rounded-xl px-3 transition-all shadow-sm`}
            >
              <span className="text-[14px] font-bold text-slate-700 dark:text-slate-200">
                {selectedCategory || 'All Categories'}
              </span>
              <span className={`material-symbols-outlined text-slate-500 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-primary' : ''}`}>
                expand_more
              </span>
            </button>

            {isDropdownOpen && (
              <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${!selectedCategory ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                  >
                    All Categories
                  </button>
                  <div className="h-px bg-slate-100 dark:bg-slate-700/50 my-1 mx-2" />
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${selectedCategory === cat ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-[12px]">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center px-[13px] py-[9px] rounded-xl shadow-sm w-full focus-within:border-primary transition-all relative">
              <span className="material-symbols-outlined text-[18px] text-slate-500">search</span>
              <input 
                className="flex-1 border-none bg-transparent focus:ring-0 text-[14px] px-[12px] pr-[60px] placeholder:text-slate-500 dark:text-white" 
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <div className="absolute right-3 inset-y-0 flex items-center gap-1.5">
                  <span className="text-[12px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                    {(() => {
                      const totalMatches = (data.columns.bank.items || [])
                        .filter((r: Recipe) => !selectedCategory || r.category === selectedCategory)
                        .filter((r: Recipe) => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .length;
                      return totalMatches;
                    })()}
                  </span>
                  <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-primary flex items-center">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
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
                <h3 className="text-[12px] font-bold tracking-[0.6px] text-slate-500 px-[4px] leading-[16px] uppercase">{cat}</h3>
                <Droppable droppableId={`bank-${cat}`}>
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="min-h-[40px] flex flex-col gap-3">
                      {recipes.filter((r: Recipe) => r && r.id).map((recipe: Recipe, index: number) => (

                        <RecipeCard 
                          key={`bank-${recipe.id}-${index}`} 
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
        </div>
      </aside>

      <section ref={planRef} className="flex-1 flex flex-col overflow-hidden bg-background-light dark:bg-background-dark p-[12px] xl:p-[24px]">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-[16px] xl:mb-[24px] gap-4 sm:gap-2">
           <div className="flex flex-row items-center gap-1 sm:gap-2">
              <button onClick={onPrevWeek} className="size-8 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors shrink-0">
                <span className="material-symbols-outlined text-slate-600 dark:text-slate-400 text-[20px] sm:text-[24px]">chevron_left</span>
              </button>
              <h2 className="text-[16px] sm:text-lg xl:text-[20px] font-bold text-slate-900 dark:text-white min-w-[110px] sm:min-w-[200px] text-center whitespace-nowrap flex items-center justify-center h-8">{formatDateRange(monday, endDate)}</h2>
              <button onClick={onNextWeek} className="size-8 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors shrink-0">
                <span className="material-symbols-outlined text-slate-600 dark:text-slate-400 text-[20px] sm:text-[24px]">chevron_right</span>
              </button>

              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl ml-2 shrink-0">
                <button 
                  onClick={() => onViewModeChange(5)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${viewMode === 5 ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  5D
                </button>
                <button 
                  onClick={() => onViewModeChange(7)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${viewMode === 7 ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  7D
                </button>
              </div>
           </div>
           
           <div className="flex items-center gap-[4px] xl:gap-[8px] w-auto">
             <button onClick={clearPlan} className="flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2 px-3 sm:px-4 text-slate-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 transition-all shadow-sm">
                <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                <span className="hidden sm:inline font-bold text-[13px]">Clear</span>
             </button>
             <button onClick={downloadAsImage} className="flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-2 px-3 sm:px-4 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-all shadow-sm">
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span className="hidden sm:inline font-bold text-[13px]">Download</span>
             </button>
             <button onClick={() => setIsGroceryModalOpen(true)} className="flex items-center justify-center gap-2 rounded-xl bg-[#ec5b13] py-2 px-3 sm:px-4 text-white shadow-lg shadow-primary/20 hover:bg-[#d95411] transition-all">
                <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                <span className="hidden sm:inline font-bold text-[13px]">Grocery List</span>
             </button>
           </div>
        </div>

        {/* Board Container - Responsive Layout */}
        <div className={`flex-1 min-h-0 flex gap-[4px] overflow-x-auto xl:overflow-hidden pb-4 xl:pb-0 scroll-smooth snap-x snap-mandatory xl:snap-none xl:grid ${viewMode === 5 ? 'xl:grid-cols-5' : 'xl:grid-cols-7'}`}>
          {daysToRender.map((dayKey, idx) => {
            const col = data.columns[dayKey];
            if (!col) return null;
            const macros = calculateMacros(col.items || []);
            const isOverTarget = macros.calories > calorieTarget;

            return (
              <div 
                key={col.id} 
                className="flex flex-col gap-[4px] h-full xl:min-h-0 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl p-[4px] relative border border-slate-200/50 dark:border-slate-700/50 shrink-0 w-[85vw] max-w-[280px] min-w-[140px] xl:w-auto xl:max-w-none xl:shrink snap-center"
              >
                <div className="text-center pt-[8px] pb-[4px] border-b-2 border-transparent shrink-0">
                  <p className="text-[12px] font-bold text-slate-600 dark:text-slate-400 leading-[14px] mb-1 truncate">
                    {getColumnDayFull(idx)} ({getColumnDate(idx)})
                  </p>
                </div>

                <div className="shrink-0">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-xl w-full shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-1">
                        <span className={`material-symbols-outlined text-[12px] font-bold ${isOverTarget ? 'text-red-500' : 'text-emerald-600'}`}>
                          {isOverTarget ? 'report' : 'auto_awesome'}
                        </span>
                        <span className={`text-[12px] font-bold tracking-tight ${isOverTarget ? 'text-red-500' : 'text-emerald-600'}`}>Macros</span>
                      </div>
                      <span className={`text-[12px] font-medium ${isOverTarget ? 'text-red-500 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                        {macros.calories} kkal
                      </span>
                    </div>

                    <div className="flex gap-1 h-[4px] w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 mb-2">
                      {macros.calories > 0 ? (
                        <>
                          <div className={`h-full transition-all duration-500 ${isOverTarget ? 'bg-red-500' : 'bg-blue-400'}`} style={{ width: `${(macros.protein * 4 / (macros.protein * 4 + macros.carbs * 4 + macros.fat * 9)) * 100}%` }} />
                          <div className={`h-full transition-all duration-500 ${isOverTarget ? 'bg-red-500' : 'bg-orange-400'}`} style={{ width: `${(macros.carbs * 4 / (macros.protein * 4 + macros.carbs * 4 + macros.fat * 9)) * 100}%` }} />
                          <div className={`h-full transition-all duration-500 ${isOverTarget ? 'bg-red-500' : 'bg-yellow-400'}`} style={{ width: `${(macros.fat * 9 / (macros.protein * 4 + macros.carbs * 4 + macros.fat * 9)) * 100}%` }} />
                        </>
                      ) : (
                        <div className="h-full w-full bg-slate-100 dark:bg-slate-700" />
                      )}
                    </div>

                    {/* Bottom Row: Macro Percentages */}
                    <div className="flex justify-between items-center">
                      <span className="text-[12px] font-bold text-slate-500">P: {macros.calories > 0 ? Math.round((macros.protein * 4 / (macros.protein * 4 + macros.carbs * 4 + macros.fat * 9)) * 100) : 0}%</span>
                      <span className="text-[12px] font-bold text-slate-500">C: {macros.calories > 0 ? Math.round((macros.carbs * 4 / (macros.protein * 4 + macros.carbs * 4 + macros.fat * 9)) * 100) : 0}%</span>
                      <span className="text-[12px] font-bold text-slate-500">F: {macros.calories > 0 ? Math.round((macros.fat * 9 / (macros.protein * 4 + macros.carbs * 4 + macros.fat * 9)) * 100) : 0}%</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 pr-1 custom-scrollbar">
                  <Droppable droppableId={col.id} isDropDisabled={isMobile}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex flex-col gap-3 min-h-[100%] transition-colors pb-4 ${snapshot.isDraggingOver ? 'bg-primary/5 rounded-xl' : ''}`}
                      >

                        {col.items?.filter((r: Recipe) => r && r.id).map((recipe: Recipe, index: number) => (
                          <RecipeCard 
                            key={`board-${recipe.id}-${index}`} 
                            recipe={recipe} 
                            index={index} 
                            onDoubleClick={() => deleteMeal(col.id, index)} 
                          />
                        ))}
                        {provided.placeholder}
                        
                        {/* Actionable Button on Mobile, Drop Zone on Desktop */}
                        <button 
                          onClick={() => {
                            if (isMobile) {
                              setActiveDayForAdd(col.id);
                              setIsAddMealModalOpen(true);
                            }
                          }}
                          className="border-2 border-slate-300 dark:border-slate-700 border-dashed rounded-xl p-[14px] flex flex-col items-center justify-center text-slate-500 dark:text-slate-600 hover:border-primary/50 hover:bg-primary/5 transition-all min-h-[80px] shrink-0 w-full"
                        >
                           <span className="material-symbols-outlined text-[18px] mb-1">add_circle</span>
                           <span className="text-[12px] font-bold leading-[12px]">{isMobile ? 'Add Meal' : 'Drop'}</span>
                        </button>
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 dark:bg-primary text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fadeInUp border border-white/10">
          <span className="material-symbols-outlined text-emerald-400">check_circle</span>
          <span className="text-sm font-bold tracking-wide">Grocery list copied!</span>
        </div>
      )}
    </main>
  );
};

export default KanbanBoard;
