import { useState, useRef, useEffect, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';

const popularLocations = [
  'Paris, França', 'Londres, Inglaterra', 'Nova York, EUA', 'Tóquio, Japão',
  'Roma, Itália', 'Barcelona, Espanha', 'Lisboa, Portugal', 'Berlim, Alemanha',
  'Amsterdã, Holanda', 'Praga, República Tcheca', 'Viena, Áustria', 'Budapeste, Hungria',
  'Dublin, Irlanda', 'Edimburgo, Escócia', 'Atenas, Grécia', 'Istambul, Turquia',
  'Dubai, Emirados Árabes', 'Bangkok, Tailândia', 'Singapura', 'Sydney, Austrália',
  'Buenos Aires, Argentina', 'Santiago, Chile', 'Lima, Peru', 'Bogotá, Colômbia',
  'Cidade do México, México', 'Cancún, México', 'Havana, Cuba', 'Cartagena, Colômbia',
  'Rio de Janeiro, Brasil', 'São Paulo, Brasil', 'Salvador, Brasil', 'Florianópolis, Brasil',
  'Gramado, Brasil', 'Foz do Iguaçu, Brasil', 'Recife, Brasil', 'Fortaleza, Brasil',
  'Cusco, Peru', 'Machu Picchu, Peru', 'Bariloche, Argentina', 'Montevidéu, Uruguai',
  'Marrakech, Marrocos', 'Cairo, Egito', 'Cidade do Cabo, África do Sul',
  'Kyoto, Japão', 'Seul, Coreia do Sul', 'Bali, Indonésia', 'Hanói, Vietnã',
  'Munique, Alemanha', 'Florença, Itália', 'Veneza, Itália', 'Milão, Itália',
  'Porto, Portugal', 'Madri, Espanha', 'Zurique, Suíça', 'Copenhague, Dinamarca',
  'Estocolmo, Suécia', 'Oslo, Noruega', 'Helsinque, Finlândia',
  'San Francisco, EUA', 'Los Angeles, EUA', 'Miami, EUA', 'Chicago, EUA',
  'Toronto, Canadá', 'Vancouver, Canadá', 'Queenstown, Nova Zelândia',
];

export interface CollectionPlaceResult {
  id: number;
  name: string;
  category: string;
  image: string;
  rating: number;
  address: string;
  lat?: number;
  lng?: number;
}

const categories = [
  'Restaurante',
  'Museu',
  'Monumento',
  'Parque',
  'Praia',
  'Hotel',
  'Café',
  'Bar',
  'Loja',
  'Igreja',
  'Mercado',
  'Castelo',
  'Templo',
  'Outro',
];

interface AddPlaceToCollectionSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (places: CollectionPlaceResult[]) => void;
}

export function AddPlaceToCollectionSheet({ open, onClose, onSelect }: AddPlaceToCollectionSheetProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addressSuggestions = useMemo(() => {
    if (!address.trim()) return [];
    const filtered = popularLocations.filter(loc =>
      loc.toLowerCase().includes(address.toLowerCase())
    ).slice(0, 5);
    // Hide suggestions if the user already selected/typed an exact match
    if (filtered.length === 1 && filtered[0] === address) return [];
    return filtered;
  }, [address]);

  useEffect(() => {
    if (open) {
      setTimeout(() => nameRef.current?.focus(), 350);
    }
  }, [open]);

  if (!open) return null;

  const isValid = name.trim().length > 0;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = () => {
    if (!isValid) return;
    const place: CollectionPlaceResult = {
      id: Date.now(),
      name: name.trim(),
      category: selectedCategory || 'Outro',
      image: imagePreview || '',
      rating: 0,
      address: address.trim(),
    };
    onSelect([place]);
    setName('');
    setAddress('');
    setSelectedCategory('');
    setImagePreview(null);
    onClose();
  };

  const handleClose = () => {
    setName('');
    setAddress('');
    setSelectedCategory('');
    setImagePreview(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[210] flex justify-center" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="absolute bottom-0 w-full max-w-[430px] bg-card rounded-t-3xl flex flex-col animate-in slide-in-from-bottom duration-300"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mt-3 mb-2" />

        {/* Header */}
        <div className="px-5 pb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-foreground">Salvar na coleção</h2>
          <button onClick={handleClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#F2F2F2' }}>
            <Icon name="close" size={18} className="text-foreground" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 scrollbar-hide space-y-5">
          {/* Image upload */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold" style={{ color: '#999' }}>
              Foto
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={removeImage}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm"
                >
                  <Icon name="close" size={12} style={{ color: '#FFFFFF' }} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-colors active:bg-muted/40"
                style={{ borderColor: '#E0E0E0' }}
              >
                <Icon name="photo_camera" size={24} style={{ color: '#999' }} />
                <span className="text-[11px] font-medium" style={{ color: '#999' }}>
                  Foto
                </span>
              </button>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold" style={{ color: '#999' }}>
              Nome do lugar
            </label>
            <input
              ref={nameRef}
              type="text"
              placeholder="Ex: Torre Eiffel"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full h-[48px] px-4 text-[14px] font-medium rounded-xl outline-none transition-colors"
              style={{
                background: '#F7F7F7',
                color: '#1A1C40',
                border: `1px solid ${name ? '#1A1C40' : '#EBEBEB'}`,
                caretColor: '#1A1C40',
              }}
            />
          </div>

          {/* Address with autocomplete */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold" style={{ color: '#999' }}>
              Endereço ou localização
            </label>
            <div className="relative">
              <div className="relative">
                <Icon
                  name="location_on"
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: '#999' }}
                />
                <input
                  type="text"
                  placeholder="Ex: Paris, França"
                  value={address}
                  onChange={e => { setAddress(e.target.value); setShowAddressSuggestions(true); }}
                  onFocus={() => setShowAddressSuggestions(true)}
                  className="w-full h-[48px] pl-10 pr-10 text-[14px] font-medium rounded-xl outline-none transition-colors"
                  style={{
                    background: '#F7F7F7',
                    color: '#1A1C40',
                    border: `1px solid ${address || showAddressSuggestions ? '#1A1C40' : '#EBEBEB'}`,
                    caretColor: '#1A1C40',
                  }}
                />
                {address && (
                  <button
                    onClick={() => { setAddress(''); setShowAddressSuggestions(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: '#E5E5E5' }}
                  >
                    <Icon name="close" size={12} style={{ color: '#666' }} />
                  </button>
                )}
              </div>
              {showAddressSuggestions && addressSuggestions.length > 0 && (
                <div
                  className="mt-1 rounded-xl overflow-hidden animate-in fade-in duration-150"
                  style={{
                    border: '1px solid #EBEBEB',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    background: '#FAFAFA',
                  }}
                >
                  {addressSuggestions.map(loc => (
                    <button
                      key={loc}
                      onClick={() => {
                        setAddress(loc);
                        setShowAddressSuggestions(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-[13px] font-medium flex items-center gap-2.5 transition-colors active:bg-muted/60"
                      style={{ color: '#1A1C40' }}
                    >
                      <Icon name="location_on" size={16} style={{ color: '#999' }} />
                      <span>{loc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Category select */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold" style={{ color: '#999' }}>
              Categoria
            </label>
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="w-full h-[48px] px-4 text-[14px] font-medium rounded-xl flex items-center justify-between transition-colors"
              style={{
                background: '#F7F7F7',
                color: selectedCategory ? '#1A1C40' : '#999',
                border: `1px solid ${selectedCategory || showCategoryDropdown ? '#1A1C40' : '#EBEBEB'}`,
              }}
            >
              <span>{selectedCategory || 'Selecionar categoria'}</span>
              <Icon
                name={showCategoryDropdown ? 'expand_less' : 'expand_more'}
                size={20}
                style={{ color: '#999' }}
              />
            </button>

            {showCategoryDropdown && (
              <div
                className="rounded-xl overflow-hidden animate-in fade-in duration-150"
                style={{
                  border: '1px solid #EBEBEB',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  background: '#FAFAFA',
                }}
              >
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setShowCategoryDropdown(false);
                    }}
                    className="w-full px-4 py-3 text-left text-[14px] font-medium transition-colors flex items-center justify-between"
                    style={{
                      color: '#1A1C40',
                      background: selectedCategory === cat ? 'rgba(157, 204, 54, 0.1)' : 'transparent',
                    }}
                  >
                    <span>{cat}</span>
                    {selectedCategory === cat && (
                      <Icon name="check" size={18} style={{ color: '#9DCC36' }} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Button */}
        <div
          className="px-5 pt-3 border-t border-border/40"
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }}
        >
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className="w-full py-3.5 rounded-2xl text-[15px] font-bold transition-all active:scale-[0.98]"
            style={{
              background: isValid ? '#9DCC36' : '#E5E5E5',
              color: isValid ? '#1A1C40' : '#999',
              boxShadow: isValid ? '0 4px 16px rgba(157, 204, 54, 0.3)' : 'none',
            }}
          >
            Salvar na coleção
          </button>
        </div>
      </div>
    </div>
  );
}
