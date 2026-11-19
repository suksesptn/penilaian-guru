import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const adminAuth = request.cookies.get('admin_auth')?.value
    if (adminAuth !== 'true') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    // 1. Ambil semua guru
    const { data: teachers, error: tError } = await supabase
      .from('teachers')
      .select('id, name, subject')
      .order('name', { ascending: true })

    if (tError) throw tError

    // 2. Untuk setiap guru, hitung skor
    const teacherScores = await Promise.all(
      teachers.map(async (teacher) => {
        // Ambil semua evaluation untuk guru ini
        const { data: evaluations } = await supabase
          .from('evaluations')
          .select('id, student_id')
          .eq('teacher_id', teacher.id)

        const studentCount = evaluations?.length || 0

        if (studentCount === 0) {
          return {
            ...teacher,
            student_count: 0,
            scores: { kepribadian: 0, sosial: 0, pedagogik: 0, profesional: 0, total: 0 }
          }
        }

        const evalIds = evaluations!.map(e => e.id)

        // Ambil semua jawaban
        const { data: answers } = await supabase
          .from('evaluation_answers')
          .select('question_no, score')
          .in('evaluation_id', evalIds)

        if (!answers || answers.length === 0) {
          return {
            ...teacher,
            student_count: studentCount,
            scores: { kepribadian: 0, sosial: 0, pedagogik: 0, profesional: 0, total: 0 }
          }
        }

        // Hitung skor per kategori
        // Kategori 1: Q 1-3 (Kepribadian)
        // Kategori 2: Q 4-6 (Sosial)
        // Kategori 3: Q 7-9 (Pedagogik)
        // Kategori 4: Q 10-12 (Profesional)
        const categoryScores = {
          kepribadian: 0,
          sosial: 0,
          pedagogik: 0,
          profesional: 0,
        }

        answers.forEach(a => {
          if (a.question_no >= 1 && a.question_no <= 3) categoryScores.kepribadian += a.score
          else if (a.question_no >= 4 && a.question_no <= 6) categoryScores.sosial += a.score
          else if (a.question_no >= 7 && a.question_no <= 9) categoryScores.pedagogik += a.score
          else if (a.question_no >= 10 && a.question_no <= 12) categoryScores.profesional += a.score
        })

        // Rumus: (total_skor / skor_maksimal) × 100
        // Skor maksimal per kategori = studentCount × 3 pertanyaan × 5 skor_max = studentCount × 15
        const maxPerCategory = studentCount * 3 * 5

        const kepribadian = (categoryScores.kepribadian / maxPerCategory) * 100
        const sosial = (categoryScores.sosial / maxPerCategory) * 100
        const pedagogik = (categoryScores.pedagogik / maxPerCategory) * 100
        const profesional = (categoryScores.profesional / maxPerCategory) * 100
        const total = (kepribadian + sosial + pedagogik + profesional) / 4

        return {
          ...teacher,
          student_count: studentCount,
          scores: {
            kepribadian: Math.round(kepribadian * 100) / 100,
            sosial: Math.round(sosial * 100) / 100,
            pedagogik: Math.round(pedagogik * 100) / 100,
            profesional: Math.round(profesional * 100) / 100,
            total: Math.round(total * 100) / 100
          }
        }
      })
    )

    // Sort by total score descending (ranking)
    teacherScores.sort((a, b) => b.scores.total - a.scores.total)

    return NextResponse.json({
      success: true,
      teachers: teacherScores
    })
  } catch (error) {
    console.error('Error fetching teacher scores:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}