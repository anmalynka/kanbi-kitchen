import React, { useState, useRef, useEffect } from 'react';
import { Recipe } from '../types';
import RecipeCardDetailed from './RecipeCardDetailed';
import axios from 'axios';

interface RecipesPageProps {
  recipes: Recipe[];
  onAddRecipe?: (recipe: Recipe) => void;
  onUpdateRecipe?: (recipe: Recipe) => void;
  onDeleteRecipe?: (recipeId: string) => void;
}

const RecipesPage: React.FC<RecipesPageProps> = ({ recipes, onAddRecipe, onUpdateRecipe, onDeleteRecipe }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ownership state (session-based)
  const [ownedRecipeIds, setOwnedRecipeIds] = useState<string[]>(() => {
    const saved = sessionStorage.getItem('owned_recipes');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    sessionStorage.setItem('owned_recipes', JSON.stringify(ownedRecipeIds));
  }, [ownedRecipeIds]);

  // Add/Edit Recipe Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  
  // Delete Confirmation State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null);

  const [newRecipe, setNewRecipe] = useState({
    name: '',
    category: '',
    prepTime: 15,
    macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    ingredients: [{ qty: '', unit: 'g', name: '', error: false }]
  });

  const categories = Array.from(new Set(recipes.map((r) => r.category))).sort();
  const hasFavorites = recipes.some(r => r.isFavorite);
  const allCategories = (hasFavorites || selectedCategory === 'Favorites') ? ['Favorites', ...categories] : categories;

  const handleEdit = (recipe: Recipe) => {
    // Parse ingredients: "200 g - Name" -> { qty: "200", unit: "g", name: "Name" }
    const parsedIngredients = recipe.ingredients.map(ing => {
      const match = ing.match(/^(\d+)\s*(\w+)\s*-\s*(.*)$/);
      if (match) {
        return { qty: match[1], unit: match[2], name: match[3], error: false };
      }
      return { qty: '', unit: 'g', name: ing, error: false };
    });

    setNewRecipe({
      name: recipe.name,
      category: recipe.category,
      prepTime: recipe.prepTime,
      macros: { ...recipe.macros },
      ingredients: parsedIngredients.length > 0 ? parsedIngredients : [{ qty: '', unit: 'g', name: '', error: false }]
    });
    setEditingRecipeId(recipe.id);
    setIsEditing(true);
    setIsAddModalOpen(true);
  };

  const handleDeleteClick = (recipeId: string) => {
    setRecipeToDelete(recipeId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!recipeToDelete) return;
    try {
      await axios.delete(`/api/recipes/${recipeToDelete}`);
      if (onDeleteRecipe) onDeleteRecipe(recipeToDelete);
      setOwnedRecipeIds(prev => prev.filter(id => id !== recipeToDelete));
      setIsDeleteModalOpen(false);
      setRecipeToDelete(null);
    } catch (err) {
      console.error("Error deleting recipe:", err);
      alert("Failed to delete recipe");
    }
  };

  const handleToggleFavorite = async (recipe: Recipe) => {
    try {
      const updated = { ...recipe, isFavorite: !recipe.isFavorite };
      const res = await axios.put(`/api/recipes/${recipe.id}`, updated);
      if (onUpdateRecipe) onUpdateRecipe(res.data);
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  };

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesCategory = !selectedCategory || recipe.category === selectedCategory;
    if (selectedCategory === 'Favorites') {
      matchesCategory = recipe.isFavorite === true;
    }
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

  const handleEstimateNutrition = async () => {
    const hasIngredients = newRecipe.ingredients.some(i => i.name.trim().length > 0);
    if (!newRecipe.name || !hasIngredients) {
      alert("Please enter a recipe name and at least one ingredient first.");
      return;
    }
    
    setIsEstimating(true);
    // Reset errors before estimation
    setNewRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.map(i => ({ ...i, error: false }))
    }));

    try {
      const ingredientNames = newRecipe.ingredients
        .filter(i => i.name)
        .map(i => `${i.qty} ${i.unit} ${i.name}`);

      const res = await axios.post('/api/ai/estimate', {
        recipeName: newRecipe.name,
        ingredients: ingredientNames
      });

      if (res.data) {
        const { calories, protein, carbs, fat, ingredientStatus } = res.data;
        
        setNewRecipe(prev => {
          const updatedIngredients = [...prev.ingredients];
          if (Array.isArray(ingredientStatus)) {
            // Map status back to ingredients (matching by index of non-empty ingredients)
            let aiIdx = 0;
            updatedIngredients.forEach((ing, idx) => {
              if (ing.name.trim()) {
                if (ingredientStatus[aiIdx] && ingredientStatus[aiIdx].status === 'unknown') {
                  updatedIngredients[idx] = { ...ing, error: true };
                }
                aiIdx++;
              }
            });
          }

          return {
            ...prev,
            macros: {
              calories: calories || 0,
              protein: protein || 0,
              carbs: carbs || 0,
              fat: fat || 0
            },
            ingredients: updatedIngredients
          };
        });
      }
    } catch (error: any) {
      console.error("Error estimating nutrition:", error);
      if (error.response?.status === 429) {
          alert("Too many requests. Please wait a while before trying again.");
      } else {
          alert("Failed to estimate nutrition. Please try again or enter manually.");
      }
    } finally {
      setIsEstimating(false);
    }
  };

  const handleAddIngredient = () => {
    setNewRecipe({
      ...newRecipe,
      ingredients: [...newRecipe.ingredients, { qty: '', unit: 'g', name: '', error: false }]
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
    
    // Auto-estimate if macros are zero
    let macrosToSave = {
      calories: Number(newRecipe.macros.calories),
      protein: Number(newRecipe.macros.protein),
      carbs: Number(newRecipe.macros.carbs),
      fat: Number(newRecipe.macros.fat),
    };

    const hasIngredients = newRecipe.ingredients.some(i => i.name.trim().length > 0);
    let macrosAreZero = macrosToSave.calories === 0 && macrosToSave.protein === 0 && macrosToSave.carbs === 0 && macrosToSave.fat === 0;

    if (macrosAreZero && newRecipe.name && hasIngredients) {
      setIsEstimating(true);
      try {
        const ingredientNames = newRecipe.ingredients
          .filter(i => i.name)
          .map(i => `${i.qty} ${i.unit} ${i.name}`);

        const res = await axios.post('/api/ai/estimate', {
          recipeName: newRecipe.name,
          ingredients: ingredientNames
        });

        if (res.data) {
          macrosToSave = {
            calories: res.data.calories || 0,
            protein: res.data.protein || 0,
            carbs: res.data.carbs || 0,
            fat: res.data.fat || 0
          };
          
          // Check if it's still zero after AI
          macrosAreZero = macrosToSave.calories === 0 && macrosToSave.protein === 0 && macrosToSave.carbs === 0 && macrosToSave.fat === 0;
          
          setNewRecipe(prev => {
             const updatedIngredients = [...prev.ingredients];
             if (Array.isArray(res.data.ingredientStatus)) {
                let aiIdx = 0;
                updatedIngredients.forEach((ing, idx) => {
                  if (ing.name.trim()) {
                    if (res.data.ingredientStatus[aiIdx] && res.data.ingredientStatus[aiIdx].status === 'unknown') {
                      updatedIngredients[idx] = { ...ing, error: true };
                    }
                    aiIdx++;
                  }
                });
             }
             return { ...prev, macros: macrosToSave, ingredients: updatedIngredients };
          });
        }
      } catch (error) {
        console.error("Auto-estimation failed on save:", error);
      } finally {
        setIsEstimating(false);
      }
    }

    if (macrosAreZero) {
      alert("Nutritional information is required. Please use 'AUTO' or enter values manually.");
      return;
    }

    // Format ingredients for schema: "200 g - Name"
    const formattedIngredients = newRecipe.ingredients
      .filter(ing => ing.qty && ing.name)
      .map(ing => `${ing.qty} ${ing.unit} - ${ing.name}`);

    const recipeToSave = {
      name: newRecipe.name,
      category: newRecipe.category || 'Other',
      prepTime: Number(newRecipe.prepTime),
      macros: macrosToSave,
      ingredients: formattedIngredients
    };

    try {
      if (isEditing && editingRecipeId) {
        const res = await axios.put(`/api/recipes/${editingRecipeId}`, recipeToSave);
        if (onUpdateRecipe) onUpdateRecipe(res.data);
      } else {
        const res = await axios.post('/api/recipes', recipeToSave);
        if (onAddRecipe) onAddRecipe(res.data);
        setOwnedRecipeIds(prev => [...prev, res.data.id]);
      }
      
      setIsAddModalOpen(false);
      setIsEditing(false);
      setEditingRecipeId(null);
      // Reset form
      setNewRecipe({
        name: '',
        category: '',
        prepTime: 15,
        macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        ingredients: [{ qty: '', unit: 'g', name: '', error: false }]
      });
    } catch (err) {
      console.error("Error saving recipe:", err);
      alert("Failed to save recipe");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F6F6] dark:bg-slate-900/50 min-h-0">
      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden p-6 text-center">
            <div className="size-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-600 dark:text-orange-400">
              <span className="material-symbols-outlined text-3xl">delete_forever</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Recipe?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">This action cannot be undone. Are you sure you want to remove this recipe from your library?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Recipe Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="sticky top-0 z-10 p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{isEditing ? 'Edit Recipe' : 'Add New Recipe'}</h2>
                <p className="text-xs text-slate-500 font-bold tracking-widest mt-1">{isEditing ? 'Update your custom dish' : 'Create a custom dish'}</p>
              </div>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditing(false); setEditingRecipeId(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-bold text-slate-500 tracking-widest mb-1.5">Recipe Name</label>
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
                    <label className="block text-[12px] font-bold text-slate-500 tracking-widest mb-1.5">Category</label>
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
                      <div className="absolute right-3 inset-y-0 flex items-center pointer-events-none text-slate-500">
                        <span className="material-symbols-outlined text-[18px]">expand_more</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-slate-500 tracking-widest mb-1.5">Prep Time (min)</label>
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
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-[12px] font-bold text-slate-500 tracking-widest">Nutritional Info (Optional)</p>
                    <button
                      type="button"
                      onClick={handleEstimateNutrition}
                      disabled={isEstimating || !newRecipe.name || !newRecipe.ingredients.some(i => i.name.trim())}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-700 to-teal-800 text-white rounded-lg text-[12px] font-bold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className={`material-symbols-outlined text-[14px] ${isEstimating ? 'animate-spin' : ''}`}>
                        {isEstimating ? 'refresh' : 'auto_awesome'}
                      </span>
                      {isEstimating ? 'Auto...' : 'Auto'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-bold text-slate-500 mb-1">Calories</label>
                      <input type="number" value={newRecipe.macros.calories} onChange={(e) => setNewRecipe({...newRecipe, macros: {...newRecipe.macros, calories: Number(e.target.value)}})} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-slate-500 mb-1">Protein (g)</label>
                      <input type="number" value={newRecipe.macros.protein} onChange={(e) => setNewRecipe({...newRecipe, macros: {...newRecipe.macros, protein: Number(e.target.value)}})} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-slate-500 mb-1">Carbs (g)</label>
                      <input type="number" value={newRecipe.macros.carbs} onChange={(e) => setNewRecipe({...newRecipe, macros: {...newRecipe.macros, carbs: Number(e.target.value)}})} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-slate-500 mb-1">Fat (g)</label>
                      <input type="number" value={newRecipe.macros.fat} onChange={(e) => setNewRecipe({...newRecipe, macros: {...newRecipe.macros, fat: Number(e.target.value)}})} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Ingredients */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <p className="text-[12px] font-bold text-slate-500 tracking-widest">Ingredients List</p>
                  <button 
                    type="button"
                    onClick={handleAddIngredient}
                    className="text-primary text-[12px] font-bold flex items-center gap-1"
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
                          <label className="block sm:hidden text-[12px] font-bold text-slate-500 mb-1">Qty</label>
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
                          <label className="block sm:hidden text-[12px] font-bold text-slate-500 mb-1">Unit</label>
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
                            <div className="absolute right-2 inset-y-0 flex items-center pointer-events-none text-slate-500">
                              <span className="material-symbols-outlined text-[16px]">expand_more</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="block sm:hidden text-[12px] font-bold text-slate-500 mb-1">Ingredient Name</label>
                        <div className="relative">
                          <input 
                            required
                            type="text"
                            placeholder="Ingredient name..."
                            value={ing.name}
                            onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                            className={`w-full bg-white dark:bg-slate-800 border ${ing.error ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-700'} rounded-xl px-4 py-2 text-xs font-bold transition-all`}
                          />
                          {ing.error && (
                            <div className="absolute -bottom-5 left-0 flex items-center gap-1 text-[10px] font-bold text-red-500 tracking-tighter animate-pulse">
                              <span className="material-symbols-outlined text-[12px]">error</span>
                              AI could not analyze this item
                            </div>
                          )}
                        </div>
                      </div>
                      <button 
                        type="button"
                        disabled={newRecipe.ingredients.length === 1}
                        onClick={() => handleRemoveIngredient(idx)}
                        className="absolute -top-2 -right-2 size-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-orange-500 shadow-sm transition-colors disabled:opacity-0"
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
                  className="flex-1 bg-primary text-white font-bold text-xs py-4 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
                >
                  {isEditing ? 'Update Recipe' : 'Create Recipe'}
                </button>
                <button 
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setIsEditing(false); setEditingRecipeId(null); }}
                  className="px-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs py-4 rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto p-[12px] xl:px-[24px] xl:pb-[24px] xl:pt-[16px]">
        {/* Sticky Header Section */}
        <div className="sticky top-0 z-40 bg-[#F8F6F6] dark:bg-slate-900/50 pb-6">
          <div className="flex flex-row items-center justify-between gap-6 mb-4 pt-2">
            <div>
              <h1 className="text-xl xl:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Recipe Library</h1>
              <p className="text-slate-500 font-medium text-xs mt-0.5">Discover and manage your dishes</p>
            </div>
            <button 
              onClick={() => {
                setNewRecipe({
                  name: '',
                  category: '',
                  prepTime: 15,
                  macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
                  ingredients: [{ qty: '', unit: 'g', name: '', error: false }]
                });
                setIsEditing(false);
                setIsAddModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              <span className="hidden sm:inline">Add </span>New Recipe
            </button>
          </div>

          {/* Filters Section */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-[360px] relative order-1 md:order-2" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`w-full h-[48px] flex items-center justify-between bg-white dark:bg-slate-800 border ${isDropdownOpen ? 'border-primary ring-4 ring-primary/10' : 'border-slate-200 dark:border-slate-700'} rounded-xl px-4 transition-all shadow-sm`}
              >
                <div className="flex items-center gap-2">
                  {selectedCategory === 'Favorites' && <span className="material-symbols-outlined text-amber-500 text-[18px] fill-1" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>}
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedCategory || 'All Categories'}
                  </span>
                </div>
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
                    {allCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${selectedCategory === cat ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'} flex items-center gap-2`}
                      >
                        {cat === 'Favorites' && <span className="material-symbols-outlined text-amber-500 text-[14px] fill-1" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>}
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 relative group order-2 md:order-1">
              <div className="absolute left-4 inset-y-0 flex items-center justify-center text-slate-500 group-focus-within:text-primary transition-colors">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input
                type="text"
                placeholder="Search recipes by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-[48px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-[100px] text-sm font-normal text-slate-900 dark:text-white focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none shadow-sm"
              />
              {searchQuery && (
                <div className="absolute right-4 inset-y-0 flex items-center gap-2">
                  <span className="text-[12px] font-bold text-slate-500 tracking-widest bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">
                    {filteredRecipes.length} {filteredRecipes.length === 1 ? 'match' : 'matches'}
                  </span>
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="flex items-center text-slate-500 hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Grid Section - Masonry Layout */}
        {filteredRecipes.length > 0 ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 min-[1440px]:columns-5 min-[1920px]:columns-8 gap-3 xl:gap-4 space-y-3 xl:space-y-4">
            {filteredRecipes.map((recipe) => (
              <div key={recipe.id} className="break-inside-avoid mb-3 xl:mb-4">
                <RecipeCardDetailed 
                  recipe={recipe} 
                  onEdit={ownedRecipeIds.includes(recipe.id) ? handleEdit : undefined}
                  onDelete={ownedRecipeIds.includes(recipe.id) ? handleDeleteClick : undefined}
                  onToggleFavorite={handleToggleFavorite}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-slate-300">restaurant_menu</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">No recipes found</h3>
            <p className="text-slate-500 font-bold text-sm mt-2 tracking-widest">Try adjusting your search or category filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipesPage;
