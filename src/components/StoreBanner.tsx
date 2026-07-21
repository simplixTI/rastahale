import { ShoppingBag, ExternalLink } from "lucide-react";

const STORE_URL = "https://rastahale.com.br";

const StoreBanner = () => (
  <section className="mt-6 px-4">
    <a
      href={STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/15 to-transparent p-4 transition-colors hover:border-primary/50"
    >
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
        <ShoppingBag size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">Nossa Loja</p>
        <p className="text-[11px] text-muted-foreground">Produtos oficiais RastaHale — rastahale.com.br</p>
      </div>
      <ExternalLink size={16} className="flex-shrink-0 text-muted-foreground" />
    </a>
  </section>
);

export default StoreBanner;
