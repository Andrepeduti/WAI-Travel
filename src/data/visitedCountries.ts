export interface CountryVisit {
  code: string;
  name: string;
  flag: string;
  year: number;
  continent: string;
  cities: string[];
  days: number;
  dateRange: string;
  lat: number;
  lng: number;
  photos: string[];
}

export const visitedCountries: CountryVisit[] = [
  {
    code: 'BR', name: 'Brasil', flag: '🇧🇷', year: 2024, continent: 'América do Sul',
    cities: ['São Paulo', 'Rio de Janeiro', 'Salvador'], days: 120, dateRange: 'Jan–Dez 2024',
    lat: -14.24, lng: -51.93,
    photos: [
      'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=600',
      'https://images.unsplash.com/photo-1516306580123-e6e52b1b7b5f?w=600',
      'https://images.unsplash.com/photo-1518639192441-8fce0a366e2e?w=600',
    ],
  },
  {
    code: 'US', name: 'Estados Unidos', flag: '🇺🇸', year: 2023, continent: 'América do Norte',
    cities: ['New York', 'Miami', 'Los Angeles'], days: 21, dateRange: 'Jun–Jul 2023',
    lat: 37.09, lng: -95.71,
    photos: [
      'https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=600',
      'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600',
      'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600',
    ],
  },
  {
    code: 'FR', name: 'França', flag: '🇫🇷', year: 2023, continent: 'Europa',
    cities: ['Paris', 'Nice', 'Lyon'], days: 14, dateRange: 'Ago 2023',
    lat: 46.60, lng: 2.21,
    photos: [
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600',
      'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=600',
      'https://images.unsplash.com/photo-1431274172761-fca41d930114?w=600',
    ],
  },
  {
    code: 'IT', name: 'Itália', flag: '🇮🇹', year: 2023, continent: 'Europa',
    cities: ['Roma', 'Florença', 'Veneza'], days: 10, dateRange: 'Set 2023',
    lat: 41.87, lng: 12.57,
    photos: [
      'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=600',
      'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=600',
      'https://images.unsplash.com/photo-1534113414509-0eec2bfb493f?w=600',
    ],
  },
  {
    code: 'ES', name: 'Espanha', flag: '🇪🇸', year: 2022, continent: 'Europa',
    cities: ['Barcelona', 'Madrid'], days: 8, dateRange: 'Mar 2022',
    lat: 40.46, lng: -3.75,
    photos: [
      'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600',
      'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600',
      'https://images.unsplash.com/photo-1509840841025-9088ba78a826?w=600',
    ],
  },
  {
    code: 'PT', name: 'Portugal', flag: '🇵🇹', year: 2022, continent: 'Europa',
    cities: ['Lisboa', 'Porto'], days: 7, dateRange: 'Abr 2022',
    lat: 39.40, lng: -8.22,
    photos: [
      'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=600',
      'https://images.unsplash.com/photo-1513735492284-ecb2f5ce894a?w=600',
      'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600',
    ],
  },
  {
    code: 'AR', name: 'Argentina', flag: '🇦🇷', year: 2022, continent: 'América do Sul',
    cities: ['Buenos Aires', 'Mendoza'], days: 9, dateRange: 'Nov 2022',
    lat: -38.42, lng: -63.62,
    photos: [
      'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=600',
      'https://images.unsplash.com/photo-1612294037637-ec328d0e075e?w=600',
      'https://images.unsplash.com/photo-1588413949557-910e206750bd?w=600',
    ],
  },
  {
    code: 'MX', name: 'México', flag: '🇲🇽', year: 2021, continent: 'América do Norte',
    cities: ['Cidade do México', 'Cancún'], days: 12, dateRange: 'Dez 2021',
    lat: 23.63, lng: -102.55,
    photos: [
      'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=600',
      'https://images.unsplash.com/photo-1547995886-6dc09384c6e6?w=600',
      'https://images.unsplash.com/photo-1570737209810-87a8e7245f88?w=600',
    ],
  },
  {
    code: 'JP', name: 'Japão', flag: '🇯🇵', year: 2024, continent: 'Ásia',
    cities: ['Tóquio', 'Quioto', 'Osaka'], days: 15, dateRange: 'Mar–Abr 2024',
    lat: 36.20, lng: 138.25,
    photos: [
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600',
      'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600',
      'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600',
    ],
  },
  {
    code: 'DE', name: 'Alemanha', flag: '🇩🇪', year: 2021, continent: 'Europa',
    cities: ['Berlim', 'Munique'], days: 6, dateRange: 'Jul 2021',
    lat: 51.17, lng: 10.45,
    photos: [
      'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600',
      'https://images.unsplash.com/photo-1449452198679-05c7fd30f416?w=600',
      'https://images.unsplash.com/photo-1554072675-d13e23ee5c48?w=600',
    ],
  },
];

export function getUniqueCountinents(countries: CountryVisit[]): string[] {
  return [...new Set(countries.map(c => c.continent))];
}
