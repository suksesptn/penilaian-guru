import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Helper: tentukan kategori dari nomor pertanyaan
function getCategory(questionNo: number): 'kepribadian' | 'sosial' | 'pedagogik' | 'profesional' {
  if (questionNo >= 1 && questionNo <= 3) return 'kepribadian'
  if (questionNo >= 4 && questionNo <= 6) return 'sosial'
  if (questionNo >= 7 && questionNo <= 9) return 'pedagogik'
  return 'profesional'
}

// Helper: hitung skor, distribusi, feedback, dan jumlah responden
// untuk SEKUMPULAN evaluations (dipakai untuk total & per-kelas)
function computeStats(evals: any[], answers: any[]) {
  const studentCount = evals.length
  const evalIds = new Set(evals.map(e => e.id))

  const categoryScores = { kepribadian: 0, sosial: 0, pedagogik: 0, profesional: 0 }
  const categoryCounts = {
    kepribadian: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    sosial: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    pedagogik: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    profesional: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  }

  answers.forEach(a => {
    if (!evalIds.has(a.evaluation_id)) return
    const category = getCategory(a.question_no)
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

  const feedbacks = evals
    .filter(e => e.open_feedback)
    .map(e => ({
      student_name: e.students?.name || 'Anonim',
      nis: e.students?.nis || '-',
      feedback: e.open_feedback,
      submitted_at: e.submitted_at
    }))

  return {
    studentCount,
    scores: {
      kepribadian: Math.round(scores.kepribadian * 100) / 100,
      sosial: Math.round(scores.sosial * 100) / 100,
      pedagogik: Math.round(scores.pedagogik * 100) / 100,
      profesional: Math.round(scores.profesional * 100) / 100,
      total: Math.round(total * 100) / 100,
    },
    categoryCounts,
    feedbacks,
  }
}

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

    // 2. Ambil semua evaluation (DITAMBAH class_id + students.class_id)
    const { data: evaluations } = await supabase
      .from('evaluations')
      .select('id, student_id, class_id, open_feedback, submitted_at, students(name, nis, class_id)')
      .eq('teacher_id', teacherId)
      .order('submitted_at', { ascending: true })

    const evalList = evaluations || []
    const studentCount = evalList.length

    // 3. Ambil semua jawaban
    let answers: any[] = []
    if (studentCount > 0) {
      const evalIds = evalList.map(e => e.id)
      const { data } = await supabase
        .from('evaluation_answers')
        .select('evaluation_id, question_no, score')
        .in('evaluation_id', evalIds)
      answers = data || []
    }

    // 4. Hitung skor TOTAL GABUNGAN (backward compatible)
    const totalStats = computeStats(evalList, answers)

    // 5. Kelompokkan evaluations per kelas
    const classGroups: Record<string, any[]> = {}
    evalList.forEach(e => {
      // Prioritaskan class_id dari evaluations, fallback ke students.class_id
      const classId = e.class_id || e.students?.class_id
      const key = classId ? String(classId) : 'unknown'
      if (!classGroups[key]) classGroups[key] = []
      classGroups[key].push(e)
    })

    // 6. Hitung statistik PER KELAS
    const scoresByClass: Record<string, any> = {}
    const categoryCountsByClass: Record<string, any> = {}
    const feedbacksByClass: Record<string, any[]> = {}
    const studentCountByClass: Record<string, number> = {}

    for (const [classKey, evals] of Object.entries(classGroups)) {
      const stats = computeStats(evals, answers)
      scoresByClass[classKey] = stats.scores
      categoryCountsByClass[classKey] = stats.categoryCounts
      feedbacksByClass[classKey] = stats.feedbacks
      studentCountByClass[classKey] = stats.studentCount
    }

    // 7. Ambil info nama kelas yang menilai
    const classIds = Object.keys(classGroups)
      .filter(k => k !== 'unknown')
      .map(k => parseInt(k))

    let classes: { id: number; name: string }[] = []
    if (classIds.length > 0) {
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name')
        .in('id', classIds)
        .order('name')
      classes = classesData || []
    }

    return NextResponse.json({
      success: true,
      teacher,

      // ===== FIELD LAMA (backward compatible — halaman detail tetap jalan) =====
      student_count: totalStats.studentCount,
      scores: totalStats.scores,
      category_counts: totalStats.categoryCounts,
      feedbacks: totalStats.feedbacks,

      // ===== FIELD BARU (per kelas) =====
      classes,                          // daftar kelas yang menilai guru ini
      scores_by_class: scoresByClass,
      category_counts_by_class: categoryCountsByClass,
      feedbacks_by_class: feedbacksByClass,
      student_count_by_class: studentCountByClass,
    })
  } catch (error) {
    console.error('Error fetching teacher detail:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}