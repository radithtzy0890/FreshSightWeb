import React, { useState } from 'react';
import { Maximize2, Trash2, X } from 'lucide-react';
import { AnalysisResult, Verdict, getVerdict } from '../types';
import { sound } from '../services/soundEngine';

interface HistoryJournalProps {
  history: AnalysisResult[];
  onSelectDetail: (item: AnalysisResult) => void;
  onDeleteItem: (id: number) => void;
  onClearAll: () => void;
  onNavigate: (id: string) => void;
}

export const HistoryJournal: React.FC<HistoryJournalProps> = ({
  history,
  onSelectDetail,
  onDeleteItem,
  onClearAll,
}) => {
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  return (
    <section id="section-riwayat" className="py-24 bg-[#0A2E19] text-white relative overflow-hidden border-t-2 border-black">

      <div className="max-w-7xl mx-auto px-6 sm:px-10 w-full relative z-10">

        {/* Clean Sent Photo History Gallery (Displaying user's actual photos cleanly) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-passata text-3xl uppercase tracking-tight text-white">
                HISTORI FOTO TERKIRIM
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-[#8DF947] text-black font-passata text-xs font-bold border-2 border-black">
                {history.length} FOTO
              </span>
            </div>

            {history.length > 0 && (
              <button
                onClick={() => {
                  sound.play('click');
                  onClearAll();
                }}
                className="px-3 py-1 rounded-xl bg-white/20 hover:bg-[#EB3322] text-xs font-passata uppercase transition-colors cursor-pointer"
              >
                Hapus Semua
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <p className="font-passata text-base text-white/60">
              Belum ada foto yang dikirimkan. Ambil atau unggah foto di Babak 01 untuk menyimpan rekam jejaknya di sini.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {history.map((item) => {
                const verdict: Verdict = item.verdict ?? getVerdict(item.conf, item.rot);
                const photo = item.thumb || item.img;

                return (
                  <div
                    key={item.id}
                    className="relative group rounded-2xl bg-[#F7F2E5] text-black border-3 border-black shadow-[4px_4px_0_#000000] overflow-hidden p-2 flex flex-col justify-between transition-transform hover:-translate-y-1 cursor-pointer"
                    onClick={() => {
                      sound.play('click');
                      onSelectDetail(item);
                    }}
                  >
                    {/* Photo Container */}
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black border-2 border-black mb-2">
                      {photo ? (
                        <img src={photo} alt="Fruit" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">🍎</div>
                      )}

                      {/* Stamped Badge */}
                      <span
                        className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-passata uppercase font-bold border border-black ${
                          verdict === 'segar' ? 'bg-[#8DF947] text-black' : 'bg-[#EB3322] text-white'
                        }`}
                      >
                        {verdict}
                      </span>

                      {/* Zoom trigger */}
                      {photo && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            sound.play('click');
                            setLightboxPhoto(photo);
                          }}
                          className="absolute bottom-1 right-1 p-1 rounded-md bg-white text-black opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Maximize2 size={12} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>

                    {/* Metadata & Quick Delete */}
                    <div className="flex items-center justify-between text-[11px] font-passata">
                      <span className="truncate uppercase font-bold">{item.fruit}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          sound.play('click');
                          onDeleteItem(item.id);
                        }}
                        className="text-black/50 hover:text-red-600 p-0.5"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <div
          onClick={() => {
            sound.play('click');
            setLightboxPhoto(null);
          }}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md cursor-zoom-out"
        >
          <div className="relative max-w-2xl max-h-[85vh] p-3 rounded-3xl border-3 border-black bg-[#F7F2E5] shadow-[8px_8px_0_#000000]">
            <img src={lightboxPhoto} alt="Full photo" className="max-h-[75vh] rounded-2xl object-contain border-2 border-black" />
            <button
              onClick={() => {
                sound.play('click');
                setLightboxPhoto(null);
              }}
              className="absolute -top-3 -right-3 p-2 rounded-full bg-[#8DF947] text-black border-2 border-black"
            >
              <X size={18} strokeWidth={3} />
            </button>
          </div>
        </div>
      )}

    </section>
  );
};
