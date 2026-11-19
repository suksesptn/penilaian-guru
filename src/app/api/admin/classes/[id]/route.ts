import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// PUT - Update kelas
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
    const { name } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nama kelas wajib diisi' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('classes')
      .update({ name: name.trim() })
      .eq('id', parseInt(id))
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, class: data })
  } catch (error: any) {
    console.error('Error updating class:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Hapus kelas
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

    // Cek apakah ada siswa di kelas ini
    const { count: studentCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', parseInt(id))

    if (studentCount && studentCount > 0) {
      return NextResponse.json(
        { error: `Tidak bisa hapus kelas. Masih ada ${studentCount} siswa di kelas ini.` },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', parseInt(id))

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting class:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}