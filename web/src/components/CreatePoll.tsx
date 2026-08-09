import { useState } from "react";
import type { Poll } from "../types";

interface CreatePollProps {
  onCreated: (poll: Poll) => void;
  username: string;
}

export function CreatePoll({ onCreated, username }: CreatePollProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [multiVote, setMultiVote] = useState(false);
  const [error, setError] = useState("");

  function addOption() {
    if (options.length < 10) setOptions([...options, ""]);
  }

  function removeOption(i: number) {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== i));
  }

  function updateOption(i: number, val: string) {
    const next = [...options];
    next[i] = val;
    setOptions(next);
  }

  function handleCreate() {
    if (!question.trim()) { setError("Please enter a question."); return; }
    const filled = options.map(o => o.trim()).filter(Boolean);
    if (filled.length < 2) { setError("Please enter at least 2 options."); return; }
    setError("");

    const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    const poll: Poll = {
      id,
      question: question.trim(),
      options: filled,
      multiVote,
      createdBy: username,
      createdAt: Date.now(),
      votes: {},
      closed: false,
    };
    onCreated(poll);
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "Fraunces, serif" }}>
        Create a Poll
      </h1>
      <p className="mb-8" style={{ color: "var(--muted)" }}>
        Set your question, add options, then share the link with anyone to vote.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium"
          style={{ background: "var(--error)", color: "#fff" }}>
          {error}
        </div>
      )}

      <div className="mb-5">
        <label className="block text-sm font-semibold mb-2">Question</label>
        <input
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="What should we decide?"
          className="w-full px-4 py-3 rounded-xl border text-base outline-none transition-all"
          style={{
            borderColor: "var(--line-strong)",
            background: "var(--paper)",
            color: "var(--ink)",
          }}
          maxLength={200}
        />
      </div>

      <div className="mb-5">
        <label className="block text-sm font-semibold mb-2">Options</label>
        <div className="flex flex-col gap-2">
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                value={opt}
                onChange={e => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="flex-1 px-4 py-2.5 rounded-xl border text-base outline-none"
                style={{
                  borderColor: "var(--line-strong)",
                  background: "var(--paper)",
                  color: "var(--ink)",
                }}
                maxLength={100}
              />
              {options.length > 2 && (
                <button
                  onClick={() => removeOption(i)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold transition-opacity hover:opacity-70"
                  style={{ background: "var(--line)", color: "var(--muted)" }}
                  title="Remove option"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < 10 && (
          <button
            onClick={addOption}
            className="mt-3 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-70"
            style={{ background: "var(--line)", color: "var(--accent)" }}
          >
            + Add option
          </button>
        )}
      </div>

      <div className="mb-8 flex items-center gap-3">
        <button
          role="checkbox"
          aria-checked={multiVote}
          onClick={() => setMultiVote(!multiVote)}
          className="w-10 h-6 rounded-full transition-colors relative shrink-0"
          style={{ background: multiVote ? "var(--accent)" : "var(--line-strong)" }}
        >
          <span
            className="absolute top-1 w-4 h-4 rounded-full transition-all"
            style={{
              background: "#fff",
              left: multiVote ? "calc(100% - 1.25rem)" : "0.25rem",
            }}
          />
        </button>
        <span className="text-sm font-medium">Allow multiple choices per voter</span>
      </div>

      <button
        onClick={handleCreate}
        className="w-full py-3.5 rounded-xl font-bold text-base transition-opacity hover:opacity-90"
        style={{ background: "var(--accent)", color: "#fff" }}
      >
        Create Poll & Get Link →
      </button>
    </div>
  );
}
