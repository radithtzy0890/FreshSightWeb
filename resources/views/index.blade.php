<!DOCTYPE html>
<html lang="id" class="scroll-smooth">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>FreshSight – Klasifikasi Kesegaran Buah Berbasis Explainable AI</title>
  <meta name="description" content="Klasifikasi kesegaran buah apel, pisang, dan jeruk dengan Grad-CAM dan deteksi anomali bio-optik.">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><path fill=%22%231C6E3D%22 d=%22M18 82C18 42 44 16 84 14c0 42-22 68-66 68z%22/></svg>">

  <!-- Google Fonts: Fraunces (Editorial Display Serif) & Plus Jakarta Sans (Modern Interface) & JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&display=swap" rel="stylesheet">

  @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="selection:bg-[#1C6E3D] selection:text-white">
  <!-- Scroll Progress Indicator (Adhering to Modern Web Guidance: aria-hidden="true" for purely visual indicators) -->
  <div id="scroll-progress" aria-hidden="true"></div>

  <!-- Toast Container -->
  <div id="toast-container" class="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none" aria-live="polite"></div>

  <!-- Top Floating Header -->
  <header class="fixed top-0 left-0 right-0 z-40 px-4 sm:px-8 py-3 transition-all duration-300">
    <div class="max-w-6xl mx-auto surface-glass rounded-full px-5 py-2.5 flex items-center justify-between shadow-lg">
      <!-- Brand Logo -->
      <a href="#section-beranda" data-scroll-to="section-beranda" class="flex items-center gap-2 text-base font-bold tracking-tight text-[var(--text-main)] group cursor-pointer">
        <span class="w-8 h-8 rounded-full bg-[var(--leaf-primary)] text-white flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm">
          <i data-lucide="leaf" class="w-4 h-4"></i>
        </span>
        <span class="font-editorial text-lg tracking-tight">Fresh<span class="text-[var(--leaf-primary)] font-bold">Sight</span></span>
      </a>

      <!-- Navigation Links -->
      <nav id="nav-links" class="relative hidden md:flex items-center gap-1 p-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs font-semibold" aria-label="Menu Utama">
        <span id="nav-active-pill" class="nav-pill-active"></span>
        <button data-nav="section-beranda" data-scroll-to="section-beranda" class="relative z-10 px-4 py-1.5 rounded-full text-[#F1F6F0] transition-colors cursor-pointer">Beranda</button>
        <button data-nav="section-analisis" data-scroll-to="section-analisis" class="relative z-10 px-4 py-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer">Analisis</button>
        <button data-nav="section-hasil" data-scroll-to="section-hasil" class="relative z-10 px-4 py-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer">Hasil</button>
        <button data-nav="section-riwayat" data-scroll-to="section-riwayat" class="relative z-10 px-4 py-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer">Riwayat</button>
        <button data-nav="section-model" data-scroll-to="section-model" class="relative z-10 px-4 py-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer">Model & Data</button>
      </nav>

      <!-- Right Controls: Theme Toggle & Quick CTA -->
      <div class="flex items-center gap-2.5">
        <button id="theme-toggle-btn" class="w-9 h-9 rounded-full flex items-center justify-center border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-main)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-sm" aria-label="Ganti Tema Gelap / Terang">
          <i data-lucide="sun" class="w-4 h-4 hidden dark:block"></i>
          <i data-lucide="moon" class="w-4 h-4 block dark:hidden"></i>
        </button>

        <button data-scroll-to="section-analisis" class="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[var(--text-main)] text-[var(--bg-primary)] hover:opacity-90 transition-all cursor-pointer shadow-sm">
          <span>Unggah Foto</span>
          <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    </div>
  </header>

  <main>
    <!-- HERO SECTION -->
    <section id="section-beranda" class="relative min-h-[92vh] pt-28 pb-16 flex items-center overflow-hidden">
      <!-- Background Ambient Glows -->
      <div class="absolute top-1/4 -right-24 w-96 h-96 rounded-full bg-[var(--citrus-soft)] opacity-60 blur-3xl pointer-events-none -z-10"></div>
      <div class="absolute bottom-10 -left-24 w-96 h-96 rounded-full bg-[var(--leaf-soft)] opacity-70 blur-3xl pointer-events-none -z-10"></div>

      <div class="max-w-6xl mx-auto px-6 sm:px-10 w-full">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          <!-- Left Column: Editorial Headline -->
          <div class="lg:col-span-7 flex flex-col items-start">
            <div class="hero-badge-reveal inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-[var(--leaf-soft)] text-[var(--leaf-primary)] border border-[var(--border-subtle)] mb-6 shadow-xs">
              <span class="w-2 h-2 rounded-full bg-[var(--leaf-primary)] animate-pulse"></span>
              <span>Explainable Fruit-Freshness AI</span>
            </div>

            <h1 class="hero-title-reveal font-editorial text-4xl sm:text-6xl lg:text-[4.25rem] leading-[1.04] font-bold text-[var(--text-main)] mb-6 tracking-tight">
              Masih <em class="italic text-[var(--leaf-primary)] font-normal">segar</em>, atau sudah lewat batas?
            </h1>

            <p class="hero-desc-reveal text-base sm:text-lg text-[var(--text-muted)] leading-relaxed max-w-xl mb-8">
              Dari satu foto apel, pisang, atau jeruk, FreshSight menentukan klasifikasi segar atau busuk serta mengekspos area defek penyebabnya dengan Grad-CAM berbasis explainable AI.
            </p>

            <div class="hero-cta-reveal flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <button data-scroll-to="section-analisis" class="btn-magnetic px-6 py-3.5 rounded-full text-sm font-semibold bg-[var(--text-main)] text-[var(--bg-primary)] hover:opacity-90 flex items-center gap-2 transition-all shadow-md cursor-pointer">
                <span>Mulai Analisis Buah</span>
                <i data-lucide="scan" class="w-4 h-4"></i>
              </button>
              <button data-scroll-to="section-model" class="btn-magnetic px-6 py-3.5 rounded-full text-sm font-semibold border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-main)] flex items-center gap-2 transition-all cursor-pointer">
                <span>Eksplorasi Model</span>
                <i data-lucide="chevron-right" class="w-4 h-4"></i>
              </button>
            </div>
          </div>

          <!-- Right Column: Interactive Optical Stage -->
          <div class="lg:col-span-5 flex flex-col items-center">
            <div class="hero-stage-card surface-card p-4 sm:p-5 w-full max-w-[420px] relative shadow-2xl">
              <!-- Showcase Stage Pedestal -->
              <div id="hero-stage-render" class="relative w-full aspect-square rounded-2xl overflow-hidden bg-[#ECE7DC] dark:bg-[#1A281F] flex items-center justify-center">
                <!-- SVG dynamically injected here -->
              </div>

              <!-- Realtime floating verdict card -->
              <div id="hero-stage-verdict" class="absolute bottom-7 left-7 right-7 surface-glass p-3 rounded-xl flex items-center justify-between shadow-xl transition-all duration-300">
                <!-- Populated dynamically -->
              </div>
            </div>

            <!-- Preset interactive selector chips -->
            <div id="hero-preset-chips" class="flex flex-wrap items-center justify-center gap-2 mt-5 max-w-sm" role="group" aria-label="Pilih Contoh Buah">
              <!-- Populated dynamically -->
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- METRICS STRIP -->
    <section id="stats-strip" class="border-y border-[var(--border-subtle)] bg-[var(--bg-secondary)] py-12">
      <div class="max-w-6xl mx-auto px-6 sm:px-10">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          <div class="flex flex-col border-r border-[var(--border-subtle)] last:border-0 pr-4">
            <span class="font-editorial text-3xl sm:text-5xl font-bold text-[var(--leaf-primary)] tabular-numbers" data-counter-target="99.6" data-counter-decimals="2" data-counter-suffix="%">0</span>
            <span class="text-xs sm:text-sm text-[var(--text-muted)] font-medium mt-1">Akurasi Uji Asli (997 objek)</span>
          </div>
          <div class="flex flex-col border-r border-[var(--border-subtle)] last:border-0 pr-4">
            <span class="font-editorial text-3xl sm:text-5xl font-bold text-[var(--leaf-primary)] tabular-numbers" data-counter-target="90.99" data-counter-decimals="2" data-counter-suffix="%">0</span>
            <span class="text-xs sm:text-sm text-[var(--text-muted)] font-medium mt-1">Akurasi Uji Eksternal (344 foto)</span>
          </div>
          <div class="flex flex-col border-r border-[var(--border-subtle)] last:border-0 pr-4">
            <span class="font-editorial text-3xl sm:text-5xl font-bold text-[var(--citrus-accent)] tabular-numbers" data-counter-target="6" data-counter-decimals="0">0</span>
            <span class="text-xs sm:text-sm text-[var(--text-muted)] font-medium mt-1">Kelas Kesegaran Buah</span>
          </div>
          <div class="flex flex-col pr-4">
            <span class="font-editorial text-3xl sm:text-5xl font-bold text-[var(--leaf-primary)] tabular-numbers" data-counter-target="3.74" data-counter-decimals="2" data-counter-suffix=" MB">0</span>
            <span class="text-xs sm:text-sm text-[var(--text-muted)] font-medium mt-1">Ukuran Model TFLite Siap Pakai</span>
          </div>
        </div>
      </div>
    </section>

    <!-- IMPACT OF EXTERNAL DATA BENCHMARK BANNER -->
    <section id="benchmark-section" class="py-20 lg:py-28">
      <div class="max-w-6xl mx-auto px-6 sm:px-10">
        <div class="surface-card bg-[#122A1E] text-white p-8 sm:p-12 lg:p-14 rounded-3xl relative overflow-hidden shadow-2xl">
          <!-- Background decoration -->
          <div class="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-[#1C6E3D] opacity-40 blur-3xl pointer-events-none"></div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
            <div class="lg:col-span-7">
              <span class="inline-flex items-center gap-1.5 text-xs uppercase font-bold tracking-widest text-[#52D487] mb-3">
                <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
                <span>Dampak Data Eksternal</span>
              </span>
              <h2 class="font-editorial text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
                Lonjakan 62% ke 91% pada Foto Dunia Nyata
              </h2>
              <p class="text-sm sm:text-base text-[#C2D8C9] leading-relaxed max-w-xl">
                Menambahkan 1.011 apel segar, 1.028 apel busuk, dan 954 pisang terlalu matang dari repositori publik membekali model ketahanan terhadap variasi cahaya dan sudut kamera ponsel tanpa menyentuh test-set asli.
              </p>
            </div>

            <div class="lg:col-span-5 flex flex-col gap-5 bg-[#0C1E15] p-6 rounded-2xl border border-[#1E3B2C]">
              <div>
                <div class="flex items-center justify-between text-xs text-[#9EB9A6] mb-1.5 font-medium">
                  <span>MobileNetV3 Baseline</span>
                  <span class="font-mono text-white font-bold">62,21%</span>
                </div>
                <div class="h-3 rounded-full bg-[#183425] overflow-hidden">
                  <div class="h-full rounded-full bg-[#759180] transition-all duration-1000" style="width: 0%" data-bar-target="62.21"></div>
                </div>
              </div>

              <div>
                <div class="flex items-center justify-between text-xs text-[#9EB9A6] mb-1.5 font-medium">
                  <span>MobileNetV3 + Data Eksternal</span>
                  <span class="font-mono text-[#52D487] font-bold">90,99%</span>
                </div>
                <div class="h-3 rounded-full bg-[#183425] overflow-hidden">
                  <div class="h-full rounded-full bg-[#52D487] transition-all duration-1000" style="width: 0%" data-bar-target="90.99"></div>
                </div>
              </div>

              <div class="pt-3 border-t border-[#1E3B2C] flex items-center justify-between text-xs text-[#9EB9A6]">
                <span>Peningkatan Akurasi Uji</span>
                <span class="text-[#52D487] font-bold font-mono">+28,78%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- WHY FRESHSIGHT FEATURE GRID -->
    <section class="py-12 lg:py-20">
      <div class="max-w-6xl mx-auto px-6 sm:px-10">
        <div class="flex flex-col items-center text-center max-w-2xl mx-auto mb-16">
          <span class="text-xs uppercase font-bold tracking-widest text-[var(--leaf-primary)] mb-2">Arsitektur & Transparansi</span>
          <h2 class="font-editorial text-3xl sm:text-5xl font-bold text-[var(--text-main)] tracking-tight">
            Mengapa FreshSight Berbeda
          </h2>
          <p class="text-sm sm:text-base text-[var(--text-muted)] mt-4">
            Bukan sekadar memberikan label tunggal, sistem dirancang untuk memberikan pertanggungjawaban visual dan integritas evaluasi ilmiah.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Card 1 -->
          <div class="surface-card-interactive p-6 flex flex-col justify-between">
            <div>
              <div class="w-12 h-12 rounded-2xl bg-[var(--leaf-soft)] text-[var(--leaf-primary)] flex items-center justify-center mb-5">
                <i data-lucide="flame" class="w-6 h-6"></i>
              </div>
              <h3 class="text-base font-bold text-[var(--text-main)] mb-2">Prediksi yang Dapat Dijelaskan</h3>
              <p class="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                Grad-CAM memetakan fokus konvolusi layer terdalam secara visual untuk membuktikan model melihat bercak pembusukan, bukan artefak latar belakang.
              </p>
            </div>
            <div class="mt-6 pt-4 border-t border-[var(--border-subtle)] text-xs font-mono text-[var(--text-dim)]">
              Convolutional Heatmap Layer
            </div>
          </div>

          <!-- Card 2 -->
          <div class="surface-card-interactive p-6 flex flex-col justify-between">
            <div>
              <div class="w-12 h-12 rounded-2xl bg-[var(--leaf-soft)] text-[var(--leaf-primary)] flex items-center justify-center mb-5">
                <i data-lucide="shield-check" class="w-6 h-6"></i>
              </div>
              <h3 class="text-base font-bold text-[var(--text-main)] mb-2">Evaluasi Bebas Kebocoran</h3>
              <p class="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                Pembagian data (train/val/test) dilakukan berdasarkan klaster perceptual near-duplicate dHash untuk mencegah data test bocor ke data latih.
              </p>
            </div>
            <div class="mt-6 pt-4 border-t border-[var(--border-subtle)] text-xs font-mono text-[var(--text-dim)]">
              Cluster-Aware Data Split
            </div>
          </div>

          <!-- Card 3 -->
          <div class="surface-card-interactive p-6 flex flex-col justify-between">
            <div>
              <div class="w-12 h-12 rounded-2xl bg-[var(--leaf-soft)] text-[var(--leaf-primary)] flex items-center justify-center mb-5">
                <i data-lucide="bar-chart-3" class="w-6 h-6"></i>
              </div>
              <h3 class="text-base font-bold text-[var(--text-main)] mb-2">Bukan Sekadar Akurasi Rata-rata</h3>
              <p class="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                Metrik presisi, recall, macro F1, dan confusion matrix transparan dilaporkan untuk setiap kelas minoritas yang rentan keliru.
              </p>
            </div>
            <div class="mt-6 pt-4 border-t border-[var(--border-subtle)] text-xs font-mono text-[var(--text-dim)]">
              Per-Class Classification Metrics
            </div>
          </div>

          <!-- Card 4 -->
          <div class="surface-card-interactive p-6 flex flex-col justify-between">
            <div>
              <div class="w-12 h-12 rounded-2xl bg-[var(--leaf-soft)] text-[var(--leaf-primary)] flex items-center justify-center mb-5">
                <i data-lucide="cpu" class="w-6 h-6"></i>
              </div>
              <h3 class="text-base font-bold text-[var(--text-main)] mb-2">Siap Pasang di Perangkat Edge</h3>
              <p class="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                Model diekspor ke TensorFlow Lite format float32 (3,74 MB) dan dynamic-range quantization (1,11 MB) untuk komputasi cepat di ponsel.
              </p>
            </div>
            <div class="mt-6 pt-4 border-t border-[var(--border-subtle)] text-xs font-mono text-[var(--text-dim)]">
              TFLite Quantized Deployment
            </div>
          </div>

          <!-- Card 5 -->
          <div class="surface-card-interactive p-6 flex flex-col justify-between">
            <div>
              <div class="w-12 h-12 rounded-2xl bg-[var(--leaf-soft)] text-[var(--leaf-primary)] flex items-center justify-center mb-5">
                <i data-lucide="target" class="w-6 h-6"></i>
              </div>
              <h3 class="text-base font-bold text-[var(--text-main)] mb-2">Pengujian Eksternal yang Jujur</h3>
              <p class="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                344 citra eksternal mandiri dan foto Wikimedia diuji terpisah untuk membuktikan performa nyata di luar dataset laboratorium.
              </p>
            </div>
            <div class="mt-6 pt-4 border-t border-[var(--border-subtle)] text-xs font-mono text-[var(--text-dim)]">
              Independent Benchmark Set
            </div>
          </div>

          <!-- Card 6 -->
          <div class="surface-card-interactive p-6 flex flex-col justify-between">
            <div>
              <div class="w-12 h-12 rounded-2xl bg-[var(--leaf-soft)] text-[var(--leaf-primary)] flex items-center justify-center mb-5">
                <i data-lucide="layers" class="w-6 h-6"></i>
              </div>
              <h3 class="text-base font-bold text-[var(--text-main)] mb-2">Inspeksi Multi-Layer</h3>
              <p class="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                Inspeksi dapat dialihkan seketika antara foto mentah, peta panas aktivasi Grad-CAM, serta segmentasi bercak cacat visual buah.
              </p>
            </div>
            <div class="mt-6 pt-4 border-t border-[var(--border-subtle)] text-xs font-mono text-[var(--text-dim)]">
              Interactive Layer Blending
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 3 SIMPLE STEPS WORKFLOW -->
    <section class="py-16 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
      <div class="max-w-6xl mx-auto px-6 sm:px-10">
        <div class="flex flex-col items-center text-center max-w-xl mx-auto mb-14">
          <span class="text-xs uppercase font-bold tracking-widest text-[var(--leaf-primary)] mb-2">Alur Kerja</span>
          <h2 class="font-editorial text-3xl sm:text-4xl font-bold text-[var(--text-main)]">Tiga Langkah Mudah</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="surface-card p-6 flex flex-col">
            <span class="font-editorial text-5xl font-bold text-[var(--citrus-accent)] mb-3">01</span>
            <h3 class="text-base font-bold text-[var(--text-main)] mb-2">Ambil atau Unggah Foto</h3>
            <p class="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              Gunakan kamera ponsel atau galeri file (JPG/PNG). Foto satu buah di tengah dengan pencahayaan cukup untuk hasil terbaik.
            </p>
          </div>

          <div class="surface-card p-6 flex flex-col">
            <span class="font-editorial text-5xl font-bold text-[var(--citrus-accent)] mb-3">02</span>
            <h3 class="text-base font-bold text-[var(--text-main)] mb-2">Sistem Membaca Citra</h3>
            <p class="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              Buah disegmentasikan dari latar belakang, kemudian metrik bio-optik seperti warna HSV, bercak, dan kontras tekstur diukur.
            </p>
          </div>

          <div class="surface-card p-6 flex flex-col">
            <span class="font-editorial text-5xl font-bold text-[var(--citrus-accent)] mb-3">03</span>
            <h3 class="text-base font-bold text-[var(--text-main)] mb-2">Pahami Hasil & Alasannya</h3>
            <p class="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              Peta panas Grad-CAM dan diagnostik naratif memperlihatkan alasan persis mengapa buah tersebut diklasifikasikan segar atau busuk.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ANALYSIS STUDIO SECTION -->
    <section id="section-analisis" class="py-20 lg:py-28">
      <div class="max-w-6xl mx-auto px-6 sm:px-10">
        <div class="flex flex-col mb-10">
          <span class="text-xs uppercase font-bold tracking-widest text-[var(--leaf-primary)] mb-1">Studio Analisis</span>
          <h2 class="font-editorial text-3xl sm:text-5xl font-bold text-[var(--text-main)] tracking-tight">
            Unggah Foto Buah Anda
          </h2>
          <p class="text-sm text-[var(--text-muted)] mt-2">
            Mendukung klasifikasi buah Apel, Pisang, dan Jeruk menggunakan model deep learning.
          </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <!-- Left Column: Dropzone & Upload Controls -->
          <div class="lg:col-span-7 flex flex-col">
            <!-- Dropzone Area -->
            <div id="upload-dropzone" class="surface-card p-8 sm:p-12 text-center flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--leaf-primary)] transition-all cursor-pointer relative overflow-hidden">
              <div class="scanner-sweep"></div>
              <div id="dropzone-preview" class="flex flex-col items-center justify-center">
                <!-- Dropzone placeholder injected via JS -->
              </div>
              <input type="file" id="file-input" accept="image/jpeg,image/png" class="hidden">
              <input type="file" id="camera-input" accept="image/*" capture="environment" class="hidden">
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-wrap items-center gap-3 my-5">
              <button id="camera-btn" class="px-5 py-2.5 rounded-full text-xs font-semibold border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-main)] flex items-center gap-2 transition-all cursor-pointer shadow-xs">
                <i data-lucide="camera" class="w-4 h-4"></i>
                <span>Gunakan Kamera</span>
              </button>
              <button id="analyze-btn" class="btn-magnetic px-6 py-2.5 rounded-full text-xs font-semibold bg-[var(--text-main)] text-[var(--bg-primary)] hover:opacity-90 flex items-center gap-2 transition-all shadow-md cursor-pointer ml-auto">
                <i data-lucide="activity" class="w-4 h-4"></i>
                <span>Mulai Analisis</span>
              </button>
            </div>

            <!-- Pipeline Step Indicators -->
            <div id="pipeline-indicator-steps" class="grid grid-cols-4 gap-2 py-3 border-y border-[var(--border-subtle)] text-center text-xs font-medium">
              <div class="py-1.5 px-2 rounded-lg bg-[var(--bg-surface)] text-[var(--text-muted)] transition-all">1. Auto-Crop</div>
              <div class="py-1.5 px-2 rounded-lg bg-[var(--bg-surface)] text-[var(--text-muted)] transition-all">2. Klasifikasi</div>
              <div class="py-1.5 px-2 rounded-lg bg-[var(--bg-surface)] text-[var(--text-muted)] transition-all">3. Grad-CAM</div>
              <div class="py-1.5 px-2 rounded-lg bg-[var(--bg-surface)] text-[var(--text-muted)] transition-all">4. Diagnostik</div>
            </div>

            <!-- Local storage save toggle -->
            <div class="mt-4 flex items-center gap-2">
              <input type="checkbox" id="save-history-check" checked class="w-4 h-4 rounded text-[var(--leaf-primary)] focus:ring-0 cursor-pointer">
              <label for="save-history-check" class="text-xs text-[var(--text-muted)] cursor-pointer">
                Simpan hasil secara otomatis ke riwayat di peramban ini
              </label>
            </div>

            <!-- Quick Preset Samples -->
            <div class="mt-8">
              <div class="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-2">
                Belum punya foto? Coba sampel pengujian instan:
              </div>
              <div id="sample-analysis-pills" class="flex flex-wrap gap-2">
                <!-- Preset pills injected dynamically -->
              </div>
            </div>
          </div>

          <!-- Right Column: Optimization Tips & Model Engine Endpoint -->
          <div class="lg:col-span-5 flex flex-col gap-6">
            <!-- Photography tips -->
            <div class="surface-card p-6">
              <div class="flex items-center gap-2 mb-3">
                <i data-lucide="sparkles" class="w-4 h-4 text-[var(--citrus-accent)]"></i>
                <h3 class="text-sm font-bold text-[var(--text-main)]">Panduan Foto Optimal</h3>
              </div>
              <ul class="text-xs text-[var(--text-muted)] flex flex-col gap-2 pl-4 list-disc">
                <li>Satu buah di tengah bingkai, usahakan memenuhi 60-80% area foto.</li>
                <li>Gunakan latar belakang polos (kertas putih, meja kayu bersih tanpa corak ramai).</li>
                <li>Hindari bayangan keras atau pantulan lampu yang menutupi tekstur kulit.</li>
                <li>Foto buah secara utuh (belum dipotong atau dikupas).</li>
              </ul>
            </div>

            <!-- Machine Learning Engine Backend Connection -->
            <div class="surface-card p-6">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <i data-lucide="cpu" class="w-4 h-4 text-[var(--leaf-primary)]"></i>
                  <h3 class="text-sm font-bold text-[var(--text-main)]">Mesin Komputasi Model</h3>
                </div>
              </div>

              <div id="api-engine-status" class="text-xs text-[var(--text-muted)] mb-4 flex flex-col gap-1.5">
                <!-- Status text injected via JS -->
              </div>

              <div class="flex items-center gap-2">
                <input type="text" id="api-url-input" placeholder="http://localhost:8000" class="flex-1 px-3 py-2 rounded-xl text-xs bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-main)] focus:outline-none focus:border-[var(--leaf-primary)]">
                <button id="api-connect-btn" class="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] text-[var(--text-main)] transition-all cursor-pointer">
                  Hubungkan
                </button>
              </div>
              <p class="text-[11px] text-[var(--text-dim)] mt-2">
                Kosongkan URL untuk beralih kembali ke mode komputasi internal browser.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- RESULTS DIAGNOSTIC SECTION -->
    <section id="section-hasil" class="py-20 lg:py-28 bg-[var(--bg-secondary)] border-y border-[var(--border-subtle)]">
      <div class="max-w-6xl mx-auto px-6 sm:px-10">
        <div class="flex flex-col mb-10">
          <span class="text-xs uppercase font-bold tracking-widest text-[var(--leaf-primary)] mb-1">Diagnostik Lengkap</span>
          <h2 class="font-editorial text-3xl sm:text-5xl font-bold text-[var(--text-main)] tracking-tight">
            Hasil Klasifikasi & Grad-CAM
          </h2>
        </div>

        <div id="results-content-box">
          <!-- Initial Placeholder when no analysis has run -->
          <div class="surface-card p-12 text-center flex flex-col items-center justify-center">
            <div class="w-16 h-16 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-dim)] mb-4">
              <i data-lucide="scan" class="w-8 h-8"></i>
            </div>
            <div class="font-editorial text-2xl font-bold text-[var(--text-main)] mb-1">Belum Ada Hasil Analisis</div>
            <p class="text-xs sm:text-sm text-[var(--text-muted)] max-w-md mb-6">
              Silakan unggah foto buah Anda di bagian Analisis atau pilih salah satu sampel pengujian untuk melihat visualisasi Grad-CAM.
            </p>
            <button data-scroll-to="section-analisis" class="px-6 py-2.5 rounded-full text-xs font-semibold bg-[var(--text-main)] text-[var(--bg-primary)] hover:opacity-90 transition-all cursor-pointer">
              Ke Form Unggah Foto
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- HISTORY SECTION -->
    <section id="section-riwayat" class="py-20 lg:py-28">
      <div class="max-w-6xl mx-auto px-6 sm:px-10">
        <div class="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <span class="text-xs uppercase font-bold tracking-widest text-[var(--leaf-primary)] mb-1">Riwayat Perangkat</span>
            <h2 class="font-editorial text-3xl sm:text-5xl font-bold text-[var(--text-main)] tracking-tight">
              Analisis Tersimpan
            </h2>
          </div>
          <div class="flex items-center gap-3">
            <span id="history-count-badge" class="text-xs text-[var(--text-muted)] font-mono">0 tersimpan</span>
            <button id="clear-history-btn" class="px-3.5 py-1.5 rounded-full text-xs font-semibold border border-[var(--border-subtle)] text-[#C9421A] hover:bg-[#FDE8E1] dark:hover:bg-[#361919] transition-all cursor-pointer" style="display: none;">
              Bersihkan Riwayat
            </button>
          </div>
        </div>

        <!-- Filter & Search Controls -->
        <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-8">
          <div class="sm:col-span-6 relative">
            <i data-lucide="search" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]"></i>
            <input type="text" id="history-search-input" placeholder="Cari nama buah..." class="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-main)] focus:outline-none focus:border-[var(--leaf-primary)]">
          </div>
          <div class="sm:col-span-3">
            <select id="history-fruit-filter" class="w-full px-3 py-2.5 rounded-xl text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-main)] focus:outline-none focus:border-[var(--leaf-primary)] cursor-pointer">
              <option value="">Semua Buah</option>
              <option value="apple">Apel</option>
              <option value="banana">Pisang</option>
              <option value="orange">Jeruk</option>
            </select>
          </div>
          <div class="sm:col-span-3">
            <select id="history-status-filter" class="w-full px-3 py-2.5 rounded-xl text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-main)] focus:outline-none focus:border-[var(--leaf-primary)] cursor-pointer">
              <option value="">Semua Status</option>
              <option value="f">Segar</option>
              <option value="r">Busuk</option>
            </select>
          </div>
        </div>

        <!-- Cards Grid Container -->
        <div id="history-cards-container" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- History cards injected via JS -->
        </div>
      </div>
    </section>

    <!-- MODEL & DATASET RESEARCH SECTION -->
    <section id="section-model" class="py-20 lg:py-28 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)]">
      <div class="max-w-6xl mx-auto px-6 sm:px-10">
        <div class="flex flex-col mb-12">
          <span class="text-xs uppercase font-bold tracking-widest text-[var(--leaf-primary)] mb-1">Riset & Spesifikasi</span>
          <h2 class="font-editorial text-3xl sm:text-5xl font-bold text-[var(--text-main)] tracking-tight">
            Arsitektur Model & Benchmark
          </h2>
          <p class="text-sm text-[var(--text-muted)] mt-2 max-w-2xl">
            Dokumentasi komprehensif alur pemrosesan dari dataset Pascal VOC hingga inferensi edge TensorFlow Lite.
          </p>
        </div>

        <!-- Pipeline Flowchart -->
        <div class="surface-card p-6 sm:p-8 mb-10">
          <h3 class="text-base font-bold text-[var(--text-main)] mb-6 flex items-center gap-2">
            <i data-lucide="sliders" class="w-4 h-4 text-[var(--leaf-primary)]"></i>
            <span>Pipeline Pelatihan & Inferensi</span>
          </h3>

          <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
            <div class="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col justify-between">
              <span class="font-editorial text-lg font-bold text-[var(--citrus-accent)]">01</span>
              <div class="text-[11px] font-bold text-[var(--text-main)] mt-1">Pascal VOC</div>
              <span class="text-[10px] text-[var(--text-muted)] mt-0.5">Citra + XML BBox</span>
            </div>
            <div class="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col justify-between">
              <span class="font-editorial text-lg font-bold text-[var(--citrus-accent)]">02</span>
              <div class="text-[11px] font-bold text-[var(--text-main)] mt-1">dHash Dedupe</div>
              <span class="text-[10px] text-[var(--text-muted)] mt-0.5">Klaster kemiripan</span>
            </div>
            <div class="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col justify-between">
              <span class="font-editorial text-lg font-bold text-[var(--citrus-accent)]">03</span>
              <div class="text-[11px] font-bold text-[var(--text-main)] mt-1">Split Bebas Bocor</div>
              <span class="text-[10px] text-[var(--text-muted)] mt-0.5">70 / 15 / 15</span>
            </div>
            <div class="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col justify-between">
              <span class="font-editorial text-lg font-bold text-[var(--citrus-accent)]">04</span>
              <div class="text-[11px] font-bold text-[var(--text-main)] mt-1">Crop + Pad 5%</div>
              <span class="text-[10px] text-[var(--text-muted)] mt-0.5">Resize 224x224</span>
            </div>
            <div class="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col justify-between">
              <span class="font-editorial text-lg font-bold text-[var(--citrus-accent)]">05</span>
              <div class="text-[11px] font-bold text-[var(--text-main)] mt-1">MobileNetV3</div>
              <span class="text-[10px] text-[var(--text-muted)] mt-0.5">Transfer Learning</span>
            </div>
            <div class="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col justify-between">
              <span class="font-editorial text-lg font-bold text-[var(--citrus-accent)]">06</span>
              <div class="text-[11px] font-bold text-[var(--text-main)] mt-1">Evaluasi F1</div>
              <span class="text-[10px] text-[var(--text-muted)] mt-0.5">Per-Class Metrics</span>
            </div>
            <div class="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col justify-between">
              <span class="font-editorial text-lg font-bold text-[var(--citrus-accent)]">07</span>
              <div class="text-[11px] font-bold text-[var(--text-main)] mt-1">Grad-CAM</div>
              <span class="text-[10px] text-[var(--text-muted)] mt-0.5">Visual Explainability</span>
            </div>
            <div class="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col justify-between">
              <span class="font-editorial text-lg font-bold text-[var(--citrus-accent)]">08</span>
              <div class="text-[11px] font-bold text-[var(--text-main)] mt-1">TFLite Export</div>
              <span class="text-[10px] text-[var(--text-muted)] mt-0.5">Edge Deployment</span>
            </div>
          </div>
        </div>

        <!-- Benchmark Tables Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <!-- Table 1: Model Comparison -->
          <div class="surface-card p-6 overflow-x-auto">
            <h3 class="text-sm font-bold text-[var(--text-main)] mb-4">Perbandingan Tiga Model</h3>
            <table class="w-full text-xs text-left">
              <thead>
                <tr class="border-b border-[var(--border-subtle)] text-[var(--text-dim)] uppercase font-semibold">
                  <th class="py-2.5 pr-2">Arsitektur</th>
                  <th class="py-2.5 px-2 text-right">Uji Asli</th>
                  <th class="py-2.5 px-2 text-right">Macro F1</th>
                  <th class="py-2.5 px-2 text-right">Uji Eksternal</th>
                  <th class="py-2.5 pl-2 text-right">Ukuran</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--border-subtle)] font-mono">
                <tr>
                  <td class="py-2.5 pr-2 font-sans font-medium text-[var(--text-main)]">CNN Baseline</td>
                  <td class="py-2.5 px-2 text-right">99,60%</td>
                  <td class="py-2.5 px-2 text-right">0,9906</td>
                  <td class="py-2.5 px-2 text-right text-[var(--text-dim)]">—</td>
                  <td class="py-2.5 pl-2 text-right">5,16 MB</td>
                </tr>
                <tr>
                  <td class="py-2.5 pr-2 font-sans font-medium text-[var(--text-main)]">MobileNetV3 Baseline</td>
                  <td class="py-2.5 px-2 text-right">99,20%</td>
                  <td class="py-2.5 px-2 text-right">0,9871</td>
                  <td class="py-2.5 px-2 text-right text-[#C9421A]">62,21%</td>
                  <td class="py-2.5 pl-2 text-right">11,84 MB</td>
                </tr>
                <tr class="bg-[var(--leaf-soft)] font-bold text-[var(--leaf-primary)]">
                  <td class="py-2.5 pr-2 font-sans">MobileNetV3 + Eksternal</td>
                  <td class="py-2.5 px-2 text-right">99,60%</td>
                  <td class="py-2.5 px-2 text-right">0,9912</td>
                  <td class="py-2.5 px-2 text-right">90,99%</td>
                  <td class="py-2.5 pl-2 text-right">10,05 MB</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Table 2: TFLite Quantization -->
          <div class="surface-card p-6 overflow-x-auto">
            <h3 class="text-sm font-bold text-[var(--text-main)] mb-4">Varian Ekspor TensorFlow Lite</h3>
            <table class="w-full text-xs text-left">
              <thead>
                <tr class="border-b border-[var(--border-subtle)] text-[var(--text-dim)] uppercase font-semibold">
                  <th class="py-2.5 pr-2">Format Berkas</th>
                  <th class="py-2.5 px-2 text-right">Akurasi Asli</th>
                  <th class="py-2.5 px-2 text-right">Eksternal</th>
                  <th class="py-2.5 pl-2 text-right">Ukuran</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--border-subtle)] font-mono">
                <tr>
                  <td class="py-2.5 pr-2 font-sans font-medium text-[var(--text-main)]">mobilenetv3_external_float32.tflite</td>
                  <td class="py-2.5 px-2 text-right">99,60%</td>
                  <td class="py-2.5 px-2 text-right">91,28%</td>
                  <td class="py-2.5 pl-2 text-right font-bold text-[var(--leaf-primary)]">3,74 MB</td>
                </tr>
                <tr>
                  <td class="py-2.5 pr-2 font-sans font-medium text-[var(--text-main)]">mobilenetv3_external_dynamic.tflite</td>
                  <td class="py-2.5 px-2 text-right">99,10%</td>
                  <td class="py-2.5 px-2 text-right">88,37%</td>
                  <td class="py-2.5 pl-2 text-right font-bold text-[var(--leaf-primary)]">1,11 MB</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Dataset Attribution List -->
        <div class="surface-card p-6 sm:p-8">
          <h3 class="text-sm font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
            <i data-lucide="file-text" class="w-4 h-4 text-[var(--leaf-primary)]"></i>
            <span>Sumber Dataset & Repositori</span>
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div class="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col justify-between">
              <div>
                <div class="font-bold text-[var(--text-main)]">Fruit-freshness-detection-dataset</div>
                <div class="text-[var(--text-muted)] mt-1">Dataset utama format Pascal VOC. Berisi 3.093 citra dan 6.977 anotasi kotak pembatas objek buah.</div>
              </div>
              <a href="https://github.com/zijianchen98/Fruit-freshness-detection-dataset" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-[var(--leaf-primary)] font-bold mt-3 hover:underline">
                <span>Buka Repositori GitHub</span>
                <i data-lucide="external-link" class="w-3 h-3"></i>
              </a>
            </div>

            <div class="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col justify-between">
              <div>
                <div class="font-bold text-[var(--text-main)]">AFQC (Apple Fruit Quality Categorization)</div>
                <div class="text-[var(--text-muted)] mt-1">Data augmentasi eksternal apel segar dan busuk dengan 2.320 citra beresolusi tinggi.</div>
              </div>
              <a href="https://github.com/mustafa20999/AFQC" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-[var(--leaf-primary)] font-bold mt-3 hover:underline">
                <span>Buka Repositori GitHub</span>
                <i data-lucide="external-link" class="w-3 h-3"></i>
              </a>
            </div>

            <div class="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col justify-between">
              <div>
                <div class="font-bold text-[var(--text-main)]">Banana Images CNN (Over Ripe)</div>
                <div class="text-[var(--text-muted)] mt-1">Data fine-tuning pisang terlalu matang dan busuk dengan 1.195 sampel citra nyata.</div>
              </div>
              <a href="https://github.com/pratheesh3780/Banana_images_CNN" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-[var(--leaf-primary)] font-bold mt-3 hover:underline">
                <span>Buka Repositori GitHub</span>
                <i data-lucide="external-link" class="w-3 h-3"></i>
              </a>
            </div>

            <div class="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col justify-between">
              <div>
                <div class="font-bold text-[var(--text-main)]">Orange Fruit Image Dataset (Mendeley)</div>
                <div class="text-[var(--text-muted)] mt-1">15.000 citra jeruk bertahap untuk pengembangan varian model generasi berikutnya.</div>
              </div>
              <a href="https://data.mendeley.com/datasets/zk4hzhtcdd/2" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-[var(--leaf-primary)] font-bold mt-3 hover:underline">
                <span>Buka Dataset Mendeley</span>
                <i data-lucide="external-link" class="w-3 h-3"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>

  <!-- FOOTER -->
  <footer class="py-12 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] text-xs text-[var(--text-muted)]">
    <div class="max-w-6xl mx-auto px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <span class="w-6 h-6 rounded-full bg-[var(--leaf-primary)] text-white flex items-center justify-center">
          <i data-lucide="leaf" class="w-3 h-3"></i>
        </span>
        <span class="font-editorial text-sm font-bold text-[var(--text-main)]">FreshSight</span>
        <span>— Sistem Klasifikasi Kesegaran Buah Berbasis Citra & Grad-CAM</span>
      </div>
      <div class="flex items-center gap-4">
        <span>Lisensi Riset Terbuka</span>
        <span>•</span>
        <a href="#section-beranda" data-scroll-to="section-beranda" class="hover:text-[var(--text-main)] transition-colors">Kembali ke Atas</a>
      </div>
    </div>
  </footer>
</body>
</html>

