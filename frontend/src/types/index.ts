export interface Recipe {
  id: string;
  name: string;
  category: string;
  prepTime: number;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  ingredients: string[];
  image?: string;
}

export interface PlanColumn {
  id: string;
  title: string;
  day?: string;
  items: Recipe[];
}

export interface Plan {
  columns: Record<string, PlanColumn>;
}
