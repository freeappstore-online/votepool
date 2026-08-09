import { useState } from "react";
import type { Poll } from "../types";

interface PollViewProps {
  poll: Poll;
  myVote: string[] | null;
  onVote: (pollId: string, selections: string[], voterName: string) => void;
  onClose: (pollId: string) => void;
  shareUrl: string;
}

export function PollView({ poll, myVote, onVote, onClose, shareUrl }: PollViewProps) {
  const [selected, setSelected] = useState<string[]>(myVote ?? []);
  const [voted, setVoted] = useState(!!myVote);
  const [copied, setCopied] = useState(false);
  const [voterName, setVoterName] = useState("");
  const [nameError, setNameError] = useState("");

  function toggleOption(opt: string) {
    if (poll.multiVote) {
      setSelected(prev =>
        prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
      );
    } else {
      setSelected([opt]);
    }
  }

  function handleVote() {
    if (selected.length === 0) return;
    const name = voterName.trim() || "anonymous";
    onVote(poll.id, selected, name);
    setVoted(true);
  }

  function copyLink() {
    const doCopy = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(shareUrl).then(doCopy).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }
  }

  function fallbackCopy() {
    const el = document.createElement("textarea");
    el.value = shareUrl;
    el.style.position = "fixed";
    el.style.top = "-9999px";
    document.body.appendChild(el);
    el.focus();
    el.select();
    try { document.execCommand("copy"); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* */ }
    document.body.removeChild(el);
  }

  // Tally
  const totalVoters = Object.keys(poll.votes).length;
  const tally: Record<string, number> = {};
  poll.options.forEach(o => { tally[o] = 0; });
  Object.values(poll.votes).forEach(sels => sels.forEach(s => { if (tally[s] !== undefined) tally[s]++; }));
  const maxVotes = Math.max(...Object.values(tally), 1);
  const winners = poll.options.filter(o => tally[o] === maxVotes && tally[o] > 0);
  const showResults = voted || poll.closed;

  return (
    <div className="max-w-xl mx-auto">
      {/* Status */}
      <div className="flex items-center gap-2 mb-6">
        <span
          className="px-3 py-1 rounded-full text-xs font-bold"
          style={{
            background: poll.closed ? "var(--line)" : "#dcfce7",
            color: poll.closed ? "var(--muted)" : "#16a34a",
          }}
        >
          {poll.closed ? "Closed" : "● Live"}
        </span>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          {totalVoters} vote{totalVoters !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Question */}
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "Fraunces, serif" }}>
        {poll.question}
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        {poll.closed
          ? "Voting is closed."
          : showResults
          ? "You've voted — results shown below."
          : poll.multiVote
          ? "Select one or more options."
          : "Pick one option."}
      </p>

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
          const pct = totalVoters > 0 ? Math.round((count / totalVoters) * 100) : 0;
          const barPct = maxVotes > 0 ? Math.round((count / maxVotes) * 100) : 0;
          const isWinner = poll.closed && winners.includes(opt) && totalVoters > 0;
          const isSelected = selected.includes(opt);
          const myChoice = (myVote ?? selected)?.includes(opt);

          return (
            <button
              key={opt}
              onClick={() => !showResults && !poll.closed && toggleOption(opt)}
              disabled={showResults || poll.closed}
              className="relative w-full text-left px-4 py-3.5 rounded-2xl border-2 overflow-hidden transition-all"
              style={{
                borderColor: isSelected && !showResults ? "var(--accent)" : isWinner ? "var(--accent)" : myChoice && showResults ? "var(--accent)" : "var(--line)",
                background: "var(--paper)",
                cursor: showResults || poll.closed ? "default" : "pointer",
              }}
            >
              {showResults && (
                <span
                  className="absolute inset-y-0 left-0 transition-all duration-500"
                  style={{ width: `${barPct}%`, background: isWinner ? "var(--accent)" : "var(--line)", opacity: 0.15 }}
                />
              )}
              <span className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-medium">
                  {!showResults && (
                    <span
                      className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center text-xs"
                      style={{
                        borderColor: isSelected ? "var(--accent)" : "var(--line)",
                        background: isSelected ? "var(--accent)" : "transparent",
                        color: "#fff",
                      }}
                    >
                      {isSelected ? "✓" : ""}
                    </span>
                  )}
                  {isWinner && "🏆 "}{opt}
                  {myChoice && showResults && (
                    <span className="text-xs font-normal" style={{ color: "var(--accent)" }}>(your vote)</span>
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

      {/* Vote form */}
      {!voted && !poll.closed && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Your name (optional)"
            value={voterName}
            onChange={e => { setVoterName(e.target.value); setNameError(""); }}
            className="w-full px-4 py-3 rounded-xl border mb-3 text-sm outline-none"
            style={{ borderColor: nameError ? "var(--error)" : "var(--line)", background: "var(--paper)", color: "var(--ink)" }}
          />
          <button
            onClick={handleVote}
            disabled={selected.length === 0}
            className="w-full py-3.5 rounded-xl font-bold text-base transition-opacity"
            style={{
              background: selected.length === 0 ? "var(--line)" : "var(--accent)",
              color: selected.length === 0 ? "var(--muted)" : "#fff",
              cursor: selected.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            Cast Vote
          </button>
        </div>
      )}

      {/* Share link */}
      <div
        className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4"
        style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
      >
        <input
          readOnly
          value={shareUrl}
          onFocus={e => e.target.select()}
          className="flex-1 text-xs bg-transparent outline-none min-w-0"
          style={{ color: "var(--muted)", fontFamily: "monospace" }}
        />
        <button
          type="button"
          onClick={copyLink}
          className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{ background: copied ? "#16a34a" : "var(--accent)", color: "#fff" }}
        >
          {copied ? "✓ Copied!" : "Copy Link"}
        </button>
      </div>

      {/* Close poll */}
      {!poll.closed && (
        <button
          onClick={() => onClose(poll.id)}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
          style={{ background: "var(--line)", color: "var(--ink)" }}
        >
          🔒 Close Poll & Declare Winner
        </button>
      )}

      <p className="mt-4 text-xs text-center" style={{ color: "var(--muted)" }}>
        Created by {poll.createdBy} · {new Date(poll.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}
