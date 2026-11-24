# FreshSight — Klasifikasi Kesegaran Buah dengan Explainable AI

FreshSight adalah aplikasi computer vision untuk mengklasifikasikan kesegaran buah
(apel, pisang, jeruk) ke dalam **6 kelas**:

`fresh_apple` · `rotten_apple` · `fresh_banana` · `rotten_banana` · `fresh_orange` · `rotten_orange`

Aplikasi menampilkan vonis, probabilitas per kelas, Grad-CAM, area cacat, dan penjelasan
terukur. Foto diproses oleh model MobileNetV3Small yang berjalan di server inferensi lokal
(FastAPI + TensorFlow), lalu UI React menampilkan hasilnya.

> **Aplikasi aktif:** React/Vite di `apps/web` + FastAPI di `backend`.
> Laravel di root adalah scaffolding lama; route Blade-nya tidak dipakai sebagai UI utama.

## Fitur

- Upload foto/galeri, kamera web, dan kamera langsung HP.
- Klasifikasi 6 kelas kesegaran buah.
- **Grad-CAM** dan **area cacat** (mask) untuk explainability.
- **Auto-crop buah kecil** pada latar ramai (komponen merah/hijau).
- **Adaptive TTA** (flip + center-crop) saat keyakinan awal rendah.
- Status **RAGU** jika keyakinan < 60%.
- **Peringatan multi-buah** jika terdeteksi lebih dari satu kandidat buah.
- Riwayat analisis tersimpan di `localStorage` (tanpa server).
- Halaman terpisah: Beranda, Cara Kerja, Model & Data, Riwayat.
- Detail hasil dalam modal (foto/Grad-CAM/area cacat, probabilitas, ciri terukur, unduh ringkasan).
- Halaman Model & Data berisi arsitektur, metrik, dataset, dan batasan.

## Stack

| Bagian | Teknologi |
|---|---|
| UI | React 19, TypeScript, Vite 6, Tailwind CSS 4, React Router 7 (HashRouter) |
| API | FastAPI, Uvicorn, TensorFlow CPU 2.16, Keras 3, OpenCV, Pillow |
| Model | MobileNetV3Small + head 6 kelas (hasil recalibration) |
| Scaffolding | Laravel 13 / PHP 8.3 (tidak dipakai sebagai UI aktif) |

## Struktur Proyek

```text
backend/
  app.py                         # FastAPI: /v1/health, /v1/predict, Grad-CAM, fitur defek
  requirements.txt
  models/
    mobilenetv3small_external_green_v2.keras             # model aktif (4,13 MB)
    mobilenetv3small_external_green_v2_float16.tflite    # ekspor edge float16 (1,82 MiB, 2,48 ms)
    mobilenetv3small_external_recalibrated.keras         # model final naskah jurnal (4,13 MB)
  tools/
    recalibrate_orange_head.py   # script recalibration head (path dataset lokal)
    evaluate_all.py              # evaluasi menyeluruh (path dataset lokal)
    summarize_eval.py
    evaluation_results.json
    orange_recalibration_metrics.json
    web_vs_journal_comparison.json

apps/web/
  src/
    components/                  # Hero, ResultsInspector, HistoryJournal, ModelDataPage, dll.
    services/cvEngine.ts         # analisis lokal + fetchPredictionFromApi
    types/index.ts
    App.tsx                      # routing + state riwayat
    main.tsx                     # HashRouter
  public/fruit/                  # foto contoh
  dist/                          # hasil `npm run build`

resources/views/index.blade.php  # tampilan Blade lama (legacy)
```

## Menjalankan Aplikasi

### Prasyarat

- PHP 8.3 + Composer
- Node.js 20+ dan npm
- Python 3.12
- Git

### 1. Setup Laravel (opsional, untuk scaffolding/tests)

```powershell
composer install
copy .env.example .env
php artisan key:generate
New-Item database\database.sqlite
php artisan migrate
```

### 2. Jalankan backend model

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8001
```

Model aktif sudah ada di `backend/models/mobilenetv3small_external_green_v2.keras`.
Jika ingin memakai model lain:

```powershell
$env:MODEL_PATH = "C:\path\ke\model.keras"
uvicorn app:app --host 127.0.0.1 --port 8001
```

Cek backend:

```powershell
curl.exe http://127.0.0.1:8001/v1/health
```

### 3. Jalankan frontend

Dari root proyek:

```powershell
npm install
Set-Content apps\web\.env.local "VITE_PREDICT_API_URL=http://127.0.0.1:8001"
npm run dev
```

Buka **http://localhost:5173**.

### 4. Build produksi

```powershell
npm run build
```

Hasil build ada di `apps/web/dist`. UI memakai `HashRouter`, sehingga rute
`/#/cara-kerja`, `/#/model`, dan `/#/riwayat` tidak memerlukan rewrite server.

## Halaman

| Route | Isi |
|---|---|
| `/#/` | Beranda: upload/kamera, preset contoh, dan kartu hasil di samping area scan |
| `/#/cara-kerja` | Empat langkah analisis + kotak observasi hasil |
| `/#/model` | Arsitektur, metrik evaluasi, dataset, explainability, batasan |
| `/#/riwayat` | Riwayat tersimpan + modal detail yang bisa discroll |

## API

### `GET /v1/health`

```json
{
  "status": "ok",
  "model": {
    "name": "mobilenetv3small_external_green_v2",
    "file": "mobilenetv3small_external_green_v2.keras",
    "input": "224x224x3",
    "classes": ["fresh_apple", "rotten_apple", "fresh_banana", "rotten_banana", "fresh_orange", "rotten_orange"]
  }
}
```

### `POST /v1/predict`

`multipart/form-data`, field: `image`.

```powershell
curl.exe -X POST http://127.0.0.1:8001/v1/predict -F "image=@C:\path\foto.jpg"
```

Field respons utama:

- `label`, `fruit`, `freshness`, `confidence`
- `probs`: probabilitas 6 kelas
- `features`: `fruit_count`, `rasio_defek`, `jumlah_bercak`, `bercak_terbesar`,
  `lokasi_bercak`, `fokus_gradcam`, `jarak_warna`, `tekstur`
- `images`: `gradcam_overlay`, `defect_mask` (base64 PNG)
- `explanation`, `inference_ms`, `tta`, `crop_used`, `model`

CORS mengizinkan `http://localhost:5173`, `http://127.0.0.1:5173`,
`http://localhost:8000`, dan `http://127.0.0.1:8000`. Ubah `allow_origins`
di `backend/app.py` jika frontend berjalan di origin lain.

## Model

- Backbone: **MobileNetV3Small**, feature map terakhir 7×7×576 (116,02 MFLOPs).
- Head: GlobalAveragePooling2D → Dense 6 (softmax), total **942.582 parameter** (ukuran berkas `.keras` **4,13 MB**; ekspor TFLite `float16` **1,82 MiB**, latensi CPU **2,48 ms / 403,7 FPS**).
- Input: 224×224×3, skala 0–1, dengan `Rescaling(2, -1)` internal (menormalkan piksel ke `[-1, 1]`).
- Inferensi API memakai `@tf.function` (*graph mode* + *startup warmup*) sehingga latensi klasifikasi + Grad-CAM + analisis defek turun menjadi **~15–18 ms** (warm CPU).
- Koreksi orientasi EXIF otomatis (`ImageOps.exif_transpose`) untuk foto kamera ponsel.
- Deteksi non-buah (OOD): menolak objek di luar spektrum/morfologi buah dengan status `tidak_terdeteksi`.
- Grad-CAM: gradien kelas target terhadap feature map 7×7×576 dalam satu *forward-gradient pass* terpadu.
- Auto-crop: komponen buah merah/oranye/kuning/hijau yang kecil (<25% frame) dipakai untuk
  klasifikasi/Grad-CAM/fitur; buah close-up memakai frame penuh.
- TTA adaptif (flip + rotasi 90°/180°/270° + center-crop): aktif saat keyakinan penuh < 80%.
- Model aktif: `mobilenetv3small_external_green_v2.keras` (green orange + cacat orange
  ditambahkan ke head recalibration dengan seleksi berbasis *validation set*).

### Ringkasan evaluasi

| Dataset | n | Akurasi | Macro-F1 (kelas aktif) |
|---|---:|---:|---:|
| Test asli 6 kelas | 918 | **98,69%** | **0,9805** |
| Train sample (sanity check) | 300 | 99,33% | 0,9933 |
| AFQC Test (apel eksternal) | 232 | 93,97% | 0,9396 |
| Green orange holdout | 600 | **99,83%** | 0,9992 |
| Fresh orange eksternal | 200 | 94,00% | 0,9691 |
| Rotten orange eksternal | 200 | 100% | 1,0000 |
| Blackspot orange | 200 | 100% | 1,0000 |
| Canker orange | 200 | 98,00% | 0,9899 |
| AFQC apple fresh holdout | 209 | 98,09% (full) / 98,56% (letterbox) | 0,9903 |
| AFQC apple rotten holdout | 209 | 94,74% (full) / 98,56% (letterbox) | 0,9730 |
| Banana overripe | 239 | 100% | 1,0000 |
| External hard set (16) | 16 | 12/16 (75,00% full) / 13/16 (API+TTA) | 0,7528 |

Recall per kelas pada test asli: `fresh_apple` 98,31%, `rotten_apple` 100%,
`fresh_banana` 98,73%, `rotten_banana` 99,12%, `fresh_orange` 98,31%,
`rotten_orange` 100%.

### Overfitting check

- Stage 1 MobileNet: train 98,43% / val 98,84%
- Stage 2 MobileNet: train **99,88%** / val **99,68%** (selisih 0,20 poin)
- Train sample 300: **99,33%** vs test asli **98,69%** (selisih 0,64 poin)
- Model final diuji pada held-out: original 98,69%, green orange 99,83%,
  external apple 98,56%, banana 100%.

Kesimpulan: **model final tidak overfitting**. Satu eksperimen fine-tune eksternal
di tengah proses sempat menunjukkan gap train/val; model final memakai head
recalibrated dan hasil held-out-nya kuat. Kegagalan yang tersisa adalah domain shift
(latar ramai, buah dipotong, tumpukan, ilustrasi), bukan hafalan data training.

## Batasan yang Diketahui

- Model adalah **classifier satu buah**, bukan object detector. Buah yang saling
  menempel dapat dihitung sebagai satu komponen.
- Auto-crop memakai komponen merah/hijau; pisang di latar sangat ramai masih bisa
  salah. Untuk pisang, foto close-up dengan buah memenuhi frame memberi hasil terbaik.
- Pada subset AFQC dengan buah kecil, auto-crop menurunkan akurasi (94% → 87%);
  frame penuh tetap tersedia untuk foto close-up.
- Tumpukan buah, buah dipotong tidak umum, dan ilustrasi dapat menghasilkan RAGU
  atau kelas yang salah.
- `backend/tools/evaluate_all.py` dan `recalibrate_orange_head.py` memakai path
  dataset lokal dari mesin pengembang; sesuaikan path sebelum menjalankan ulang.

## Dataset & Kredit

- [Fruit-freshness-detection-dataset](https://github.com/zijianchen98/Fruit-freshness-detection-dataset)
- [AFQC (Apple Fruit Quality Categorization)](https://github.com/mustafa20999/AFQC)
- [Banana Images CNN](https://github.com/pratheesh3780/Banana_images_CNN)
- [Orange Fruit Image Dataset (Mendeley)](https://data.mendeley.com/datasets/zk4hzhtcdd/2)

## Lisensi

MIT.
