import React, { useState, useRef, useEffect } from 'react';
import { Recipe } from '../types';
import RecipeCardDetailed from './RecipeCardDetailed';
import axios from 'axios';

interface RecipesPageProps {
  recipes: Recipe[];
  onAddRecipe?: (recipe: Recipe) => void;
}

const RecipesPage: React.FC<RecipesPageProps> = ({ recipes, onAddRecipe }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Add Recipe Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    category: '',
    prepTime: 15,
    macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    ingredients: [{ qty: '', unit: 'g', name: '' }]
  });

  const categories = Array.from(new Set(recipes.map((r) => r.category))).sort();

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || recipe.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddIngredient = () => {
    setNewRecipe({
      ...newRecipe,
      ingredients: [...newRecipe.ingredients, { qty: '', unit: 'g', name: '' }]
    });
  };

  const handleRemoveIngredient = (index: number) => {
    const ings = [...newRecipe.ingredients];
    ings.splice(index, 1);
    setNewRecipe({ ...newRecipe, ingredients: ings });
  };

  const handleIngredientChange = (index: number, field: string, value: string) => {
    const ings = [...newRecipe.ingredients];
    if (field === 'name') {
      // no special symbols, max 30, capitalize first letter
      let cleaned = value.replace(/[^a-zA-Z0-9\s]/g, '').slice(0, 30);
      if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }
      ings[index] = { ...ings[index], [field]: cleaned };
    } else {
      ings[index] = { ...ings[index], [field]: value };
    }
    setNewRecipe({ ...newRecipe, ingredients: ings });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Format ingredients for schema: "200 g - Name"
    const formattedIngredients = newRecipe.ingredients
      .filter(ing => ing.qty && ing.name)
      .map(ing => `${ing.qty} ${ing.unit} - ${ing.name}`);

    const recipeToSave = {
      name: newRecipe.name,
      category: newRecipe.category || 'Other',
      prepTime: Number(newRecipe.prepTime),
      macros: {
        calories: Number(newRecipe.macros.calories),
        protein: Number(newRecipe.macros.protein),
        carbs: Number(newRecipe.macros.carbs),
        fat: Number(newRecipe.macros.fat),
      },
      ingredients: formattedIngredients
    };

    try {
      const res = await axios.post('/api/recipes', recipeToSave);
      if (onAddRecipe) onAddRecipe(res.data);
      setIsAddModalOpen(false);
      // Reset form
      setNewRecipe({
        name: '',
        category: '',
        prepTime: 15,
        macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        ingredients: [{ qty: '', unit: 'g', name: '' }]
      });
    } catch (err) {
      console.error("Error saving recipe:", err);
      alert("Failed to save recipe");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F6F6] dark:bg-slate-900/50 min-h-0">
      {/* Add Recipe Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="sticky top-0 z-10 p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Add New Recipe</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Create a custom dish</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Recipe Name</label>
                    <input 
                      required
                      type="text"
                      value={newRecipe.name}
                      onChange={(e) => {
                        let cleaned = e.target.value.replace(/[^a-zA-Z0-9\s-]/g, '').slice(0, 50);
                        setNewRecipe({...newRecipe, name: cleaned});
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      placeholder="e.g. Classic Margherita"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Category</label>
                    <div className="relative">
                      <select 
                        required
                        value={newRecipe.category}
                        onChange={(e) => setNewRecipe({...newRecipe, category: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none pr-10"
                      >
                        <option value="">Select category...</option>
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        <option value="Other">Other</option>
                      </select>
                      <div className="absolute right-3 inset-y-0 flex items-center pointer-events-none text-slate-400">
                        <span className="material-symbols-outlined text-[18px]">expand_more</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Prep Time (min)</label>
                    <input 
                      required
                      type="number"
                      value={newRecipe.prepTime}
                      onChange={(e) => setNewRecipe({...newRecipe, prepTime: Number(e.target.value)})}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                {/* Macros */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Nutritional Info (Optional)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Calories</label>
                      <input type="number" value={newRecipe.macros.calories} onChange={(e) => setNewRecipe({...newRecipe, macros: {...newRecipe.macros, calories: Number(e.target.value)}})} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold" />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Protein (g)</label>
                      <input type="number" value={newRecipe.macros.protein} onChange={(e) => setNewRecipe({...newRecipe, macros: {...newRecipe.macros, protein: Number(e.target.value)}})} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold" />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Carbs (g)</label>
                      <input type="number" value={newRecipe.macros.carbs} onChange={(e) => setNewRecipe({...newRecipe, macros: {...newRecipe.macros, carbs: Number(e.target.value)}})} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold" />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Fat (g)</label>
                      <input type="number" value={newRecipe.macros.fat} onChange={(e) => setNewRecipe({...newRecipe, macros: {...newRecipe.macros, fat: Number(e.target.value)}})} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Ingredients */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ingredients List</p>
                  <button 
                    type="button"
                    onClick={handleAddIngredient}
                    className="text-primary text-[10px] font-bold uppercase flex items-center gap-1 hover:underline"
                  >
                    <span className="material-symbols-outlined text-[14px]">add_circle</span>
                    Add Ingredient
                  </button>
                </div>
                
                <div className="space-y-4">
                  {newRecipe.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 relative">
                      <div className="flex gap-2">
                        <div className="flex-1 sm:w-[80px] sm:flex-none">
                          <label className="block sm:hidden text-[8px] font-bold text-slate-400 uppercase mb-1">Qty</label>
                          <input 
                            required
                            type="number"
                            placeholder="Qty"
                            value={ing.qty}
                            onChange={(e) => handleIngredientChange(idx, 'qty', e.target.value)}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold"
                          />
                        </div>
                        <div className="flex-1 sm:w-[80px] sm:flex-none">
                          <label className="block sm:hidden text-[8px] font-bold text-slate-400 uppercase mb-1">Unit</label>
                          <div className="relative w-full">
                            <select 
                              value={ing.unit}
                              onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs font-bold appearance-none pr-6"
                            >
                              <option value="g">g</option>
                              <option value="ml">ml</option>
                              <option value="pcs">pcs</option>
                            </select>
                            <div className="absolute right-2 inset-y-0 flex items-center pointer-events-none text-slate-400">
                              <span className="material-symbols-outlined text-[16px]">expand_more</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="block sm:hidden text-[8px] font-bold text-slate-400 uppercase mb-1">Ingredient Name</label>
                        <input 
                          required
                          type="text"
                          placeholder="Ingredient name..."
                          value={ing.name}
                          onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold"
                        />
                      </div>
                      <button 
                        type="button"
                        disabled={newRecipe.ingredients.length === 1}
                        onClick={() => handleRemoveIngredient(idx)}
                        className="absolute -top-2 -right-2 size-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-slate-300 hover:text-orange-500 shadow-sm transition-colors disabled:opacity-0"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 z-10 p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-3 shrink-0">
                <button 
                  type="submit"
                  className="flex-1 bg-primary text-white font-bold uppercase text-xs py-4 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
                >
                  Create Recipe
                </button>
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-xs py-4 rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto p-[12px] xl:p-[24px]">
        {/* Sticky Header Section */}
        <div className="sticky top-0 z-40 bg-[#F8F6F6] dark:bg-slate-900/50 pb-6">
          <div className="flex flex-row items-center justify-between gap-6 mb-4 pt-2">
            <div>
              <h1 className="text-xl xl:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Recipe Library</h1>
              <p className="text-slate-500 font-medium text-xs mt-0.5">Discover and manage your dishes</p>
            </div>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              <span className="hidden sm:inline">Add </span>New Recipe
            </button>
          </div>

          {/* Filters Section */}
          <div className="flex flex-col-reverse md:flex-row gap-4">
            <div className="flex-1 relative group">
              <div className="absolute left-4 inset-y-0 flex items-center justify-center text-slate-400 group-focus-within:text-primary transition-colors">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input
                type="text"
                placeholder="Search recipes by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-[48px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-12 text-sm font-normal text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none shadow-sm"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 inset-y-0 flex items-center text-slate-400 hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              )}
            </div>

            <div className="w-full md:w-[360px] relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`w-full h-[48px] flex items-center justify-between bg-white dark:bg-slate-800 border ${isDropdownOpen ? 'border-primary ring-4 ring-primary/10' : 'border-slate-200 dark:border-slate-700'} rounded-xl px-4 transition-all shadow-sm`}
              >
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedCategory || 'All Categories'}
                </span>
                <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-primary' : ''}`}>
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
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${!selectedCategory ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
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
                        className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${selectedCategory === cat ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Grid Section - Masonry Layout */}
        {filteredRecipes.length > 0 ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 xl:gap-4 space-y-3 xl:space-y-4">
            {filteredRecipes.map((recipe) => (
              <div key={recipe.id} className="break-inside-avoid mb-3 xl:mb-4">
                <RecipeCardDetailed recipe={recipe} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-slate-300">restaurant_menu</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase">No recipes found</h3>
            <p className="text-slate-500 font-bold text-sm mt-2 uppercase tracking-widest">Try adjusting your search or category filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipesPage;
