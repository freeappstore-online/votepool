import { useState, useEffect, useCallback } from "react";
import type { Poll } from "../types";

interface PollViewProps {
  poll: Poll;
  currentUser: string;
  isOwner: boolean;
  onVote: (pollId: string, selections: string[]) => Promise<void>;
  onClose: (pollId: string) => Promise<void>;
  onRefresh: (pollId: string) => Promise<Poll | null>;
  shareUrl: string;
}

export function PollView({ poll: initialPoll, currentUser, isOwner, onVote, onClose, onRefresh, shareUrl }: PollViewProps) {
  const [poll, setPoll] = useState(initialPoll);
  const [selected, setSelected] = useState<string[]>([]);
  const [voted, setVoted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Check if current user already voted
  useEffect(() => {
    if (poll.votes[currentUser]) {
      setVoted(true);
      setSelected(poll.votes[currentUser]);
    }
  }, [poll, currentUser]);

  // Auto-refresh every 5 seconds
  const refresh = useCallback(async () => {
    const updated = await onRefresh(poll.id);
    if (updated) {
      setPoll(updated);
      setLastRefresh(Date.now());
    }
  }, [poll.id, onRefresh]);

  useEffect(() => {
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  function toggleOption(opt: string) {
    if (poll.multiVote) {
      setSelected(prev =>
        prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
      );
    } else {
      setSelected([opt]);
    }
  }

  async function handleVote() {
    if (selected.length === 0) return;
    setSubmitting(true);
    await onVote(poll.id, selected);
    setVoted(true);
    setSubmitting(false);
    await refresh();
  }

  async function handleClose() {
    setClosing(true);
    await onClose(poll.id);
    await refresh();
    setClosing(false);
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Tally votes
  const totalVoters = Object.keys(poll.votes).length;
  const tally: Record<string, number> = {};
  poll.options.forEach(o => { tally[o] = 0; });
  Object.values(poll.votes).forEach(selections => {
    selections.forEach(s => { if (tally[s] !== undefined) tally[s]++; });
  });

  const maxVotes = Math.max(...Object.values(tally), 1);
  const winners = poll.options.filter(o => tally[o] === maxVotes && tally[o] > 0);

  const showResults = voted || poll.closed;

  const secondsAgo = Math.round((Date.now() - lastRefresh) / 1000);

  return (
    <div className="max-w-xl mx-auto">
      {/* Status bar */}
      <div className="flex items-center gap-2 mb-6">
        <span
          className="px-3 py-1 rounded-full text-xs font-bold"
          style={{
            background: poll.closed ? "var(--line)" : "#dcfce7",
            color: poll.closed ? "var(--muted)" : "var(--success)",
          }}
        >
          {poll.closed ? "Closed" : "● Live"}
        </span>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          {totalVoters} voter{totalVoters !== 1 ? "s" : ""} · refreshed {secondsAgo}s ago
        </span>
        <button
          onClick={refresh}
          className="ml-auto text-xs px-3 py-1 rounded-lg transition-opacity hover:opacity-70"
          style={{ background: "var(--line)", color: "var(--muted)" }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Question */}
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "Fraunces, serif" }}>
        {poll.question}
      </h1>
      {poll.multiVote && !showResults && (
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          You can select multiple options.
        </p>
      )}
      {!poll.multiVote && !showResults && (
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          Pick one option.
        </p>
      )}
      {showResults && (
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          {poll.closed ? "Voting is closed." : "You've voted — results update live."}
        </p>
      )}

      {/* Winner banner */}
      {poll.closed && winners.length > 0 && totalVoters > 0 && (
        <div
          className="mb-6 px-5 py-4 rounded-2xl font-semibold text-sm"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          🏆 Winner{winners.length > 1 ? "s" : ""}: {winners.join(" & ")}
        </div>
      )}

      {/* Options */}
      <div className="flex flex-col gap-3 mb-6">
        {poll.options.map(opt => {
          const count = tally[opt];
          const pct = totalVoters > 0 ? Math.round((count / (poll.multiVote ? totalVoters : totalVoters)) * 100) : 0;
          const barPct = maxVotes > 0 ? Math.round((count / maxVotes) * 100) : 0;
          const isWinner = poll.closed && winners.includes(opt) && totalVoters > 0;
          const isSelected = selected.includes(opt);
          const myVote = poll.votes[currentUser]?.includes(opt);

          return (
            <button
              key={opt}
              onClick={() => !showResults && !poll.closed && toggleOption(opt)}
              disabled={showResults || poll.closed}
              className="relative w-full text-left px-4 py-3.5 rounded-2xl border-2 overflow-hidden transition-all"
              style={{
                borderColor: isSelected && !showResults
                  ? "var(--accent)"
                  : isWinner
                  ? "var(--accent)"
                  : myVote && showResults
                  ? "var(--accent)"
                  : "var(--line)",
                background: "var(--paper)",
                cursor: showResults || poll.closed ? "default" : "pointer",
              }}
            >
              {/* Progress bar fill */}
              {showResults && (
                <span
                  className="absolute inset-y-0 left-0 transition-all duration-500"
                  style={{
                    width: `${barPct}%`,
                    background: isWinner ? "var(--accent)" : "var(--line)",
                    opacity: 0.15,
                  }}
                />
              )}

              <span className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-medium">
                  {!showResults && (
                    <span
                      className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center text-xs"
                      style={{
                        borderColor: isSelected ? "var(--accent)" : "var(--line-strong)",
                        background: isSelected ? "var(--accent)" : "transparent",
                        color: "#fff",
                      }}
                    >
                      {isSelected ? "✓" : ""}
                    </span>
                  )}
                  {isWinner && "🏆 "}
                  {opt}
                  {myVote && showResults && (
                    <span className="text-xs font-normal" style={{ color: "var(--accent)" }}>
                      (your vote)
                    </span>
                  )}
                </span>
                {showResults && (
                  <span className="text-sm font-bold shrink-0" style={{ color: isWinner ? "var(--accent)" : "var(--muted)" }}>
                    {count} · {pct}%
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Vote button */}
      {!voted && !poll.closed && (
        <button
          onClick={handleVote}
          disabled={selected.length === 0 || submitting}
          className="w-full py-3.5 rounded-xl font-bold text-base mb-4 transition-opacity"
          style={{
            background: selected.length === 0 ? "var(--line)" : "var(--accent)",
            color: selected.length === 0 ? "var(--muted)" : "#fff",
            opacity: submitting ? 0.6 : 1,
            cursor: selected.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Submitting…" : "Cast Vote"}
        </button>
      )}

      {/* Share link */}
      <div
        className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4"
        style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
      >
        <span className="flex-1 text-xs truncate" style={{ color: "var(--muted)", fontFamily: "monospace" }}>
          {shareUrl}
        </span>
        <button
          onClick={copyLink}
          className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: copied ? "var(--success)" : "var(--accent)",
            color: "#fff",
          }}
        >
          {copied ? "✓ Copied!" : "Copy Link"}
        </button>
      </div>

      {/* Owner controls */}
      {isOwner && !poll.closed && (
        <button
          onClick={handleClose}
          disabled={closing}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
          style={{ background: "var(--line)", color: "var(--ink)", opacity: closing ? 0.6 : 1 }}
        >
          {closing ? "Closing…" : "🔒 Close Poll & Declare Winner"}
        </button>
      )}

      <p className="mt-4 text-xs text-center" style={{ color: "var(--muted)" }}>
        Created by @{poll.createdBy}
      </p>
    </div>
  );
}
