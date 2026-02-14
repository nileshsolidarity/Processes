import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { processApi } from '../../services/api';
import { ArrowLeft, ExternalLink, Calendar, Tag, FileText, Loader2 } from 'lucide-react';

export default function DocumentViewer() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocument();
  }, [id]);

  async function loadDocument() {
    setLoading(true);
    try {
      const data = await processApi.getById(id);
      setDoc(data);
    } catch (err) {
      console.error('Failed to load document:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Document not found</p>
        <Link to="/processes" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to Processes
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link to="/processes" className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-4">
          <ArrowLeft size={16} />
          Back to Processes
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                <FileText size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{doc.title}</h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Tag size={14} />
                    {doc.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    Last modified: {new Date(doc.last_modified).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            {doc.drive_url && (
              <a
                href={doc.drive_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
              >
                <ExternalLink size={14} />
                Open in Drive
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b">Document Content</h2>
        <div className="prose max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
          {doc.content_text || 'No content available for this document.'}
        </div>
      </div>
    </div>
  );
}
