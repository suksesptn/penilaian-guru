import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const studentId = request.cookies.get('student_id')?.value

    if (!studentId) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      )
    }

    const { teacher_id, answers, open_feedback } = await request.json()

    // Validasi input
    if (!teacher_id || !answers || !Array.isArray(answers) || answers.length !== 12) {
      return NextResponse.json(
        { error: 'Data tidak lengkap. Semua 12 pertanyaan harus diisi.' },
        { status: 400 }
      )
    }

    // 1. Cek apakah sudah submit sebelumnya (PERBAIKAN DI SINI)
    const { data: existing, error: checkError } = await supabase
      .from('evaluations')
      .select('id')
      .eq('student_id', studentId)
      .eq('teacher_id', teacher_id)
      .maybeSingle() // maybeSingle() lebih aman daripada single() jika data belum ada

    if (checkError) {
      console.error('❌ Error checking existing evaluation:', checkError)
      return NextResponse.json(
        { error: 'Gagal memeriksa status penilaian' },
        { status: 500 }
      )
    }

    if (existing) {
      return NextResponse.json(
        { error: 'Anda sudah mengisi angket untuk guru ini sebelumnya.' },
        { status: 400 }
      )
    }

    // 2. Insert header evaluation
    const { data: evaluation, error: evalError } = await supabase
      .from('evaluations')
      .insert({
        student_id: studentId,
        teacher_id: teacher_id,
        open_feedback: open_feedback || null
      })
      .select()
      .single()

    if (evalError || !evaluation) {
      console.error('❌ Error creating evaluation:', evalError)
      
      // Jika error karena unique constraint (meski sudah dicek di atas, ini pengaman ganda)
      if (evalError.code === '23505') {
        return NextResponse.json(
          { error: 'Anda sudah mengisi angket untuk guru ini sebelumnya.' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Gagal menyimpan data penilaian' },
        { status: 500 }
      )
    }

    // 3. Insert detail answers (12 pertanyaan)
    const answerRows = answers.map((a: any) => ({
      evaluation_id: evaluation.id,
      question_no: a.question_no,
      score: a.score
    }))

    const { error: answersError } = await supabase
      .from('evaluation_answers')
      .insert(answerRows)

    if (answersError) {
      console.error('❌ Error creating answers:', answersError)
      
      // Rollback: hapus evaluation yang baru dibuat agar tidak ada data sampah
      await supabase.from('evaluations').delete().eq('id', evaluation.id)
      
      return NextResponse.json(
        { error: 'Gagal menyimpan jawaban detail' },
        { status: 500 }
      )
    }

    console.log('✅ Angket berhasil disimpan untuk guru', teacher_id, 'oleh siswa', studentId)

    return NextResponse.json({
      success: true,
      message: 'Penilaian berhasil disimpan'
    })
  } catch (error: any) {
    console.error('💥 Submit error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server: ' + error.message },
      { status: 500 }
    )
  }
}