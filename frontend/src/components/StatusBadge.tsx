import { StreamerInfo } from "../types";
import { ConnectionStatus } from "../hooks/useChat";

interface Props {
  streamerInfo: StreamerInfo | null;
  currentChannel: string | null;
  wsStatus: ConnectionStatus;
}

const StatusBadge: React.FC<Props> = ({
  streamerInfo,
  currentChannel,
  wsStatus,
}: Props) => {
  if (wsStatus === "connecting" || wsStatus === "disconnected") {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
        {wsStatus === "connecting"
          ? "Connecting to server..."
          : "Reconnecting..."}
      </div>
    );
  }

  if (!currentChannel || !streamerInfo) {
    return null;
  }

  if (streamerInfo.isLive) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Live
          </span>
          <span className="text-white font-semibold">
            {streamerInfo.displayName}
          </span>
          <span className="text-gray-400 text-sm">
            {streamerInfo.viewerCount?.toLocaleString()} viewers
          </span>
        </div>
        {streamerInfo.title && (
          <p
            className="text-gray-400 text-sm truncate max-w-md"
            title={streamerInfo.title}
          >
            {streamerInfo.title}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold bg-gray-600 text-gray-300 uppercase tracking-wide">
        Offline
      </span>
      <span className="text-white font-semibold">
        {streamerInfo.displayName}
      </span>
      <span className="text-gray-400 text-sm">— chat may be quiet</span>
    </div>
  );
};

export default StatusBadge;
