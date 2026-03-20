import { useState, useEffect } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import KanbanBoard from './components/KanbanBoard';
import RecipesPage from './components/RecipesPage';
import axios from 'axios';
import { Recipe } from './types';

interface DataState {
  columns: {
    bank: { id: string; title: string; items: Recipe[] };
    [key: string]: { id: string; title: string; items: Recipe[]; day?: string };
  };
  columnOrder: string[];
}

function App() {
  const [activePage, setActivePage] = useState<'planner' | 'recipes'>('planner');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [calorieTarget, setCalorieTarget] = useState(2200);
  const [isCalorieModalOpen, setIsCalorieModalOpen] = useState(false);
  const [tempCalorie, setTempCalorie] = useState(calorieTarget.toString());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1280);
  const [isSmallMobile, setIsSmallMobile] = useState(window.innerWidth < 700);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const getWeekId = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  const weekId = getWeekId(currentDate);

  const [viewMode, setViewMode] = useState<5 | 7>(5);
  const [data, setData] = useState<DataState>({
    columns: {
      'bank': { id: 'bank', title: 'Dish Bank', items: [] as Recipe[] },
      'mon': { id: 'mon', title: 'Monday', day: 'Mon', items: [] as Recipe[] },
      'tue': { id: 'tue', title: 'Tuesday', day: 'Tue', items: [] as Recipe[] },
      'wed': { id: 'wed', title: 'Wednesday', day: 'Wed', items: [] as Recipe[] },
      'thu': { id: 'thu', title: 'Thursday', day: 'Thu', items: [] as Recipe[] },
      'fri': { id: 'fri', title: 'Friday', day: 'Fri', items: [] as Recipe[] },
      'sat': { id: 'sat', title: 'Saturday', day: 'Sat', items: [] as Recipe[] },
      'sun': { id: 'sun', title: 'Sunday', day: 'Sun', items: [] as Recipe[] },
    },
    columnOrder: ['bank', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  });

  // Initial load for recipes
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1280);
      setIsSmallMobile(window.innerWidth < 700);
    };
    window.addEventListener('resize', handleResize);
    
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    const fetchRecipes = async () => {
      try {
        const res = await axios.get('/api/recipes');
        setData(prev => ({
          ...prev,
          columns: {
            ...prev.columns,
            bank: { id: 'bank', title: 'Dish Bank', items: res.data }
          }
        }));
      } catch (err) {
        console.error("Error fetching recipes:", err);
      }
    };
    fetchRecipes();

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  // Load plan when week changes
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const res = await axios.get(`/api/plan?week=${weekId}`);
        setData(prev => ({
          ...prev,
          columns: {
            ...prev.columns,
            ...res.data.columns,
          }
        }));
      } catch (err) {
        console.error("Error fetching plan:", err);
      }
    };
    fetchPlan();
  }, [weekId]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const isSourceBank = source.droppableId.startsWith('bank');
    const isDestBank = destination.droppableId.startsWith('bank');

    if (isDestBank) return;

    const startColumn = isSourceBank 
      ? data.columns.bank 
      : data.columns[source.droppableId];
    const finishColumn = data.columns[destination.droppableId];

    let newColumns: DataState['columns'];

    if (startColumn === finishColumn && !isSourceBank) {
      const newItems = Array.from(startColumn.items);
      const [movedItem] = newItems.splice(source.index, 1);
      newItems.splice(destination.index, 0, movedItem);
      newColumns = { ...data.columns, [startColumn.id]: { ...startColumn, items: newItems } };
    } 
    else if (isSourceBank) {
      const itemToClone = startColumn.items.find(r => `bank-item-${r.id}` === result.draggableId);
      if (!itemToClone) return;
      
      const uniqueId = `${itemToClone.id}-${Math.random().toString(36).substr(2, 9)}`;
      const clonedItem = { ...itemToClone, id: uniqueId };
      
      const finishItems = Array.from(finishColumn.items);
      finishItems.splice(destination.index, 0, clonedItem);
      
      newColumns = {
        ...data.columns,
        [finishColumn.id]: { ...finishColumn, items: finishItems }
      };
    }
    else {
      const startItems = Array.from(startColumn.items);
      const [movedItem] = startItems.splice(source.index, 1);
      const finishItems = Array.from(finishColumn.items);
      finishItems.splice(destination.index, 0, movedItem);
      newColumns = {
        ...data.columns,
        [startColumn.id]: { ...startColumn, items: startItems },
        [finishColumn.id]: { ...finishColumn, items: finishItems }
      };
    }

    setData({ ...data, columns: newColumns });
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { bank, ...planColumns } = newColumns;
    try {
      await axios.post(`/api/plan?week=${weekId}`, { columns: planColumns });
    } catch (err) {
      console.error("Error saving plan:", err);
    }
  };

  const addMealToDay = async (dayId: string, recipe: Recipe) => {
    const col = data.columns[dayId];
    if (!col) return;

    const uniqueId = `${recipe.id}-${Math.random().toString(36).substr(2, 9)}`;
    const clonedItem = { ...recipe, id: uniqueId };
    
    const newItems = [...col.items, clonedItem];
    const newColumns = { ...data.columns, [dayId]: { ...col, items: newItems } };
    
    setData({ ...data, columns: newColumns });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { bank, ...planColumns } = newColumns;
    try {
      await axios.post(`/api/plan?week=${weekId}`, { columns: planColumns });
    } catch (err) {
      console.error("Error saving plan:", err);
    }
  };

  const deleteMeal = async (columnId: string, index: number) => {
    const col = data.columns[columnId];
    if (!col) return;
    const newItems = Array.from(col.items);
    newItems.splice(index, 1);
    
    const newColumns = { ...data.columns, [columnId]: { ...col, items: newItems } };
    setData({ ...data, columns: newColumns });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { bank, ...planColumns } = newColumns;
    try {
      await axios.post(`/api/plan?week=${weekId}`, { columns: planColumns });
    } catch (err) {
      console.error("Error saving plan:", err);
    }
  };

  const clearPlan = async () => {
    const newColumns = { ...data.columns };
    ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach(day => {
      if (newColumns[day]) {
        newColumns[day] = {
          ...newColumns[day],
          items: []
        };
      }
    });
    
    setData({ ...data, columns: newColumns });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { bank, ...planColumns } = newColumns;
    try {
      await axios.post(`/api/plan?week=${weekId}`, { columns: planColumns });
    } catch (err) {
      console.error("Error clearing plan:", err);
    }
  };

  const nextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    setCurrentDate(next);
  };

  const prevWeek = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 7);
    setCurrentDate(prev);
  };

  const handleSaveCalorieTarget = () => {
    const value = parseInt(tempCalorie);
    if (!isNaN(value) && value > 0) {
      setCalorieTarget(value);
      setIsCalorieModalOpen(false);
    }
  };

  const addRecipe = (newRecipe: Recipe) => {
    setData(prev => ({
      ...prev,
      columns: {
        ...prev.columns,
        bank: {
          ...prev.columns.bank,
          items: [...prev.columns.bank.items, newRecipe]
        }
      }
    }));
  };

  const updateRecipe = (updatedRecipe: Recipe) => {
    setData(prev => {
      // Update in bank
      const newBankItems = prev.columns.bank.items.map(r => 
        r.id === updatedRecipe.id ? updatedRecipe : r
      );

      // Update in all other columns (plan)
      const newColumns = { ...prev.columns };
      Object.keys(newColumns).forEach(colId => {
        if (colId !== 'bank') {
          newColumns[colId] = {
            ...newColumns[colId],
            items: newColumns[colId].items.map(r => {
              // Plan items have unique IDs like "id-random", so we check if the base ID matches
              if (r.id?.startsWith(updatedRecipe.id + '-')) {
                return { ...updatedRecipe, id: r.id };
              }
              return r;
            })
          };
        }
      });

      return {
        ...prev,
        columns: {
          ...newColumns,
          bank: { ...prev.columns.bank, items: newBankItems }
        }
      };
    });
  };

  const deleteRecipeFromBank = (recipeId: string) => {
    setData(prev => {
      // Remove from bank
      const newBankItems = prev.columns.bank.items.filter(r => r.id !== recipeId);

      // Remove from all other columns (plan)
      const newColumns = { ...prev.columns };
      Object.keys(newColumns).forEach(colId => {
        if (colId !== 'bank') {
          newColumns[colId] = {
            ...newColumns[colId],
            items: newColumns[colId].items.filter(r => !r.id?.startsWith(recipeId + '-'))
          };
        }
      });

      return {
        ...prev,
        columns: {
          ...newColumns,
          bank: { ...prev.columns.bank, items: newBankItems }
        }
      };
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display">
        <div className="w-[300px] h-[300px] mb-8 overflow-hidden rounded-3xl shadow-2xl animate-pulse">
          <img src="/kanbi.png" alt="Kanbi Kitchen Logo" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter animate-bounce text-center px-4">
          Kanbi Kitchen Loading...
        </h1>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="layout-container flex h-screen grow flex-col overflow-hidden bg-background-light dark:bg-background-dark font-display">
        {/* Calorie Modal */}
        {isCalorieModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-[600px] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Set Calorie Target</h2>
                  <p className="text-xs text-slate-500 font-bold tracking-widest mt-1">Daily energy goal</p>
                </div>
                <button onClick={() => setIsCalorieModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex justify-between gap-2">
                  {[1200, 1600, 2200].map((val) => (
                    <button
                      key={val}
                      onClick={() => setTempCalorie(val.toString())}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                        tempCalorie === val.toString()
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-primary'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={tempCalorie}
                    onChange={(e) => setTempCalorie(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pr-12"
                    placeholder="Enter value..."
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">kcal</span>
                </div>
                <button
                  onClick={handleSaveCalorieTarget}
                  className="w-full bg-primary text-white font-bold text-xs py-4 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
                >
                  Save Target
                </button>
              </div>
            </div>
          </div>
        )}

        <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-background-light dark:bg-background-dark px-[24px] sticky top-0 z-50 h-[64px]">
          <div className="flex items-center gap-[16px] w-[200px]">
            <div className="size-[32px] overflow-hidden rounded-lg flex items-center justify-center cursor-pointer" onClick={() => { setActivePage('planner'); setIsMenuOpen(false); }}>
              <img src="/kanbi.png" alt="Kanbi Kitchen Logo" className="size-full object-cover" />
            </div>
            <h2 className="text-slate-900 dark:text-slate-100 text-[18px] font-bold leading-[22.5px] tracking-[-0.45px]">Kanbi Kitchen</h2>
          </div>
          
          {/* Desktop/Tablet Nav */}
          <nav className="hidden min-[700px]:flex flex-1 justify-center gap-[32px] h-full">
            <button 
              className={`text-[14px] transition-all duration-200 relative h-full flex items-center border-b-2 font-semibold ${activePage === 'planner' ? 'text-primary border-primary' : 'text-slate-600 dark:text-slate-400 hover:text-primary border-transparent'}`}
              onClick={() => setActivePage('planner')}
            >
              Weekly Planner
            </button>
            <button 
              className={`text-[14px] transition-all duration-200 relative h-full flex items-center border-b-2 font-semibold ${activePage === 'recipes' ? 'text-primary border-primary' : 'text-slate-600 dark:text-slate-400 hover:text-primary border-transparent'}`}
              onClick={() => setActivePage('recipes')}
            >
              Recipes
            </button>
          </nav>

          {/* Mobile Hamburger Button */}
          <div className="flex min-[700px]:hidden items-center justify-end w-[200px]">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[28px]">
                {isMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>

          <div className="hidden min-[700px]:block w-[200px]"></div>

          {/* Mobile Menu Overlay */}
          {isSmallMobile && isMenuOpen && (
            <div className="absolute top-[64px] left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 z-50">
              <div className="flex flex-col p-4 gap-2">
                <button 
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-bold transition-all ${activePage === 'planner' ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-400'}`}
                  onClick={() => {
                    setActivePage('planner');
                    setIsMenuOpen(false);
                  }}
                >
                  <span className="material-symbols-outlined">calendar_view_week</span>
                  Weekly Planner
                </button>
                <button 
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-bold transition-all ${activePage === 'recipes' ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-400'}`}
                  onClick={() => {
                    setActivePage('recipes');
                    setIsMenuOpen(false);
                  }}
                >
                  <span className="material-symbols-outlined">restaurant_menu</span>
                  Recipes
                </button>
              </div>
            </div>
          )}
        </header>

        <div className="flex-1 flex overflow-hidden relative">
          {activePage === 'planner' ? (
            <KanbanBoard 
              data={data} 
              deleteMeal={deleteMeal} 
              clearPlan={clearPlan}
              currentDate={currentDate}
              onNextWeek={nextWeek}
              onPrevWeek={prevWeek}
              calorieTarget={calorieTarget}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              isMobile={isMobile}
              addMealToDay={addMealToDay}
            />
          ) : (
            <RecipesPage 
              recipes={data.columns.bank.items} 
              onAddRecipe={addRecipe}
              onUpdateRecipe={updateRecipe}
              onDeleteRecipe={deleteRecipeFromBank}
            />
          )}
        </div>

        <footer className="h-[40px] bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-[24px] flex items-center justify-between">
          <div className="flex gap-[24px]">
            <span className="text-[10px] font-semibold text-slate-500 tracking-[1px] flex items-center gap-2">
              <span className="hidden sm:inline">Calories Target:</span> {calorieTarget.toLocaleString()}/day
              <button 
                onClick={() => {
                  setTempCalorie(calorieTarget.toString());
                  setIsCalorieModalOpen(true);
                }}
                className="hover:text-primary transition-colors flex items-center"
              >
                <span className="material-symbols-outlined text-[14px]">edit</span>
              </button>
            </span>
          </div>
          <div className="flex gap-[16px] items-center">
             <span className="text-[10px] font-bold text-slate-400 tracking-widest">Kanbi Kitchen v1.0</span>
          </div>
        </footer>      </div>
    </DragDropContext>
  );
}

export default App;
