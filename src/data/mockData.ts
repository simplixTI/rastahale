export interface Instructor {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  loginEmail?: string;
  loginPassword?: string;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl?: string | null;
  duration: string;
  category: "jiu-jitsu" | "luta-livre";
  subcategory: string;
  level: "Iniciante" | "Intermediário" | "Avançado";
  instructorId: string;
  isFavorite?: boolean;
  progress?: number;
  watched?: boolean;
  visible?: boolean;
  unlockByProgress?: boolean;
  requiredProgress?: number;
}

export interface MockUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  plan: string;
  status: "ativo" | "inativo" | "pendente";
  joinDate: string;
  lastAccess: string;
  videosWatched: number;
  totalHours: number;
}

export interface MockPayment {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  method: "PIX" | "Cartão" | "Boleto";
  status: "pago" | "pendente" | "falhou";
  date: string;
  plan: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  interval: "mensal" | "trimestral" | "anual";
  features: string[];
  active: boolean;
  usersCount: number;
  categories: string[];
  maxLevel: "Iniciante" | "Intermediário" | "Avançado";
}

export const videoCategories = [
  "Fundamentos",
  "Avançado",
  "Defesas",
  "Condicionamento",
  "Raspagens",
  "Finalizações",
  "Passagem de Guarda",
] as const;

export const instructors: Instructor[] = [
  {
    id: "inst-1",
    name: "Rafael Leão",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
    bio: "Faixa preta 3º grau de Jiu Jitsu. 15 anos de experiência.",
  },
  {
    id: "inst-3",
    name: "Diego Santos",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    bio: "Campeão nacional de Luta Livre. Instrutor há 10 anos.",
  },
];

export const videos: Video[] = [
  {
    id: "v1",
    title: "Guarda Fechada — Fundamentos",
    description: "Aprenda os princípios básicos da guarda fechada, incluindo postura, controle de distância e as primeiras finalizações.",
    thumbnail: "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400&h=225&fit=crop",
    duration: "12:30",
    category: "jiu-jitsu",
    subcategory: "Fundamentos",
    level: "Iniciante",
    instructorId: "inst-1",
    progress: 100,
    watched: true,
    visible: true,
  },
  {
    id: "v2",
    title: "Passagem de Guarda Básica",
    description: "Técnicas essenciais para passar a guarda do oponente com segurança e eficiência.",
    thumbnail: "https://images.unsplash.com/photo-1564415315949-7a0c4c73aab4?w=400&h=225&fit=crop",
    duration: "15:45",
    category: "jiu-jitsu",
    subcategory: "Passagem de Guarda",
    level: "Iniciante",
    instructorId: "inst-1",
    progress: 65,
    visible: true,
  },
  {
    id: "v3",
    title: "Raspagens da Guarda",
    description: "Domine as principais raspagens partindo da guarda fechada.",
    thumbnail: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=225&fit=crop",
    duration: "18:20",
    category: "jiu-jitsu",
    subcategory: "Raspagens",
    level: "Intermediário",
    instructorId: "inst-1",
    visible: true,
  },
  {
    id: "v4",
    title: "Montada e Controle",
    description: "Como manter a posição montada e aplicar pressão eficiente.",
    thumbnail: "https://images.unsplash.com/photo-1517438476312-10d79c077509?w=400&h=225&fit=crop",
    duration: "14:10",
    category: "jiu-jitsu",
    subcategory: "Fundamentos",
    level: "Iniciante",
    instructorId: "inst-1",
    progress: 30,
    visible: true,
  },
  {
    id: "v5",
    title: "Berimbolo — Entrada e Controle",
    description: "Técnica avançada de inversão para chegar às costas do oponente.",
    thumbnail: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&h=225&fit=crop",
    duration: "22:15",
    category: "jiu-jitsu",
    subcategory: "Avançado",
    level: "Avançado",
    instructorId: "inst-1",
    visible: true,
    unlockByProgress: true,
    requiredProgress: 50,
  },
  {
    id: "v6",
    title: "Leg Lock System",
    description: "Sistema completo de ataques às pernas com transições fluidas.",
    thumbnail: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400&h=225&fit=crop",
    duration: "25:00",
    category: "jiu-jitsu",
    subcategory: "Finalizações",
    level: "Avançado",
    instructorId: "inst-1",
    visible: true,
  },
  {
    id: "v7",
    title: "Triângulo — Variações Avançadas",
    description: "Todas as variações do triângulo partindo de diferentes posições.",
    thumbnail: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&h=225&fit=crop",
    duration: "19:40",
    category: "jiu-jitsu",
    subcategory: "Finalizações",
    level: "Avançado",
    instructorId: "inst-1",
    visible: false,
  },
  {
    id: "v8",
    title: "Defesa de Queda",
    description: "Como defender quedas e manter a posição em pé.",
    thumbnail: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&h=225&fit=crop",
    duration: "17:00",
    category: "luta-livre",
    subcategory: "Defesas",
    level: "Iniciante",
    instructorId: "inst-3",
    progress: 80,
    visible: true,
  },
  {
    id: "v9",
    title: "Controle no Solo",
    description: "Posições de controle e transições no chão.",
    thumbnail: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=225&fit=crop",
    duration: "20:15",
    category: "luta-livre",
    subcategory: "Fundamentos",
    level: "Intermediário",
    instructorId: "inst-3",
    visible: true,
  },
  {
    id: "v10",
    title: "Finalizações da Luta Livre",
    description: "As finalizações mais eficientes da luta livre esportiva.",
    thumbnail: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=225&fit=crop",
    duration: "23:30",
    category: "luta-livre",
    subcategory: "Finalizações",
    level: "Avançado",
    instructorId: "inst-3",
    visible: true,
  },
  {
    id: "v11",
    title: "Condicionamento para Luta",
    description: "Treino físico específico para artes marciais e luta livre.",
    thumbnail: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=400&h=225&fit=crop",
    duration: "30:00",
    category: "luta-livre",
    subcategory: "Condicionamento",
    level: "Intermediário",
    instructorId: "inst-3",
    progress: 50,
    visible: true,
  },
  {
    id: "v12",
    title: "Defesa de Arm Lock",
    description: "Técnicas de defesa contra arm lock e kimura.",
    thumbnail: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&h=225&fit=crop",
    duration: "16:00",
    category: "jiu-jitsu",
    subcategory: "Defesas",
    level: "Intermediário",
    instructorId: "inst-1",
    visible: true,
  },
  {
    id: "v13",
    title: "HIIT para Lutadores",
    description: "Treino intervalado de alta intensidade focado em artes marciais.",
    thumbnail: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400&h=225&fit=crop",
    duration: "28:00",
    category: "jiu-jitsu",
    subcategory: "Condicionamento",
    level: "Intermediário",
    instructorId: "inst-1",
    visible: true,
    progress: 40,
  },
  {
    id: "v14",
    title: "Defesa de Estrangulamento",
    description: "Como escapar dos principais estrangulamentos.",
    thumbnail: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&h=225&fit=crop",
    duration: "15:30",
    category: "jiu-jitsu",
    subcategory: "Defesas",
    level: "Avançado",
    instructorId: "inst-1",
    visible: true,
    unlockByProgress: true,
    requiredProgress: 60,
  },
];

export const mockUsers: MockUser[] = [
  { id: "u1", name: "Lucas Atleta", email: "lucas@teste.com", avatar: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=100&h=100&fit=crop", plan: "Premium", status: "ativo", joinDate: "2024-01-15", lastAccess: "2025-04-01", videosWatched: 8, totalHours: 4.5 },
  { id: "u2", name: "Ana Silva", email: "ana@teste.com", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop", plan: "Básico", status: "ativo", joinDate: "2024-03-10", lastAccess: "2025-03-28", videosWatched: 3, totalHours: 1.2 },
  { id: "u3", name: "Pedro Costa", email: "pedro@teste.com", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop", plan: "Premium", status: "ativo", joinDate: "2024-02-20", lastAccess: "2025-04-01", videosWatched: 12, totalHours: 7.3 },
  { id: "u4", name: "Mariana Souza", email: "mariana@teste.com", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop", plan: "Básico", status: "pendente", joinDate: "2025-03-25", lastAccess: "2025-03-25", videosWatched: 0, totalHours: 0 },
  { id: "u5", name: "Carlos Ferreira", email: "carlos@teste.com", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop", plan: "Premium", status: "inativo", joinDate: "2023-11-05", lastAccess: "2025-01-10", videosWatched: 5, totalHours: 2.8 },
  { id: "u6", name: "Juliana Rocha", email: "juliana@teste.com", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop", plan: "Anual Premium", status: "ativo", joinDate: "2024-06-01", lastAccess: "2025-04-01", videosWatched: 20, totalHours: 15.2 },
];

export const mockPayments: MockPayment[] = [
  { id: "p1", userId: "u1", userName: "Lucas Atleta", amount: 79.90, method: "PIX", status: "pago", date: "2025-04-01", plan: "Premium" },
  { id: "p2", userId: "u2", userName: "Ana Silva", amount: 39.90, method: "Cartão", status: "pago", date: "2025-04-01", plan: "Básico" },
  { id: "p3", userId: "u3", userName: "Pedro Costa", amount: 79.90, method: "Cartão", status: "pago", date: "2025-03-28", plan: "Premium" },
  { id: "p4", userId: "u4", userName: "Mariana Souza", amount: 39.90, method: "Boleto", status: "pendente", date: "2025-03-25", plan: "Básico" },
  { id: "p5", userId: "u5", userName: "Carlos Ferreira", amount: 79.90, method: "PIX", status: "falhou", date: "2025-01-10", plan: "Premium" },
  { id: "p6", userId: "u1", userName: "Lucas Atleta", amount: 79.90, method: "PIX", status: "pago", date: "2025-03-01", plan: "Premium" },
  { id: "p7", userId: "u3", userName: "Pedro Costa", amount: 79.90, method: "Cartão", status: "pago", date: "2025-02-28", plan: "Premium" },
  { id: "p8", userId: "u6", userName: "Juliana Rocha", amount: 699.90, method: "PIX", status: "pago", date: "2024-06-01", plan: "Anual Premium" },
];

export const mockPlans: Plan[] = [
  {
    id: "plan-1",
    name: "Básico",
    price: 39.90,
    interval: "mensal",
    features: ["Acesso a aulas de Fundamentos", "1 categoria", "Suporte por email"],
    active: true,
    usersCount: 2,
    categories: ["Fundamentos"],
    maxLevel: "Iniciante",
  },
  {
    id: "plan-2",
    name: "Premium",
    price: 79.90,
    interval: "mensal",
    features: ["Acesso total", "Todas as categorias", "Aulas avançadas", "Suporte prioritário", "Downloads offline"],
    active: true,
    usersCount: 3,
    categories: ["Fundamentos", "Avançado", "Defesas", "Condicionamento", "Raspagens", "Finalizações", "Passagem de Guarda"],
    maxLevel: "Avançado",
  },
  {
    id: "plan-3",
    name: "Anual Premium",
    price: 699.90,
    interval: "anual",
    features: ["Tudo do Premium", "2 meses grátis", "Acesso antecipado", "Mentoria mensal"],
    active: true,
    usersCount: 1,
    categories: ["Fundamentos", "Avançado", "Defesas", "Condicionamento", "Raspagens", "Finalizações", "Passagem de Guarda"],
    maxLevel: "Avançado",
  },
];

export const getInstructor = (id: string) => instructors.find((i) => i.id === id);

export const getCategoryLabel = (cat: string) => {
  const map: Record<string, string> = { "jiu-jitsu": "Jiu Jitsu", "luta-livre": "Luta Livre" };
  return map[cat] || cat;
};

export const getLevelColor = (level: string) => {
  switch (level) {
    case "Iniciante": return "bg-emerald-500/20 text-emerald-400";
    case "Intermediário": return "bg-amber-500/20 text-amber-400";
    case "Avançado": return "bg-red-500/20 text-red-400";
    default: return "bg-muted text-muted-foreground";
  }
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case "ativo": case "pago": return "bg-emerald-500/20 text-emerald-400";
    case "pendente": return "bg-amber-500/20 text-amber-400";
    case "inativo": case "falhou": return "bg-red-500/20 text-red-400";
    default: return "bg-muted text-muted-foreground";
  }
};

export const TEST_USER = { email: "aluno@rastahale.com", password: "rasta123", name: "Lucas Atleta", role: "user" as const };
export const TEST_ADMIN = { email: "admin@rastahale.com", password: "admin123", name: "Admin RastaHale", role: "admin" as const };
