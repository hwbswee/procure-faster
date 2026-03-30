'use client'

interface CategoryFilterProps {
  selectedCategories: string[]
  onCategoryToggle: (category: string) => void
}

export function CategoryFilter({ selectedCategories, onCategoryToggle }: CategoryFilterProps) {
  const categories = [
    {
      id: 'Cat A-Beverages',
      label: 'Cat A - Beverages',
      selectedClass: 'bg-teal-50 border-teal-200 text-teal-800',
    },
    {
      id: 'Cat B-Snacks',
      label: 'Cat B - Snacks',
      selectedClass: 'bg-sky-50 border-sky-200 text-sky-800',
    },
    {
      id: 'Cat C-Disposable Pantry Items',
      label: 'Cat C - Disposable Pantry',
      selectedClass: 'bg-amber-50 border-amber-200 text-amber-800',
    },
  ]

  return (
    <div className="flex gap-2.5 flex-wrap">
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => onCategoryToggle(cat.id)}
          className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
            selectedCategories.includes(cat.id)
              ? cat.selectedClass
              : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}
