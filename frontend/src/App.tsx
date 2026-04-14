import { useChat } from './hooks/useChat';
import StatusBadge from './components/StatusBadge';
import ChatFeed from './components/ChatFeed';
import StreamerInput from './components/StreamerInput';

export default function App() {
  const {
    messages,
    status,
    currentChannel,
    streamerInfo,
    inputError,
    joinChannel,
  } = useChat();

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 shrink-0">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {/* Twitch logo */}
            <svg className="w-7 h-7 text-purple-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
            </svg>
            <h1 className="text-xl font-bold text-white">Twitch Chat Viewer</h1>
          </div>

          <StreamerInput
            onJoin={joinChannel}
            inputError={inputError}
            isConnected={status === 'connected'}
          />

          <StatusBadge
            streamerInfo={streamerInfo}
            currentChannel={currentChannel}
            wsStatus={status}
          />
        </div>
      </header>

      {/* Chat feed */}
      <main className="flex-1 flex flex-col overflow-hidden max-w-2xl w-full mx-auto py-2">
        <ChatFeed messages={messages} currentChannel={currentChannel} />
      </main>
    </div>
  );
}
