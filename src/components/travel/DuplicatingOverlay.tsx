export function DuplicatingOverlay() {
  return (
    <div className="fixed inset-0 z-[210] flex flex-col items-center justify-center gap-6" style={{ backgroundColor: '#1A1C40' }}>
      <div className="relative w-[80px] h-[80px] animate-spin">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'conic-gradient(from 180deg at 50% 50%, rgba(134, 182, 31, 0) 0deg, #86B61F 360deg)',
            WebkitMaskImage: 'radial-gradient(circle at center, transparent 34px, black 35px)',
            maskImage: 'radial-gradient(circle at center, transparent 34px, black 35px)'
          }}
        />
        <div
          className="absolute"
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#9DCC36',
            top: '67.57px',
            left: '34.18px'
          }}
        />
      </div>
      <p className="text-[24px] font-semibold text-[#FEFEFE]" style={{ fontFamily: 'Urbanist, sans-serif' }}>
        Duplicando roteiro...
      </p>
    </div>
  );
}
