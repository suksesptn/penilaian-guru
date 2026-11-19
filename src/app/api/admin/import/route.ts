import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const adminAuth = request.cookies.get('admin_auth')?.value
    if (adminAuth !== 'true') {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { type, data, mode } = await request.json()

    if (!type || !data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Data tidak valid' },
        { status: 400 }
      )
    }

    const importMode = mode || 'insert' // 'insert' atau 'upsert'
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // ===== IMPORT KELAS =====
    if (type === 'classes') {
      for (const row of data) {
        try {
          const name = row.name || row.nama || row.Kelas
          if (!name) {
            errorCount++
            errors.push(`Baris tanpa nama kelas`)
            continue
          }

          if (importMode === 'upsert') {
            // Cek apakah kelas sudah ada
            const { data: existing } = await supabase
              .from('classes')
              .select('id')
              .eq('name', name.trim())
              .single()

            if (existing) {
              successCount++ // Skip, sudah ada
              continue
            }
          }

          const { error } = await supabase
            .from('classes')
            .insert({ name: name.trim() })

          if (error) {
            errorCount++
            errors.push(`Gagal menambah "${name}": ${error.message}`)
          } else {
            successCount++
          }
        } catch (err: any) {
          errorCount++
          errors.push(`Error: ${err.message}`)
        }
      }
    }

    // ===== IMPORT GURU =====
    else if (type === 'teachers') {
      for (const row of data) {
        try {
          const name = row.name || row.nama || row.Nama
          const subject = row.subject || row.mapel || row['Mata Pelajaran'] || row.Subject

          if (!name || !subject) {
            errorCount++
            errors.push(`Baris tanpa nama atau mata pelajaran`)
            continue
          }

          if (importMode === 'upsert') {
            const { data: existing } = await supabase
              .from('teachers')
              .select('id')
              .eq('name', name.trim())
              .single()

            if (existing) {
              // Update mapel jika berbeda
              await supabase
                .from('teachers')
                .update({ subject: subject.trim() })
                .eq('id', existing.id)
              successCount++
              continue
            }
          }

          const { error } = await supabase
            .from('teachers')
            .insert({ name: name.trim(), subject: subject.trim() })

          if (error) {
            errorCount++
            errors.push(`Gagal menambah "${name}": ${error.message}`)
          } else {
            successCount++
          }
        } catch (err: any) {
          errorCount++
          errors.push(`Error: ${err.message}`)
        }
      }
    }

    // ===== IMPORT SISWA =====
    else if (type === 'students') {
      // Ambil daftar kelas untuk validasi
      const { data: classes } = await supabase.from('classes').select('id, name')
      const classMap = new Map<string, number>()
      const classIdMap = new Map<number, string>()
      classes?.forEach(c => {
        classMap.set(c.name.toLowerCase(), c.id)
        classIdMap.set(c.id, c.name)
      })

      for (const row of data) {
        try {
          const nis = String(row.nis || row.NIS || '').trim()
          const name = row.name || row.nama || row.Nama
          const classRef = row.class_id || row.class || row.kelas || row.Kelas

          if (!nis || !name || !classRef) {
            errorCount++
            errors.push(`Baris tanpa NIS, nama, atau kelas`)
            continue
          }

          // Resolve class_id
          let classId: number | null = null
          if (typeof classRef === 'number') {
            classId = classRef
          } else {
            const classStr = String(classRef).trim()
            // Coba cari by ID
            if (!isNaN(parseInt(classStr))) {
              classId = parseInt(classStr)
            }
            // Coba cari by nama
            else {
              classId = classMap.get(classStr.toLowerCase()) || null
            }
          }

          if (!classId || !classIdMap.has(classId)) {
            errorCount++
            errors.push(`Kelas "${classRef}" tidak ditemukan untuk NIS ${nis}`)
            continue
          }

          if (importMode === 'upsert') {
            const { data: existing } = await supabase
              .from('students')
              .select('id')
              .eq('nis', nis)
              .single()

            if (existing) {
              await supabase
                .from('students')
                .update({ name: name.trim(), class_id: classId })
                .eq('id', existing.id)
              successCount++
              continue
            }
          }

          const { error } = await supabase
            .from('students')
            .insert({ nis, name: name.trim(), class_id: classId })

          if (error) {
            errorCount++
            errors.push(`Gagal menambah "${name}" (NIS: ${nis}): ${error.message}`)
          } else {
            successCount++
          }
        } catch (err: any) {
          errorCount++
          errors.push(`Error: ${err.message}`)
        }
      }
    }

        // ===== IMPORT KORELASI GURU-KELAS =====
    else if (type === 'teacher_classes') {
      // Ambil semua data referensi
      const { data: allTeachers } = await supabase.from('teachers').select('id, name')
      const { data: allClasses } = await supabase.from('classes').select('id, name')

      const teacherMap = new Map<string, number>()
      const classMap = new Map<string, number>()
      allTeachers?.forEach(t => teacherMap.set(t.name.toLowerCase().trim(), t.id))
      allClasses?.forEach(c => classMap.set(c.name.toLowerCase().trim(), c.id))

      // Group by teacher
      const teacherClassMap = new Map<number, Set<number>>()

      for (const row of data) {
        try {
          // Resolve teacher
          let teacherId: number | null = null
          const teacherRef = row.teacher_name || row.teacher || row.Teacher || row.teacher_id
          
          if (typeof teacherRef === 'number') {
            teacherId = teacherRef
          } else if (teacherRef) {
            const teacherStr = String(teacherRef).trim()
            if (!isNaN(parseInt(teacherStr))) {
              teacherId = parseInt(teacherStr)
            } else {
              teacherId = teacherMap.get(teacherStr.toLowerCase()) || null
            }
          }

          // Resolve class
          let classId: number | null = null
          const classRef = row.class_name || row.class || row.Kelas || row.class_id
          
          if (typeof classRef === 'number') {
            classId = classRef
          } else if (classRef) {
            const classStr = String(classRef).trim()
            if (!isNaN(parseInt(classStr))) {
              classId = parseInt(classStr)
            } else {
              classId = classMap.get(classStr.toLowerCase()) || null
            }
          }

          if (!teacherId || !classId) {
            errorCount++
            errors.push(`Guru "${teacherRef}" atau Kelas "${classRef}" tidak ditemukan`)
            continue
          }

          if (!teacherClassMap.has(teacherId)) {
            teacherClassMap.set(teacherId, new Set())
          }
          teacherClassMap.get(teacherId)!.add(classId)
          successCount++
        } catch (err: any) {
          errorCount++
          errors.push(`Error: ${err.message}`)
        }
      }

      // Apply changes: replace korelasi untuk guru yang ada di CSV
      for (const [teacherId, classIds] of teacherClassMap.entries()) {
        try {
          // Hapus korelasi lama guru ini
          await supabase
            .from('teacher_classes')
            .delete()
            .eq('teacher_id', teacherId)

          // Insert korelasi baru
          if (classIds.size > 0) {
            const rows = Array.from(classIds).map(classId => ({
              teacher_id: teacherId,
              class_id: classId
            }))
            const { error } = await supabase
              .from('teacher_classes')
              .insert(rows)
            if (error) {
              errors.push(`Gagal simpan korelasi guru ID ${teacherId}: ${error.message}`)
            }
          }
        } catch (err: any) {
          errors.push(`Error simpan guru ID ${teacherId}: ${err.message}`)
        }
      }
    }

    else {
      return NextResponse.json({ error: 'Tipe import tidak valid' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      successCount,
      errorCount,
      errors: errors.slice(0, 20) // Max 20 error
    })
  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Gagal mengimport data: ' + error.message },
      { status: 500 }
    )
  }
}