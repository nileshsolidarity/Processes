export default function CategoryFilter({ categories, selected, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`px-3 py-1.5 text-sm rounded-full transition ${
            selected === cat
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 border border-gray-300 hover:border-blue-300 hover:text-blue-600'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
