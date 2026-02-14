import ReactMarkdown from 'react-markdown';
import { Bot, User, ExternalLink, AlertCircle } from 'lucide-react';

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Bot size={18} className="text-blue-600" />
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-blue-600 text-white'
              : message.isError
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {isUser ? (
            <p className="text-sm">{message.content}</p>
          ) : message.isError ? (
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle size={16} />
              {message.content}
            </div>
          ) : (
            <div className="chat-message text-sm">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.sources.map((source, i) => (
              <a
                key={i}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition"
              >
                <ExternalLink size={10} />
                {source.title}
              </a>
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <User size={18} className="text-gray-600" />
        </div>
      )}
    </div>
  );
}
