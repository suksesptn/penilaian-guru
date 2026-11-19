import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export interface Teacher { id: number; name: string; subject: string; }
export interface Evaluation { id: number; student_id: string; teacher_id: number; open_feedback: string | null; submitted_at: string; students: Array<{ name: string; nis: string }> | null; }
export interface Answer { evaluation_id: number; question_no: number; score: number; }
export interface CategoryCounts { [key: string]: Record<number, number>; }
export interface ScoreResult { kepribadian: number; sosial: number; pedagogik: number; profesional: number; total: number; }
export interface TeacherAssessment { teacher: Teacher; student_count: number; scores: ScoreResult; category_counts: CategoryCounts; feedbacks: Array<{ student_name: string; nis: string; feedback: string | null; submitted_at: string; }>; }

export function calculateScores(answers: Answer[], studentCount: number): ScoreResult {
  const categoryScores = { kepribadian: 0, sosial: 0, pedagogik: 0, profesional: 0 };
  const categoryCounts = {
    kepribadian: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    sosial: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    pedagogik: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    profesional: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };
  answers.forEach(a => {
    let category: keyof typeof categoryScores;
    if (a.question_no >= 1 && a.question_no <= 3) category = 'kepribadian';
    else if (a.question_no >= 4 && a.question_no <= 6) category = 'sosial';
    else if (a.question_no >= 7 && a.question_no <= 9) category = 'pedagogik';
    else category = 'profesional';
    categoryScores[category] += a.score;
    categoryCounts[category][a.score as 1 | 2 | 3 | 4 | 5] = (categoryCounts[category][a.score as 1 | 2 | 3 | 4 | 5] || 0) + 1;
  });
  const maxPerCategory = studentCount * 3 * 5;
  const scores = {
    kepribadian: studentCount > 0 ? (categoryScores.kepribadian / maxPerCategory) * 100 : 0,
    sosial: studentCount > 0 ? (categoryScores.sosial / maxPerCategory) * 100 : 0,
    pedagogik: studentCount > 0 ? (categoryScores.pedagogik / maxPerCategory) * 100 : 0,
    profesional: studentCount > 0 ? (categoryScores.profesional / maxPerCategory) * 100 : 0,
  };
  return {
    ...scores,
    total: (scores.kepribadian + scores.sosial + scores.pedagogik + scores.profesional) / 4,
  };
}

