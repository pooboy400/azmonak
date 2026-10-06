// ============================================================
// آزمونک — Sample data seeder (deterministic, PRNG seed 1405)
// What it creates (all rows isSample=true, ids prefixed "smp"):
//   12 subjects (6 with content, 6 catalog-only) + 22 topics + 60 questions
//   26 users (24 students + 2 teachers) with identity (phones 09990000xxx)
//   2 classes + 31 friendships + 10 misconception nodes (M01–M10, D16-parked)
//   ~5.5 weeks of simulated placement/practice sessions with attempts
//   driven by Elo + D13 weighted score + D14 confidence + D16 level ladder
//   + SM-2 review schedules (some overdue → "مرور امروز" banner has data)
// Run:      bun prisma/seed.ts   (or: bun run db:seed-sample)
// Remove:   bun run db:clean-sample   (or re-seed: idempotent, cleans first)
// ============================================================

import { PrismaClient, Prisma } from "@prisma/client";
import { existsSync } from "node:fs";
import { SUBJECTS, type Diff } from "./seed-data-catalog";
import { USERS, CLASSES, FRIENDSHIPS, MISCONCEPTIONS, samplePhone } from "./seed-data-people";
import { cleanSampleData } from "./sample-cleanup";

// ---------- deterministic PRNG ----------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(1405);
const rand = (min: number, max: number) => min + rng() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

// ---------- constants from plan v1.3 ----------
const NOW = Date.now();
const DAY = 86_400_000;
const MIN = 60_000;

const TIER_RATING: Record<Diff, number> = { EASY: 1150, MEDIUM: 1250, HARD: 1350 };
const TIER_SKILL: Record<Diff, number> = { EASY: 0.4, MEDIUM: 0.58, HARD: 0.74 };
const WEIGHT: Record<Diff, number> = { EASY: 1, MEDIUM: 1.5, HARD: 2 };
const EST_TIME: Record<Diff, number> = { EASY: 60, MEDIUM: 90, HARD: 120 };
const DIFF_BY_LEVEL = ["EASY", "MEDIUM", "HARD"] as const;
const LETTERS = ["A", "B", "C", "D"] as const;

const kStudent = (answered: number) => (answered < 50 ? 32 : answered < 150 ? 24 : 16); // plan K schedule
const kQuestion = (count: number) => (count < 40 ? 8 : 4);
const expected = (rs: number, rq: number) => 1 / (1 + Math.pow(10, (rq - rs) / 400));

/** subjects each student cohort actually takes (subjects that have questions) */
function subjectsFor(grade: string | null, major: string | null): string[] {
  if (grade === "GRADE11" && major === "EXPERIMENTAL") return ["FAR11T", "MAT11T", "PHY11T", "BIO11T"];
  if (grade === "GRADE10" && major === "EXPERIMENTAL") return ["FAR10T"];
  if (grade === "GRADE11" && major === "MATH") return ["CAL11M"];
  return [];
}

// ---------- global sim state ----------
interface QState {
  id: string; // question.id (DB)
  rating: number; // Elo rating of the question (drifts during sim)
  count: number; // ratingCount (drives K_q schedule)
  correctLetter: "A" | "B" | "C" | "D";
}
const qState = new Map<string, QState>();
let sessionSeq = 0;
let attemptSeq = 0;
const nextSessionId = () => `smpsess${String(++sessionSeq).padStart(6, "0")}`;
const nextAttemptId = () => `smpatt${String(++attemptSeq).padStart(6, "0")}`;

interface TopicState {
  topicId: string;
  level: number; // D16 ladder 1–3
  wrongStreak: number;
  rightStreak: number;
  weakness: number;
  answered: number;
  review: { ef: number; interval: number; rep: number; last: number | null };
}
interface TopicRow {
  topicId: string;
  title: string;
  questions: Map<Diff, string[]>; // diff -> question.id pool
}

const sessionRows: Prisma.SessionCreateManyInput[] = [];
const attemptRows: Prisma.AttemptCreateManyInput[] = [];

// ---------- content selection ----------
function pickTopic(topics: TopicState[]): TopicState {
  // weaker topics get priority (plan 1.2 — educational value weight)
  const weights = topics.map((t) => 5 - t.level + rng() * 2);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < topics.length; i++) {
    r -= weights[i];
    if (r <= 0) return topics[i];
  }
  return topics[topics.length - 1];
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Question selection with preference order: preferred topic → other topics,
 * each at its own level. 1st pass respects exposure window + in-session
 * uniqueness; fallback (small sample bank) only respects in-session
 * uniqueness. Returns the topic actually used so the D16 ladder updates it.
 */
function selectQuestion(
  topicStates: TopicState[],
  preferred: TopicState | null,
  catalog: TopicRow[],
  seen: string[],
  sessionPicks: Set<string>
): { qid: string; diff: Diff; topic: TopicState } | null {
  const rest = preferred ? topicStates.filter((t) => t !== preferred) : topicStates;
  const ordered = preferred ? [preferred, ...shuffled(rest)] : shuffled(topicStates);
  for (const ts of ordered) {
    const row = catalog.find((r) => r.topicId === ts.topicId)!;
    const want = DIFF_BY_LEVEL[ts.level - 1];
    for (const diff of [want, ...DIFF_BY_LEVEL.filter((d) => d !== want)]) {
      const pool = (row.questions.get(diff) ?? []).filter((qid) => !seen.includes(qid) && !sessionPicks.has(qid));
      if (pool.length > 0) return { qid: pick(pool), diff, topic: ts };
    }
  }
  for (const ts of ordered) {
    const row = catalog.find((r) => r.topicId === ts.topicId)!;
    for (const diff of DIFF_BY_LEVEL) {
      const pool = (row.questions.get(diff) ?? []).filter((qid) => !sessionPicks.has(qid));
      if (pool.length > 0) return { qid: pick(pool), diff, topic: ts };
    }
  }
  return null;
}

// ---------- one attempt ----------
interface WalkCtx {
  userId: string;
  subjectRating: number;
  answered: number; // per student-subject
  seen: string[]; // exposure window (G8) — capped at windowW below
  sessionPicks: Set<string>; // in-session uniqueness
  windowW: number; // effective exposure window (sample banks are smaller than the real 150-question bank)
  promoted: Set<string>; // max one promotion per session per topic (D16)
}

function simulateAttempt(
  ctx: WalkCtx,
  qid: string,
  diff: Diff,
  skill: number,
  topic: TopicState | null,
  time: number,
  sessionId: string,
  order: number
): { correct: boolean; weight: number; latency: number; endTime: number } {
  const q = qState.get(qid)!;
  const pCorrect = clamp(0.62 + 2.0 * (skill - TIER_SKILL[diff]), 0.1, 0.9);
  const correct = rng() < pCorrect;

  // D14: confidence self-report
  const confidence = correct
    ? rng() < 0.78
      ? "CONFIDENT"
      : "GUESSED"
    : rng() < 0.35
      ? "CONFIDENT"
      : "GUESSED";

  // latency shaped by correctness/confidence (t_fast=15s, t_slow=70s — D10)
  let latency: number;
  if (correct && confidence === "CONFIDENT") latency = rand(8, 28);
  else if (correct) latency = rand(18, 50);
  else if (confidence === "CONFIDENT") latency = rand(25, 60);
  else latency = rand(30, 85);
  latency = round1(latency);

  const selected = correct
    ? q.correctLetter
    : pick(LETTERS.filter((l) => l !== q.correctLetter));
  const weight = WEIGHT[diff];

  // Elo (two-sided, plan K schedule)
  const rBefore = ctx.subjectRating;
  const E = expected(rBefore, q.rating);
  const ks = kStudent(ctx.answered);
  const kq = kQuestion(q.count);
  const rAfter = correct ? rBefore + ks * (1 - E) : rBefore - ks * E;
  ctx.subjectRating = rAfter;
  q.rating = correct ? q.rating + kq * (E - 1) : q.rating + kq * (1 - E);
  q.count += 1;
  ctx.answered += 1;
  ctx.seen.push(qid);
  ctx.sessionPicks.add(qid);
  if (ctx.seen.length > ctx.windowW) ctx.seen.shift();

  // D16 level ladder
  if (topic) {
    topic.answered += 1;
    if (correct) {
      topic.rightStreak += 1;
      topic.wrongStreak = 0;
      if (topic.rightStreak >= 2 && !ctx.promoted.has(topic.topicId)) {
        topic.level = Math.min(3, topic.level + 1);
        topic.rightStreak = 0;
        ctx.promoted.add(topic.topicId);
      }
    } else {
      topic.wrongStreak += 1;
      topic.rightStreak = 0;
      if (topic.wrongStreak >= 2) {
        if (topic.level > 1) topic.level -= 1;
        else topic.weakness += 1; // at floor — weakness counter (study-alert input)
        topic.wrongStreak = 0;
      }
    }
  }

  attemptRows.push({
    id: nextAttemptId(),
    sessionId,
    userId: ctx.userId,
    questionId: q.id,
    orderInSession: order,
    selected,
    isCorrect: correct,
    confidence,
    latencySec: latency,
    weight,
    rBefore: Math.round(rBefore * 10) / 10,
    rAfter: Math.round(rAfter * 10) / 10,
    paramsSnapshot: JSON.stringify({ Ks: ks, Kq: kq, zone: "0.65-0.75", exposure: 20, ver: "plan-v1.3" }),
    isSample: true,
    createdAt: new Date(time),
  });

  // SM-2 quality (correct, confidence, latency) + state update
  if (topic) {
    const quality = correct
      ? confidence === "CONFIDENT"
        ? latency <= 15
          ? 5
          : 4
        : 3
      : confidence === "CONFIDENT"
        ? 2
        : 1;
    const rv = topic.review;
    if (quality >= 3) {
      rv.rep += 1;
      rv.interval = rv.rep === 1 ? 1 : rv.rep === 2 ? 6 : Math.ceil(rv.interval * rv.ef);
    } else {
      rv.rep = 0;
      rv.interval = 1;
    }
    rv.ef = Math.max(1.3, rv.ef + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    rv.last = time;
  }

  return { correct, weight, latency, endTime: time + (latency + rand(2, 7)) * 1000 };
}

// ---------- main ----------
async function main() {
  const db = new PrismaClient();
  try {
    console.log("🧹 cleaning previous sample data (idempotent re-seed)…");
    await cleanSampleData(db);

    // ===== 1. subjects + topics + questions =====
    console.log("📚 inserting subjects, topics, questions…");
    const subjectIds = new Map<string, string>();
    const topicIds = new Map<string, string>(); // key: code::title
    let qCounter = 0;
    for (const s of SUBJECTS) {
      const sid = `smpsub-${s.code}`;
      subjectIds.set(s.code, sid);
      await db.subject.create({
        data: {
          id: sid,
          code: s.code,
          title: s.title,
          grade: s.grade,
          major: s.major,
          iconKey: s.icon,
          colorKey: s.color,
          isActive: s.active,
          isSample: true,
        },
      });
      for (let i = 0; i < s.topics.length; i++) {
        const tid = `smptop-${s.code}-${i + 1}`;
        topicIds.set(`${s.code}::${s.topics[i]}`, tid);
        await db.topic.create({
          data: { id: tid, subjectId: sid, title: s.topics[i], order: i + 1, isSample: true },
        });
      }
      let n = 0;
      for (const q of s.questions) {
        n += 1;
        qCounter += 1;
        const id = `smpq-${s.code}-${String(n).padStart(2, "0")}`;
        qState.set(id, {
          id,
          rating: TIER_RATING[q.diff],
          count: 0,
          correctLetter: q.correct,
        });
        await db.question.create({
          data: {
            id,
            qid: `SMP-${s.code}-${String(n).padStart(2, "0")}`,
            subjectId: sid,
            topicId: topicIds.get(`${s.code}::${q.topic}`) ?? null,
            status: "APPROVED",
            author: "دادهٔ نمونهٔ آزمونک",
            difficulty: q.diff,
            stem: q.stem,
            optionA: q.opts[0],
            optionB: q.opts[1],
            optionC: q.opts[2],
            optionD: q.opts[3],
            correct: q.correct,
            distractorMap: "-",
            explanation: q.expl,
            estTimeSec: EST_TIME[q.diff],
            license: "CC BY-NC 4.0",
            notes: "سؤال نمونهٔ توسعه — با db:clean-sample حذف می‌شود",
            rating: TIER_RATING[q.diff],
            ratingCount: 0,
            isSample: true,
            createdAt: new Date(NOW - randInt(35, 42) * DAY),
          },
        });
      }
    }

    // ===== 2. users + identity =====
    console.log("👥 inserting users…");
    if (!existsSync(process.cwd() + "/public/avatars/sample")) {
      console.log("⚠️  پوشه public/avatars/sample/ نیست — عکس‌های نمونه را با scripts/download-sample-avatars.sh دانلود کن (وگرنه آواتارها ۴۰۴ می‌شوند و UI باید placeholder نشان دهد).");
    }
    for (let i = 0; i < USERS.length; i++) {
      const u = USERS[i];
      const createdAt = new Date(NOW - randInt(48, 54) * DAY);
      await db.user.create({
        data: {
          id: u.id,
          role: u.role,
          nickname: u.nickname,
          avatarUrl: u.avatarUrl,
          grade: u.grade,
          major: u.major,
          privacy: u.privacy,
          isSample: true,
          createdAt,
        },
      });
      await db.identity.create({
        data: {
          userId: u.id,
          phone: samplePhone(i + 1),
          isActive: true,
          verifiedAt: new Date(createdAt.getTime() + 2 * MIN),
          isSample: true,
          createdAt,
        },
      });
    }

    // ===== 3. classes + friendships + misconceptions =====
    console.log("🏫 inserting classes, friendships, misconceptions…");
    for (const c of CLASSES) {
      await db.classRoom.create({
        data: {
          id: c.id,
          name: c.name,
          code: c.code,
          teacherId: c.teacherId,
          grade: c.grade,
          major: c.major,
          isSample: true,
          createdAt: new Date(NOW - 40 * DAY),
        },
      });
      await db.classMember.createMany({
        data: c.memberIds.map((sid) => ({
          classId: c.id,
          studentId: sid,
          isSample: true,
          joinedAt: new Date(NOW - randInt(37, 39) * DAY),
        })),
      });
    }
    for (const [req, addr, accepted] of FRIENDSHIPS) {
      await db.friendship.create({
        data: {
          requesterId: req,
          addresseeId: addr,
          status: accepted ? "ACCEPTED" : "PENDING",
          respondedAt: accepted ? new Date(NOW - randInt(5, 20) * DAY) : null,
          isSample: true,
          createdAt: new Date(NOW - randInt(10, 30) * DAY),
        },
      });
    }
    for (const m of MISCONCEPTIONS) {
      await db.misconception.create({ data: { ...m, isSample: true, createdAt: new Date(NOW - 41 * DAY) } });
    }

    // ===== 4. simulate history =====
    console.log("🧪 simulating ~5.5 weeks of sessions…");
    // catalog per subject code
    const catalogs = new Map<string, TopicRow[]>();
    for (const s of SUBJECTS) {
      const rows: TopicRow[] = s.topics.map((title, i) => ({
        topicId: topicIds.get(`${s.code}::${title}`)!,
        title,
        questions: new Map<Diff, string[]>([
          ["EASY", []],
          ["MEDIUM", []],
          ["HARD", []],
        ]),
      }));
      catalogs.set(s.code, rows);
    }
    // fill question pools
    for (const s of SUBJECTS) {
      let idx = 0;
      for (const q of s.questions) {
        idx += 1;
        const id = `smpq-${s.code}-${String(idx).padStart(2, "0")}`;
        const tid = topicIds.get(`${s.code}::${q.topic}`)!;
        const row = catalogs.get(s.code)!.find((r) => r.topicId === tid)!;
        row.questions.get(q.diff)!.push(id);
      }
      void qCounter;
    }

    const dayTime = (daysBack: number) => {
      const dt = new Date(NOW - daysBack * DAY);
      dt.setHours(randInt(15, 21), randInt(0, 59), 0, 0);
      if (dt.getTime() > NOW) return NOW - rand(0.2, 2) * 3_600_000;
      return dt.getTime();
    };

    const subjectAbilityRows: Prisma.SubjectAbilityCreateManyInput[] = [];
    const topicAbilityRows: Prisma.TopicAbilityCreateManyInput[] = [];
    const reviewRows: Prisma.ReviewScheduleCreateManyInput[] = [];

    interface Slot {
      placement: boolean;
      time: number;
      abandoned: boolean;
    }

    for (const u of USERS) {
      if (u.role !== "STUDENT") continue;
      for (const code of subjectsFor(u.grade, u.major)) {
        const subjectId = subjectIds.get(code)!;
        const catalog = catalogs.get(code)!;
        const topicStates: TopicState[] = catalog.map((r) => ({
          topicId: r.topicId,
          level: rng() < 0.5 ? 2 : 1,
          wrongStreak: 0,
          rightStreak: 0,
          weakness: 0,
          answered: 0,
          review: { ef: 2.5, interval: 0, rep: 0, last: null },
        }));
        const ctx: WalkCtx = {
          userId: u.id,
          subjectRating: 1100,
          answered: 0,
          seen: [],
          sessionPicks: new Set(),
          windowW: Math.min(20, Math.max(6, catalog.reduce((n, r) => n + [...r.questions.values()].flat().length, 0) - 4)),
          promoted: new Set(),
        };

        // --- schedule: placement first, then weekly practice over 5 weeks + busy current week ---
        const slots: Slot[] = [{ placement: true, time: dayTime(rand(41, 45)), abandoned: false }];
        for (let w = 1; w <= 5; w++) {
          if (rng() < 0.25) continue; // some weeks skipped entirely
          const count = 1 + (rng() < 0.5 ? 1 : 0) + (rng() < 0.12 ? 1 : 0);
          for (let c = 0; c < count; c++) {
            const daysBack = (6 - w) * 7 + rand(0, 6.5);
            slots.push({ placement: false, time: dayTime(daysBack), abandoned: rng() < 0.05 });
          }
        }
        if (rng() < 0.95) slots.push({ placement: false, time: dayTime(rand(0.2, 4)), abandoned: rng() < 0.08 });
        if (rng() < 0.55) slots.push({ placement: false, time: dayTime(rand(0.1, 2.5)), abandoned: rng() < 0.1 });
        if (rng() < 0.25) slots.push({ placement: false, time: dayTime(rand(0.05, 1)), abandoned: false });
        slots.sort((a, b) => a.time - b.time);

        for (const slot of slots) {
          const sessionId = nextSessionId();
          const count = slot.placement ? 4 : 10;
          // abandoned sessions stop mid-way (student quit)
          const stopAt = slot.abandoned && !slot.placement ? randInt(3, 7) : count;
          ctx.promoted = new Set();
          ctx.sessionPicks = new Set();
          const rStart = ctx.subjectRating;
          let scoreW = 0;
          let scoreSum = 0;
          let correctCount = 0;
          let attemptsMade = 0;
          let t = slot.time;

          for (let k = 1; k <= stopAt; k++) {
            let qid: string | null = null;
            let diff: Diff = "MEDIUM";
            let topic: TopicState | null = null;
            if (slot.placement) {
              // spread difficulty across tiers (D1: پراکنده ۱۱۵۰–۱۳۵۰), topics in random order
              const want = DIFF_BY_LEVEL[(k - 1) % 3];
              const shuffled = [...topicStates].sort(() => rng() - 0.5);
              outer: for (const ts of shuffled) {
                const row = catalog.find((r) => r.topicId === ts.topicId)!;
                for (const d of [want, ...DIFF_BY_LEVEL]) {
                  const pool = (row.questions.get(d) ?? []).filter(
                    (cand) => !ctx.seen.includes(cand) && !ctx.sessionPicks.has(cand)
                  );
                  if (pool.length > 0) {
                    qid = pick(pool);
                    diff = d;
                    topic = ts;
                    break outer;
                  }
                }
              }
              if (!qid) break;
            } else {
              const preferred = pickTopic(topicStates);
              const chosen = selectQuestion(topicStates, preferred, catalog, ctx.seen, ctx.sessionPicks);
              if (!chosen) break;
              qid = chosen.qid;
              diff = chosen.diff;
              topic = chosen.topic;
            }
            const res = simulateAttempt(ctx, qid, diff, u.skill, topic, t, sessionId, k);
            attemptsMade += 1;
            if (res.correct) correctCount += 1;
            scoreW += res.weight;
            scoreSum += res.weight * (res.correct ? 1 : 0);
            t = res.endTime;
            if (t > NOW) break; // never leak into the future
          }
          if (attemptsMade === 0) continue; // no orphan sessions
          const completed = !slot.abandoned && attemptsMade === count && t <= NOW;
          sessionRows.push({
            id: sessionId,
            userId: u.id,
            subjectId,
            type: slot.placement ? "PLACEMENT" : "PRACTICE",
            status: completed ? "COMPLETED" : "ABANDONED",
            questionCount: count,
            correctCount,
            score: completed && scoreW > 0 ? round1((scoreSum / scoreW) * 100) : null,
            rStart: Math.round(rStart),
            rEnd: completed ? Math.round(ctx.subjectRating) : null,
            startedAt: new Date(slot.time),
            finishedAt: completed ? new Date(Math.min(t, NOW)) : null,
            lastActivityAt: new Date(Math.min(t, NOW)),
            isSample: true,
            createdAt: new Date(slot.time),
          });
        }

        // --- final ability + review rows ---
        subjectAbilityRows.push({
          userId: u.id,
          subjectId,
          rating: Math.round(ctx.subjectRating),
          answeredCount: ctx.answered,
          isSample: true,
        });
        for (const ts of topicStates) {
          if (ts.answered === 0) continue;
          topicAbilityRows.push({
            userId: u.id,
            subjectId,
            topicId: ts.topicId,
            level: ts.level,
            wrongStreak: ts.wrongStreak,
            rightStreak: ts.rightStreak,
            weaknessCount: ts.weakness,
            answeredCount: ts.answered,
            isSample: true,
          });
          const last = ts.review.last;
          const due = last !== null ? last + Math.max(1, ts.review.interval) * DAY : NOW - randInt(1, 3) * DAY;
          reviewRows.push({
            userId: u.id,
            subjectId,
            topicId: ts.topicId,
            ef: round1(ts.review.ef * 100) / 100,
            intervalDays: Math.max(1, ts.review.interval),
            repetitions: ts.review.rep,
            dueAt: new Date(Math.min(due, NOW + randInt(0, 2) * DAY)),
            lastReviewedAt: last ? new Date(last) : null,
            isSample: true,
          });
        }
      }
    }

    // ===== 5. two in-progress sessions (resume + live UI demo) =====
    console.log("⏳ creating in-progress sessions…");
    const inProgress: Array<{ userId: string; code: string; minutesAgo: number; attempts: number }> = [
      { userId: "smpu01", code: "PHY11T", minutesAgo: 180, attempts: 5 },
      { userId: "smpu05", code: "BIO11T", minutesAgo: 90, attempts: 4 },
    ];
    for (const ip of inProgress) {
      const subjectId = subjectIds.get(ip.code)!;
      const u = USERS.find((x) => x.id === ip.userId)!;
      const catalog = catalogs.get(ip.code)!;
      const sessionId = nextSessionId();
      const topicStates: TopicState[] = catalog.map((r) => ({
        topicId: r.topicId,
        level: 2,
        wrongStreak: 0,
        rightStreak: 0,
        weakness: 0,
        answered: 0,
        review: { ef: 2.5, interval: 0, rep: 0, last: null },
      }));
      const ctx: WalkCtx = {
        userId: u.id,
        subjectRating: 1100,
        answered: 0,
        seen: [],
        sessionPicks: new Set(),
        windowW: Math.min(20, Math.max(6, catalog.reduce((n, r) => n + [...r.questions.values()].flat().length, 0) - 4)),
        promoted: new Set(),
      };
      const start = NOW - ip.minutesAgo * MIN;
      let t = start;
      let correctCount = 0;
      for (let k = 1; k <= ip.attempts; k++) {
        const ts = pickTopic(topicStates);
        const chosen = selectQuestion(topicStates, ts, catalog, ctx.seen, ctx.sessionPicks);
        if (!chosen) break;
        const res = simulateAttempt(ctx, chosen.qid, chosen.diff, u.skill, chosen.topic, t, sessionId, k);
        if (res.correct) correctCount += 1;
        t = res.endTime;
      }
      sessionRows.push({
        id: sessionId,
        userId: u.id,
        subjectId,
        type: "PRACTICE",
        status: "ACTIVE",
        questionCount: 10,
        correctCount,
        score: null,
        rStart: 1100,
        rEnd: null,
        startedAt: new Date(start),
        finishedAt: null,
        lastActivityAt: new Date(Math.min(t, NOW)),
        isSample: true,
        createdAt: new Date(start),
      });
    }

    // ===== 6. batch insert + question drift updates =====
    console.log(`💾 inserting ${sessionRows.length} sessions, ${attemptRows.length} attempts…`);
    const chunk = <T,>(arr: T[], size: number): T[][] => {
      const out: T[][] = [];
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
      return out;
    };
    for (const part of chunk(sessionRows, 500)) await db.session.createMany({ data: part });
    for (const part of chunk(attemptRows, 1000)) await db.attempt.createMany({ data: part });
    for (const part of chunk(subjectAbilityRows, 500)) await db.subjectAbility.createMany({ data: part });
    for (const part of chunk(topicAbilityRows, 500)) await db.topicAbility.createMany({ data: part });
    for (const part of chunk(reviewRows, 500)) await db.reviewSchedule.createMany({ data: part });

    for (const st of qState.values()) {
      await db.question.update({
        where: { id: st.id },
        data: { rating: Math.round(st.rating * 10) / 10, ratingCount: st.count },
      });
    }

    // ===== 7. summary =====
    const [users, identity, subjects, topics, questions, sessions, attempts, sa, ta, reviews, classes, friendships, mis] =
      await Promise.all([
        db.user.count(),
        db.identity.count(),
        db.subject.count(),
        db.topic.count(),
        db.question.count(),
        db.session.count(),
        db.attempt.count(),
        db.subjectAbility.count(),
        db.topicAbility.count(),
        db.reviewSchedule.count(),
        db.classRoom.count(),
        db.friendship.count(),
        db.misconception.count(),
      ]);
    console.log("\n✅ seed complete — sample data summary:");
    console.table({
      users, identity, subjects, topics, questions, sessions, attempts,
      subjectAbility: sa, topicAbility: ta, reviewSchedule: reviews,
      classes, friendships, misconceptions: mis,
    });
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error("❌ seed failed:", e);
  process.exit(1);
});
