import { Building2, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import { processApi } from '../../services/api';

export default function Header() {
  const { branch, logout } = useAuth();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await processApi.triggerSync();
      setSyncing(false);
      window.location.reload();
    } catch {
      setSyncing(false);
      alert('Sync failed. Check your Google Drive configuration.');
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 text-white p-2 rounded-lg">
          <Building2 size={24} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Process Repository</h1>
          <p className="text-xs text-gray-500">SOPs & Policies</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition disabled:opacity-50"
        >
          <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing...' : 'Sync Drive'}
        </button>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="bg-gray-100 px-2 py-1 rounded">{branch?.code}</span>
          <span className="hidden sm:inline">{branch?.name}</span>
        </div>

        <button
          onClick={logout}
          className="p-2 text-gray-400 hover:text-red-500 transition"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
