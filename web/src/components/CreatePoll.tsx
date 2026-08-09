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
  const [creatorName, setCreatorName] = useState(username !== "me" ? username : "");
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
      createdBy: creatorName.trim() || "anonymous",
      createdAt: Date.now(),
      votes: {},
      closed: false,
    };
    onCreated(poll);
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "Fraunces, serif" }}>
        New Poll
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
        Fill in your question and options, then share the link with anyone.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium"
          style={{ background: "var(--error, #fee2e2)", color: "#dc2626" }}>
          {error}
        </div>
      )}

      {/* Your name */}
      <div className="mb-5">
        <label className="block text-sm font-semibold mb-2">Your name (optional)</label>
        <input
          type="text"
          placeholder="e.g. Alex"
          value={creatorName}
          onChange={e => setCreatorName(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border outline-none text-sm transition-all"
          style={{ borderColor: "var(--line)", background: "var(--paper)", color: "var(--ink)" }}
        />
      </div>

      {/* Question */}
      <div className="mb-5">
        <label className="block text-sm font-semibold mb-2">Question *</label>
        <input
          type="text"
          placeholder="e.g. What should we have for lunch?"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border outline-none text-sm transition-all"
          style={{ borderColor: "var(--line)", background: "var(--paper)", color: "var(--ink)" }}
        />
      </div>

      {/* Options */}
      <div className="mb-5">
        <label className="block text-sm font-semibold mb-2">Options *</label>
        <div className="flex flex-col gap-2">
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={e => updateOption(i, e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border outline-none text-sm"
                style={{ borderColor: "var(--line)", background: "var(--paper)", color: "var(--ink)" }}
              />
              {options.length > 2 && (
                <button
                  onClick={() => removeOption(i)}
                  className="px-3 py-2 rounded-xl text-sm transition-opacity hover:opacity-70"
                  style={{ background: "var(--line)", color: "var(--muted)" }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < 10 && (
          <button
            onClick={addOption}
            className="mt-2 text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: "var(--accent)" }}
          >
            + Add option
          </button>
        )}
      </div>

      {/* Multi-vote toggle */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => setMultiVote(v => !v)}
          className="w-10 h-6 rounded-full transition-all relative"
          style={{ background: multiVote ? "var(--accent)" : "var(--line)" }}
        >
          <span
            className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
            style={{ left: multiVote ? "calc(100% - 1.25rem)" : "0.25rem" }}
          />
        </button>
        <span className="text-sm">Allow multiple selections</span>
      </div>

      <button
        onClick={handleCreate}
        className="w-full py-4 rounded-xl font-bold text-base transition-opacity hover:opacity-90"
        style={{ background: "var(--accent)", color: "#fff" }}
      >
        Create Poll & Get Link
      </button>
    </div>
  );
}
