import { ChatMessage as ChatMessageType } from '../types';

interface Props {
  message: ChatMessageType;
}

// Badge display config: badge key → label + color classes
const BADGE_STYLES: Record<string, { label: string; className: string }> = {
  broadcaster: { label: 'Broadcaster', className: 'bg-red-700 text-red-100' },
  moderator:   { label: 'Mod',         className: 'bg-green-700 text-green-100' },
  vip:         { label: 'VIP',         className: 'bg-purple-700 text-purple-100' },
  subscriber:  { label: 'Sub',         className: 'bg-indigo-700 text-indigo-100' },
  staff:       { label: 'Staff',       className: 'bg-yellow-700 text-yellow-100' },
};

const DEFAULT_COLOR = '#9CA3AF'; // gray-400 — Twitch default for users with no color set

const ChatMessage: React.FC<Props> = ({ message }: Props) => {
  const usernameColor = message.color ?? DEFAULT_COLOR;

  const badgeEntries = Object.entries(message.badges)
    .filter(([key]) => key in BADGE_STYLES)
    // Sort: broadcaster first, then mod, vip, subscriber
    .sort(([a], [b]) => {
      const order = ['broadcaster', 'moderator', 'vip', 'subscriber', 'staff'];
      return order.indexOf(a) - order.indexOf(b);
    });

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="group flex items-start gap-2 px-3 py-1.5 hover:bg-gray-700/40 rounded transition-colors">
      {/* Timestamp — visible on hover */}
      <span className="hidden group-hover:block text-gray-500 text-xs pt-0.5 shrink-0 w-10 text-right">
        {formattedTime}
      </span>

      <div className="flex-1 min-w-0">
        {/* Username + badges */}
        <span className="inline-flex items-center gap-1 mr-1">
          {badgeEntries.map(([key]) => {
            const badge = BADGE_STYLES[key];
            return (
              <span
                key={key}
                className={`inline-block px-1 py-px text-[10px] font-bold rounded ${badge.className}`}
                title={badge.label}
              >
                {badge.label}
              </span>
            );
          })}
          <span
            className="font-semibold text-sm break-words"
            style={{ color: usernameColor }}
          >
            {message.username}
          </span>
          <span className="text-gray-400 text-sm select-none">:</span>
        </span>

        {/* Message text */}
        <span className="text-gray-100 text-sm break-words">{message.text}</span>
      </div>
    </div>
  );
}

export default ChatMessage;
