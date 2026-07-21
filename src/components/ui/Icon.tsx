import { cn } from '@/lib/utils';
import React from 'react';

// Heroicons outline (24x24, 1.5px stroke)
import {
  HomeIcon,
  MagnifyingGlassIcon,
  BellIcon,
  ArrowLeftIcon,
  ArrowRightOnRectangleIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  XMarkIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShareIcon,
  HeartIcon,
  StarIcon,
  BookmarkIcon,
  ChatBubbleOvalLeftIcon,
  ChatBubbleLeftRightIcon,
  MapPinIcon,
  MapIcon,
  GlobeAltIcon,
  CalendarDaysIcon,
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  UserPlusIcon,
  UserIcon,
  Cog6ToothIcon,
  EllipsisVerticalIcon,
  EllipsisHorizontalIcon,
  PlayIcon,
  CameraIcon,
  PhotoIcon,
  FilmIcon,
  VideoCameraIcon,
  LinkIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  LightBulbIcon,
  CheckCircleIcon,
  LockClosedIcon,
  SparklesIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  PaperAirplaneIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  BanknotesIcon,
  WalletIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  ReceiptPercentIcon,
  TagIcon,
  AdjustmentsHorizontalIcon,
  ArrowsUpDownIcon,
  ArrowsRightLeftIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  TrophyIcon,
  GiftIcon,
  PlusCircleIcon,
  MinusIcon,
  BuildingOffice2Icon,
  SquaresPlusIcon,
  BookOpenIcon,
  MicrophoneIcon,
  MusicalNoteIcon,
  QueueListIcon,
  FolderPlusIcon,
  FolderIcon,
  FolderArrowDownIcon,
  Squares2X2Icon,
  GlobeAmericasIcon,
  PaperClipIcon,
  PhotoIcon as PhotoIconAlias,
  ArrowPathIcon,
  ExclamationCircleIcon,
  HandThumbUpIcon,
  RocketLaunchIcon,
  CommandLineIcon,
  NewspaperIcon,
  ArrowUpRightIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XCircleIcon,
  Bars3Icon,
  QrCodeIcon,
  ComputerDesktopIcon,
  TicketIcon,
} from '@heroicons/react/24/outline';

// Lucide icons for transport (not available in Heroicons)
import { Footprints, Bus as LucideBus, TrainFront, CarFront, TrainFrontTunnel, GripVertical, LayoutList, Rows3, Route, UtensilsCrossed, Landmark, Trees, Wine, MapPin, Ticket, Bike, Coffee, Moon, Luggage, SquarePen, Crown, SunMoon, Umbrella, Mountain, Snowflake, BookMarked, Palette, Sandwich, Waves, Anchor, Flower2, Martini, Building2, Church, PartyPopper, Backpack, Gem, Pause, Tent, PawPrint, Leaf, Ship, Beer, Utensils } from 'lucide-react';

// Wrap lucide components to match heroicon SVG prop interface
const makeLucideWrapper = (LucideIcon: React.ComponentType<any>): React.ComponentType<React.SVGProps<SVGSVGElement>> => {
  const Wrapper = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>((props, ref) => {
    const { className, style } = props;
    return <LucideIcon ref={ref} className={className} style={style} />;
  });
  Wrapper.displayName = `LucideWrapper`;
  return Wrapper as any;
};

// Custom Pix icon using official logo
import pixIconSrc from '@/assets/pix-icon.png';
const PixIcon = ({ className, style, strokeWidth, ...props }: any) => (
  <img src={pixIconSrc} alt="Pix" className={className} style={{ ...style, filter: 'brightness(0) saturate(100%) invert(8%) sepia(30%) saturate(2000%) hue-rotate(210deg) brightness(95%)' }} {...props} />
);

const FootprintsIcon = makeLucideWrapper(Footprints);
const BusIcon = makeLucideWrapper(LucideBus);
const TrainFrontIcon = makeLucideWrapper(TrainFront);
const CarFrontIcon = makeLucideWrapper(CarFront);
const SubwayIcon = makeLucideWrapper(TrainFrontTunnel);
const GripVerticalIcon = makeLucideWrapper(GripVertical);
const LayoutListIcon = makeLucideWrapper(LayoutList);
const Rows3Icon = makeLucideWrapper(Rows3);
const RouteIcon = makeLucideWrapper(Route);
const RestaurantIcon = makeLucideWrapper(UtensilsCrossed);
const MuseumIcon = makeLucideWrapper(Landmark);
const ParkIcon = makeLucideWrapper(Trees);
const LocalBarIcon = makeLucideWrapper(Wine);
const PlaceIcon = makeLucideWrapper(MapPin);
const ConfirmationNumberIcon = makeLucideWrapper(Ticket);
const BikeIcon = makeLucideWrapper(Bike);
const CoffeeIcon = makeLucideWrapper(Coffee);
const MoonIcon = makeLucideWrapper(Moon);
const LuggageIcon = makeLucideWrapper(Luggage);
const SquarePenIcon = makeLucideWrapper(SquarePen);
const PauseIcon = makeLucideWrapper(Pause);

// Interests
const BookMarkedIcon = makeLucideWrapper(BookMarked);
const PaletteIcon = makeLucideWrapper(Palette);
const SandwichIcon = makeLucideWrapper(Sandwich);
const WavesIcon = makeLucideWrapper(Waves);
const AnchorIcon = makeLucideWrapper(Anchor);
const Flower2Icon = makeLucideWrapper(Flower2);
const MartiniIcon = makeLucideWrapper(Martini);
const Building2Icon = makeLucideWrapper(Building2);
const ChurchIcon = makeLucideWrapper(Church);
const PartyPopperIcon = makeLucideWrapper(PartyPopper);
const BackpackIcon = makeLucideWrapper(Backpack);
const GemIcon = makeLucideWrapper(Gem);
const UmbrellaIcon = makeLucideWrapper(Umbrella);
const MountainIcon = makeLucideWrapper(Mountain);
const SnowflakeIcon = makeLucideWrapper(Snowflake);
const TentIcon = makeLucideWrapper(Tent);
const PawPrintIcon = makeLucideWrapper(PawPrint);
const LeafIcon = makeLucideWrapper(Leaf);
const ShipIcon = makeLucideWrapper(Ship);
const BeerIcon = makeLucideWrapper(Beer);
const UtensilsIcon = makeLucideWrapper(Utensils);

// Heroicons solid (for filled state)
import {
  HomeIcon as HomeIconSolid,
  HeartIcon as HeartIconSolid,
  StarIcon as StarIconSolid,
  BookmarkIcon as BookmarkIconSolid,
  MapPinIcon as MapPinIconSolid,
  MapIcon as MapIconSolid,
  CheckCircleIcon as CheckCircleIconSolid,
  ChatBubbleOvalLeftIcon as ChatBubbleOvalLeftIconSolid,
  SparklesIcon as SparklesIconSolid,
  PlayIcon as PlayIconSolid,
  BellIcon as BellIconSolid,
  UserIcon as UserIconSolid,
  GlobeAltIcon as GlobeAltIconSolid,
  MagnifyingGlassIcon as MagnifyingGlassIconSolid,
  LockClosedIcon as LockClosedIconSolid,
} from '@heroicons/react/24/solid';

// Map material symbol names → [outline, solid] heroicon components
const iconMap: Record<string, [React.ComponentType<React.SVGProps<SVGSVGElement>>, React.ComponentType<React.SVGProps<SVGSVGElement>>?]> = {
  // Navigation
  home: [HomeIcon, HomeIconSolid],
  arrow_back: [ArrowLeftIcon],
  arrow_forward: [ArrowRightIcon],
  chevron_right: [ChevronRightIcon],
  chevron_left: [ChevronLeftIcon],
  chevron_down: [ChevronDownIcon],
  expand_more: [ChevronDownIcon],
  chevron_up: [ChevronUpIcon],
  expand_less: [ChevronUpIcon],
  close: [XMarkIcon],
  more_vert: [EllipsisVerticalIcon],
  more_horiz: [EllipsisHorizontalIcon],
  menu: [Bars3Icon],

  // Actions
  add: [PlusIcon],
  add_circle: [PlusCircleIcon],
  add_box: [FolderPlusIcon],
  folder: [FolderIcon],
  create_new_folder: [FolderPlusIcon],
  drive_file_move: [FolderArrowDownIcon],
  edit: [PencilIcon],
  edit_square: [SquarePenIcon],
  delete: [TrashIcon],
  logout: [ArrowRightOnRectangleIcon],
  share: [ShareIcon],
  search: [MagnifyingGlassIcon, MagnifyingGlassIconSolid],
  tune: [AdjustmentsHorizontalIcon],
  swap_vert: [ArrowsUpDownIcon],
  swap_horiz: [ArrowsRightLeftIcon],
  send: [PaperAirplaneIcon],
  download: [ArrowDownTrayIcon],
  remove: [MinusIcon],
  content_copy: [ClipboardDocumentIcon],
  check: [CheckIcon],
  link: [LinkIcon],

  // Social / Communication
  favorite: [HeartIcon, HeartIconSolid],
  star: [StarIcon, StarIconSolid],
  bookmark: [BookmarkIcon, BookmarkIconSolid],
  chat_bubble: [ChatBubbleOvalLeftIcon, ChatBubbleOvalLeftIconSolid],
  chat_bubble_left: [ChatBubbleOvalLeftIcon, ChatBubbleOvalLeftIconSolid],
  chat_bubble_outline: [ChatBubbleLeftRightIcon],
  notifications: [BellIcon, BellIconSolid],
  person: [UserIcon, UserIconSolid],
  person_add: [UserPlusIcon],
  group: [UserGroupIcon],
  group_add: [UserPlusIcon],

  // Travel / Map
  map: [MapIcon, MapIconSolid],
  location_on: [MapPinIcon, MapPinIconSolid],
  location_city: [BuildingOffice2Icon],
  hotel: [BuildingOffice2Icon],
  explore: [GlobeAltIcon, GlobeAltIconSolid],
  flight: [PaperAirplaneIcon],
  flight_takeoff: [PaperAirplaneIcon],
  flight_land: [PaperAirplaneIcon],
  videocam: [VideoCameraIcon],
  add_location: [MapPinIcon, MapPinIconSolid],
  public: [GlobeAmericasIcon],
  language: [GlobeAltIcon, GlobeAltIconSolid],

  // Date / Time
  calendar_today: [CalendarIcon],
  calendar_month: [CalendarDaysIcon],
  schedule: [ClockIcon],
  access_time: [ClockIcon],

  // Media
  play_arrow: [PlayIcon, PlayIconSolid],
  photo_camera: [CameraIcon],
  video_library: [FilmIcon],
  video_call: [VideoCameraIcon],
  movie: [FilmIcon],
  music_note: [MusicalNoteIcon],
  perm_media: [PhotoIcon],
  image: [PhotoIcon],

  // Content / Documents
  description: [DocumentTextIcon],
  edit_note: [DocumentTextIcon],
  auto_stories: [BookOpenIcon],
  receipt_long: [ReceiptPercentIcon],
  receipt: [ReceiptPercentIcon],
  category: [TagIcon],
  local_offer: [TagIcon],

  // Status / Info
  info: [InformationCircleIcon],
  check_circle: [CheckCircleIcon, CheckCircleIconSolid],
  lock: [LockClosedIcon, LockClosedIconSolid],
  lightbulb: [LightBulbIcon],
  auto_awesome: [SparklesIcon, SparklesIconSolid],
  tips_and_updates: [LightBulbIcon],

  // Finance
  attach_money: [CurrencyDollarIcon],
  paid: [CurrencyDollarIcon],
  currency_exchange: [BanknotesIcon],
  credit_card: [CreditCardIcon],
  pix: [PixIcon],
  shopping_bag: [ShoppingBagIcon],
  shopping_cart: [ShoppingCartIcon],
  wallet: [WalletIcon],
  account_balance_wallet: [WalletIcon],
  redeem: [GiftIcon],

  // Charts / Analytics
  show_chart: [ChartBarIcon],
  trending_up: [ArrowTrendingUpIcon],
  emoji_events: [TrophyIcon],
  target: [MapPinIcon],

  // Subscription / Premium
  workspace_premium: [makeLucideWrapper(Crown)],

  // Theme
  dark_mode: [makeLucideWrapper(SunMoon)],

  // Settings
  settings: [Cog6ToothIcon],
  mic: [MicrophoneIcon],
  history: [ClockIcon],
  arrow_upward: [ChevronUpIcon],
  refresh: [ArrowPathIcon],
  visibility: [EyeIcon],
  open_in_new: [ArrowUpRightIcon],
  list: [QueueListIcon],
  dashboard: [Squares2X2Icon],
  attach_file: [PaperClipIcon],
  error: [ExclamationCircleIcon],
  cancel: [XCircleIcon],
  thumb_up: [HandThumbUpIcon],
  terminal: [CommandLineIcon],
  article: [NewspaperIcon],

  // Transport
  directions_walk: [FootprintsIcon],
  directions_bus: [BusIcon],
  directions_subway: [SubwayIcon],
  directions_car: [CarFrontIcon],
  directions_train: [TrainFrontIcon],
  drag_indicator: [GripVerticalIcon],
  view_agenda: [Rows3Icon],
  view_list: [LayoutListIcon],
  route: [RouteIcon],

  // Categories
  restaurant: [RestaurantIcon],
  museum: [MuseumIcon],
  park: [ParkIcon],
  local_bar: [LocalBarIcon],
  place: [PlaceIcon],
  confirmation_number: [ConfirmationNumberIcon],
  directions_bike: [BikeIcon],
  free_cancellation: [MoonIcon],
  free_time: [MoonIcon],
  moon: [MoonIcon],
  pause: [PauseIcon],
  local_cafe: [CoffeeIcon],
  luggage: [LuggageIcon],
  beach: [UmbrellaIcon],
  mountain: [MountainIcon],
  snow: [SnowflakeIcon],

  // Interests
  history_edu: [BookMarkedIcon],
  palette: [PaletteIcon],
  lunch_dining: [SandwichIcon],
  hiking: [FootprintsIcon],
  beach_access: [UmbrellaIcon],
  landscape: [MountainIcon],
  surfing: [WavesIcon],
  scuba_diving: [AnchorIcon],
  downhill_skiing: [SnowflakeIcon],
  spa: [Flower2Icon],
  nightlife: [MartiniIcon],
  apartment: [Building2Icon],
  church: [ChurchIcon],
  celebration: [PartyPopperIcon],
  backpack: [BackpackIcon],
  diamond: [GemIcon],
  theater_comedy: [TicketIcon],
  set_meal: [UtensilsIcon],
  sports_bar: [BeerIcon],
  liquor: [MartiniIcon],
  ac_unit: [SnowflakeIcon],
  terrain: [MountainIcon],
  tent: [TentIcon],
  pets: [PawPrintIcon],
  eco: [LeafIcon],
  directions_boat: [ShipIcon],
  laptop_mac: [ComputerDesktopIcon],
};

interface IconProps {
  name: string;
  className?: string;
  filled?: boolean;
  size?: number;
  style?: React.CSSProperties;
}

export function Icon({
  name,
  className,
  filled = false,
  size = 24,
  style,
}: IconProps) {
  const entry = iconMap[name];

  if (!entry) {
    console.warn(`Icon "${name}" not mapped to Heroicons`);
    return null;
  }

  const [OutlineComponent, SolidComponent] = entry;
  const Component = filled && SolidComponent ? SolidComponent : OutlineComponent;

  return (
    <Component
      className={cn('flex-shrink-0 text-[#130e39]', className)}
      style={{ width: size, height: size, ...style }}
      strokeWidth={2}
    />
  );
}
