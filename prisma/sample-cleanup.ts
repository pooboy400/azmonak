// Deletes ALL sample-flagged rows, in FK-safe order.
// Real data (isSample=false) is never touched.
// Also removes the sample avatar folder (public/avatars/sample/) when run
// standalone — re-seeding afterwards requires re-downloading via
// scripts/download-sample-avatars.sh (seed warns about it).
// Run standalone:  bun prisma/sample-cleanup.ts
// Or via npm:      bun run db:clean-sample

import { rmSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

export const SAMPLE_AVATARS_DIR = process.cwd() + "/public/avatars/sample";

export async function cleanSampleData(db: PrismaClient): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  // children first — every delete is scoped to isSample=true
  counts.attempts = (await db.attempt.deleteMany({ where: { isSample: true } })).count;
  counts.sessions = (await db.session.deleteMany({ where: { isSample: true } })).count;
  counts.abilitySubject = (await db.subjectAbility.deleteMany({ where: { isSample: true } })).count;
  counts.abilityTopic = (await db.topicAbility.deleteMany({ where: { isSample: true } })).count;
  counts.reviewSchedule = (await db.reviewSchedule.deleteMany({ where: { isSample: true } })).count;
  counts.misconceptionState = (await db.misconceptionState.deleteMany({ where: { isSample: true } })).count;
  counts.forumQuestionVotes = (await db.forumQuestionVote.deleteMany({ where: { isSample: true } })).count;
  counts.forumAnswerVotes = (await db.forumAnswerVote.deleteMany({ where: { isSample: true } })).count;
  counts.forumAnswers = (await db.forumAnswer.deleteMany({ where: { isSample: true } })).count;
  counts.forumQuestions = (await db.forumQuestion.deleteMany({ where: { isSample: true } })).count;
  counts.assignmentCompletions = (await db.assignmentCompletion.deleteMany({ where: { isSample: true } })).count;
  counts.assignments = (await db.assignment.deleteMany({ where: { isSample: true } })).count;
  counts.questionMisconception = (await db.questionMisconception.deleteMany({ where: { isSample: true } })).count;
  counts.questions = (await db.question.deleteMany({ where: { isSample: true } })).count;
  counts.topics = (await db.topic.deleteMany({ where: { isSample: true } })).count;
  counts.subjects = (await db.subject.deleteMany({ where: { isSample: true } })).count;
  counts.misconceptions = (await db.misconception.deleteMany({ where: { isSample: true } })).count;
  counts.friendships = (await db.friendship.deleteMany({ where: { isSample: true } })).count;
  counts.classMembers = (await db.classMember.deleteMany({ where: { isSample: true } })).count;
  counts.classes = (await db.classRoom.deleteMany({ where: { isSample: true } })).count;
  counts.identity = (await db.identity.deleteMany({ where: { isSample: true } })).count;
  counts.otpCodes = (await db.otpCode.deleteMany({ where: { isSample: true } })).count;
  counts.users = (await db.user.deleteMany({ where: { isSample: true } })).count;
  counts.blogPosts = (await db.blogPost.deleteMany({ where: { isSample: true } })).count;
  counts.faqs = (await db.faq.deleteMany({ where: { isSample: true } })).count;
  counts.siteSettings = (await db.siteSetting.deleteMany({ where: { isSample: true } })).count;

  return counts;
}

async function main() {
  const db = new PrismaClient();
  try {
    const counts = await cleanSampleData(db);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    console.log("✅ Sample data cleaned:");
    for (const [table, n] of Object.entries(counts)) {
      if (n > 0) console.log(`   ${table}: ${n} row(s) deleted`);
    }
    if (total === 0) console.log("   (nothing to delete — no sample data present)");
    // sample-only static assets: whole folder is disposable
    rmSync(SAMPLE_AVATARS_DIR, { recursive: true, force: true });
    console.log(`   avatars: folder ${SAMPLE_AVATARS_DIR} removed`);
  } finally {
    await db.$disconnect();
  }
}

if (import.meta.main) {
  main().catch((e) => {
    console.error("❌ Cleanup failed:", e);
    process.exit(1);
  });
}
