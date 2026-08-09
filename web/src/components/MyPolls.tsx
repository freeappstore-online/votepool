import type { Poll } from "../types";

interface MyPollsProps {
  polls: Poll[];
  onSelect: (poll: Poll) => void;
  onNew: () => void;
}

export function MyPolls({ polls, onSelect, onNew }: MyPollsProps) {
  if (polls.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="text-5xl mb-4">🗳️</div>
        <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "Fraunces, serif" }}>
          No polls yet
        </h2>
        <p className="mb-6" style={{ color: "var(--muted)" }}>
          Create your first poll and share the link to start collecting votes.
        </p>
        <button
          onClick={onNew}
          className="px-6 py-3 rounded-xl font-bold transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          Create a Poll
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>
          My Polls
        </h1>
        <button
          onClick={onNew}
          className="px-4 py-2 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          + New Poll
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {polls.map(poll => {
          const totalVoters = Object.keys(poll.votes).length;
          const tally: Record<string, number> = {};
          poll.options.forEach(o => { tally[o] = 0; });
          Object.values(poll.votes).forEach(sels => sels.forEach(s => { if (tally[s] !== undefined) tally[s]++; }));
          const maxVotes = Math.max(...Object.values(tally), 0);
          const winners = poll.options.filter(o => tally[o] === maxVotes && tally[o] > 0);

          return (
            <button
              key={poll.id}
              onClick={() => onSelect(poll)}
              className="w-full text-left px-5 py-4 rounded-2xl border transition-all hover:border-[var(--accent)]"
              style={{ borderColor: "var(--line)", background: "var(--panel)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{poll.question}</p>
                  <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                    {poll.options.length} options · {totalVoters} voter{totalVoters !== 1 ? "s" : ""}
                    {winners.length > 0 && poll.closed && ` · 🏆 ${winners.join(", ")}`}
                  </p>
                </div>
                <span
                  className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: poll.closed ? "var(--line)" : "#dcfce7",
                    color: poll.closed ? "var(--muted)" : "var(--success)",
                  }}
                >
                  {poll.closed ? "Closed" : "Live"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
