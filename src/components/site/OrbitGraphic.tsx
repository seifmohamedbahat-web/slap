import Icon from "@/components/Icon";

/**
 * Animated hero visual: a glowing planet with rotating orbit rings and
 * floating stat chips. Pure CSS animation — no JS runtime cost.
 */
export default function OrbitGraphic() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[500px] select-none">
      {/* ambient glows */}
      <div className="absolute top-1/2 left-1/2 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/40 blur-[90px]" />
      <div className="absolute top-[18%] right-[8%] h-[30%] w-[30%] rounded-full bg-accent/30 blur-[70px]" />

      {/* orbit rings with satellites */}
      <div className="animate-orbit absolute inset-[2%] rounded-full border border-white/12">
        <span className="absolute top-0 left-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_16px_4px_rgba(34,211,238,0.55)]" />
      </div>
      <div className="animate-orbit-reverse absolute inset-[15%] rounded-full border border-white/15">
        <span className="absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-brand-light shadow-[0_0_14px_3px_rgba(145,135,246,0.6)]" />
      </div>
      <div className="animate-orbit absolute inset-[28%] rounded-full border border-dashed border-white/10 [animation-duration:16s]">
        <span className="absolute top-1/2 right-0 h-2 w-2 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />
      </div>

      {/* planet */}
      <div className="absolute inset-[36%]">
        <div className="animate-float-slow relative h-full w-full">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent via-[#4f7df5] to-brand shadow-[0_0_60px_10px_rgba(109,94,242,0.45)]" />
          <div className="absolute top-[14%] left-[16%] h-[30%] w-[30%] rounded-full bg-white/35 blur-[6px]" />
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_70%_75%,rgba(28,27,46,0.35),transparent_55%)]" />
        </div>
      </div>

      {/* floating chips */}
      <div className="animate-float absolute top-[12%] left-[4%] flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 backdrop-blur-md">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20 text-accent">
          <Icon name="search" size={14} />
        </span>
        <span className="text-xs font-semibold text-white">
          SEO traffic <span className="text-accent">+214%</span>
        </span>
      </div>
      <div className="animate-float-slow absolute right-[2%] bottom-[20%] flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 backdrop-blur-md [animation-delay:1.2s]">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/30 text-brand-light">
          <Icon name="rocket" size={14} />
        </span>
        <span className="text-xs font-semibold text-white">Site launched 🎉</span>
      </div>
      <div className="animate-float absolute bottom-[6%] left-[18%] flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 backdrop-blur-md [animation-delay:2s]">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
          <Icon name="zap" size={14} />
        </span>
        <span className="text-xs font-semibold text-white">Loads in 0.8s</span>
      </div>
    </div>
  );
}
