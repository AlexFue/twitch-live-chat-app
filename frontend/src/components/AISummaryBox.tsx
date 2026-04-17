import React, { useState } from "react";
import { ChatMessage } from "../types";

interface Props {
  messages: ChatMessage[];
}

/**
 * This component will display an AI-generated summary of recent chat activity.
 * It will have 2 states, open and closed. When closed, a text box icon would be shown. When open, it will show chat box style vertical rectangle window, asking the user if they would like the chat messages to be summarized.
 * When user clicks "Summarize", it will send a request to the backend to generate a summary of the recent chat messages. The backend will use OpenAI's API to generate the summary and return it to the frontend, which will then display it in the box.
 * Closing the chat box would not clear the summary, so that when the user opens it again, they can see the previous summary. However, if the user clicks "Summarize" again, it will generate a new summary based on the most recent chat messages.
 * User cannot summarize if there are no chat messages and when no new chat messages are available from last summary. The "Summarize" button will be disabled in these case.
 */
const AISummaryBox: React.FC<Props> = ({ messages }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSummarize = async () => {
    if (messages.length === 0) return;

    setIsLoading(true);
    try {
      // Send request to backend to generate summary
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((msg) => ({
            username: msg.username,
            message: msg.text,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
      }
    } catch (error) {
      console.error("Failed to generate summary:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Closed state: floating icon button at bottom right
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="
          fixed bottom-6 right-6 z-40
          w-14 h-14 rounded-full
          bg-blue-500 hover:bg-blue-600 text-white
          shadow-lg transition-colors flex items-center justify-center
          font-bold text-xl
        "
        title="AI Summary"
      >
        <svg
          className="w-6 h-6"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    );
  }

  // Open state: modal-style box at bottom right
  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-48px)]">
      <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-500"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-white">Chat Summary</h3>
              <p className="text-xs text-blue-100">AI-powered insights</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-blue-700 rounded p-1 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!summary ? (
            <div className="space-y-4">
              <div className="text-gray-800">
                <p className="text-sm font-medium text-gray-700 mb-2">💬 Summary</p>
                <p className="text-sm text-gray-600">
                  Would you like to generate an AI summary of recent chat messages?
                </p>
              </div>
              <button
                onClick={handleSummarize}
                disabled={messages.length === 0 || isLoading}
                className="
                  w-full px-4 py-2 rounded-lg font-medium text-white
                  bg-blue-500 hover:bg-blue-600 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                "
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Generating...
                  </>
                ) : (
                  "Summarize Chat"
                )}
              </button>
              <p className="text-xs text-gray-500 text-center">
                {messages.length === 0 ? "No messages to summarize" : `${messages.length} messages available`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-800 leading-relaxed">{summary}</p>
              </div>
              <button
                onClick={handleSummarize}
                disabled={messages.length === 0 || isLoading}
                className="
                  w-full px-4 py-2 rounded-lg font-medium text-white
                  bg-blue-500 hover:bg-blue-600 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                "
              >
                {isLoading ? "Regenerating..." : "Regenerate Summary"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AISummaryBox;