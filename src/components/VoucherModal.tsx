import { useState } from "react";
import { Trophy, Copy, Check, ShoppingBag } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";

const STORE_URL = "https://rastahale.com.br";

interface Props {
  open:      boolean;
  onClose:   () => void;
  prizeText: string;
  prizeCode: string;
}

/** Aviso comemorativo mostrado ao aluno que venceu a temporada. */
const VoucherModal = ({ open, onClose, prizeText, prizeCode }: Props) => {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    if (!prizeCode) return;
    try {
      navigator.clipboard.writeText(prizeCode);
      setCopied(true);
      toast.success("Código copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="border-primary/40 bg-background sm:max-w-xs">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/15 text-amber-400">
            <Trophy size={32} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Você venceu a temporada! 🎉</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Ficou em 1º lugar no ranking dos alunos. Aqui está o seu prêmio:
            </p>
          </div>

          <div className="w-full rounded-xl border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm font-bold text-foreground">{prizeText || "Voucher RastaHale"}</p>
            {prizeCode && (
              <button
                onClick={copyCode}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 bg-background px-3 py-2 text-sm font-mono font-bold tracking-wider text-primary"
              >
                {prizeCode}
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            )}
          </div>

          <div className="flex w-full flex-col gap-2 pt-1">
            <a
              href={STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl btn-press bg-primary py-2.5 text-xs font-semibold text-primary-foreground"
            >
              <ShoppingBag size={14} /> Ir para a loja
            </a>
            <button onClick={onClose} className="py-1 text-[11px] text-muted-foreground">
              Fechar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoucherModal;
