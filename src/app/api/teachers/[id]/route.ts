import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const teacherId = parseInt(id)

    if (isNaN(teacherId)) {
      return NextResponse.json(
        { error: 'ID guru tidak valid' },
        { status: 400 }
      )
    }

    // Cek login
    const studentId = request.cookies.get('student_id')?.value
    if (!studentId) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      )
    }

    // Ambil detail guru
    const { data: teacher, error } = await supabase
      .from('teachers')
      .select('id, name, subject')
      .eq('id', teacherId)
      .single()

    if (error || !teacher) {
      return NextResponse.json(
        { error: 'Guru tidak ditemukan' },
        { status: 404 }
      )
    }

    // Cek apakah guru mengajar di kelas siswa ini
    const classId = request.cookies.get('student_class_id')?.value
    const { data: tc } = await supabase
      .from('teacher_classes')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('class_id', classId)
      .single()

    if (!tc) {
      return NextResponse.json(
        { error: 'Guru tidak mengajar di kelas Anda' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      teacher
    })
  } catch (error) {
    console.error('💥 Error fetching teacher:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}