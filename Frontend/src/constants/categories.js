export const CATEGORIES = [
  {
    value: 'asian',
    label: 'Asian',
    subcategories: [
      { value: 'chinese',  label: 'Chinese'  },
      { value: 'japanese', label: 'Japanese' },
      { value: 'korean',   label: 'Korean'   },
    ],
  },
  {
    value: 'european',
    label: 'European',
    subcategories: [
      { value: 'italian', label: 'Italian' },
      { value: 'french',  label: 'French'  },
      { value: 'german',  label: 'German'  },
    ],
  },
  {
    value: 'dessert',
    label: 'Dessert',
    subcategories: [
      { value: 'drinks',    label: 'Drinks'    },
      { value: 'cake',      label: 'Cake'      },
      { value: 'pastries',  label: 'Pastries'  },
    ],
  },
  {
    value: 'vegan',
    label: 'Vegan',
    subcategories: [
      { value: 'salads', label: 'Salads' },
      { value: 'soups',  label: 'Soups'  },
      { value: 'other',  label: 'Other'  },
    ],
  },
]

export const DIFFICULTIES = [
  { value: 'easy',   label: 'Easy'   },
  { value: 'medium', label: 'Medium' },
  { value: 'hard',   label: 'Hard'   },
]

export const getCategoryLabel = (value) =>
  CATEGORIES.find((c) => c.value === value)?.label || value

export const getSubcategoryLabel = (categoryValue, subValue) => {
  const cat = CATEGORIES.find((c) => c.value === categoryValue)
  return cat?.subcategories.find((s) => s.value === subValue)?.label || subValue
}

export const getDifficultyLabel = (value) =>
  DIFFICULTIES.find((d) => d.value === value)?.label || value
