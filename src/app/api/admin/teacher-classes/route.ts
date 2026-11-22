import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// ===== GET: Ambil semua korelasi guru-kelas =====
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('teacher_classes')
      .select(`
        id,
        teacher_id,
        class_id,
        teachers ( id, name, subject ),
        classes ( id, name )
      `)

    if (error) {
      console.error('❌ GET teacher_classes error:', error)
      return NextResponse.json(
        { error: 'Gagal memuat data korelasi: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ correlations: data || [] })
  } catch (err: any) {
    console.error('💥 GET error:', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server: ' + err.message },
      { status: 500 }
    )
  }
}

// ===== POST: Simpan korelasi untuk 1 guru (HAPUS DULU, LALU INSERT) =====
export async function POST(request: NextRequest) {
  try {
    const { teacher_id, class_ids } = await request.json()

    // Validasi input
    if (!teacher_id) {
      return NextResponse.json(
        { error: 'teacher_id wajib diisi' },
        { status: 400 }
      )
    }

    // Pastikan class_ids adalah array (handle jika null/undefined)
    const validClassIds = Array.isArray(class_ids)
      ? class_ids.filter((id: any) => id !== null && id !== undefined && id !== '')
      : []

    // STEP 1: Hapus SEMUA korelasi guru ini terlebih dahulu
    // Ini mencegah unique constraint violation saat insert ulang
    const { error: deleteError } = await supabase
      .from('teacher_classes')
      .delete()
      .eq('teacher_id', teacher_id)

    if (deleteError) {
      console.error('❌ Delete korelasi error:', deleteError)
      return NextResponse.json(
        { error: 'Gagal menghapus korelasi lama: ' + deleteError.message },
        { status: 500 }
      )
    }

    // STEP 2: Jika tidak ada kelas yang dipilih, simpan kosong (guru tidak mengajar)
    if (validClassIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Korelasi berhasil disimpan (guru tidak mengajar kelas manapun)'
      })
    }

    // STEP 3: Insert korelasi baru
    const newRows = validClassIds.map((class_id: any) => ({
      teacher_id: parseInt(teacher_id),
      class_id: parseInt(class_id),
    }))

    const { error: insertError } = await supabase
      .from('teacher_classes')
      .insert(newRows)

    if (insertError) {
      console.error('❌ Insert korelasi error:', insertError)
      // Rollback jika insert gagal (opsional, karena delete sudah terjadi)
      return NextResponse.json(
        { error: 'Gagal menyimpan korelasi: ' + insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil menyimpan ${validClassIds.length} korelasi`
    })
  } catch (err: any) {
    console.error('💥 POST error:', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server: ' + err.message },
      { status: 500 }
    )
  }
}