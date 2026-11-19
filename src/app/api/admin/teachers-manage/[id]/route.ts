import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// PUT - Update guru
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = request.cookies.get('admin_auth')?.value
    if (adminAuth !== 'true') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { id } = await params
    const { name, subject } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nama guru wajib diisi' }, { status: 400 })
    }

    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: 'Mata pelajaran wajib diisi' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('teachers')
      .update({ 
        name: name.trim(), 
        subject: subject.trim() 
      })
      .eq('id', parseInt(id))
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, teacher: data })
  } catch (error: any) {
    console.error('Error updating teacher:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Hapus guru
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = request.cookies.get('admin_auth')?.value
    if (adminAuth !== 'true') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { id } = await params

    // Cek apakah guru masih mengajar di kelas manapun
    const { count: classCount } = await supabase
      .from('teacher_classes')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_id', parseInt(id))

    if (classCount && classCount > 0) {
      return NextResponse.json(
        { error: `Tidak bisa hapus guru. Guru ini masih mengajar di ${classCount} kelas.` },
        { status: 400 }
      )
    }

    // Cek apakah ada penilaian untuk guru ini
    const { count: evalCount } = await supabase
      .from('evaluations')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_id', parseInt(id))

    if (evalCount && evalCount > 0) {
      return NextResponse.json(
        { error: `Tidak bisa hapus guru. Masih ada ${evalCount} data penilaian untuk guru ini.` },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('teachers')
      .delete()
      .eq('id', parseInt(id))

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting teacher:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}