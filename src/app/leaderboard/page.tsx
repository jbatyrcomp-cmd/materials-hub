"use client";

import React, { useEffect, useState } from "react";
import { Medal, Trophy } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { formatDuration } from "@/lib/utils";

interface Subject {
  id: string;
  nameUz: string;
  nameTk: string;
}

interface RankRow {
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
  testsTaken: number;
  totalScore: number;
  totalMaxScore: number;
  accuracyPercent: number;
  totalDurationSeconds: number;
}

export default function LeaderboardPage() {
  const { user, lang, t } = useApp();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [rankings, setRankings] = useState<RankRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((d) => setSubjects(d.subjects ?? []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const sp = subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : "";
    fetch(`/api/leaderboard${sp}`)
      .then((r) => r.json())
      .then((d) => setRankings(d.rankings ?? []))
      .finally(() => setLoading(false));
  }, [subjectId]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            {t.leaderboard.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t.leaderboard.subtitle}
          </p>
        </div>

        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="px-3 py-2 rounded-xl border bg-card text-sm"
        >
          <option value="">{t.common.all}</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {lang === "tk" ? s.nameTk : s.nameUz}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="h-48 rounded-2xl bg-muted animate-pulse" />
      ) : rankings.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center space-y-2">
          <Medal className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t.leaderboard.empty}</p>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                <th className="py-3 px-4 text-left">{t.leaderboard.rank}</th>
                <th className="py-3 px-4 text-left">{t.leaderboard.student}</th>
                <th className="py-3 px-4 text-right">
                  {t.leaderboard.testsTaken}
                </th>
                <th className="py-3 px-4 text-right">
                  {t.leaderboard.totalScore}
                </th>
                <th className="py-3 px-4 text-right">
                  {t.leaderboard.accuracy}
                </th>
                <th className="py-3 px-4 text-right">
                  {t.leaderboard.totalTime}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rankings.map((row, idx) => {
                const medal =
                  idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;
                const isMe = row.user.id === user?.id;
                return (
                  <tr
                    key={row.user.id}
                    className={isMe ? "bg-primary/5 font-medium" : undefined}
                  >
                    <td className="py-3 px-4 font-bold">{medal}</td>
                    <td className="py-3 px-4">
                      <span>
                        {row.user.firstName} {row.user.lastName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">{row.testsTaken}</td>
                    <td className="py-3 px-4 text-right font-bold text-primary">
                      {row.totalScore} / {row.totalMaxScore}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {row.accuracyPercent}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-muted-foreground">
                      {formatDuration(row.totalDurationSeconds)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

