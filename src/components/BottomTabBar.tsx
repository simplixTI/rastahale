import { Home, Search, Users, Heart, Trophy, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import TabBar, { type TabItem } from "@/components/TabBar";

const under = (...prefixes: string[]) => (pathname: string) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/** Navegação do aluno. As telas internas mantêm acesa a aba de onde vieram. */
const BottomTabBar = () => {
  const { t } = useTranslation();

  const items: TabItem[] = [
    { path: "/",            icon: Home,   label: t("nav.home") },
    { path: "/buscar",      icon: Search, label: t("nav.search") },
    { path: "/professores", icon: Users,  label: t("nav.teachers"), match: under("/professores", "/instrutor", "/atleta") },
    { path: "/favoritos",   icon: Heart,  label: t("nav.favorites") },
    { path: "/progresso",   icon: Trophy, label: t("nav.ranking") },
    { path: "/perfil",      icon: User,   label: t("nav.profile"), match: under("/perfil") },
  ];

  return <TabBar items={items} ariaLabel={t("nav.bottomNavigation")} />;
};

export default BottomTabBar;
