import { useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { Bot, Trash2 } from 'lucide-react';

export default function ChatWidget() {
  const { messages, isLoading, sendMessage, clearChat } = useChat();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white">
        <div className="flex items-center gap-2">
          <Bot size={20} />
          <div>
            <h3 className="font-semibold text-sm">Process AI Assistant</h3>
            <p className="text-xs text-blue-200">Powered by Gemini AI</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="p-1.5 hover:bg-blue-700 rounded transition"
            title="Clear chat"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <Bot size={48} className="mx-auto text-gray-200 mb-4" />
            <h4 className="text-gray-700 font-medium mb-1">How can I help you?</h4>
            <p className="text-gray-400 text-sm mb-6">
              Ask me anything about your company's processes, SOPs, and policies.
            </p>
            <div className="space-y-2">
              {[
                'What is the leave policy?',
                'How do I submit an expense report?',
                'What are the compliance requirements?',
                'Explain the onboarding process',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="block w-full max-w-xs mx-auto text-left px-4 py-2.5 text-sm bg-gray-50 text-gray-600 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => <ChatMessage key={i} message={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={sendMessage} isLoading={isLoading} />
    </div>
  );
}
