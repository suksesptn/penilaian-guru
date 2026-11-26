import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function getCategory(qNo: number): 'kepribadian' | 'sosial' | 'pedagogik' | 'profesional' {
  if (qNo <= 3) return 'kepribadian'
  if (qNo <= 6) return 'sosial'
  if (qNo <= 9) return 'pedagogik'
  return 'profesional'
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

    // 1. Info guru
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id, name, subject')
      .eq('id', teacherId)
      .single()

    if (!teacher) {
      return NextResponse.json({ error: 'Guru tidak ditemukan' }, { status: 404 })
    }

    // ✅ 2. Skor per kelas (via RPC - cepat & tanpa limit!)
    const { data: classScores } = await supabase
      .rpc('admin_teacher_class_scores', { p_teacher_id: teacherId })

    // ✅ 3. Distribusi jawaban per kelas (via RPC)
    const { data: distData } = await supabase
      .rpc('admin_teacher_class_distribution', { p_teacher_id: teacherId })

    // 4. Feedback (per kelas)
    const { data: feedbacks } = await supabase
      .from('evaluations')
      .select('id, class_id, open_feedback, submitted_at, students(name, nis)')
      .eq('teacher_id', teacherId)
      .not('open_feedback', 'is', null)
      .limit(1000)

    // 5. Bangun struktur per kelas
    const scoresByClass: Record<string, any> = {}
    const categoryCountsByClass: Record<string, any> = {}
    const feedbacksByClass: Record<string, any[]> = {}
    const studentCountByClass: Record<string, number> = {}
    const classes: { id: number; name: string }[] = []

    for (const row of classScores || []) {
      const cid = String(row.class_id)
      classes.push({ id: row.class_id, name: row.class_name })
      scoresByClass[cid] = {
        kepribadian: Number(row.kepribadian),
        sosial: Number(row.sosial),
        pedagogik: Number(row.pedagogik),
        profesional: Number(row.profesional),
        total: Number(row.total),
      }
      studentCountByClass[cid] = Number(row.student_count)
      categoryCountsByClass[cid] = {
        kepribadian: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        sosial: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        pedagogik: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        profesional: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      }
    }

    // Isi distribusi dari RPC
    for (const row of distData || []) {
      const cid = String(row.class_id)
      const cat = getCategory(row.question_no)
      if (categoryCountsByClass[cid] && categoryCountsByClass[cid][cat]) {
        categoryCountsByClass[cid][cat][row.score] = Number(row.jumlah)
      }
    }

    // Isi feedback per kelas
    for (const fb of feedbacks || []) {
      const cid = String(fb.class_id)
      if (!feedbacksByClass[cid]) feedbacksByClass[cid] = []
      feedbacksByClass[cid].push({
        student_name: (fb as any).students?.name || 'Anonim',
        nis: (fb as any).students?.nis || '-',
        feedback: fb.open_feedback,
        submitted_at: fb.submitted_at,
      })
    }

    // 6. Hitung total gabungan (weighted average by student_count)
    const totalStudents = Object.values(studentCountByClass).reduce((a, b) => a + b, 0)
    const totalScores = { kepribadian: 0, sosial: 0, pedagogik: 0, profesional: 0, total: 0 }
    if (totalStudents > 0) {
      for (const cid of Object.keys(scoresByClass)) {
        const w = studentCountByClass[cid] / totalStudents
        totalScores.kepribadian += scoresByClass[cid].kepribadian * w
        totalScores.sosial += scoresByClass[cid].sosial * w
        totalScores.pedagogik += scoresByClass[cid].pedagogik * w
        totalScores.profesional += scoresByClass[cid].profesional * w
      }
      totalScores.total = (totalScores.kepribadian + totalScores.sosial + totalScores.pedagogik + totalScores.profesional) / 4
      Object.keys(totalScores).forEach(k => { totalScores[k as keyof typeof totalScores] = Math.round(totalScores[k as keyof typeof totalScores] * 100) / 100 })
    }

    const allFeedbacks = Object.values(feedbacksByClass).flat()

    return NextResponse.json({
      success: true,
      teacher,
      // Backward compatible (untuk halaman detail lama)
      student_count: totalStudents,
      scores: totalScores,
      category_counts: Object.values(categoryCountsByClass)[0] || {},
      feedbacks: allFeedbacks,
      // Baru: per kelas
      classes,
      scores_by_class: scoresByClass,
      category_counts_by_class: categoryCountsByClass,
      feedbacks_by_class: feedbacksByClass,
      student_count_by_class: studentCountByClass,
    })
  } catch (error: any) {
    console.error('Error fetching teacher detail:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}