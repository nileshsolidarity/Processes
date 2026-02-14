import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { processApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FileText, MessageSquare, FolderOpen, RefreshCw, ArrowRight } from 'lucide-react';

export default function Home() {
  const { branch } = useAuth();
  const [stats, setStats] = useState({ total: 0, categories: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const [processes, categories] = await Promise.all([
        processApi.list({ limit: 1 }),
        processApi.getCategories(),
      ]);
      setStats({
        total: processes.pagination.total,
        categories: categories.filter((c) => c !== 'All'),
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {branch?.name}
        </h1>
        <p className="text-gray-500 mt-1">
          Access your organization's processes, SOPs, and policies in one place.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-lg">
              <FileText size={22} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Processes</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-50 rounded-lg">
              <FolderOpen size={22} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.categories.length}</p>
              <p className="text-sm text-gray-500">Categories</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 rounded-lg">
              <MessageSquare size={22} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">AI</p>
              <p className="text-sm text-gray-500">Chatbot Ready</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/processes"
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md hover:border-blue-200 transition group"
        >
          <FileText size={28} className="text-blue-600 mb-3" />
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">
            Browse Processes
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Search and view all SOPs and policies organized by category.
          </p>
          <span className="flex items-center gap-1 text-sm text-blue-600 mt-3 font-medium">
            Go to Processes <ArrowRight size={14} />
          </span>
        </Link>

        <Link
          to="/chat"
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md hover:border-blue-200 transition group"
        >
          <MessageSquare size={28} className="text-purple-600 mb-3" />
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">
            Ask AI Assistant
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Get instant answers about company processes powered by Gemini AI.
          </p>
          <span className="flex items-center gap-1 text-sm text-blue-600 mt-3 font-medium">
            Start Chatting <ArrowRight size={14} />
          </span>
        </Link>
      </div>

      {/* Categories */}
      {stats.categories.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Process Categories</h2>
          <div className="flex flex-wrap gap-2">
            {stats.categories.map((cat) => (
              <Link
                key={cat}
                to={`/processes?category=${encodeURIComponent(cat)}`}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition"
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
