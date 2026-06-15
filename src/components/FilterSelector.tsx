import type { FilterMode } from "../utils/imageProcessor";

interface FilterSelectorProps {
  selected: FilterMode;
  onChange: (mode: FilterMode) => void;
  previewUrl: string;
}

const filters: {
  mode: FilterMode;
  label: string;
  desc: string;
  icon: string;
}[] = [
  { mode: "bw", label: "Blanco y negro", desc: "Texto nítido, fondo blanco puro", icon: "⬛" },
  { mode: "grayscale", label: "Escala de grises", desc: "Tonos suaves, sin color", icon: "🔲" },
  { mode: "color", label: "Color", desc: "Conserva los colores originales", icon: "🎨" },
];

export function FilterSelector({ selected, onChange, previewUrl }: FilterSelectorProps) {
  return (
    <div className="flex flex-col bg-[#0D1526] min-h-screen pb-28">
      {/* Header */}
      <div className="bg-[#0D1A35] border-b border-[#1E2D4D] px-4 py-3">
        <h2 className="text-white font-bold text-sm text-center">
          ¿Cómo desea escanear este documento?
        </h2>
        <p className="text-slate-400 text-xs text-center mt-0.5">
          Seleccione el modo de digitalización
        </p>
      </div>

      <div className="flex-1 px-4 py-4 flex flex-col gap-4 max-w-sm mx-auto w-full">

        {/* Aperçu */}
        <div className="w-full rounded-2xl overflow-hidden border border-[#1E2D4D] shadow-2xl bg-white">
          <img
            src={previewUrl}
            alt="Vista previa"
            className="w-full object-contain max-h-40"
          />
          <div className="px-3 py-2 border-t border-[#1E2D4D] bg-[#0D1A35]">
            <p className="text-xs text-slate-500 text-center">
              Vista previa del documento recortado
            </p>
          </div>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-3">
          {filters.map((f) => (
            <button
              key={f.mode}
              onClick={() => onChange(f.mode)}
              className={`flex items-center gap-4 rounded-2xl p-4 border-2 transition-all cursor-pointer ${
                selected === f.mode
                  ? "border-[#4F8EF7] bg-[#1A2744] shadow-lg shadow-blue-900/30"
                  : "border-[#1E2D4D] bg-[#0D1A35] hover:border-[#4F8EF7]/40 hover:bg-[#112040]"
              }`}
            >
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                selected === f.mode ? "bg-[#4F8EF7]/20" : "bg-[#1A2744]"
              }`}>
                {f.icon}
              </div>
              <div className="text-left flex-1">
                <p className={`font-bold text-sm ${selected === f.mode ? "text-[#4F8EF7]" : "text-white"}`}>
                  {f.label}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selected === f.mode ? "border-[#4F8EF7] bg-[#4F8EF7]" : "border-[#2A3A5C]"
              }`}>
                {selected === f.mode && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}