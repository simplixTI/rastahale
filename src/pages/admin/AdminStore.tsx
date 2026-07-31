import { useRef, useState } from "react";
import { Plus, Trash2, Upload, Image as ImageIcon, Loader2, ShoppingBag, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import AdminLayout from "@/components/AdminLayout";
import {
  useStoreBanners, useCreateStoreBanner, useDeleteStoreBanner, type StoreBanner,
} from "@/hooks/useStoreBanners";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const fieldCls = "w-full rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

function isMockMode(): boolean {
  return !isSupabaseConfigured;
}

const AdminStore = () => {
  const { data: banners = [], isLoading } = useStoreBanners();
  const createBanner = useCreateStoreBanner();
  const deleteBanner = useDeleteStoreBanner();

  const [imageUrl,  setImageUrl]  = useState("");
  const [linkUrl,   setLinkUrl]   = useState("");
  const [uploading, setUploading] = useState(false);
  const [delBanner, setDelBanner] = useState<StoreBanner | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleAdd(url?: string) {
    const image = (url ?? imageUrl).trim();
    if (!image) { toast.error("Informe a URL da foto ou envie um arquivo"); return; }
    createBanner.mutate(
      { imageUrl: image, linkUrl: linkUrl.trim() || undefined, sortOrder: banners.length },
      {
        onSuccess: () => { toast.success("Foto adicionada"); setImageUrl(""); setLinkUrl(""); },
        onError:   (e) => toast.error(`Erro ao adicionar. A tabela do banner já foi criada no banco? ${(e as Error)?.message ?? ""}`),
      }
    );
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (file.size > 10 * 1024 * 1024)    { toast.error("Imagem muito grande (máx. 10 MB)"); return; }
    setUploading(true);
    try {
      let url: string;
      if (isMockMode()) {
        url = URL.createObjectURL(file);
      } else {
        const path = `store/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
        const { error } = await supabase.storage.from("media").upload(path, file);
        if (error) { toast.error("Erro ao enviar imagem"); return; }
        url = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      }
      handleAdd(url);
    } finally {
      setUploading(false);
    }
  }

  function handleDelete() {
    if (!delBanner) return;
    deleteBanner.mutate({ id: delBanner.id }, {
      onSuccess: () => { toast.success("Foto removida"); setDelBanner(null); },
      onError:   () => toast.error("Erro ao remover"),
    });
  }

  return (
    <AdminLayout title="Banner da Loja" backTo="/admin">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Banner da Loja</h2>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <ShoppingBag size={13} /> {banners.length} fotos
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Fotos exibidas em carrossel na Home (troca a cada 10 segundos). Adicione quantas quiser — sem limite.
        Cada foto pode ter um link opcional (padrão: rastahale.com.br).
      </p>

      {/* ── Adicionar foto ─────────────────────────────────────────── */}
      <div className="mt-4 space-y-2 rounded-xl border border-border bg-card p-3">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">URL da foto</label>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            className={fieldCls}
          />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <LinkIcon size={10} /> Link ao tocar (opcional)
          </label>
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://rastahale.com.br/produto/..."
            className={fieldCls}
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => handleAdd()}
            disabled={createBanner.isPending || uploading}
            className="flex flex-1 items-center justify-center gap-1 rounded-full btn-press bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {createBanner.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Adicionar URL
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading || createBanner.isPending}
            className="flex flex-1 items-center justify-center gap-1 rounded-full btn-press border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground disabled:opacity-50 transition-colors"
          >
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Enviar arquivo
          </button>
        </div>
      </div>

      {/* ── Fotos atuais ───────────────────────────────────────────── */}
      {isLoading ? (
        <div className="mt-8 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : banners.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-2 text-center">
          <ImageIcon size={30} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhuma foto ainda — adicione a primeira acima</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {banners.map((b, i) => (
            <div key={b.id} className="relative overflow-hidden rounded-xl border border-border bg-card">
              <img src={b.imageUrl} alt={`Foto ${i + 1}`} className="aspect-[16/9] w-full object-cover" />
              <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-semibold text-white backdrop-blur-sm">
                {i + 1}
              </span>
              <button
                onClick={() => setDelBanner(b)}
                className="absolute right-1.5 top-1.5 rounded-full bg-red-500 p-1.5 text-white shadow-lg btn-press"
                aria-label="Remover foto"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* confirmar remoção */}
      {delBanner && (
        <Dialog open onOpenChange={(v) => { if (!v) setDelBanner(null); }}>
          <DialogContent className="border-border bg-background sm:max-w-xs">
            <DialogHeader><DialogTitle className="text-sm font-bold text-foreground">Remover foto?</DialogTitle></DialogHeader>
            <p className="text-xs text-muted-foreground">A foto será removida do carrossel da Home.</p>
            <DialogFooter className="pt-2">
              <button onClick={() => setDelBanner(null)} className="rounded-full btn-press border border-border px-4 py-2 text-xs font-medium text-muted-foreground">Cancelar</button>
              <button onClick={handleDelete} disabled={deleteBanner.isPending} className="rounded-full btn-press bg-red-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-50">Remover</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
};

export default AdminStore;
