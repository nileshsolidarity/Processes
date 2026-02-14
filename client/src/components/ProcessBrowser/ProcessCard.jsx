import { FileText, ExternalLink, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

const categoryColors = {
  'HR': 'bg-purple-100 text-purple-700',
  'Finance': 'bg-green-100 text-green-700',
  'Compliance': 'bg-red-100 text-red-700',
  'Operations': 'bg-orange-100 text-orange-700',
  'Sales & Marketing': 'bg-pink-100 text-pink-700',
  'IT': 'bg-cyan-100 text-cyan-700',
  'Security': 'bg-yellow-100 text-yellow-700',
  'Customer Service': 'bg-blue-100 text-blue-700',
  'Policies': 'bg-indigo-100 text-indigo-700',
  'SOPs': 'bg-teal-100 text-teal-700',
  'General': 'bg-gray-100 text-gray-700',
};

export default function ProcessCard({ process }) {
  const colorClass = categoryColors[process.category] || categoryColors['General'];
  const lastModified = process.last_modified
    ? new Date(process.last_modified).toLocaleDateString()
    : 'Unknown';

  return (
    <Link
      to={`/processes/${process.id}`}
      className="block bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-blue-200 transition group"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-100 transition">
          <FileText size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition">
            {process.title}
          </h3>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorClass}`}>
              {process.category}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Calendar size={12} />
              {lastModified}
            </span>
          </div>
        </div>
        {process.drive_url && (
          <a
            href={process.drive_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 text-gray-400 hover:text-blue-500 transition"
            title="Open in Google Drive"
          >
            <ExternalLink size={16} />
          </a>
        )}
      </div>
    </Link>
  );
}
