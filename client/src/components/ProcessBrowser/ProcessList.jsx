import { useState, useEffect } from 'react';
import { processApi } from '../../services/api';
import ProcessCard from './ProcessCard';
import SearchBar from './SearchBar';
import CategoryFilter from './CategoryFilter';
import { Loader2, FolderOpen } from 'lucide-react';

export default function ProcessList() {
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [search, category]);

  async function loadCategories() {
    try {
      const cats = await processApi.getCategories();
      setCategories(cats);
    } catch {
      // fallback
    }
  }

  async function loadDocuments(page = 1) {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (category !== 'All') params.category = category;

      const data = await processApi.list(params);
      setDocuments(data.documents);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to load processes:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} />
        </div>
      </div>

      <CategoryFilter categories={categories} selected={category} onSelect={setCategory} />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-lg">No processes found</p>
          <p className="text-gray-400 text-sm mt-1">
            {search || category !== 'All'
              ? 'Try adjusting your search or filters'
              : 'Click "Sync Drive" to import documents from Google Drive'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">{pagination.total} process(es) found</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <ProcessCard key={doc.id} process={doc} />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              {Array.from({ length: pagination.totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => loadDocuments(i + 1)}
                  className={`px-3 py-1 text-sm rounded ${
                    pagination.page === i + 1
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
