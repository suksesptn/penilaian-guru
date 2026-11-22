import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    console.log('📤 Starting export all teachers...')

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

    if (!teachers || teachers.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data guru' }, { status: 404 })
    }

    // 2. Hitung skor untuk semua guru
    const teacherData = []
    
    for (const teacher of teachers) {
      const { data: evaluations } = await supabase
        .from('evaluations')
        .select('id, student_id, open_feedback, submitted_at, students(name, nis)')
        .eq('teacher_id', teacher.id)

      const studentCount = evaluations?.length || 0
      let answers: any[] = []

      if (studentCount > 0) {
        const evalIds = evaluations!.map(e => e.id)
        const { data } = await supabase
          .from('evaluation_answers')
          .select('evaluation_id, question_no, score')
          .in('evaluation_id', evalIds)
        answers = data || []
      }

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
        categoryCounts[category][a.score as 1|2|3|4|5]++
      })

      const maxPerCategory = studentCount * 3 * 5
      const scores = {
        kepribadian: studentCount > 0 ? (categoryScores.kepribadian / maxPerCategory) * 100 : 0,
        sosial: studentCount > 0 ? (categoryScores.sosial / maxPerCategory) * 100 : 0,
        pedagogik: studentCount > 0 ? (categoryScores.pedagogik / maxPerCategory) * 100 : 0,
        profesional: studentCount > 0 ? (categoryScores.profesional / maxPerCategory) * 100 : 0,
      }
      const total = (scores.kepribadian + scores.sosial + scores.pedagogik + scores.profesional) / 4

      const feedbacks = (evaluations || [])
        .filter(e => e.open_feedback)
        .map(e => ({
          student_name: e.students?.name || 'Anonim',
          nis: e.students?.nis || '-',
          feedback: e.open_feedback,
          submitted_at: e.submitted_at
        }))

      teacherData.push({
        ...teacher,
        student_count: studentCount,
        scores,
        total: Math.round(total * 100) / 100,
        category_counts: categoryCounts,
        feedbacks
      })
    }

    teacherData.sort((a, b) => b.total - a.total)

    // ===== BUAT EXCEL DENGAN XLSX =====
    const wb = XLSX.utils.book_new()

    // Sheet 1: Ranking
    const rankingData = [
      ['REKAPITULASI PENILAIAN KINERJA GURU'],
      [`Tanggal: ${new Date().toLocaleDateString('id-ID')}`],
      [],
      ['Rank', 'Nama Guru', 'Mata Pelajaran', 'Responden', 'Kepribadian', 'Sosial', 'Pedagogik', 'Profesional', 'Total']
    ]

    teacherData.forEach((t, idx) => {
      rankingData.push([
        idx + 1,
        t.name,
        t.subject,
        t.student_count,
        t.scores.kepribadian.toFixed(2),
        t.scores.sosial.toFixed(2),
        t.scores.pedagogik.toFixed(2),
        t.scores.profesional.toFixed(2),
        t.total.toFixed(2)
      ])
    })

    const wsRanking = XLSX.utils.aoa_to_sheet(rankingData)
    XLSX.utils.book_append_sheet(wb, wsRanking, 'Ranking Guru')

    // Sheet per guru
    const scoreLabels: Record<number, string> = { 1: 'Sangat Kurang Baik', 2: 'Kurang Baik', 3: 'Cukup', 4: 'Baik', 5: 'Sangat Baik' }
    const categories = [
      { key: 'kepribadian', label: 'Kepribadian' },
      { key: 'sosial', label: 'Sosial' },
      { key: 'pedagogik', label: 'Pedagogik' },
      { key: 'profesional', label: 'Profesional' },
    ]

    teacherData.forEach((t, idx) => {
      let sheetName = `${idx + 1}. ${t.name}`
      sheetName = sheetName.replace(/[\\\/\?\*\[\]:]/g, '')
      if (sheetName.length > 31) sheetName = sheetName.substring(0, 31)

      const guruData: any[][] = [
        ['LAPORAN DETAIL GURU'],
        [],
        ['Nama Guru', t.name],
        ['Mata Pelajaran', t.subject],
        ['Jumlah Responden', `${t.student_count} siswa`],
        ['Skor Total', t.total.toFixed(2)],
        [],
        ['ANALISIS SKOR PER KATEGORI'],
        ['Kategori', 'Skor'],
      ]

      categories.forEach(cat => {
        guruData.push([cat.label, t.scores[cat.key as keyof typeof t.scores].toFixed(2)])
      })

      guruData.push([])
      guruData.push(['DISTRIBUSI JAWABAN'])
      guruData.push(['Kategori', 'Tingkat', 'Jumlah', 'Persentase'])

      categories.forEach(cat => {
        guruData.push([cat.label, '', '', ''])
        const counts = t.category_counts[cat.key as keyof typeof t.category_counts]
        const totalAnswers = Object.values(counts).reduce((a, b) => a + b, 0)

        for (let s = 5; s >= 1; s--) {
          const count = counts[s as 1|2|3|4|5]
          const pct = totalAnswers > 0 ? (count / totalAnswers) * 100 : 0
          guruData.push(['', scoreLabels[s as 1|2|3|4|5], count, `${pct.toFixed(1)}%`])
        }
      })

      guruData.push([])
      guruData.push(['SARAN & MASUKAN SISWA'])
      guruData.push(['No', 'Nama Siswa', 'NIS', 'Tanggal', 'Saran/Masukan'])

      if (t.feedbacks.length === 0) {
        guruData.push(['', '', '', '', 'Tidak ada saran/masukan'])
      } else {
        t.feedbacks.forEach((fb, fIdx) => {
          guruData.push([
            fIdx + 1,
            fb.student_name,
            fb.nis,
            new Date(fb.submitted_at).toLocaleString('id-ID'),
            fb.feedback
          ])
        })
      }

      const wsGuru = XLSX.utils.aoa_to_sheet(guruData)
      XLSX.utils.book_append_sheet(wb, wsGuru, sheetName)
    })

    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Rekap_Penilaian_Guru_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  } catch (error: any) {
    console.error('💥 Export error:', error)
    console.error('💥 Message:', error.message)
    return NextResponse.json(
      { error: 'Gagal mengexport data: ' + (error.message || 'Unknown') },
      { status: 500 }
    )
  }
}