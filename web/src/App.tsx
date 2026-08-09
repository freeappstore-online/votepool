import { useState, useEffect, useCallback, useRef } from "react";
import { initApp } from "@freeappstore/sdk";
import { useAuth } from "@freeappstore/sdk/hooks";
import { Shell } from "./components/Shell";
import { CreatePoll } from "./components/CreatePoll";
import { PollView } from "./components/PollView";
import { MyPolls } from "./components/MyPolls";
import type { Poll } from "./types";

const fas = initApp({ appId: "votepool" });

type View = "home" | "create" | "poll";

function getShareUrl(pollId: string): string {
  return `${window.location.origin}${window.location.pathname}?poll=${pollId}`;
}

function getPollIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("poll");
}

function setUrlPoll(pollId: string | null) {
  const url = new URL(window.location.href);
  if (pollId) {
    url.searchParams.set("poll", pollId);
  } else {
    url.searchParams.delete("poll");
  }
  window.history.replaceState({}, "", url.toString());
}

function getUserId(user: Record<string, unknown>): string {
  return (
    (user.username as string) ||
    (user.login as string) ||
    (user.name as string) ||
    (user.email as string) ||
    String(user.id ?? "anonymous")
  );
}

export default function App() {
  const { user, loading: authLoading } = useAuth(fas);
  const [view, setView] = useState<View>("home");
  const [myPolls, setMyPolls] = useState<Poll[]>([]);
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [loadingPoll, setLoadingPoll] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [pollError, setPollError] = useState("");
  const initialPollId = useRef(getPollIdFromUrl()); // capture once on mount
  const didInit = useRef(false);

  const userId = user ? getUserId(user as Record<string, unknown>) : "";

  const loadPoll = useCallback(async (pollId: string): Promise<Poll | null> => {
    try {
      const poll = await fas.kv.get<Poll>(`poll:${pollId}`);
      return poll ?? null;
    } catch {
      return null;
    }
  }, []);

  const loadMyPolls = useCallback(async () => {
    if (!user) return;
    try {
      const keys = await fas.kv.list({ prefix: "poll:" });
      const polls: Poll[] = [];
      for (const key of keys) {
        const p = await fas.kv.get<Poll>(key);
        if (p && p.createdBy === getUserId(user as Record<string, unknown>)) polls.push(p);
      }
      polls.sort((a, b) => b.createdAt - a.createdAt);
      setMyPolls(polls);
    } catch {
      // ignore
    }
  }, [user]);

  // One-time init after auth resolves
  useEffect(() => {
    if (authLoading || !user || didInit.current) return;
    didInit.current = true;

    const pollId = initialPollId.current;
    // Always clean the URL param now
    setUrlPoll(null);

    if (pollId) {
      setLoadingPoll(true);
      loadPoll(pollId).then(poll => {
        setLoadingPoll(false);
        if (poll) {
          setActivePoll(poll);
          setIsOwner(poll.createdBy === getUserId(user as Record<string, unknown>));
          setUrlPoll(poll.id);
          setView("poll");
        } else {
          setPollError("This poll link has expired or no longer exists. Create a new poll below.");
        }
        loadMyPolls();
      });
    } else {
      loadMyPolls();
    }
  }, [authLoading, user, loadPoll, loadMyPolls]);

  async function handleCreated(poll: Poll) {
    if (!user) return;
    await fas.kv.set(`poll:${poll.id}`, poll);
    setMyPolls(prev => [poll, ...prev]);
    setActivePoll(poll);
    setIsOwner(true);
    setUrlPoll(poll.id);
    setPollError("");
    setView("poll");
  }

  async function handleVote(pollId: string, selections: string[]) {
    if (!user) return;
    const poll = await loadPoll(pollId);
    if (!poll || poll.closed) return;
    poll.votes[userId] = selections;
    await fas.kv.set(`poll:${pollId}`, poll);
    setActivePoll({ ...poll });
  }

  async function handleClose(pollId: string) {
    if (!user) return;
    const poll = await loadPoll(pollId);
    if (!poll) return;
    poll.closed = true;
    await fas.kv.set(`poll:${pollId}`, poll);
    setActivePoll({ ...poll });
    await loadMyPolls();
  }

  async function handleRefresh(pollId: string): Promise<Poll | null> {
    const poll = await loadPoll(pollId);
    if (poll) setActivePoll({ ...poll });
    return poll;
  }

  function goHome() {
    setView("home");
    setActivePoll(null);
    setPollError("");
    setUrlPoll(null);
  }

  function goCreate() {
    setView("create");
    setActivePoll(null);
    setPollError("");
    setUrlPoll(null);
  }

  function selectPoll(poll: Poll) {
    setActivePoll(poll);
    setIsOwner(poll.createdBy === userId);
    setUrlPoll(poll.id);
    setView("poll");
  }

  const navItems = user ? (
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
      <div className="mt-4 px-3 py-2 rounded-xl text-xs" style={{ background: "var(--line)", color: "var(--muted)" }}>
        Signed in as{" "}
        <span className="font-semibold" style={{ color: "var(--ink)" }}>
          @{userId}
        </span>
      </div>
    </div>
  ) : null;

  if (authLoading || loadingPoll) {
    return (
      <Shell nav={navItems} title="VotePool">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-pulse">🗳️</div>
            <p style={{ color: "var(--muted)" }}>
              {loadingPoll ? "Loading poll…" : "Loading…"}
            </p>
          </div>
        </div>
      </Shell>
    );
  }

  if (!user) {
    const pollId = getPollIdFromUrl();
    return (
      <Shell title="VotePool">
        <div className="max-w-md mx-auto text-center py-16">
          <div className="text-6xl mb-6">🗳️</div>
          <h1 className="text-4xl font-bold mb-3" style={{ fontFamily: "Fraunces, serif" }}>
            VotePool
          </h1>
          {pollId ? (
            <>
              <div
                className="mb-6 px-5 py-4 rounded-2xl text-left"
                style={{ background: "var(--panel)", border: "2px solid var(--accent)" }}
              >
                <p className="font-bold mb-1">📩 You've been invited to vote!</p>
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  Sign in with GitHub to see the poll and cast your vote. It's free and takes one tap.
                </p>
              </div>
              <button
                onClick={() => fas.auth.signIn()}
                className="w-full py-4 rounded-xl font-bold text-lg transition-opacity hover:opacity-90 mb-3"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                Sign in to Vote →
              </button>
            </>
          ) : (
            <>
              <p className="text-lg mb-8" style={{ color: "var(--muted)" }}>
                Create polls, share a unique link, and see who wins — in real time.
              </p>
              <div className="flex flex-col gap-3 text-sm mb-8 text-left">
                {[
                  "Create a poll with your question & options",
                  "Share the unique link with anyone",
                  "Watch votes come in live",
                  "Close the poll to reveal the winner",
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: "var(--accent)", color: "#fff" }}
                    >
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => fas.auth.signIn()}
                className="w-full py-4 rounded-xl font-bold text-lg transition-opacity hover:opacity-90 mb-3"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                Sign in with GitHub to Get Started
              </button>
            </>
          )}
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Free · No ads · No tracking
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell nav={navItems} title="VotePool">
      <div className="md:hidden mb-4">
        <div className="flex gap-2">
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
      </div>

      {/* Only show poll error if we actually tried to load a poll from a link */}
      {pollError && view === "home" && (
        <div className="max-w-xl mx-auto mb-6 px-5 py-4 rounded-2xl text-sm"
          style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
          <p className="font-semibold mb-1">🔗 Poll link expired</p>
          <p style={{ color: "var(--muted)" }}>{pollError}</p>
          <button
            onClick={goCreate}
            className="mt-3 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            ➕ Create a New Poll
          </button>
        </div>
      )}

      {view === "home" && <MyPolls polls={myPolls} onSelect={selectPoll} onNew={goCreate} />}
      {view === "create" && <CreatePoll onCreated={handleCreated} username={userId} />}
      {view === "poll" && activePoll && (
        <PollView
          poll={activePoll}
          currentUser={userId}
          isOwner={isOwner}
          onVote={handleVote}
          onClose={handleClose}
          onRefresh={handleRefresh}
          shareUrl={getShareUrl(activePoll.id)}
        />
      )}
    </Shell>
  );
}
