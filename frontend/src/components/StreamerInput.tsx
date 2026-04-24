import { useState, useRef, useEffect } from "react";
import { StreamerInfo } from "../types";

interface Props {
  onJoin: (login: string) => Promise<void>;
  onLeave: () => void;
  streamerInfo: StreamerInfo | null;
  inputError: string | null;
  isConnected: boolean;
  history: string[];
}

const StreamerInput: React.FC<Props> = ({ onJoin, onLeave, inputError, isConnected, history }: Props) => {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = history.filter(
    (h) => !value.trim() || h.toLowerCase().includes(value.toLowerCase())
  );

  useEffect(() => {
    setActiveIndex(-1);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || loading) return;

    setOpen(false);
    setLoading(true);
    try {
      await onJoin(trimmed);
    } finally {
      setLoading(false);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || filtered.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      setValue(filtered[activeIndex]);
      setOpen(false);
      setActiveIndex(-1);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const selectHistoryItem = (item: string) => {
    setValue(item);
    setOpen(false);
    setActiveIndex(-1);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div ref={containerRef} className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Enter streamer name..."
            disabled={loading || !isConnected}
            className="
              w-full px-4 py-2 rounded-lg
              bg-gray-700 text-white placeholder-gray-400
              border border-gray-600 focus:border-purple-500 focus:outline-none
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            "
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
          />

          {open && filtered.length > 0 && (
            <ul className="absolute z-10 w-full mt-1 rounded-lg bg-gray-800 border border-gray-600 shadow-lg overflow-hidden max-h-48 overflow-y-auto">
              {filtered.map((item, i) => (
                <li
                  key={item}
                  onMouseDown={() => selectHistoryItem(item)}
                  className={`px-4 py-2 cursor-pointer text-sm text-white ${i === activeIndex ? "bg-purple-600" : "hover:bg-gray-700"
                    }`}
                >
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !isConnected || !value.trim()}
          className="
            px-5 py-2 rounded-lg font-semibold
            bg-purple-600 hover:bg-purple-500 text-white
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors flex items-center gap-2
          "
        >
          {loading ? (
            <>
              <Spinner />
              Joining...
            </>
          ) : (
            "Watch"
          )}
        </button>
        <button
          type="button"
          onClick={onLeave}
          disabled={!isConnected}
          className="px-5 py-2 rounded-lg font-semibold bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Stop Watching
        </button>
      </div>

      {inputError && <p className="text-red-400 text-sm px-1">{inputError}</p>}
    </form>
  );
}

export default StreamerInput;

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
