import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const adminAuth = request.cookies.get('admin_auth')?.value
    if (adminAuth !== 'true') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    // ✅ 1 QUERY CEPAT: skor dihitung di database!
    const { data, error } = await supabase.rpc('admin_teacher_scores')

    if (error) {
      console.error('❌ RPC error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const teachers = (data || []).map((row: any) => ({
      id: row.teacher_id,
      name: row.teacher_name,
      subject: row.teacher_subject,
      student_count: Number(row.student_count),
      scores: {
        kepribadian: Number(row.kepribadian),
        sosial: Number(row.sosial),
        pedagogik: Number(row.pedagogik),
        profesional: Number(row.profesional),
        total: Number(row.total),
      },
    }))

    console.log(`✅ Dashboard: ${teachers.length} guru, total responden: ${teachers.reduce((s, t) => s + t.student_count, 0)}`)

    return NextResponse.json({ success: true, teachers })
  } catch (error: any) {
    console.error('💥 Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}