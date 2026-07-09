import {
  Bike,
  BookOpen,
  Brain,
  Briefcase,
  CalendarDays,
  Car,
  CigaretteOff,
  Coffee,
  Droplets,
  Dumbbell,
  Flame,
  GraduationCap,
  Heart,
  HeartPulse,
  Home,
  Moon,
  Pill,
  ShoppingBag,
  Sparkles,
  Star,
  Smartphone,
  Target,
  Utensils,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { HabitIconKey } from '../../types/habit'

const habitIconMap: Record<HabitIconKey, LucideIcon> = {
  briefcase: Briefcase,
  'cigarette-off': CigaretteOff,
  dumbbell: Dumbbell,
  droplets: Droplets,
  'book-open': BookOpen,
  sparkles: Sparkles,
  'heart-pulse': HeartPulse,
  brain: Brain,
  moon: Moon,
  flame: Flame,
  target: Target,
  star: Star,
  wallet: Wallet,
  users: Users,
  coffee: Coffee,
  home: Home,
  utensils: Utensils,
  'graduation-cap': GraduationCap,
  car: Car,
  bike: Bike,
  pill: Pill,
  heart: Heart,
  'calendar-days': CalendarDays,
  smartphone: Smartphone,
  'shopping-bag': ShoppingBag,
}

interface HabitIconViewProps {
  icon: HabitIconKey
  color: string
  className?: string
}

export function HabitIconView({ icon, color, className }: HabitIconViewProps) {
  const Icon = habitIconMap[icon]

  return <Icon className={className ?? 'h-5 w-5'} style={{ color }} />
}
