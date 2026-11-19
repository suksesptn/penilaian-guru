import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = request.cookies.get('admin_auth')?.value
    if (adminAuth !== 'true') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { id } = await params
    const teacherId = parseInt(id)

    // 1. Ambil info guru
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id, name, subject')
      .eq('id', teacherId)
      .single()

    if (!teacher) {
      return NextResponse.json({ error: 'Guru tidak ditemukan' }, { status: 404 })
    }

    // 2. Ambil semua evaluation
    const { data: evaluations } = await supabase
      .from('evaluations')
      .select('id, student_id, open_feedback, submitted_at, students(name, nis)')
      .eq('teacher_id', teacherId)
      .order('submitted_at', { ascending: true })

    const studentCount = evaluations?.length || 0

    // 3. Ambil semua jawaban
    let answers: any[] = []
    if (studentCount > 0) {
      const evalIds = evaluations!.map(e => e.id)
      const { data } = await supabase
        .from('evaluation_answers')
        .select('evaluation_id, question_no, score')
        .in('evaluation_id', evalIds)
      answers = data || []
    }

    // 4. Hitung skor per kategori
    const categoryScores = { kepribadian: 0, sosial: 0, pedagogik: 0, profesional: 0 }
    const categoryCounts = {
      kepribadian: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      sosial: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      pedagogik: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      profesional: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    }

    answers.forEach(a => {
      let category: keyof typeof categoryScores
      if (a.question_no >= 1 && a.question_no <= 3) category = 'kepribadian'
      else if (a.question_no >= 4 && a.question_no <= 6) category = 'sosial'
      else if (a.question_no >= 7 && a.question_no <= 9) category = 'pedagogik'
      else category = 'profesional'

      categoryScores[category] += a.score
      categoryCounts[category][a.score as keyof typeof categoryCounts.kepribadian]++
    })

    const maxPerCategory = studentCount * 3 * 5
    const scores = {
      kepribadian: studentCount > 0 ? (categoryScores.kepribadian / maxPerCategory) * 100 : 0,
      sosial: studentCount > 0 ? (categoryScores.sosial / maxPerCategory) * 100 : 0,
      pedagogik: studentCount > 0 ? (categoryScores.pedagogik / maxPerCategory) * 100 : 0,
      profesional: studentCount > 0 ? (categoryScores.profesional / maxPerCategory) * 100 : 0,
    }

    const total = (scores.kepribadian + scores.sosial + scores.pedagogik + scores.profesional) / 4

    return NextResponse.json({
      success: true,
      teacher,
      student_count: studentCount,
      scores: {
        kepribadian: Math.round(scores.kepribadian * 100) / 100,
        sosial: Math.round(scores.sosial * 100) / 100,
        pedagogik: Math.round(scores.pedagogik * 100) / 100,
        profesional: Math.round(scores.profesional * 100) / 100,
        total: Math.round(total * 100) / 100
      },
      category_counts: categoryCounts,
      feedbacks: evaluations?.map(e => ({
        student_name: e.students?.name || 'Anonim',
        nis: e.students?.nis || '-',
        feedback: e.open_feedback,
        submitted_at: e.submitted_at
      })).filter(e => e.feedback) || []
    })
  } catch (error) {
    console.error('Error fetching teacher detail:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}