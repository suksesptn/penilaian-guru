import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Helper: tentukan kategori dari nomor pertanyaan
function getCategory(questionNo: number): 'kepribadian' | 'sosial' | 'pedagogik' | 'profesional' {
  if (questionNo >= 1 && questionNo <= 3) return 'kepribadian'
  if (questionNo >= 4 && questionNo <= 6) return 'sosial'
  if (questionNo >= 7 && questionNo <= 9) return 'pedagogik'
  return 'profesional'
}

// ✅ RUMUS BARU: skor = (rata-rata jawaban / 5) × 100
// Sama persis dengan yang dipakai di halaman detail guru
function computeScores(answers: any[], evalIds: Set<string>) {
  const catSum: Record<string, number> = { kepribadian: 0, sosial: 0, pedagogik: 0, profesional: 0 }
  const catCount: Record<string, number> = { kepribadian: 0, sosial: 0, pedagogik: 0, profesional: 0 }

  answers.forEach(a => {
    if (!evalIds.has(a.evaluation_id)) return
    const cat = getCategory(a.question_no)
    catSum[cat] += a.score
    catCount[cat] += 1
  })

  const avg = (cat: string) => catCount[cat] > 0 ? catSum[cat] / catCount[cat] : 0
  const toScore = (cat: string) => Math.round((avg(cat) / 5) * 100 * 100) / 100

  const scores = {
    kepribadian: toScore('kepribadian'),
    sosial: toScore('sosial'),
    pedagogik: toScore('pedagogik'),
    profesional: toScore('profesional'),
    total: 0,
  }
  scores.total = Math.round(((scores.kepribadian + scores.sosial + scores.pedagogik + scores.profesional) / 4) * 100) / 100

  return scores
}

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

    // 2. Ambil SEMUA evaluasi sekaligus (lebih efisien daripada query per guru)
    const { data: evaluations, error: eError } = await supabase
      .from('evaluations')
      .select('id, teacher_id')

    if (eError) throw eError

    const evalList = evaluations || []

    // 3. Ambil SEMUA jawaban sekaligus
    let allAnswers: any[] = []
    if (evalList.length > 0) {
      const evalIds = evalList.map(e => e.id)
      const { data } = await supabase
        .from('evaluation_answers')
        .select('evaluation_id, question_no, score')
        .in('evaluation_id', evalIds)
      allAnswers = data || []
    }

    // 4. Kelompokkan evaluasi per guru
    const evalsByTeacher: Record<number, any[]> = {}
    evalList.forEach(e => {
      if (!evalsByTeacher[e.teacher_id]) evalsByTeacher[e.teacher_id] = []
      evalsByTeacher[e.teacher_id].push(e)
    })

    // 5. Hitung skor per guru dengan RUMUS BARU
    const teacherResults = teachers.map(teacher => {
      const teacherEvals = evalsByTeacher[teacher.id] || []
      const evalIds = new Set(teacherEvals.map(e => e.id))
      const studentCount = teacherEvals.length

      // ✅ Pakai fungsi computeScores yang sama dengan halaman detail
      const scores = computeScores(allAnswers, evalIds)

      return {
        id: teacher.id,
        name: teacher.name,
        subject: teacher.subject,
        student_count: studentCount,
        scores,
      }
    })

    // 6. Sortir berdasarkan skor total (tertinggi dulu)
    teacherResults.sort((a, b) => b.scores.total - a.scores.total)

    return NextResponse.json({
      success: true,
      teachers: teacherResults,
    })
  } catch (error: any) {
    console.error('Error fetching teacher scores:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server: ' + error.message },
      { status: 500 }
    )
  }
}