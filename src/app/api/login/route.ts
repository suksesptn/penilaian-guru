import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { nis } = await request.json()
    console.log('🔍 Login attempt with NIS:', nis)

    if (!nis) {
      return NextResponse.json(
        { error: 'NIS harus diisi' },
        { status: 400 }
      )
    }

    // Cari siswa berdasarkan NIS
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, nis, name, class_id')
      .eq('nis', nis.trim())
      .single()

    console.log('👤 Student found:', student)
    console.log('❌ Student error:', studentError)

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'NIS tidak ditemukan. Periksa kembali NIS Anda.' },
        { status: 404 }
      )
    }

    // Cari nama kelas
    let className = 'Kelas tidak diketahui'
    if (student.class_id) {
      const { data: classData } = await supabase
        .from('classes')
        .select('name')
        .eq('id', student.class_id)
        .single()
      
      if (classData) {
        className = classData.name
      }
    }

    // Buat response
    const response = NextResponse.json({
      success: true,
      data: {
        id: student.id,
        nis: student.nis,
        name: student.name,
        class_id: student.class_id,
        class_name: className
      }
    })

    // Set cookies - SEMUA TANPA httpOnly agar bisa dibaca client-side
    response.cookies.set('student_id', student.id, {
      httpOnly: false,  // ← PERUBAHAN PENTING!
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8
    })

    response.cookies.set('student_nis', student.nis, {
      httpOnly: false,
      path: '/',
      maxAge: 60 * 60 * 8
    })

    response.cookies.set('student_name', student.name, {
      httpOnly: false,
      path: '/',
      maxAge: 60 * 60 * 8
    })

    response.cookies.set('student_class_id', String(student.class_id), {
      httpOnly: false,
      path: '/',
      maxAge: 60 * 60 * 8
    })

    response.cookies.set('student_class_name', className, {
      httpOnly: false,
      path: '/',
      maxAge: 60 * 60 * 8
    })

    return response
  } catch (error) {
    console.error('💥 Login error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}