import {
  Building2, Bus, GraduationCap, HeartPulse, Home, Landmark, Leaf, Mountain, ShieldAlert, ShoppingBasket, Sprout, Trees, Truck, Users, Zap, Droplets, type LucideProps,
} from "lucide-react";

const icons: Record<string, React.ComponentType<LucideProps>> = {
  energy: Zap,
  water: Droplets,
  pwd: Truck,
  revenue: Landmark,
  food: ShoppingBasket,
  "social-welfare": Users,
  health: HeartPulse,
  education: GraduationCap,
  police: ShieldAlert,
  urban: Building2,
  rural: Home,
  forest: Trees,
  agriculture: Sprout,
  disaster: Mountain,
  transport: Bus,
  other: Leaf,
};

export function DeptIcon({ id, size = 22 }: { id: string; size?: number }) {
  const Icon = icons[id] ?? Leaf;
  return <Icon size={size} aria-hidden="true" />;
}
