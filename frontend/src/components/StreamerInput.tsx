import { useState, FormEvent } from 'react';

interface Props {
  onJoin: (login: string) => Promise<void>;
  inputError: string | null;
  isConnected: boolean;
}

const StreamerInput: React.FC<Props> = ({ onJoin, inputError, isConnected }: Props) => {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim() || loading) return;

    setLoading(true);
    try {
      await onJoin(value.trim());
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter streamer name..."
          disabled={loading || !isConnected}
          className="
            flex-1 px-4 py-2 rounded-lg
            bg-gray-700 text-white placeholder-gray-400
            border border-gray-600 focus:border-purple-500 focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
        />
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
            'Watch'
          )}
        </button>
      </div>

      {inputError && (
        <p className="text-red-400 text-sm px-1">{inputError}</p>
      )}
    </form>
  );
}

export default StreamerInput;

const Spinner: React.FC = () => {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
