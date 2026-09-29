import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getPlaceFullDetails, PlaceFullDetails, getPhotoSignature } from '@/lib/placeDetails';
import { openGoogleMapsDirections } from '@/lib/navigationMaps';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronLeft,
  ChevronRight,
  Share2,
  MapPin,
  Compass,
  Sparkles,
  Clock,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Copy,
  Check,
  X,
  Target,
  Star,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from 'sonner';

export interface ActivityData {
  id: number;
  name: string;
  image?: string;
  category?: string;
  rating?: number;
  price?: string;
  openHours?: string;
  startTime?: string;
  endTime?: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  location?: string;
  tripName?: string;
}

export interface ActivityDetailScreenProps {
  activity: ActivityData;
  onBack: () => void;
  onOpenMap?: (activity: ActivityData) => void;
}

// Fallbacks de alta resolução temáticos e distintos (sem duplicatas)
const FALLBACK_PHOTOS_FOOD = [
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1000',
  'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=1000',
  'https://images.unsplash.com/photo-1544025162-d76694265947?w=1000',
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1000',
];

const FALLBACK_PHOTOS_NATURE = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1000',
  'https://images.unsplash.com/photo-1534113414509-0eec2bfb493f?w=1000',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1000',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1000',
  'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1000',
];

const FALLBACK_PHOTOS_CULTURE = [
  'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=1000',
  'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=1000',
  'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1000',
  'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1000',
  'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=1000',
];

const FALLBACK_PHOTOS_LANDMARKS = [
  'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1000',
  'https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=1000',
  'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1000',
  'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1000',
  'https://images.unsplash.com/photo-1520939817895-060bdef4ad1b?w=1000',
];

const FALLBACK_PHOTOS_GENERAL = [
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1000',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1000',
  'https://images.unsplash.com/photo-1500835556837-99ac94a94552?w=1000',
  'https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=1000',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1000',
];

export function ActivityDetailScreen({ activity, onBack, onOpenMap }: ActivityDetailScreenProps) {
  const [details, setDetails] = useState<PlaceFullDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sobre' | 'informacoes'>('sobre');
  const [isHoursOpen, setIsHoursOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const miniMapRef = useRef<L.Map | null>(null);
  const miniMapContainerRef = useRef<HTMLDivElement>(null);

  // Carrega dados híbridos (Google Places + Gemini + Cache DB)
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    getPlaceFullDetails({
      name: activity.name,
      city: activity.city || activity.location,
      country: activity.country,
      category: activity.category,
      lat: activity.lat,
      lng: activity.lng,
      image: activity.image,
      rating: activity.rating,
      price: activity.price,
    })
      .then((data) => {
        if (!isCancelled) {
          setDetails(data);
        }
      })
      .catch((err) => {
        console.error('Failed to load place details:', err);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [activity.name, activity.city, activity.location, activity.country, activity.category, activity.lat, activity.lng, activity.image, activity.rating, activity.price]);

  // Inicializa o Mini Mapa na seção Informações
  useEffect(() => {
    if (isLoading || !miniMapContainerRef.current || miniMapRef.current) return;

    const lat = details?.lat ?? activity.lat ?? -23.5505;
    const lng = details?.lng ?? activity.lng ?? -46.6333;

    if (lat === 0 && lng === 0) return;

    try {
      const map = L.map(miniMapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        scrollWheelZoom: false,
      }).setView([lat, lng], 15);

      L.tileLayer('https://mt0.google.com/vt/lyrs=m&hl=pt-BR&x={x}&y={y}&z={z}', {
        maxZoom: 19,
      }).addTo(map);

      // Custom Pin Marker
      const pinIcon = L.divIcon({
        className: 'custom-details-mini-pin',
        html: `<div style="
          width: 30px;
          height: 30px;
          border-radius: 50% 50% 50% 0;
          background: #0A0E59;
          transform: rotate(-45deg);
          border: 2px solid white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #86B61F;
            transform: rotate(45deg);
          "></div>
        </div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      });

      L.marker([lat, lng], { icon: pinIcon }).addTo(map);
      miniMapRef.current = map;
    } catch (e) {
      console.warn('Leaflet mini map error:', e);
    }

    return () => {
      if (miniMapRef.current) {
        miniMapRef.current.remove();
        miniMapRef.current = null;
      }
    };
  }, [isLoading, details?.lat, details?.lng, activity.lat, activity.lng]);

  // Scrollspy para destacar a aba ativa conforme o scroll (Sobre e Informações)
  useEffect(() => {
    const handleScroll = () => {
      const sobreEl = document.getElementById('sobre');
      const infoEl = document.getElementById('informacoes');

      const scrollPos = window.scrollY + 180;

      if (infoEl && scrollPos >= infoEl.offsetTop) {
        setActiveTab('informacoes');
      } else if (sobreEl) {
        setActiveTab('sobre');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: 'sobre' | 'informacoes') => {
    setActiveTab(id);
    const el = document.getElementById(id);
    if (el) {
      const topOffset = el.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: Math.max(0, topOffset), behavior: 'smooth' });
    }
  };

  // Keyboard navigation para o Lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev !== null && prev < allPhotos.length - 1 ? prev + 1 : prev));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, details?.photos]);

  const handlePrevPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
  };

  const handleNextPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLightboxIndex((prev) => (prev !== null && prev < allPhotos.length - 1 ? prev + 1 : prev));
  };

  // Handlers para arrastar / swipe em touch screens
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartX.current === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - dragStartX.current;
    setDragOffset(diff);
  };

  const handleTouchEnd = () => {
    if (dragStartX.current === null) return;
    const threshold = 40;
    if (dragOffset < -threshold && lightboxIndex !== null && lightboxIndex < allPhotos.length - 1) {
      setLightboxIndex((prev) => (prev !== null ? prev + 1 : null));
    } else if (dragOffset > threshold && lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex((prev) => (prev !== null ? prev - 1 : null));
    }
    dragStartX.current = null;
    setDragOffset(0);
    setIsDragging(false);
  };

  // Handlers para arrastar com o mouse no Desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartX.current = e.clientX;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || dragStartX.current === null) return;
    const diff = e.clientX - dragStartX.current;
    setDragOffset(diff);
  };

  const handleMouseUp = () => {
    if (!isDragging || dragStartX.current === null) return;
    const threshold = 40;
    if (dragOffset < -threshold && lightboxIndex !== null && lightboxIndex < allPhotos.length - 1) {
      setLightboxIndex((prev) => (prev !== null ? prev + 1 : null));
    } else if (dragOffset > threshold && lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex((prev) => (prev !== null ? prev - 1 : null));
    }
    dragStartX.current = null;
    setDragOffset(0);
    setIsDragging(false);
  };

  const handleShare = async () => {
    const shareText = `Confira ${activity.name} no WAI Travel Hub!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: activity.name,
          text: shareText,
          url: window.location.href,
        });
      } catch {
        // user dismissed
      }
    } else {
      await navigator.clipboard.writeText(`${shareText} - ${window.location.href}`);
      toast.success('Link copiado para a área de transferência!');
    }
  };

  const handleCopyAddress = () => {
    const addressToCopy = details?.formattedAddress || activity.location || activity.name;
    navigator.clipboard.writeText(addressToCopy);
    setIsCopied(true);
    toast.success('Endereço copiado!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleOpenDirections = () => {
    openGoogleMapsDirections({
      name: activity.name,
      lat: details?.lat ?? activity.lat,
      lng: details?.lng ?? activity.lng,
      address: details?.formattedAddress,
      city: details?.city || activity.city,
    });
  };

  const handleVerNoMapa = () => {
    if (onOpenMap) {
      onOpenMap({
        ...activity,
        lat: details?.lat ?? activity.lat,
        lng: details?.lng ?? activity.lng,
        location: details?.formattedAddress || activity.location,
      });
    } else {
      handleOpenDirections();
    }
  };

  // Deduplica fotos e garante que a galeria NUNCA tenha fotos repetidas (mesmo com query params diferentes)
  const allPhotos = useMemo(() => {
    const rawList: string[] = [];

    // 1. Fotos retornadas pelo Google Places / DB Cache
    if (details?.photos && details.photos.length > 0) {
      rawList.push(...details.photos);
    }

    // 2. Foto original da atividade
    if (activity.image && activity.image.trim()) {
      rawList.push(activity.image.trim());
    }

    // 3. Deduplica fotos existentes usando assinatura normalizada
    const seenSignatures = new Set<string>();
    const unique: string[] = [];

    for (const p of rawList) {
      if (!p || !p.trim()) continue;
      const sig = getPhotoSignature(p);
      if (sig && !seenSignatures.has(sig)) {
        seenSignatures.add(sig);
        unique.push(p);
      }
    }

    // 4. Seleciona pool de fallbacks temáticos de acordo com a categoria da atividade
    const cat = (activity.category || details?.category || '').toLowerCase();
    let themeFallbacks = FALLBACK_PHOTOS_GENERAL;
    if (
      cat.includes('restaurante') ||
      cat.includes('gastronom') ||
      cat.includes('culin') ||
      cat.includes('bar') ||
      cat.includes('café') ||
      cat.includes('cafe') ||
      cat.includes('almoço') ||
      cat.includes('jantar')
    ) {
      themeFallbacks = FALLBACK_PHOTOS_FOOD;
    } else if (
      cat.includes('parque') ||
      cat.includes('praia') ||
      cat.includes('natureza') ||
      cat.includes('mirante') ||
      cat.includes('ar livre') ||
      cat.includes('trilha')
    ) {
      themeFallbacks = FALLBACK_PHOTOS_NATURE;
    } else if (
      cat.includes('museu') ||
      cat.includes('arte') ||
      cat.includes('galeria') ||
      cat.includes('cultura') ||
      cat.includes('teatro')
    ) {
      themeFallbacks = FALLBACK_PHOTOS_CULTURE;
    } else if (
      cat.includes('monumento') ||
      cat.includes('ponto turístico') ||
      cat.includes('turism') ||
      cat.includes('histór') ||
      cat.includes('histor') ||
      cat.includes('igreja') ||
      cat.includes('castelo')
    ) {
      themeFallbacks = FALLBACK_PHOTOS_LANDMARKS;
    }

    const combinedPool = [...themeFallbacks, ...FALLBACK_PHOTOS_GENERAL];

    for (const fb of combinedPool) {
      if (unique.length >= 5) break;
      const sig = getPhotoSignature(fb);
      if (sig && !seenSignatures.has(sig)) {
        seenSignatures.add(sig);
        unique.push(fb);
      }
    }

    return unique;
  }, [details?.photos, details?.category, activity.image, activity.category]);

  const heroImage =
    allPhotos[0] ||
    activity.image ||
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1000';

  const categoryName = details?.category || activity.category || 'Atração';
  const cityName = details?.city || activity.city || (activity.location ? activity.location.split(',')[0] : '');
  const titleDisplay = activity.name || 'Lugar';

  return (
    <div ref={containerRef} className="min-h-[100dvh] bg-white dark:bg-background text-[#141530] dark:text-foreground font-['Urbanist',sans-serif] pb-16">
      {/* ─── 1. HERO SECTION (Botões_Img / Frame 1321316151) ─── */}
      <div className="relative w-full h-[244px] overflow-hidden rounded-b-[24px] bg-muted shadow-sm">
        {/* Background Image */}
        <img
          src={heroImage}
          alt={activity.name}
          className="w-full h-full object-cover rounded-b-[24px]"
        />

        {/* Gradient Overlay as specified in CSS */}
        <div
          className="absolute inset-0 rounded-b-[24px] pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.26) 0%, rgba(0, 0, 0, 0.7) 62.95%)',
          }}
        />

        {/* Hero Content Container */}
        <div className="absolute inset-0 flex flex-col justify-between z-10">
          {/* Top Bar (Frame 1321316149) */}
          <div
            className="w-full px-6 flex items-center justify-between"
            style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 8px)' }}
          >
            {/* Back Button */}
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-[#FFFFFF] shadow-[0px_4px_20px_rgba(0,0,0,0.15)] flex items-center justify-center text-[#000000] active:scale-95 transition-all"
              aria-label="Voltar"
            >
              <ChevronLeft className="w-5 h-5 text-[#000000] stroke-[2.2]" />
            </button>

            {/* Share Button */}
            <button
              type="button"
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-[#FEFEFE] shadow-[0px_4px_20px_rgba(0,0,0,0.15)] flex items-center justify-center text-[#141530] active:scale-95 transition-all"
              aria-label="Compartilhar"
            >
              <Share2 className="w-5 h-5 text-[#141530]" />
            </button>
          </div>

          {/* Bottom Hero Info (Frame 1321316150) */}
          <div className="px-6 pb-6 flex flex-col gap-4 drop-shadow-[0px_4px_4px_rgba(0,0,0,0.25)]">
            {/* Title & Subtitle Group */}
            <div className="flex flex-col gap-1">
              <h1 className="font-['Urbanist',sans-serif] font-semibold text-[24px] leading-[29px] text-[#F2F2F2] truncate">
                {titleDisplay}
              </h1>

              {/* Subtitle: Category | City */}
              <div className="flex items-center gap-1">
                <span className="font-['Urbanist',sans-serif] font-semibold text-[14px] leading-[17px] text-[#E7E7EE]">
                  {categoryName}
                </span>
                <span className="font-['Urbanist',sans-serif] font-medium text-[16px] leading-[19px] text-[#FEFEFE] px-0.5">
                  |
                </span>
                <span className="font-['Urbanist',sans-serif] font-semibold text-[14px] leading-[17px] text-[#E7E7EE]">
                  {cityName}
                </span>
              </div>
              
              {/* Rating */}
              {isLoading && !details?.rating && !activity.rating ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-[100px] h-[20px] bg-[#E7E7EE]/30 animate-pulse rounded" />
                </div>
              ) : (details?.rating || activity.rating) ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Star className="w-4 h-4 fill-[#FFB800] text-[#FFB800]" />
                  <span className="font-['Urbanist',sans-serif] font-semibold text-[14px] leading-[17px] text-[#FEFEFE]">
                    {Number(details?.rating || activity.rating).toFixed(1)}
                  </span>
                  {details?.userRatingCount && (
                    <span className="font-['Urbanist',sans-serif] font-medium text-[13px] leading-[16px] text-[#E7E7EE]/80">
                      ({details.userRatingCount.toLocaleString()} avaliações)
                    </span>
                  )}
                </div>
              ) : null}
            </div>

            {/* Glass Action Tags (Frame 1321316054) */}
            <div className="flex items-center gap-2">
              {/* Tag 1: Ver no mapa */}
              <button
                type="button"
                onClick={handleVerNoMapa}
                className="h-[32px] px-3 py-1 box-border rounded-[9px] border border-[#FEFEFE] flex items-center justify-center gap-1.5 text-[#FEFEFE] hover:bg-white/15 active:scale-95 transition-all font-['Urbanist',sans-serif] font-normal text-[14px] leading-[17px]"
              >
                <MapPin className="w-4 h-4 text-[#FEFEFE]" />
                <span>Ver no mapa</span>
              </button>

              {/* Tag 2: Direções */}
              <button
                type="button"
                onClick={handleOpenDirections}
                className="h-[32px] px-3 py-1 box-border rounded-[9px] border border-[#FEFEFE] flex items-center justify-center gap-1.5 text-[#FEFEFE] hover:bg-white/15 active:scale-95 transition-all font-['Urbanist',sans-serif] font-normal text-[14px] leading-[17px]"
              >
                <Compass className="w-4 h-4 text-[#FEFEFE]" />
                <span>Direções</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. STICKY TABS BAR (2 Abas: Sobre | Informações) ─── */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-background/95 backdrop-blur-md px-4 pt-3 pb-0 mt-6 border-b border-[#F2F2F2] dark:border-border">
        <div className="flex items-center gap-4 h-[30px]">
          {(['sobre', 'informacoes'] as const).map((tab) => {
            const label = tab === 'sobre' ? 'Sobre' : 'Informações';
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => scrollToSection(tab)}
                className={`h-[30px] font-['Urbanist',sans-serif] font-semibold text-[16px] leading-[28px] px-2 transition-all relative ${
                  isActive
                    ? 'text-[#080B43] dark:text-white border-b-2 border-[#080B43] dark:border-white'
                    : 'text-[#7F7F7F] hover:text-[#141530] dark:hover:text-white border-b border-transparent'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 3. CONTENT BODY (block) ─── */}
      <div className="px-4 py-6 flex flex-col gap-8 bg-white dark:bg-background max-w-2xl mx-auto">
        {isLoading ? (
          /* SKELETON LOADING STATE */
          <div className="space-y-6 animate-pulse">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-9/12" />
            </div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-12 w-full rounded-[8px]" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-28 rounded-[9px]" />
                <Skeleton className="h-6 w-28 rounded-[9px]" />
              </div>
            </div>
            <Skeleton className="h-32 w-full rounded-[8px]" />
          </div>
        ) : (
          <>
            {/* ─── SEÇÃO 1: SOBRE (Frame 1321316421) ─── */}
            <section id="sobre" className="flex flex-col gap-4 scroll-mt-24">
              {/* Description */}
              <p className="font-['Urbanist',sans-serif] font-medium text-[16px] leading-[22px] text-[#7F7F7F] dark:text-muted-foreground">
                {details?.description || 'Um dos maiores símbolos e atrações imperdíveis da região, com arquitetura icônica, história rica e vistas panorâmicas deslumbrantes.'}
              </p>

              {/* Média de gasto (Frame 1321316541) */}
              <div className="flex items-center gap-2 h-[23px]">
                <Sparkles className="w-[18px] h-[18px] text-[#2865B6] shrink-0" />
                <span className="font-['Urbanist',sans-serif] font-semibold text-[16px] leading-[22px] text-[#141530] dark:text-foreground">
                  Média de gasto:{' '}
                  <span className="font-medium text-[#7F7F7F] dark:text-muted-foreground">
                    {details?.averageExpense || 'R$ 250,00'}
                  </span>
                </span>
              </div>

              {/* Horário de funcionamento (Frame 1321316390) */}
              <div className="flex flex-col gap-4 pt-2">
                <h3 className="font-['Urbanist',sans-serif] font-semibold text-[18px] leading-[22px] text-[#171F2C] dark:text-foreground">
                  Horário de funcionamento
                </h3>

                {/* Card (Frame 1321316162) */}
                <div className="bg-white dark:bg-card border border-[#D6D6D6] dark:border-border rounded-[8px] overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => setIsHoursOpen(!isHoursOpen)}
                    className="w-full flex items-center justify-between p-3 min-h-[44px] text-left active:bg-black/5 dark:active:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-[#0A0E59] dark:text-primary shrink-0" />
                      <span className="font-['Urbanist',sans-serif] font-medium text-[14px] leading-[20px] text-[#141530] dark:text-foreground">
                        Hoje: {details?.openingHours?.todayHours || '12:00 - 23:00'}
                      </span>
                    </div>
                    {isHoursOpen ? (
                      <ChevronUp className="w-5 h-5 text-[#555555]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[#555555]" />
                    )}
                  </button>

                  {/* Collapsible 7-day schedule */}
                  {isHoursOpen && (
                    <div className="px-4 py-2 border-t border-[#F2F2F2] dark:border-border space-y-1.5 text-[13px] font-['Urbanist',sans-serif] text-[#7F7F7F] dark:text-muted-foreground animate-in fade-in duration-200">
                      {details?.openingHours?.weekdayDescriptions && details.openingHours.weekdayDescriptions.length > 0 ? (
                        details.openingHours.weekdayDescriptions.map((dayDesc, idx) => (
                          <div key={idx} className="py-1 flex items-center justify-between">
                            <span>{dayDesc}</span>
                          </div>
                        ))
                      ) : (
                        <p className="py-1">Segunda a Domingo: 09:00 – 18:00</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Perfeito para (Frame 1321316387) */}
              {details?.tags && details.tags.length > 0 && (
                <div className="flex flex-col gap-4 pt-2">
                  <h3 className="font-['Urbanist',sans-serif] font-semibold text-[18px] leading-[22px] text-[#171F2C] dark:text-foreground">
                    Perfeito para
                  </h3>
                  <div className="flex flex-row flex-wrap gap-3">
                    {details.tags.map((tag, idx) => (
                      <div
                        key={idx}
                        className="h-[24px] px-3 py-1 bg-[#EEEEEE] dark:bg-muted rounded-[9px] flex items-center justify-center gap-1.5"
                      >
                        <Target className="w-3.5 h-3.5 text-[#555555] shrink-0" />
                        <span className="font-['Urbanist',sans-serif] font-medium text-[12px] leading-[14px] text-[#555555] dark:text-foreground text-center">
                          {tag}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* O que você precisa saber (Frame 1321316388) */}
              {details?.tips && details.tips.length > 0 && (
                <div className="flex flex-col gap-4 pt-2">
                  <h3 className="font-['Urbanist',sans-serif] font-semibold text-[18px] leading-[22px] text-[#171F2C] dark:text-foreground">
                    O que você precisa saber
                  </h3>
                  <div className="flex flex-col gap-4">
                    {details.tips.map((tip, idx) => (
                      <div key={idx} className="flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                          <Lightbulb className="w-4 h-4 text-[#0A0E59] dark:text-primary shrink-0 mt-0.5" />
                          <span className="font-['Urbanist',sans-serif] font-medium text-[14px] leading-[17px] text-[#7F7F7F] dark:text-muted-foreground flex-1">
                            {tip}
                          </span>
                        </div>
                        {idx < details.tips.length - 1 && (
                          <div className="w-full border-b border-[#F2F2F2] dark:border-border" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* ─── SEÇÃO 2: INFORMAÇÕES & GALERIA UNIFICADAS ─── */}
            <section id="informacoes" className="flex flex-col gap-6 scroll-mt-24">
              <h3 className="font-['Urbanist',sans-serif] font-bold text-[18px] leading-[22px] text-[#171F2C] dark:text-foreground">
                Informações
              </h3>

              {/* Mini Map (Rectangle 38) */}
              <div
                onClick={handleVerNoMapa}
                className="w-full h-[135px] rounded-[8px] overflow-hidden border border-[#D6D6D6] dark:border-border cursor-pointer relative shadow-xs group"
                title="Ver no mapa"
              >
                <div ref={miniMapContainerRef} className="w-full h-full" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
              </div>

              {/* Address Card (Frame 1321316162) */}
              <div className="w-full min-h-[64px] p-3 bg-white dark:bg-card border border-[#D6D6D6] dark:border-border rounded-[8px] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Clock className="w-5 h-5 text-[#0A0E59] dark:text-primary shrink-0" />
                  <p className="font-['Urbanist',sans-serif] font-medium text-[14px] leading-[20px] text-[#141530] dark:text-foreground break-words">
                    {details?.formattedAddress || activity.location || 'Endereço não disponível'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-[#86B61F] hover:bg-[#86B61F]/10 active:scale-95 transition-all shrink-0"
                  title="Copiar endereço"
                  aria-label="Copiar endereço"
                >
                  {isCopied ? (
                    <Check className="w-5 h-5 text-[#86B61F]" />
                  ) : (
                    <Copy className="w-5 h-5 text-[#86B61F]" />
                  )}
                </button>
              </div>

              {/* Galeria de Fotos */}
              {allPhotos.length > 0 && (
                <div className="flex flex-col gap-3 pt-2">
                  <h4 className="font-['Urbanist',sans-serif] font-semibold text-[16px] leading-[20px] text-[#171F2C] dark:text-foreground">
                    Galeria
                  </h4>

                  <div className="flex flex-row gap-2 h-[248px]">
                    {/* Left Column (Rectangle 38) */}
                    <div
                      onClick={() => setLightboxIndex(0)}
                      className="flex-1 h-[248px] rounded-[8px] overflow-hidden cursor-pointer active:scale-[0.99] transition-transform bg-muted"
                    >
                      <img
                        src={allPhotos[0]}
                        alt={`${activity.name} 1`}
                        className="w-full h-full object-cover rounded-[8px]"
                        loading="lazy"
                      />
                    </div>

                    {/* Right Column (Frame 2087325002) */}
                    <div className="flex-1 h-[248px] flex flex-col gap-2">
                      {/* Top Image (Rectangle 40) */}
                      {allPhotos.length > 1 ? (
                        <div
                          onClick={() => setLightboxIndex(1)}
                          className="h-[120px] rounded-[8px] overflow-hidden cursor-pointer active:scale-[0.99] transition-transform bg-muted"
                        >
                          <img
                            src={allPhotos[1]}
                            alt={`${activity.name} 2`}
                            className="w-full h-full object-cover rounded-[8px]"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="h-[120px] rounded-[8px] bg-muted/40" />
                      )}

                      {/* Bottom Image (Rectangle 42 / 43 with +N Overlay) */}
                      {allPhotos.length > 2 ? (
                        <div
                          onClick={() => setLightboxIndex(2)}
                          className="h-[120px] rounded-[8px] overflow-hidden cursor-pointer active:scale-[0.99] transition-transform relative bg-muted"
                        >
                          <img
                            src={allPhotos[2]}
                            alt={`${activity.name} 3`}
                            className="w-full h-full object-cover rounded-[8px]"
                            loading="lazy"
                          />
                          {allPhotos.length > 3 && (
                            <div className="absolute inset-0 bg-black/50 rounded-[8px] flex items-center justify-center">
                              <span className="font-['Urbanist',sans-serif] font-bold text-[32px] leading-[38px] text-white">
                                +{allPhotos.length - 2}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-[120px] rounded-[8px] bg-muted/40" />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* ─── 4. FULLSCREEN LIGHTBOX (Trilho contínuo ultra-fluido com swipe em tempo real) ─── */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[3000] bg-black/95 flex flex-col justify-between py-6 px-0 select-none touch-pan-y animate-in fade-in duration-200"
          onClick={() => setLightboxIndex(null)}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Lightbox Header */}
          <div className="flex items-center justify-between z-30 px-6">
            <span className="text-white text-[15px] font-bold font-['Urbanist',sans-serif] tracking-wide">
              {lightboxIndex + 1} de {allPhotos.length}
            </span>
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white active:scale-95 transition-all"
              aria-label="Fechar galeria"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Image Container with Continuous Sliding Track */}
          <div
            className="flex-1 relative flex items-center justify-center overflow-hidden py-4 cursor-grab active:cursor-grabbing w-full"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Previous Button */}
            {lightboxIndex > 0 && (
              <button
                type="button"
                onClick={handlePrevPhoto}
                className="absolute left-4 z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm active:scale-95 transition-all shadow-md"
                aria-label="Foto anterior"
              >
                <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
              </button>
            )}

            {/* Continuous Track of Pre-Rendered Images */}
            <div
              className="w-full h-full flex items-center"
              style={{
                transform: `translateX(calc(-${lightboxIndex * 100}% + ${dragOffset}px))`,
                transition: isDragging ? 'none' : 'transform 280ms cubic-bezier(0.25, 1, 0.5, 1)',
                willChange: 'transform',
              }}
            >
              {allPhotos.map((photo, i) => (
                <div
                  key={i}
                  className="w-full h-full flex-shrink-0 flex items-center justify-center px-4"
                >
                  <img
                    src={photo}
                    alt={`Foto ${i + 1}`}
                    className="max-h-[75vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl user-select-none pointer-events-none"
                    draggable={false}
                    loading={Math.abs(i - lightboxIndex) <= 1 ? 'eager' : 'lazy'}
                  />
                </div>
              ))}
            </div>

            {/* Next Button */}
            {lightboxIndex < allPhotos.length - 1 && (
              <button
                type="button"
                onClick={handleNextPhoto}
                className="absolute right-4 z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm active:scale-95 transition-all shadow-md"
                aria-label="Próxima foto"
              >
                <ChevronRight className="w-6 h-6 stroke-[2.5]" />
              </button>
            )}
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center items-center gap-1.5 z-30 py-2 px-6">
            {allPhotos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(i);
                }}
                className={`h-2 rounded-full transition-all ${
                  i === lightboxIndex ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Ir para foto ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

