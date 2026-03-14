"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { requireDb } from "@/lib/db";
import { useAuth } from "@/components/AuthProvider";
import { getUserProfile } from "@/lib/users";
import type { Auction, AuctionQuestion, UserProfile } from "@/types/auction";
import { formatCurrency, formatDate } from "@/lib/format";

type UserRow = UserProfile & { updated_at?: string };

export default function AdminPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "auctions">("users");
  const [userSearch, setUserSearch] = useState("");
  const [userRole, setUserRole] = useState<"all" | UserProfile["role"]>("all");
  const [userVerification, setUserVerification] = useState<"all" | UserProfile["verification_status"]>("all");
  const [userBanned, setUserBanned] = useState<"all" | "banned" | "active">("all");
  const [userNew, setUserNew] = useState<"all" | "new" | "complete">("all");
  const [auctionSearch, setAuctionSearch] = useState("");
  const [auctionStatus, setAuctionStatus] = useState<"all" | Auction["status"]>("all");
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<AuctionQuestion[]>([]);
  const [logs, setLogs] = useState<
    { id: string; action: string; target_type: string; target_id: string; created_at: string }[]
  >([]);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      if (!user) return;
      const data = await getUserProfile(user.uid);
      if (!active) return;
      setProfile(data);
    }
    loadProfile();
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!profile || profile.role !== "admin") return;
    const db = requireDb();
    const usersQuery = query(collection(db, "users"), orderBy("created_at", "desc"));
    const auctionsQuery = query(collection(db, "auctions"), orderBy("auction_end", "desc"));
    const logsQuery = query(collection(db, "admin_logs"), orderBy("created_at", "desc"), limit(20));

    const unsubUsers = onSnapshot(usersQuery, (snap) => {
      const rows = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<UserProfile, "id">)
      }));
      setUsers(rows);
    });
    const unsubAuctions = onSnapshot(auctionsQuery, (snap) => {
      const rows = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Auction, "id">)
      }));
      setAuctions(rows);
    });
    const unsubLogs = onSnapshot(logsQuery, (snap) => {
      const rows = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as {
          action: string;
          target_type: string;
          target_id: string;
          created_at: string;
        })
      }));
      setLogs(rows);
    });

    return () => {
      unsubUsers();
      unsubAuctions();
      unsubLogs();
    };
  }, [profile]);

  const isAdmin = useMemo(() => profile?.role === "admin", [profile]);

  useEffect(() => {
    if (!selectedAuctionId || !isAdmin) {
      setQuestions([]);
      return;
    }
    const db = requireDb();
    const questionsQuery = query(
      collection(db, "auctions", selectedAuctionId, "questions"),
      orderBy("created_at", "desc")
    );
    const unsubscribe = onSnapshot(questionsQuery, (snap) => {
      const rows = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<AuctionQuestion, "id">)
      }));
      setQuestions(rows);
    });
    return () => unsubscribe();
  }, [isAdmin, selectedAuctionId]);

  async function logAdminAction(action: string, targetType: string, targetId: string, details?: Record<string, unknown>) {
    if (!user) return;
    const db = requireDb();
    await addDoc(collection(db, "admin_logs"), {
      admin_id: user.uid,
      action,
      target_type: targetType,
      target_id: targetId,
      details: details ?? {},
      created_at: new Date().toISOString()
    });
  }

  async function updateUser(userId: string, payload: Partial<UserProfile>) {
    try {
      const db = requireDb();
      await updateDoc(doc(db, "users", userId), payload);
      await logAdminAction("update_user", "user", userId, payload);
      setStatus("User updated.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to update user.");
    }
  }

  async function endAuction(auctionId: string) {
    try {
      const db = requireDb();
      await updateDoc(doc(db, "auctions", auctionId), {
        status: "ended",
        auction_end: new Date().toISOString()
      });
      await logAdminAction("end_auction", "auction", auctionId);
      setStatus("Auction ended.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to end auction.");
    }
  }

  async function approveAuction(auctionId: string) {
    try {
      const db = requireDb();
      await updateDoc(doc(db, "auctions", auctionId), {
        status: "live",
        auction_start: new Date().toISOString()
      });
      await logAdminAction("approve_auction", "auction", auctionId);
      setStatus("Auction approved.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to approve auction.");
    }
  }

  async function deleteAuction(auctionId: string) {
    try {
      const db = requireDb();
      const batch = writeBatch(db);
      const bidsQuery = query(collection(db, "bids"), where("auction_id", "==", auctionId));
      const bidsSnap = await getDocs(bidsQuery);
      bidsSnap.forEach((docSnap) => batch.delete(docSnap.ref));
      batch.delete(doc(db, "auctions", auctionId));
      await batch.commit();
      await logAdminAction("delete_auction", "auction", auctionId, { bids: bidsSnap.size });
      setStatus("Auction deleted.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to delete auction.");
    }
  }

  async function answerQuestion(questionId: string, answer: string) {
    if (!selectedAuctionId) return;
    try {
      const db = requireDb();
      await updateDoc(doc(db, "auctions", selectedAuctionId, "questions", questionId), {
        answer,
        answered_at: new Date().toISOString()
      });
      await logAdminAction("answer_question", "question", questionId, { auction_id: selectedAuctionId });
      setStatus("Answer posted.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to answer question.");
    }
  }

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-12">
        <h1 className="text-3xl font-semibold text-neutral-900">Admin</h1>
        <p className="text-neutral-600">Sign in to access admin tools.</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-12">
        <h1 className="text-3xl font-semibold text-neutral-900">Admin</h1>
        <p className="text-neutral-600">You do not have access to this page.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Admin</p>
        <h1 className="text-4xl font-semibold text-neutral-900">Manage users and auctions</h1>
        <p className="text-neutral-600">Approve verification, update roles, and close auctions.</p>
      </header>

      {status && <p className="text-sm text-neutral-600">{status}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab("users")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            activeTab === "users" ? "bg-neutral-900 text-white" : "bg-white text-neutral-700"
          }`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab("auctions")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            activeTab === "auctions" ? "bg-neutral-900 text-white" : "bg-white text-neutral-700"
          }`}
        >
          Auctions
        </button>
      </div>

      {activeTab === "users" ? (
        <section className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_12px_32px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-neutral-900">Users</h2>
            <input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search name, email, id..."
              className="rounded-full border border-neutral-300 px-3 py-1 text-sm"
            />
            <select
              value={userRole}
              onChange={(event) => setUserRole(event.target.value as typeof userRole)}
              className="rounded-full border border-neutral-300 px-3 py-1 text-sm"
            >
              <option value="all">All roles</option>
              <option value="buyer">buyer</option>
              <option value="seller">seller</option>
              <option value="admin">admin</option>
            </select>
            <select
              value={userVerification}
              onChange={(event) => setUserVerification(event.target.value as typeof userVerification)}
              className="rounded-full border border-neutral-300 px-3 py-1 text-sm"
            >
              <option value="all">All verification</option>
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
            </select>
            <select
              value={userBanned}
              onChange={(event) => setUserBanned(event.target.value as typeof userBanned)}
              className="rounded-full border border-neutral-300 px-3 py-1 text-sm"
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
            </select>
            <select
              value={userNew}
              onChange={(event) => setUserNew(event.target.value as typeof userNew)}
              className="rounded-full border border-neutral-300 px-3 py-1 text-sm"
            >
              <option value="all">All onboarding</option>
              <option value="new">New users</option>
              <option value="complete">Completed</option>
            </select>
          </div>
          <div className="mt-4 grid gap-4">
            {users.length === 0 ? (
              <p className="text-sm text-neutral-500">No users found.</p>
            ) : (
              users
                .filter((item) => {
                  const queryText = userSearch.trim().toLowerCase();
                  if (queryText) {
                    const haystack = `${item.name} ${item.email} ${item.id}`.toLowerCase();
                    if (!haystack.includes(queryText)) return false;
                  }
                  if (userRole !== "all" && item.role !== userRole) return false;
                  if (userVerification !== "all" && item.verification_status !== userVerification) return false;
                  if (userBanned === "banned" && !item.banned) return false;
                  if (userBanned === "active" && item.banned) return false;
                  if (userNew === "new" && item.onboarding_complete) return false;
                  if (userNew === "complete" && !item.onboarding_complete) return false;
                  return true;
                })
                .map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700 md:grid-cols-[1.2fr_0.8fr_0.8fr_1fr_auto]"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-neutral-900">{item.name || item.full_name || "No name"}</p>
                        {!item.onboarding_complete && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500">{item.email}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-neutral-400">Role</p>
                      <select
                        value={item.role}
                        onChange={(event) =>
                          updateUser(item.id, { role: event.target.value as UserProfile["role"] })
                        }
                        className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-1 text-sm"
                      >
                        <option value="buyer">buyer</option>
                        <option value="seller">seller</option>
                        <option value="admin">admin</option>
                      </select>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-neutral-400">Verification</p>
                      <p className="mt-1 capitalize">{item.verification_status}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => updateUser(item.id, { verification_status: "approved" })}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateUser(item.id, { verification_status: "rejected" })}
                        className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => updateUser(item.id, { banned: !item.banned })}
                        className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-semibold text-neutral-700"
                      >
                        {item.banned ? "Unban" : "Ban"}
                      </button>
                    </div>
                    <div className="text-xs text-neutral-400">ID: {item.id.slice(0, 8)}…</div>
                  </div>
                ))
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_12px_32px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-neutral-900">Auctions</h2>
            <input
              value={auctionSearch}
              onChange={(event) => setAuctionSearch(event.target.value)}
              placeholder="Search pigeon, seller id..."
              className="rounded-full border border-neutral-300 px-3 py-1 text-sm"
            />
            <select
              value={auctionStatus}
              onChange={(event) => setAuctionStatus(event.target.value as typeof auctionStatus)}
              className="rounded-full border border-neutral-300 px-3 py-1 text-sm"
            >
              <option value="all">All status</option>
              <option value="pending">pending</option>
              <option value="live">live</option>
              <option value="ended">ended</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>
          <div className="mt-4 grid gap-4">
            {auctions.length === 0 ? (
              <p className="text-sm text-neutral-500">No auctions found.</p>
            ) : (
              auctions
                .filter((auction) => {
                  const queryText = auctionSearch.trim().toLowerCase();
                  if (queryText) {
                    const haystack = `${auction.pigeon_name} ${auction.description} ${auction.seller_id}`.toLowerCase();
                    if (!haystack.includes(queryText)) return false;
                  }
                  if (auctionStatus !== "all" && auction.status !== auctionStatus) return false;
                  return true;
                })
                .map((auction) => (
                  <div
                    key={auction.id}
                    className="grid gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700 md:grid-cols-[1.2fr_0.8fr_0.8fr_1fr_auto]"
                  >
                    <div>
                      <p className="font-semibold text-neutral-900">{auction.pigeon_name}</p>
                      <p className="text-xs text-neutral-500">{auction.description}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-neutral-400">Status</p>
                      <p className="mt-1 capitalize">{auction.status}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-neutral-400">Price</p>
                      <p className="mt-1">{formatCurrency(auction.current_price)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-neutral-400">Ends</p>
                      <p className="mt-1">{formatDate(auction.auction_end)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {auction.status === "pending" ? (
                        <button
                          onClick={() => approveAuction(auction.id)}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                        >
                          Approve
                        </button>
                      ) : (
                        <button
                          onClick={() => endAuction(auction.id)}
                          className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-700"
                        >
                          End now
                        </button>
                      )}
                      <button
                        onClick={() => deleteAuction(auction.id)}
                        className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setSelectedAuctionId(auction.id)}
                        className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-semibold text-neutral-700"
                      >
                        Q&A
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
          {selectedAuctionId && (
            <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-neutral-900">Questions</h3>
                <button
                  onClick={() => setSelectedAuctionId(null)}
                  className="text-xs font-semibold text-neutral-500"
                >
                  Close
                </button>
              </div>
              <div className="mt-4 grid gap-3">
                {questions.length === 0 ? (
                  <p className="text-sm text-neutral-500">No questions yet.</p>
                ) : (
                  questions.map((question) => (
                    <div key={question.id} className="rounded-xl border border-neutral-200 p-3 text-sm">
                      <p className="font-medium text-neutral-900">{question.question}</p>
                      {question.answer ? (
                        <p className="mt-2 text-emerald-700">Answer: {question.answer}</p>
                      ) : (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            placeholder="Write an answer..."
                            className="flex-1 rounded-lg border border-neutral-300 px-3 py-1 text-sm"
                            onBlur={(event) => {
                              const value = event.target.value.trim();
                              if (value.length < 2) return;
                              answerQuestion(question.id, value);
                              event.target.value = "";
                            }}
                          />
                          <span className="text-xs text-neutral-400">Press out of field to save</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_12px_32px_rgba(15,23,42,0.08)] backdrop-blur">
        <h2 className="text-lg font-semibold text-neutral-900">Recent admin activity</h2>
        <div className="mt-4 grid gap-2 text-sm text-neutral-600">
          {logs.length === 0 ? (
            <p>No audit entries yet.</p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2"
              >
                <span className="font-semibold text-neutral-900">{log.action}</span>
                <span className="text-xs text-neutral-500">
                  {log.target_type}:{log.target_id.slice(0, 8)}…
                </span>
                <span className="text-xs text-neutral-400">{formatDate(log.created_at)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
