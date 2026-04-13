import { useCallback, useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type BeforeAfterSlide = {
  title: string;
  category: "garbage" | "water" | "light";
  beforeImageUrl: string;
  afterImageUrl: string;
  locationLabel?: string;
};

function CategoryPill({ category }: { category: BeforeAfterSlide["category"] }) {
  const label = category === "garbage" ? "Garbage" : category === "water" ? "Water" : "Street Light";
  return <Badge className="bg-white/15 text-white border-white/25">{label}</Badge>;
}

export function BeforeAfterCarousel({ slides }: { slides: BeforeAfterSlide[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [selected, setSelected] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi) return;
    const id = window.setInterval(() => emblaApi.scrollNext(), 6000);
    return () => window.clearInterval(id);
  }, [emblaApi]);

  const canScrollPrev = emblaApi?.canScrollPrev() ?? true;
  const canScrollNext = emblaApi?.canScrollNext() ?? true;

  const dots = useMemo(() => slides.map((_, i) => i), [slides]);

  return (
    <div className="rounded-2xl border border-border/50 overflow-hidden bg-gradient-to-br from-primary/90 via-primary/80 to-accent/70 text-white">
      <div className="flex items-center justify-between gap-3 p-5">
        <div>
          <div className="text-lg font-bold leading-tight">Before / After Impact</div>
          <div className="text-sm text-white/80">Real improvements from civic reports (replace images with yours)</div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            className="bg-white/15 hover:bg-white/25 text-white border border-white/20"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={scrollNext}
            disabled={!canScrollNext}
            className="bg-white/15 hover:bg-white/25 text-white border border-white/20"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {slides.map((s, idx) => (
            <div key={`${s.title}-${idx}`} className="min-w-0 flex-[0_0_100%] px-5 pb-5">
              <div className="rounded-xl overflow-hidden border border-white/15 bg-black/15">
                <div className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CategoryPill category={s.category} />
                      {s.locationLabel ? (
                        <span className="text-xs text-white/75 truncate">{s.locationLabel}</span>
                      ) : null}
                    </div>
                    <div className="mt-2 text-base font-semibold truncate">{s.title}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                  <div className="relative">
                    <img src={s.beforeImageUrl} alt={`${s.title} before`} className="h-64 md:h-72 w-full object-cover" />
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-black/55 text-white border-white/15">Before</Badge>
                    </div>
                  </div>
                  <div className="relative">
                    <img src={s.afterImageUrl} alt={`${s.title} after`} className="h-64 md:h-72 w-full object-cover" />
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-green-600/75 text-white border-white/15">After</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 pb-5">
        {dots.map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => emblaApi?.scrollTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2.5 rounded-full transition-all ${selected === i ? "w-8 bg-white" : "w-2.5 bg-white/40 hover:bg-white/70"}`}
          />
        ))}
      </div>
    </div>
  );
}

