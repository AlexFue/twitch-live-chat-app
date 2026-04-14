import { useEffect, useRef, useState } from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import ChatMessage from './ChatMessage';

interface Props {
  messages: ChatMessageType[];
  currentChannel: string | null;
}

const SCROLL_THRESHOLD = 80; // px from bottom to consider "at bottom"

const ChatFeed: React.FC<Props> = ({ messages, currentChannel }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // // Auto-scroll to bottom when new messages arrive (unless user scrolled up)
  // useEffect(() => {
  //   if (!isPaused) {
  //     bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  //   }
  // }, [messages, isPaused]);

  // Detect whether the user has scrolled up away from the bottom
  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsPaused(distFromBottom > SCROLL_THRESHOLD);
  }

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsPaused(false);
  }

  if (!currentChannel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-3">
        <TwitchIcon />
        <p className="text-lg">Enter a streamer name above to start watching chat</p>
      </div>
    );
  }

  return (
    <div className="flex-1 relative overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto chat-scrollbar flex flex-col py-2"
      >
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Waiting for messages in #{currentChannel}...
          </div>
        ) : (
          messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* "Scroll to bottom" button — shown when auto-scroll is paused */}
      {isPaused && (
        <button
          onClick={scrollToBottom}
          className="
            absolute bottom-4 left-1/2 -translate-x-1/2
            px-4 py-2 rounded-full
            bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium
            shadow-lg transition-colors flex items-center gap-2
          "
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          Live chat
        </button>
      )}
    </div>
  );
}

export default ChatFeed;

const TwitchIcon: React.FC = () => {
  return (
    <svg className="w-12 h-12 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
    </svg>
  );
}
