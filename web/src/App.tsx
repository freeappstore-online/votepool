import { useState, useEffect, useRef } from "react";
import { Shell } from "./components/Shell";
import { CreatePoll } from "./components/CreatePoll";
import { PollView } from "./components/PollView";
import { MyPolls } from "./components/MyPolls";
import type { Poll } from "./types";

const STORAGE_KEY = "votepool_polls";
const VOTE_PREFIX = "votepool_vote_";

type View = "home" | "create" | "poll";

// Encode poll into URL-safe base64
function encodePoll(poll: Poll): string {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(poll))));
  } catch {
    return "";
  }
}

// Decode poll from base64 string
function decodePoll(encoded: string): Poll | null {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded))));
  } catch {
    return null;
  }
}

function getShareUrl(poll: Poll): string {
  const encoded = encodePoll(poll);
  return `${window.location.origin}${window.location.pathname}?poll=${encoded}`;
}

function getPollFromUrl(): Poll | null {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("poll");
  if (!encoded) return null;
  return decodePoll(encoded);
}

function clearUrlParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete("poll");
  window.history.replaceState({}, "", url.toString());
}

function loadPolls(): Poll[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function savePollsToStorage(polls: Poll[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(polls));
}

function getMyVote(pollId: string): string[] | null {
  try {
    const v = localStorage.getItem(VOTE_PREFIX + pollId);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

function saveMyVote(pollId: string, selections: string[]) {
  localStorage.setItem(VOTE_PREFIX + pollId, JSON.stringify(selections));
}

export default function App() {
  const [view, setView] = useState<View>("home");
  const [myPolls, setMyPolls] = useState<Poll[]>([]);
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [pollError, setPollError] = useState("");
  const didInit = useRef(false);

  // Init: check URL for poll, load local polls
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const polls = loadPolls();
    setMyPolls(polls);

    const urlPoll = getPollFromUrl();
    clearUrlParam();

    if (urlPoll) {
      // Merge incoming poll into local storage if not already there
      const existing = polls.find(p => p.id === urlPoll.id);
      if (!existing) {
        const updated = [urlPoll, ...polls];
        savePollsToStorage(updated);
        setMyPolls(updated);
      }
      // Use the local version if we have it (may have more votes), otherwise use URL version
      const pollToShow = existing ?? urlPoll;
      setActivePoll(pollToShow);
      setView("poll");
    }
  }, []);

  function handleCreated(poll: Poll) {
    const updated = [poll, ...myPolls];
    savePollsToStorage(updated);
    setMyPolls(updated);
    setActivePoll(poll);
    setPollError("");
    setView("poll");
  }

  function handleVote(pollId: string, selections: string[], voterName: string) {
    saveMyVote(pollId, selections);

    // Update poll in local storage with this vote
    const updated = myPolls.map(p => {
      if (p.id !== pollId) return p;
      return { ...p, votes: { ...p.votes, [voterName]: selections } };
    });

    // If poll isn't in myPolls (voter opened via link), add it
    const found = updated.find(p => p.id === pollId);
    if (!found && activePoll) {
      const withVote = { ...activePoll, votes: { ...activePoll.votes, [voterName]: selections } };
      updated.unshift(withVote);
      setActivePoll(withVote);
    } else if (found) {
      setActivePoll(found);
    }

    savePollsToStorage(updated);
    setMyPolls(updated);
  }

  function handleClose(pollId: string) {
    const updated = myPolls.map(p =>
      p.id === pollId ? { ...p, closed: true } : p
    );
    savePollsToStorage(updated);
    setMyPolls(updated);
    const closed = updated.find(p => p.id === pollId);
    if (closed) setActivePoll(closed);
  }

  function goHome() {
    setView("home");
    setActivePoll(null);
    setPollError("");
  }

  function goCreate() {
    setView("create");
    setActivePoll(null);
    setPollError("");
  }

  function selectPoll(poll: Poll) {
    setActivePoll(poll);
    setView("poll");
  }

  const navItems = (
    <div className="flex flex-col gap-1">
      <button
        onClick={goHome}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all hover:opacity-80"
        style={{
          background: view === "home" ? "var(--accent)" : "transparent",
          color: view === "home" ? "#fff" : "var(--ink)",
        }}
      >
        <span>📋</span> My Polls
      </button>
      <button
        onClick={goCreate}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all hover:opacity-80"
        style={{
          background: view === "create" ? "var(--accent)" : "transparent",
          color: view === "create" ? "#fff" : "var(--ink)",
        }}
      >
        <span>➕</span> New Poll
      </button>
      {activePoll && (
        <button
          onClick={() => setView("poll")}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all hover:opacity-80"
          style={{
            background: view === "poll" ? "var(--accent)" : "transparent",
            color: view === "poll" ? "#fff" : "var(--ink)",
          }}
        >
          <span>🗳️</span> Current Poll
        </button>
      )}
    </div>
  );

  return (
    <Shell nav={navItems} title="VotePool">
      {/* Mobile top tabs */}
      <div className="md:hidden mb-4 flex gap-2">
        <button
          onClick={goHome}
          className="flex-1 py-2 rounded-xl text-sm font-semibold text-center transition-all"
          style={{
            background: view === "home" ? "var(--accent)" : "var(--line)",
            color: view === "home" ? "#fff" : "var(--ink)",
          }}
        >
          📋 My Polls
        </button>
        <button
          onClick={goCreate}
          className="flex-1 py-2 rounded-xl text-sm font-semibold text-center transition-all"
          style={{
            background: view === "create" ? "var(--accent)" : "var(--line)",
            color: view === "create" ? "#fff" : "var(--ink)",
          }}
        >
          ➕ New Poll
        </button>
      </div>

      {pollError && (
        <div className="max-w-xl mx-auto mb-4 px-4 py-3 rounded-xl text-sm"
          style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
          ⚠️ {pollError}
        </div>
      )}

      {view === "home" && <MyPolls polls={myPolls} onSelect={selectPoll} onNew={goCreate} />}
      {view === "create" && <CreatePoll onCreated={handleCreated} username="me" />}
      {view === "poll" && activePoll && (
        <PollView
          poll={activePoll}
          myVote={getMyVote(activePoll.id)}
          onVote={handleVote}
          onClose={handleClose}
          shareUrl={getShareUrl(activePoll)}
        />
      )}
    </Shell>
  );
}
