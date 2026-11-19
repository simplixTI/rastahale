import { Video, MessageCircle, UserCircle } from "lucide-react";
import TabBar, { type TabItem } from "@/components/TabBar";

// Navegação do professor. "Sair" saiu da barra: ação destrutiva não divide
// espaço com navegação — ela fica em Perfil → "Sair da conta".
const items: TabItem[] = [
  { path: "/studio",          icon: Video,         label: "Aulas" },
  { path: "/studio/feedback", icon: MessageCircle, label: "Feedback", match: (p) => p.startsWith("/studio/feedback") },
  { path: "/studio/perfil",   icon: UserCircle,    label: "Perfil",   match: (p) => p.startsWith("/studio/perfil") },
];

const StudioBottomBar = () => <TabBar items={items} ariaLabel="Navegação do Studio" />;

export default StudioBottomBar;
