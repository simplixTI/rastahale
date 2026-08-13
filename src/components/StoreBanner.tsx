import { useEffect, useState } from "react";
import { ShoppingBag, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStoreBanners } from "@/hooks/useStoreBanners";
import { cn } from "@/lib/utils";

const STORE_URL = "https://rastahale.com.br";
const ROTATE_MS = 10_000; // troca a cada 10 segundos

/** Card simples (fallback) quando ainda não há fotos cadastradas. */
function FallbackCard() {
  const { t } = useTranslation();
  return (
    <a
      href={STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/15 to-transparent p-4 transition-colors hover:border-primary/50"
    >
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
        <ShoppingBag size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">{t("store.title")}</p>
        <p className="text-[11px] text-muted-foreground">{t("store.fallbackDescription")}</p>
      </div>
      <ExternalLink size={16} className="flex-shrink-0 text-muted-foreground" />
    </a>
  );
}

const StoreBanner = () => {
  const { data: banners = [], isLoading } = useStoreBanners();
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  // Garante que o índice fique válido se a quantidade de fotos mudar.
  useEffect(() => {
    if (index >= banners.length) setIndex(0);
  }, [banners.length, index]);

  // Auto-avança a cada 10s (só quando há mais de uma foto).
  useEffect(() => {
    if (banners.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % banners.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [banners.length]);

  return (
    <section className="mt-6 px-4">
      <div className="mb-3 flex items-center gap-1.5">
        <ShoppingBag size={16} className="text-primary" />
        <h2 className="text-base font-bold tracking-tight text-foreground">{t("store.title")}</h2>
      </div>

      {isLoading || banners.length === 0 ? (
        <FallbackCard />
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-border">
          {/* trilho de imagens */}
          <div
            className="flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {banners.map((b) => (
              <a
                key={b.id}
                href={b.linkUrl || STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full flex-shrink-0"
              >
                <img
                  src={b.imageUrl}
                  alt={t("store.imageAlt")}
                  className="aspect-[16/9] w-full object-cover"
                  loading="lazy"
                />
              </a>
            ))}
          </div>

          {/* indicadores (dots) */}
          {banners.length > 1 && (
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  onClick={() => setIndex(i)}
                  aria-label={t("store.goToPhoto", { number: i + 1 })}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === index ? "w-5 bg-primary" : "w-1.5 bg-white/60"
                  )}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default StoreBanner;
