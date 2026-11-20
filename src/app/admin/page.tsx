  // ===== EXPORT EXCEL (FORMAT SESUAI FILE CONTOH - JUDUL DIUPDATE) =====
  const handleExportAll = async () => {
    if (teachers.length === 0) {
      alert('Belum ada data untuk diexport')
      return
    }

    setExporting(true)
    try {
      const wb = XLSX.utils.book_new()
      const today = new Date().toLocaleDateString('id-ID')

      // ===== Sheet 1: Ranking Guru =====
      const rankingRows: any[] = [
        ['REKAPITULASI ANGKET UMPAN BALIK SISWA'], // <-- DIUBAH
        [`Tanggal: ${today}`],
        [],
        ['Rank', 'Nama Guru', 'Mata Pelajaran', 'Responden', 'Kepribadian', 'Sosial', 'Pedagogik', 'Profesional', 'Total']
      ]

      teachers.forEach((t, idx) => {
        rankingRows.push([
          idx + 1,
          t.name,
          t.subject,
          t.student_count,
          t.scores.kepribadian.toFixed(2),
          t.scores.sosial.toFixed(2),
          t.scores.pedagogik.toFixed(2),
          t.scores.profesional.toFixed(2),
          t.scores.total.toFixed(2)
        ])
      })

      const wsRanking = XLSX.utils.aoa_to_sheet(rankingRows)
      wsRanking['!cols'] = [
        { wch: 6 }, { wch: 30 }, { wch: 20 }, { wch: 12 },
        { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 13 }, { wch: 10 }
      ]
      XLSX.utils.book_append_sheet(wb, wsRanking, 'Rekapitulasi')

      // ===== Sheet Per Guru =====
      for (let i = 0; i < teachers.length; i++) {
        const teacher = teachers[i]
        const sheetNum = i + 1

        let sheetName = `${sheetNum}. ${teacher.name}`
        sheetName = sheetName.replace(/[\\\/\?\*\[\]:]/g, '')
        if (sheetName.length > 31) sheetName = sheetName.substring(0, 31)

        try {
          const res = await fetch(`/api/admin/teachers/${teacher.id}`)
          const data = await res.json()

          if (!res.ok) continue

          const detail = data
          const categoryCounts = detail.category_counts || {}
          const feedbacks = detail.feedbacks || []
          const studentCount = detail.student_count || 0

          const rows: any[] = []

          // Header
          rows.push(['LAPORAN DETAIL UMPAN BALIK SISWA']) // <-- DIUBAH
          rows.push([])

          // Info Guru
          rows.push(['Nama Guru', teacher.name])
          rows.push(['Mata Pelajaran', teacher.subject])
          rows.push(['Jumlah Responden', `${studentCount} siswa`])
          rows.push(['Skor Total', teacher.scores.total.toFixed(2)])
          rows.push([])

          // Analisis Skor Per Kategori
          rows.push(['ANALISIS SKOR PER KATEGORI'])
          rows.push(['Kategori', 'Skor'])
          rows.push(['Kepribadian', teacher.scores.kepribadian.toFixed(2)])
          rows.push(['Sosial', teacher.scores.sosial.toFixed(2)])
          rows.push(['Pedagogik', teacher.scores.pedagogik.toFixed(2)])
          rows.push(['Profesional', teacher.scores.profesional.toFixed(2)])
          rows.push([])

          // Distribusi Jawaban
          rows.push(['DISTRIBUSI JAWABAN'])
          rows.push(['Kategori', 'Tingkat', 'Jumlah', 'Persentase'])

          Object.entries(CATEGORY_LABELS).forEach(([key, label]) => {
            rows.push([label])
            const counts = categoryCounts[key] || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
            const totalAnswers = Object.values(counts).reduce((a: number, b: any) => a + b, 0)

            for (let s = 5; s >= 1; s--) {
              const count = counts[s as keyof typeof counts] || 0
              const pct = totalAnswers > 0 ? (count / totalAnswers) * 100 : 0
              rows.push(['', SCORE_LABELS[s as 1|2|3|4|5], count, `${pct.toFixed(1)}%`])
            }
          })

          rows.push([])

          // Saran & Masukan Siswa
          rows.push(['SARAN & MASUKAN SISWA'])
          rows.push(['No', 'Nama Siswa', 'NIS', 'Tanggal', 'Saran/Masukan'])

          if (feedbacks.length === 0) {
            rows.push(['', '', '', '', 'Tidak ada saran/masukan'])
          } else {
            feedbacks.forEach((fb: any, idx: number) => {
              rows.push([
                idx + 1,
                fb.student_name || '',
                fb.nis || '',
                fb.submitted_at ? new Date(fb.submitted_at).toLocaleString('id-ID') : '',
                fb.feedback || ''
              ])
            })
          }

          const ws = XLSX.utils.aoa_to_sheet(rows)
          ws['!cols'] = [
            { wch: 25 }, { wch: 35 }, { wch: 15 }, { wch: 25 }, { wch: 60 }
          ]
          XLSX.utils.book_append_sheet(wb, ws, sheetName)

        } catch (err) {
          console.error(`Error exporting teacher ${teacher.name}:`, err)
        }
      }

      // Download (Nama File Diubah)
      const filename = `Rekap_Umpan_Balik_Siswa_${new Date().toISOString().split('T')[0]}`
      XLSX.writeFile(wb, `${filename}.xlsx`)

    } catch (err: any) {
      alert('Gagal export: ' + err.message)
    } finally {
      setExporting(false)
    }
  }