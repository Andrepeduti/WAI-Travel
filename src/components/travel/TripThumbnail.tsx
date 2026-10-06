import { GENERIC_TRAVEL_PLACEHOLDER } from '@/lib/coverImageResolver';

// Single cover image thumbnail (Figma: width 95px, height 117px, border-radius 8px)
export function TripThumbnail({ images, className }: { images: string[]; className?: string }) {
  const cover = images.find((image) => image && !image.startsWith('blob:')) || GENERIC_TRAVEL_PLACEHOLDER;
  return (
    <div className={`rounded-[8px] overflow-hidden flex-shrink-0 bg-muted ${className || "w-[95px] h-[117px] min-w-[95px] min-h-[117px]"}`}>
      <img
        src={cover}
        alt=""
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
}
