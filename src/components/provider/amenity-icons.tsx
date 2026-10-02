import type { ComponentType, SVGProps } from "react";
import {
  AccessibilityIcon,
  ActivityIcon,
  BedIcon,
  BikeIcon,
  CarIcon,
  CheckIcon,
  ClipboardIcon,
  ClockIcon,
  CubeIcon,
  CupIcon,
  DoorIcon,
  DropletsIcon,
  FlameIcon,
  GiftIcon,
  LayersIcon,
  LeafIcon,
  LockIcon,
  MonitorIcon,
  PinIcon,
  ShirtIcon,
  SparklesIcon,
  SunIcon,
  TicketIcon,
  UserIcon,
  UsersIcon,
  WavesIcon,
  WifiIcon,
} from "./icons";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * Amenities, "included with every visit" items and add-ons are plain strings in providers.ts, so
 * the icon is picked by keyword. First match wins, so order matters ("Private plunge tubs" must
 * hit water before "private" hits a room; "Towel and robe" must hit the robe before the towel).
 * Anything unmatched falls back to a check mark.
 */
const RULES: [RegExp, Icon][] = [
  [/\b(plunge|float|tubs?|pods?)\b/i, WavesIcon],
  [/robe|slippers|changing/i, ShirtIcon],
  [/sauna|heated|wood-fired|\bhot\b/i, FlameIcon],
  [/\b(bed|pillow|mask)\b/i, BedIcon],
  [/shower|water|towel|electrolyte|juice/i, DropletsIcon],
  [/\b(tea|lounge|refreshments?)\b/i, CupIcon],
  [/locker/i, LockIcon],
  [/bike/i, BikeIcon],
  [/parking/i, CarIcon],
  [/wheelchair/i, AccessibilityIcon],
  [/gift/i, GiftIcon],
  [/wifi/i, WifiIcon],
  [/online/i, MonitorIcon],
  [/timer|temperature|minutes?\b|late/i, ClockIcon],
  [/product|ammonia|sensitive|clean|aroma|eucalyptus|infusion|balm|cbd|scalp/i, LeafIcon],
  [/consult|patch|skin|aftercare|notes|tips|guide/i, ClipboardIcon],
  [/kids|group/i, UsersIcon],
  [/on-site/i, PinIcon],
  [/coach|beginner|orientation/i, UserIcon],
  [/light/i, SunIcon],
  [/rooms?\b/i, DoorIcon],
  [/trial|package/i, TicketIcon],
  [/floor/i, LayersIcon],
  [/props?\b|\bmat\b|blocks/i, CubeIcon],
  [/compression/i, ActivityIcon],
  [/mist|touch-up|gloss|finish|bond|condition|lash|\blip\b|tint|removal|second look|upgrade|strips/i, SparklesIcon],
];

export function AmenityIcon({ name, ...props }: { name: string } & SVGProps<SVGSVGElement>) {
  const Match = RULES.find(([pattern]) => pattern.test(name))?.[1] ?? CheckIcon;
  return <Match {...props} />;
}
