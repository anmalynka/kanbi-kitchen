import React, { useState, useEffect } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import KanbanBoard from './components/KanbanBoard';
import AISidebar from './components/AISidebar';
import axios from 'axios';
import { Recipe } from './types';

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getMonday = (d: Date) => {
    d = new Date(d);
    var day = d.getDay(),
        diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  }

  const [data, setData] = useState({
    columns: {
      'bank': { id: 'bank', title: 'Dish Bank', items: [] as Recipe[] },
      'mon': { id: 'mon', title: '14', day: 'Mon', items: [] as Recipe[] },
      'tue': { id: 'tue', title: '15', day: 'Tue', items: [] as Recipe[] },
      'wed': { id: 'wed', title: '16', day: 'Wed', items: [] as Recipe[] },
      'thu': { id: 'thu', title: '17', day: 'Thu', items: [] as Recipe[] },
      'fri': { id: 'fri', title: '18', day: 'Fri', items: [] as Recipe[] },
    },
    columnOrder: ['bank', 'mon', 'tue', 'wed', 'thu', 'fri']
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recipesRes, planRes] = await Promise.all([
          axios.get('/api/recipes'),
          axios.get('/api/plan')
        ]);
        
        setData(prev => ({
          ...prev,
          columns: {
            ...planRes.data.columns,
            bank: { id: 'bank', title: 'Dish Bank', items: recipesRes.data }
          }
        }));
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, []);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const isSourceBank = source.droppableId.startsWith('bank');
    const isDestBank = destination.droppableId.startsWith('bank');

    if (isDestBank) return;

    const startColumn = isSourceBank 
      ? data.columns.bank 
      : data.columns[source.droppableId as keyof typeof data.columns];
    const finishColumn = data.columns[destination.droppableId as keyof typeof data.columns];

    let newColumns;

    if (startColumn === finishColumn && !isSourceBank) {
      const newItems = Array.from(startColumn.items);
      const [movedItem] = newItems.splice(source.index, 1);
      newItems.splice(destination.index, 0, movedItem);
      newColumns = { ...data.columns, [startColumn.id]: { ...startColumn, items: newItems } };
    } 
    else if (isSourceBank) {
      const cat = source.droppableId.replace('bank-', '');
      const bankItems = startColumn.items.filter(r => r.category === cat);
      const itemToClone = bankItems[source.index];
      
      const originalId = itemToClone.id.replace('bank-item-', '');
      const uniqueId = `${originalId}-${Math.random().toString(36).substr(2, 9)}`;
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
    
    const { bank, ...planColumns } = newColumns;
    try {
      await axios.post('/api/plan', { columns: planColumns });
    } catch (err) {
      console.error("Error saving plan:", err);
    }
  };

  const deleteMeal = async (columnId: string, index: number) => {
    const col = data.columns[columnId as keyof typeof data.columns];
    const newItems = Array.from(col.items);
    newItems.splice(index, 1);
    
    const newColumns = { ...data.columns, [columnId]: { ...col, items: newItems } };
    setData({ ...data, columns: newColumns });

    const { bank, ...planColumns } = newColumns;
    await axios.post('/api/plan', { columns: planColumns });
  };

  const clearPlan = async () => {
    const newColumns = { ...data.columns };
    ['mon', 'tue', 'wed', 'thu', 'fri'].forEach(day => {
      newColumns[day as keyof typeof newColumns] = {
        ...newColumns[day as keyof typeof newColumns],
        items: []
      };
    });
    
    setData({ ...data, columns: newColumns });
    const { bank, ...planColumns } = newColumns;
    try {
      await axios.post('/api/plan', { columns: planColumns });
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

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="layout-container flex h-screen grow flex-col overflow-hidden bg-background-light dark:bg-background-dark font-display">
        {/* Header - Top Navigation Bar */}
        <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-background-light dark:bg-background-dark px-[24px] pb-[13px] pt-[12px] sticky top-0 z-50">
          <div className="flex items-center gap-[16px]">
            <div className="size-[32px] overflow-hidden rounded-lg flex items-center justify-center">
              <img src="/kanbi.png" alt="Kanbi Kitchen Logo" className="size-full object-cover" />
            </div>
            <h2 className="text-slate-900 dark:text-slate-100 text-[18px] font-bold leading-[22.5px] tracking-[-0.45px]">Kanbi Kitchen</h2>
          </div>
          <nav className="hidden md:flex flex-1 justify-center gap-[32px]">
            <a className="text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary text-[14px] font-medium transition-colors" href="#">Dashboard</a>
            <a className="text-primary text-[14px] font-bold border-b-2 border-primary pb-[6px]" href="#">Weekly Planner</a>
            <a className="text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary text-[14px] font-medium transition-colors" href="#">Inventory</a>
            <a className="text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary text-[14px] font-medium transition-colors" href="#">Recipes</a>
          </nav>
          <div className="flex gap-[8px]">
            {/* Action buttons removed */}
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
          <KanbanBoard 
            data={data} 
            deleteMeal={deleteMeal} 
            clearPlan={clearPlan}
            currentDate={currentDate}
            onNextWeek={nextWeek}
            onPrevWeek={prevWeek}
          />
        </div>

        {/* Footer - Bottom Status Bar */}
        <footer className="h-[40px] bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-[24px] flex items-center justify-between">
          <div className="flex gap-[24px]">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-[1px]">Active Plan: Healthy Autumn</span>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-[1px]">Calories Target: 2,200/day</span>
          </div>
          <div className="flex gap-[16px] items-center">
            <span className="flex items-center gap-[4px]">
              <div className="size-[8px] rounded-full bg-green-500"></div> 
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-[1px]">System Sync OK</span>
            </span>
            <span className="flex items-center gap-[4px]">
              <div className="size-[8px] rounded-full bg-primary"></div> 
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-[1px]">Draft Auto-saved</span>
            </span>
          </div>
        </footer>
      </div>
    </DragDropContext>
  );
}

export default App;
