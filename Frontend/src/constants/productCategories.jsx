export const CATEGORIES = [
  {
    value: 'seasoning',
    label: 'Seasonings & Condiments'
  },
  {
    value: 'proteins',
    label: 'Fresh Produce & Proteins'
    
  },
  {
    value: 'accessories',
    label: 'Accessories'
  },
  {
    value: 'staple',
    label: 'Staples'
  }
]

export const getCategoryLabel = (value) => {
  if (value === "all") return "All Products"
  return CATEGORIES.find((c) => c.value === value)?.label || value
}