/**
 * Copyright (c) 2026 IDX Screener by @NeaByteLab (https://neabyte.com)
 * SPDX-License-Identifier: MIT
 *
 * Open to remote work & consulting.
 * Fullstack developer with a focus on security and experience in trading systems.
 */

import React from 'react'
import { Info } from 'lucide-react'

export default function About() {
  return (
    <div className='min-h-screen bg-black px-4 py-8 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-3xl rounded-2xl border border-[#39FF14]/20 bg-gray-900/80 p-6 shadow-lg shadow-[#39FF14]/5 backdrop-blur sm:p-8 lg:p-10'>
        <h1 className='mb-6 flex items-center gap-3 text-2xl font-bold tracking-tight text-white sm:text-3xl'>
          <Info size={28} strokeWidth={2} aria-hidden className='text-[#39FF14]' />
          <span>Tentang Aplikasi</span>
        </h1>
        <p className='mb-6 text-base leading-relaxed text-gray-300 sm:text-lg'>
          Dashboard gratis untuk screening dan analisa saham pasar Indonesia{' '}
          <strong className='text-[#39FF14]'>by @NeaByteLab</strong>.
        </p>

        <div className='space-y-6'>
          <p className='text-sm leading-relaxed text-gray-300 sm:text-base'>
            <strong className='text-white'>IDX Screener</strong> adalah aplikasi web yang menyediakan{' '}
            <strong className='text-white'>dashboard screening dan analisa saham</strong>{' '}
            untuk pasar modal Indonesia secara{' '}
            <strong className='text-[#39FF14]'>gratis</strong>. Aplikasi ini memudahkan Anda menyaring emiten berdasarkan
            fundamental (<strong className='text-white'>valuasi</strong>, <strong className='text-white'>profitabilitas</strong>,{' '}
            <strong className='text-white'>leverage</strong>), <strong className='text-white'>momentum</strong> harga, dan{' '}
            <strong className='text-white'>likuiditas</strong>, lalu mengurutkannya dengan skor gabungan sehingga Anda
            punya daftar kandidat yang terstruktur untuk riset lanjutan, bukan sekadar daftar saham
            acak atau rekomendasi tanpa dasar terukur.
          </p>
          <p className='text-sm leading-relaxed text-gray-300 sm:text-base'>
            Data fundamental dan ringkasan perdagangan diambil dari sumber resmi (termasuk data
            terbuka dari bursa dan pihak terkait) serta diperbarui secara berkala. Skor dihitung di
            server dengan metodologi factor investing (<strong className='text-white'>value</strong>,{' '}
            <strong className='text-white'>quality</strong>,{' '}
            <strong className='text-white'>momentum</strong>) yang lazim dipakai dalam riset akademik dan manajemen
            portofolio, rumus <strong className='text-white'>normalisasi</strong> dan <strong className='text-white'>bobot</strong>{' '}
            diterapkan seragam ke seluruh emiten sehingga perbandingan antarsaham adil. Dengan
            begitu, <strong className='text-[#39FF14]'>ranking</strong>{' '}
            konsisten, dapat direproduksi, dan dapat diandalkan sebagai titik awal analisa maupun
            riset lanjutan.
          </p>

          <h2 className='mt-8 mb-4 text-xl font-semibold tracking-tight text-[#39FF14] sm:text-2xl'>
            Yang Bisa Anda Lakukan
          </h2>
          <ul className='space-y-3 text-sm text-gray-300 sm:text-base'>
            <li className='rounded-lg border border-[#39FF14]/10 bg-gray-800/50 p-4'>
              <strong className='text-white'>Screener</strong>: Lihat daftar kandidat saham yang lolos filter, diurutkan
              berdasarkan skor gabungan (<strong className='text-white'>composite</strong>). Tabel menampilkan kode, nama
              emiten, sektor, <strong className='text-white'>PER</strong>, <strong className='text-white'>ROE</strong>,{' '}
              <strong className='text-white'>DER</strong>, return <strong className='text-white'>26w</strong> & <strong className='text-white'>52w</strong>, serta{' '}
              <strong className='text-white'>persentil</strong> <strong className='text-white'>composite</strong>.
            </li>
            <li className='rounded-lg border border-[#39FF14]/10 bg-gray-800/50 p-4'>
              <strong className='text-white'>Filter</strong>: Atur batas valuasi (<strong className='text-white'>PER</strong>{' '}
              min/max), fundamental (<strong className='text-white'>ROE</strong> min, <strong className='text-white'>DER</strong>{' '}
              max), momentum (periode{' '}
              <strong className='text-white'>26w</strong>/<strong className='text-white'>52w</strong>, batas minimal return),{' '}
              <strong className='text-white'>likuiditas</strong> (min <strong className='text-white'>value</strong> &{' '}
              <strong className='text-white'>volume</strong>), dan opsi eksklusi (<strong className='text-white'>notation</strong>,{' '}
              <strong className='text-white'>corporate action</strong>,{' '}
              <strong className='text-white'>UMA</strong>) agar daftar sesuai profil risiko dan preferensi Anda.
            </li>
            <li className='rounded-lg border border-[#39FF14]/10 bg-gray-800/50 p-4'>
              <strong className='text-white'>Kekuatan Sektor</strong>: Lihat rata-rata <strong className='text-white'>momentum</strong>{' '}
              per sektor (<strong className='text-white'>26w</strong> atau{' '}
              <strong className='text-white'>52w</strong>) untuk konteks makro: sektor mana yang secara agregat sedang
              positif atau negatif.
            </li>
            <li className='rounded-lg border border-[#39FF14]/10 bg-gray-800/50 p-4'>
              <strong className='text-white'>Detail Saham</strong>: Klik baris di tabel untuk membuka modal berisi{' '}
              <strong className='text-white'>klasifikasi</strong>, <strong className='text-white'>valuasi</strong>,{' '}
              <strong className='text-white'>profitabilitas</strong>, <strong className='text-white'>leverage</strong>, skor per pilar,{' '}
              <strong className='text-white'>momentum</strong>{' '}
              multi-horizon, dan grafik harga (<strong className='text-white'>OHLC</strong>) 90 hari terakhir.
            </li>
          </ul>
          <p className='text-sm leading-relaxed text-gray-300 sm:text-base'>
            Semua fitur di atas tersedia tanpa biaya. Untuk penjelasan rumus skor,{' '}
            <strong className='text-white'>normalisasi</strong>, dan urutan filter, buka tab <strong className='text-white'>Metodologi</strong>,
            {' '}
            <strong className='text-white'>Skor</strong>, <strong className='text-white'>Filter & Risiko</strong>, serta{' '}
            <strong className='text-white'>Cara Pakai</strong> di halaman <strong className='text-white'>Beranda</strong>.
          </p>

          <h3 className='mt-6 mb-3 text-lg font-semibold text-white sm:text-xl'>
            Metodologi Singkat
          </h3>
          <p className='text-sm leading-relaxed text-gray-300 sm:text-base'>
            Skor gabungan dibangun dari tiga pilar dengan <strong className='text-[#39FF14]'>bobot</strong>{' '}
            dan indikator berikut:
          </p>
          <ul className='space-y-3 text-sm text-gray-300 sm:text-base'>
            <li className='rounded-lg border border-[#39FF14]/10 bg-gray-800/50 p-4'>
              <strong className='text-[#39FF14]'>Valuasi (40%)</strong>: <strong className='text-white'>PER</strong> & <strong className='text-white'>PBV</strong>{' '}
              rendah = relatif murah.
            </li>
            <li className='rounded-lg border border-[#39FF14]/10 bg-gray-800/50 p-4'>
              <strong className='text-[#39FF14]'>Kualitas (30%)</strong>: <strong className='text-white'>ROE</strong>, <strong className='text-white'>ROA</strong>,{' '}
              <strong className='text-white'>DER</strong> untuk profitabilitas dan kesehatan utang.
            </li>
            <li className='rounded-lg border border-[#39FF14]/10 bg-gray-800/50 p-4'>
              <strong className='text-[#39FF14]'>Momentum (30%)</strong>: return <strong className='text-white'>26w</strong>/<strong className='text-white'>52w</strong>{' '}
              untuk tren harga.
            </li>
          </ul>
          <p className='text-sm leading-relaxed text-gray-300 sm:text-base'>
            Nilai di-<strong className='text-white'>normalisasi</strong>{' '}
            ke skala 0-1 lalu di-<strong className='text-white'>bobot</strong>. Indikator yang &quot;lebih rendah = lebih
            baik&quot; (<strong className='text-white'>PER</strong>, <strong className='text-white'>PBV</strong>,{' '}
            <strong className='text-white'>DER</strong>) di-inversi agar <strong className='text-[#39FF14]'>ranking</strong> sejalan dengan logika
            {' '}
            <strong className='text-[#39FF14]'>value</strong> dan <strong className='text-[#39FF14]'>kualitas</strong>.
          </p>

          <div className='mt-6 rounded-lg border border-yellow-500/30 bg-yellow-900/20 p-5'>
            <p className='text-sm leading-relaxed text-gray-300 sm:text-base'>
              <strong className='text-yellow-400'>Disclaimer</strong>: Gunakan informasi di <strong className='text-white'>screener</strong> dan{' '}
              <strong className='text-white'>detail saham</strong> hanya sebagai <em className='text-gray-400'>awal riset</em>{' '}
              dan bahan pertimbangan, bukan satu-satunya dasar keputusan investasi. Selalu lakukan
              riset mandiri (
              <strong className='text-white'>due diligence</strong>), baca laporan keuangan dan pengumuman emiten, serta
              pertimbangkan risiko pasar, kondisi makro, dan fundamental perusahaan sebelum
              berinvestasi. Data dan skor di sini bersifat informatif serta tidak menjamin hasil di
              masa depan, aplikasi ini tidak memberikan rekomendasi jual/beli maupun{' '}
              <strong className='text-white'>nasihat investasi</strong>. Semua keputusan investasi sepenuhnya menjadi
              tanggung jawab pengguna. Pengembang aplikasi tidak bertanggung jawab atas segala
              kerugian, klaim, tuntutan, atau konsekuensi lain yang timbul dari penggunaan data, skor,
              dan fitur di aplikasi ini.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
