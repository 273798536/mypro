import { useNavigate } from "react-router-dom";
import { Wheat, TrendingDown, AlertTriangle, Star } from "lucide-react";
import { levelConfigs } from "@/engine/levelConfigs";

const levelIcons = [Wheat, TrendingDown, AlertTriangle];

export default function LevelSelect() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: "#F5F0E8" }}>
      <div
        className="pointer-events-none absolute inset-0 z-10 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />

      <div className="relative z-20 flex min-h-screen flex-col">
        <header className="pt-16 pb-10 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="h-px w-16" style={{ backgroundColor: "#C8A951" }} />
            <Wheat size={28} style={{ color: "#C8A951" }} />
            <div className="h-px w-16" style={{ backgroundColor: "#C8A951" }} />
          </div>
          <h1
            className="mb-4 text-5xl font-black tracking-wide"
            style={{ color: "#2D3B2D", fontFamily: "'Playfair Display', serif" }}
          >
            期货套保农场
          </h1>
          <p
            className="mx-auto max-w-2xl text-lg leading-relaxed"
            style={{ color: "#5A6B5A", fontFamily: "'Noto Sans SC', sans-serif" }}
          >
            在模拟的农产品期货市场中，学习如何运用套期保值策略保护农场收益。
            <br />
            从基础到进阶，逐步掌握应对市场风险的实战能力。
          </p>
          <div className="mt-6 flex items-center justify-center gap-2">
            {[1, 2, 3].map((n) => (
              <Star
                key={n}
                size={14}
                fill="#C8A951"
                style={{ color: "#C8A951" }}
              />
            ))}
            <span
              className="ml-2 text-sm font-medium"
              style={{ color: "#8A7A4A", fontFamily: "'Noto Sans SC', sans-serif" }}
            >
              三大关卡 · 渐进式训练
            </span>
          </div>
        </header>

        <main className="flex flex-1 items-start justify-center px-6 pb-20">
          <div className="grid w-full max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
            {levelConfigs.map((level, index) => {
              const Icon = levelIcons[index];
              return (
                <div
                  key={level.id}
                  className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border-2 border-transparent bg-white/80 p-7 shadow-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:border-[#C8A951] hover:shadow-xl"
                  style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
                  onClick={() => navigate(`/simulate/${level.id}`)}
                >
                  <div
                    className="absolute inset-x-0 top-0 h-1 transition-all duration-300 group-hover:h-1.5"
                    style={{ backgroundColor: "#C8A951" }}
                  />

                  <div className="mb-5 flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl shadow-sm transition-transform duration-300 group-hover:scale-110"
                      style={{ backgroundColor: "#2D3B2D" }}
                    >
                      <Icon size={22} style={{ color: "#C8A951" }} />
                    </div>
                    <div>
                      <h2
                        className="text-xl font-bold"
                        style={{ color: "#2D3B2D", fontFamily: "'Playfair Display', serif" }}
                      >
                        {level.name}
                      </h2>
                      <div className="mt-0.5 flex gap-0.5">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            fill={i < level.difficulty ? "#C8A951" : "none"}
                            style={{
                              color: i < level.difficulty ? "#C8A951" : "#D4CFC4",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="mb-5 flex-1 text-sm leading-relaxed" style={{ color: "#5A6B5A" }}>
                    {level.description}
                  </p>

                  <div className="mb-5 flex flex-wrap gap-2">
                    {level.keyKnowledge.split("、").map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full px-3 py-1 text-xs font-medium"
                        style={{
                          backgroundColor: "#2D3B2D",
                          color: "#F5F0E8",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <button
                    className="mt-auto w-full rounded-xl py-3 text-sm font-bold tracking-wider transition-all duration-300 hover:shadow-md"
                    style={{
                      backgroundColor: "#2D3B2D",
                      color: "#C8A951",
                      fontFamily: "'Noto Sans SC', sans-serif",
                    }}
                  >
                    进入关卡 →
                  </button>
                </div>
              );
            })}
          </div>
        </main>

        <footer className="pb-8 text-center">
          <p
            className="text-xs"
            style={{ color: "#8A9A8A", fontFamily: "'Noto Sans SC', sans-serif" }}
          >
            本模拟器仅供教学用途，不构成投资建议
          </p>
        </footer>
      </div>
    </div>
  );
}
