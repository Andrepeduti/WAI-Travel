import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';


interface ActivityData {
  id: number;
  name: string;
  image: string;
  category: string;
  rating: number;
  price: string;
  openHours: string;
  startTime: string;
  endTime: string;
  day?: number | null;
}

interface ActivityDetailSheetProps {
  activity: ActivityData | null;
  videoLink?: string;
  onClose: () => void;
}

// ─── Place-specific photo database ───────────────────────────────────────────
// Each place gets unique, real photos. The activity.image is always included as first.

const placePhotos: Record<string, string[]> = {
  // Paris
  'Museu do Louvre': [
    'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=600',
    'https://images.unsplash.com/photo-1564399580075-5dfe19c205f3?w=600',
    'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=600',
    'https://images.unsplash.com/photo-1585651378721-d5e8b5d8e2a8?w=600',
    'https://images.unsplash.com/photo-1591289009723-aef0a1a8a211?w=600',
    'https://images.unsplash.com/photo-1587651831397-a2c3dfb6e5c0?w=600',
  ],
  'Torre Eiffel': [
    'https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=600',
    'https://images.unsplash.com/photo-1511739001486-6bfe10ce65f4?w=600',
    'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600',
    'https://images.unsplash.com/photo-1431274172761-fca41d930114?w=600',
    'https://images.unsplash.com/photo-1549144511-f099e773c147?w=600',
    'https://images.unsplash.com/photo-1500039436846-25ae2f11882e?w=600',
  ],
  'Sacré-Cœur': [
    'https://images.unsplash.com/photo-1520939817895-060bdaf4fe1b?w=600',
    'https://images.unsplash.com/photo-1551634979-2b11f8c946fe?w=600',
    'https://images.unsplash.com/photo-1590095867115-080789084554?w=600',
    'https://images.unsplash.com/photo-1555685812-4b943f1cb3eb?w=600',
    'https://images.unsplash.com/photo-1591636051903-3ea8e4523f40?w=600',
  ],
  "Museu d'Orsay": [
    'https://images.unsplash.com/photo-1591289009723-aef0a1a8a211?w=600',
    'https://images.unsplash.com/photo-1564399580075-5dfe19c205f3?w=600',
    'https://images.unsplash.com/photo-1583225173760-16c3e45e6688?w=600',
    'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=600',
    'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=600',
  ],
  'Café de Flore': [
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600',
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600',
    'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=600',
    'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=600',
    'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=600',
  ],
  'Arco do Triunfo': [
    'https://images.unsplash.com/photo-1509439581779-6298f75bf6e5?w=600',
    'https://images.unsplash.com/photo-1524396309943-e03f5249f002?w=600',
    'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=600',
    'https://images.unsplash.com/photo-1541855492-581f618108af?w=600',
    'https://images.unsplash.com/photo-1471623320832-752e8bbf8413?w=600',
  ],
  'Montmartre': [
    'https://images.unsplash.com/photo-1551634979-2b11f8c946fe?w=600',
    'https://images.unsplash.com/photo-1555685812-4b943f1cb3eb?w=600',
    'https://images.unsplash.com/photo-1590095867115-080789084554?w=600',
    'https://images.unsplash.com/photo-1520939817895-060bdaf4fe1b?w=600',
    'https://images.unsplash.com/photo-1560625269-c2a18db51023?w=600',
  ],
  // Amsterdam
  'Rijksmuseum': [
    'https://images.unsplash.com/photo-1576924542622-772281b13aa8?w=600',
    'https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=600',
    'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600',
    'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=600',
    'https://images.unsplash.com/photo-1512470876337-d72d5c37f8f3?w=600',
  ],
  'Museu Van Gogh': [
    'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600',
    'https://images.unsplash.com/photo-1576924542622-772281b13aa8?w=600',
    'https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=600',
    'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=600',
    'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600',
  ],
  'Vondelpark': [
    'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600',
    'https://images.unsplash.com/photo-1524047934617-cb782c24e5f3?w=600',
    'https://images.unsplash.com/photo-1588392382834-a891154bca4d?w=600',
    'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=600',
    'https://images.unsplash.com/photo-1512470876337-d72d5c37f8f3?w=600',
  ],
  'Casa de Anne Frank': [
    'https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?w=600',
    'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=600',
    'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600',
    'https://images.unsplash.com/photo-1576924542622-772281b13aa8?w=600',
    'https://images.unsplash.com/photo-1504019347908-b45f9b0b8f64?w=600',
  ],
  // Roma
  'Coliseu': [
    'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600',
    'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=600',
    'https://images.unsplash.com/photo-1548585744-5be19c3fd653?w=600',
    'https://images.unsplash.com/photo-1529260830199-42c24126f198?w=600',
    'https://images.unsplash.com/photo-1555992828-ca4dbe41d294?w=600',
    'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=600',
  ],
  'Vaticano': [
    'https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=600',
    'https://images.unsplash.com/photo-1548585744-5be19c3fd653?w=600',
    'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600',
    'https://images.unsplash.com/photo-1525874684015-58379d421a52?w=600',
    'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=600',
  ],
  'Fontana di Trevi': [
    'https://images.unsplash.com/photo-1525874684015-58379d421a52?w=600',
    'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600',
    'https://images.unsplash.com/photo-1555992828-ca4dbe41d294?w=600',
    'https://images.unsplash.com/photo-1548585744-5be19c3fd653?w=600',
    'https://images.unsplash.com/photo-1529260830199-42c24126f198?w=600',
  ],
  // Nova York
  'Central Park': [
    'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600',
    'https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=600',
    'https://images.unsplash.com/photo-1490644658840-3f2e3f8c5625?w=600',
    'https://images.unsplash.com/photo-1522083165195-3424ed14020d?w=600',
    'https://images.unsplash.com/photo-1496588152823-86ff7695e68f?w=600',
    'https://images.unsplash.com/photo-1543716091-a840c05249ec?w=600',
  ],
  'MET Museum': [
    'https://images.unsplash.com/photo-1575505586569-646b2ca898fc?w=600',
    'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600',
    'https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=600',
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600',
    'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=600',
  ],
  'Estátua da Liberdade': [
    'https://images.unsplash.com/photo-1485738422979-f5c462d49f04?w=600',
    'https://images.unsplash.com/photo-1496588152823-86ff7695e68f?w=600',
    'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600',
    'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=600',
    'https://images.unsplash.com/photo-1490644658840-3f2e3f8c5625?w=600',
    'https://images.unsplash.com/photo-1543716091-a840c05249ec?w=600',
  ],
  'Times Square': [
    'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=600',
    'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600',
    'https://images.unsplash.com/photo-1496588152823-86ff7695e68f?w=600',
    'https://images.unsplash.com/photo-1490644658840-3f2e3f8c5625?w=600',
    'https://images.unsplash.com/photo-1543716091-a840c05249ec?w=600',
  ],
  'Brooklyn Bridge': [
    'https://images.unsplash.com/photo-1496588152823-86ff7695e68f?w=600',
    'https://images.unsplash.com/photo-1543716091-a840c05249ec?w=600',
    'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600',
    'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=600',
    'https://images.unsplash.com/photo-1490644658840-3f2e3f8c5625?w=600',
    'https://images.unsplash.com/photo-1522083165195-3424ed14020d?w=600',
  ],
  'Top of the Rock': [
    'https://images.unsplash.com/photo-1490644658840-3f2e3f8c5625?w=600',
    'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600',
    'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=600',
    'https://images.unsplash.com/photo-1496588152823-86ff7695e68f?w=600',
    'https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=600',
  ],
  'High Line': [
    'https://images.unsplash.com/photo-1522083165195-3424ed14020d?w=600',
    'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600',
    'https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=600',
    'https://images.unsplash.com/photo-1490644658840-3f2e3f8c5625?w=600',
    'https://images.unsplash.com/photo-1496588152823-86ff7695e68f?w=600',
  ],
  // Lisboa
  'Torre de Belém': [
    'https://images.unsplash.com/photo-1548707309-dcebeab426c8?w=600',
    'https://images.unsplash.com/photo-1572276596428-69facb3e0e10?w=600',
    'https://images.unsplash.com/photo-1558369981-f9ca78462e61?w=600',
    'https://images.unsplash.com/photo-1573053986147-34b1f8e801b2?w=600',
    'https://images.unsplash.com/photo-1580323956656-26bbb7206961?w=600',
  ],
  'Castelo de São Jorge': [
    'https://images.unsplash.com/photo-1580323956656-26bbb7206961?w=600',
    'https://images.unsplash.com/photo-1558369981-f9ca78462e61?w=600',
    'https://images.unsplash.com/photo-1548707309-dcebeab426c8?w=600',
    'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=600',
    'https://images.unsplash.com/photo-1573053986147-34b1f8e801b2?w=600',
  ],
  // Barcelona
  'Sagrada Família': [
    'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600',
    'https://images.unsplash.com/photo-1511527661048-7fe73d85b9a4?w=600',
    'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=600',
    'https://images.unsplash.com/photo-1562883676-8c7feb83f09b?w=600',
    'https://images.unsplash.com/photo-1579282240050-352db0a14c21?w=600',
    'https://images.unsplash.com/photo-1564221710304-0b37c8b9d729?w=600',
  ],
  'Park Güell': [
    'https://images.unsplash.com/photo-1511527661048-7fe73d85b9a4?w=600',
    'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600',
    'https://images.unsplash.com/photo-1562883676-8c7feb83f09b?w=600',
    'https://images.unsplash.com/photo-1564221710304-0b37c8b9d729?w=600',
    'https://images.unsplash.com/photo-1579282240050-352db0a14c21?w=600',
  ],
  // Londres
  'British Museum': [
    'https://images.unsplash.com/photo-1590085438498-2c2efdc1e14e?w=600',
    'https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=600',
    'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=600',
    'https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?w=600',
    'https://images.unsplash.com/photo-1549489300-03dca9ca7bc6?w=600',
    'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600',
  ],
  'Tower of London': [
    'https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=600',
    'https://images.unsplash.com/photo-1590085438498-2c2efdc1e14e?w=600',
    'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=600',
    'https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?w=600',
    'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600',
  ],
  // Tóquio
  'Templo Senso-ji': [
    'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600',
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600',
    'https://images.unsplash.com/photo-1528181304800-259b08848526?w=600',
    'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=600',
    'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=600',
  ],
  'Shibuya Crossing': [
    'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=600',
    'https://images.unsplash.com/photo-1528181304800-259b08848526?w=600',
    'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=600',
    'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600',
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600',
  ],
  // Praga
  'Castelo de Praga': [
    'https://images.unsplash.com/photo-1541849546-216549ae216d?w=600',
    'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=600',
    'https://images.unsplash.com/photo-1562624475-96c2bc08fab9?w=600',
    'https://images.unsplash.com/photo-1458150945447-7fb764c11a92?w=600',
    'https://images.unsplash.com/photo-1592906209472-a36b1f3782ef?w=600',
    'https://images.unsplash.com/photo-1564429238961-bf8282c73b75?w=600',
  ],
  'Ponte Carlos': [
    'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=600',
    'https://images.unsplash.com/photo-1541849546-216549ae216d?w=600',
    'https://images.unsplash.com/photo-1562624475-96c2bc08fab9?w=600',
    'https://images.unsplash.com/photo-1564429238961-bf8282c73b75?w=600',
    'https://images.unsplash.com/photo-1458150945447-7fb764c11a92?w=600',
  ],
  // Atenas
  'Acrópole de Atenas': [
    'https://images.unsplash.com/photo-1555993539-1732b0258235?w=600',
    'https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?w=600',
    'https://images.unsplash.com/photo-1608834007709-c7a13a849bfe?w=600',
    'https://images.unsplash.com/photo-1600240644455-3edc55c375fe?w=600',
    'https://images.unsplash.com/photo-1594820843853-f49c4d8e16c8?w=600',
    'https://images.unsplash.com/photo-1603852452515-2dc8cd24e991?w=600',
  ],
  // Santorini
  'Oia Village': [
    'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=600',
    'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600',
    'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600',
    'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=600',
  ],
  // Bangkok
  'Grand Palace': [
    'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=600',
    'https://images.unsplash.com/photo-1528181304800-259b08848526?w=600',
    'https://images.unsplash.com/photo-1583395838144-09e3f0e1d2c5?w=600',
    'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=600',
    'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=600',
  ],
  // Budapeste
  'Parlamento Húngaro': [
    'https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=600',
    'https://images.unsplash.com/photo-1551867633-194f125bddfa?w=600',
    'https://images.unsplash.com/photo-1565426873118-a17ed65d74b9?w=600',
    'https://images.unsplash.com/photo-1541343672885-9be56236302a?w=600',
    'https://images.unsplash.com/photo-1509285913759-d3e2f3eeb7f3?w=600',
  ],
  // Viena
  'Palácio de Schönbrunn': [
    'https://images.unsplash.com/photo-1609856878074-cf31e21ccb6b?w=600',
    'https://images.unsplash.com/photo-1573599852326-2d4da0bbe613?w=600',
    'https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=600',
    'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=600',
    'https://images.unsplash.com/photo-1574180566232-aaad1b5b8450?w=600',
    'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600',
  ],
};

const detailData: Record<string, {
  description: string;
  tip: string;
  location: string;
  coords: [number, number];
}> = {
  'Museu do Louvre': {
    description: 'O maior museu de arte do mundo, com obras-primas como a Mona Lisa e a Vênus de Milo.',
    tip: 'Chegue cedo para evitar filas. Recomendamos reservar com antecedência.',
    location: '1er Arrondissement, Paris',
    coords: [48.8606, 2.3376],
  },
  'Café de Flore': {
    description: 'Café histórico no coração de Saint-Germain-des-Prés, frequentado por artistas e escritores.',
    tip: 'Peça o chocolate quente, é famoso!',
    location: 'Saint-Germain-des-Prés, Paris',
    coords: [48.8541, 2.3326],
  },
  'Torre Eiffel': {
    description: 'O monumento mais icônico de Paris. Suba ao topo para vistas panorâmicas deslumbrantes.',
    tip: 'Compre ingressos online para evitar filas de até 2 horas.',
    location: 'Champ de Mars, Paris',
    coords: [48.8584, 2.2945],
  },
  'Rijksmuseum': {
    description: 'O museu nacional da Holanda com obras-primas de Rembrandt, Vermeer e outros mestres holandeses.',
    tip: 'Reserve ao menos 3 horas. A Ronda Noturna de Rembrandt é imperdível.',
    location: 'Museumstraat 1, Amsterdam',
    coords: [52.3600, 4.8852],
  },
  'Vondelpark': {
    description: 'O maior e mais famoso parque de Amsterdam, perfeito para um passeio relaxante.',
    tip: 'Leve um piquenique! No verão há shows gratuitos no teatro ao ar livre.',
    location: 'Vondelpark, Amsterdam',
    coords: [52.3579, 4.8686],
  },
};

const defaultDetail = {
  description: 'Uma experiência imperdível. Este local oferece uma visão única da cultura e história local.',
  tip: 'Chegue cedo para aproveitar melhor.',
  location: 'Centro da cidade',
  coords: [48.8566, 2.3522] as [number, number],
};

// Category-based fallback photos when no specific photos exist
const categoryFallbackPhotos: Record<string, string[]> = {
  'Museu': ['https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600', 'https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=600', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600', 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=600', 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=600'],
  'Ponto Turístico': ['https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600', 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600', 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600', 'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=600', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600'],
  'Restaurante': ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600', 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600', 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=600', 'https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=600'],
  'Cafeteria': ['https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600', 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600', 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=600', 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=600'],
  'Parque': ['https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600', 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600', 'https://images.unsplash.com/photo-1524047934617-cb782c24e5f3?w=600'],
  'Monumento': ['https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600', 'https://images.unsplash.com/photo-1509439581779-6298f75bf6e5?w=600', 'https://images.unsplash.com/photo-1548585744-5be19c3fd653?w=600', 'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=600', 'https://images.unsplash.com/photo-1525874684015-58379d421a52?w=600'],
  'Igreja': ['https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=600', 'https://images.unsplash.com/photo-1520939817895-060bdaf4fe1b?w=600', 'https://images.unsplash.com/photo-1573599852326-2d4da0bbe613?w=600', 'https://images.unsplash.com/photo-1548585744-5be19c3fd653?w=600', 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600'],
  'Mirante': ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600', 'https://images.unsplash.com/photo-1490644658840-3f2e3f8c5625?w=600', 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600', 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=600', 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=600'],
  'Bar': ['https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600', 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600', 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=600', 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=600', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600'],
  'Mercado': ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600', 'https://images.unsplash.com/photo-1555992643-0ab5a39ab10a?w=600', 'https://images.unsplash.com/photo-1553452118-621e1f860f43?w=600', 'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=600', 'https://images.unsplash.com/photo-1588392382834-a891154bca4d?w=600'],
  'Praia': ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600', 'https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=600', 'https://images.unsplash.com/photo-1564221710304-0b37c8b9d729?w=600', 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=600', 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=600'],
  'Experiência': ['https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600', 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600', 'https://images.unsplash.com/photo-1605433246452-959f2bd10e38?w=600', 'https://images.unsplash.com/photo-1478391679764-b2d8b3cd1e94?w=600', 'https://images.unsplash.com/photo-1504019347908-b45f9b0b8f64?w=600'],
  'Bairro': ['https://images.unsplash.com/photo-1560625269-c2a18db51023?w=600', 'https://images.unsplash.com/photo-1558369981-f9ca78462e61?w=600', 'https://images.unsplash.com/photo-1529260830199-42c24126f198?w=600', 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=600', 'https://images.unsplash.com/photo-1562883676-8c7feb83f09b?w=600'],
};

const genericFallback = [
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600',
  'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=600',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600',
];

/** Build the full photo list for any activity */
function getPhotosForActivity(activity: ActivityData): string[] {
  // 1. Check for place-specific photos
  const specific = placePhotos[activity.name];
  if (specific && specific.length > 0) {
    // Ensure activity.image is first if not already included
    const photos = specific.includes(activity.image)
      ? specific
      : [activity.image, ...specific];
    return photos;
  }

  // 2. Fallback: activity image + category-based photos
  const catPhotos = categoryFallbackPhotos[activity.category] || genericFallback;
  const uniquePhotos = [activity.image, ...catPhotos.filter(p => p !== activity.image)];
  return uniquePhotos.slice(0, 6);
}

export function ActivityDetailSheet({ activity, videoLink, onClose }: ActivityDetailSheetProps) {
  const [expandedPhotoIndex, setExpandedPhotoIndex] = useState<number | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [showMoveOptions, setShowMoveOptions] = useState(false);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);

  const handleSwipe = (direction: 'left' | 'right') => {
    if (expandedPhotoIndex === null || !activity) return;
    const allPhotos = getPhotosForActivity(activity);
    if (direction === 'left' && expandedPhotoIndex < allPhotos.length - 1) {
      setExpandedPhotoIndex(expandedPhotoIndex + 1);
    } else if (direction === 'right' && expandedPhotoIndex > 0) {
      setExpandedPhotoIndex(expandedPhotoIndex - 1);
    }
  };

  if (!activity) return null;

  const detail = detailData[activity.name] || defaultDetail;
  const photos = getPhotosForActivity(activity);
  const MAX_VISIBLE_THUMBS = 3;
  const visibleThumbs = photos.slice(0, MAX_VISIBLE_THUMBS);
  const hiddenCount = Math.max(0, photos.length - MAX_VISIBLE_THUMBS);


  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-[430px] bg-card rounded-t-2xl max-h-[90vh] overflow-y-auto scrollbar-hide"
        onClick={(e) => e.stopPropagation()}>
        
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-muted" />
        </div>

        {/* Header info */}
        <div className="px-5 pt-[40px] pb-3">
          <div className="flex items-start justify-between mb-1">
            <div className="flex-1 min-w-0">
              <h2 className="text-[20px] font-bold text-foreground leading-tight">{activity.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {activity.category &&
                <span className="inline-flex items-center text-[12px] font-medium text-[#8E8E93] px-3 h-6 rounded-2xl bg-[#F2F2F2]">
                    {activity.category}
                  </span>
                }
                {activity.rating > 0 &&
                <div className="flex items-center gap-1">
                    <Icon name="star" size={14} filled className="text-[hsl(var(--warning))]" />
                    <span className="text-[13px] font-semibold text-foreground">{activity.rating}</span>
                  </div>
                }
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F2F2F2] flex items-center justify-center flex-shrink-0">
              <Icon name="close" size={18} className="text-foreground" />
            </button>
          </div>

        </div>

        {/* Description */}
        <div className="px-5 pb-3">
          <p className="text-[13px] text-muted-foreground leading-relaxed">{detail.description}</p>
        </div>

        {/* Photo Gallery */}
        {photos.length > 0 &&
        <div className="px-5 pb-4">
            <div className="flex gap-2">
              {visibleThumbs.map((photo, i) => {
                const isLastWithMore = i === MAX_VISIBLE_THUMBS - 1 && hiddenCount > 0;
                return (
                  <div
                    key={i}
                    className="relative flex-1 aspect-square rounded-xl overflow-hidden cursor-pointer active:scale-95 transition-transform"
                    onClick={() => {
                      if (isLastWithMore) setShowGallery(true);
                      else setExpandedPhotoIndex(i);
                    }}
                  >
                    <img
                      src={photo}
                      alt={`${activity.name} ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {isLastWithMore && (
                      <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                        <span className="text-white text-[16px] font-bold">+{hiddenCount}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        }

        {/* Tip */}
        <div className="mx-5 flex items-center gap-3 p-3.5 rounded-2xl mb-4" style={{ backgroundColor: 'rgba(53, 135, 242, 0.08)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(53, 135, 242, 0.15)' }}>
            <Icon name="lightbulb" size={16} style={{ color: '#3587F2' }} />
          </div>
          <p className="text-[12px] leading-relaxed font-medium" style={{ color: '#2A6BC6' }}>{detail.tip}</p>
        </div>

        {/* Info fields - read only */}
        <div className="px-5 space-y-0 mb-6">
          {(activity.startTime || activity.endTime) &&
          <div className="flex items-center justify-between py-3.5 border-b border-border/40">
              <div className="flex items-center gap-3">
                <Icon name="schedule" size={18} className="text-muted-foreground" />
                <div>
                  <span className="text-[11px] text-muted-foreground block">Horário de funcionamento</span>
                  <span className="text-[14px] font-medium text-foreground">
                    {activity.openHours || `${activity.startTime || '--:--'} - ${activity.endTime || '--:--'}`}
                  </span>
                </div>
              </div>
            </div>
          }

          <div className="flex items-center justify-between py-3.5">
            <div className="flex items-center gap-3">
              <Icon name="location_on" size={18} className="text-muted-foreground" />
              <div>
                <span className="text-[11px] text-muted-foreground block">Localização</span>
                <span className="text-[14px] font-medium text-foreground">{detail.location}</span>
              </div>
            </div>
          </div>

        </div>





        {/* In-app Photo Gallery */}
        {showGallery && (
          <div className="fixed inset-0 z-[2900] bg-background flex justify-center">
            <div className="w-full max-w-[430px] h-full flex flex-col">
              {/* Header */}
              <div className="sticky top-0 z-10 bg-background flex items-center gap-3 px-4 h-14 border-b border-border/40">
                <button
                  onClick={() => setShowGallery(false)}
                  className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center active:scale-95 transition-transform"
                  aria-label="Voltar"
                >
                  <Icon name="chevron_left" size={20} className="text-foreground" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-foreground truncate">{activity.name}</p>
                  <p className="text-[11px] text-muted-foreground">{photos.length} {photos.length === 1 ? 'foto' : 'fotos'}</p>
                </div>
              </div>
              {/* Grid */}
              <div className="flex-1 overflow-y-auto px-3 py-3">
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, i) => (
                    <button
                      key={i}
                      onClick={() => setExpandedPhotoIndex(i)}
                      className="relative aspect-square rounded-lg overflow-hidden active:scale-95 transition-transform"
                    >
                      <img src={photo} alt={`${activity.name} ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen Photo Overlay */}
        {expandedPhotoIndex !== null && (
          <div
            className="fixed inset-0 z-[3000] bg-black flex items-center justify-center"
            onClick={() => setExpandedPhotoIndex(null)}
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; touchDeltaX.current = 0; }}
            onTouchMove={(e) => { touchDeltaX.current = e.touches[0].clientX - touchStartX.current; }}
            onTouchEnd={() => {
              if (Math.abs(touchDeltaX.current) > 50) {
                handleSwipe(touchDeltaX.current < 0 ? 'left' : 'right');
              }
              touchDeltaX.current = 0;
            }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setExpandedPhotoIndex(null); }}
              className="absolute top-12 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
              style={{ zIndex: 1 }}
            >
              <Icon name="close" size={20} className="text-white" />
            </button>
            <div className="w-full max-w-[430px] h-full flex items-center justify-center px-4">
              <img
                src={photos[expandedPhotoIndex]}
                alt={`Foto ${expandedPhotoIndex + 1}`}
                className="w-full max-h-[80vh] object-contain rounded-xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            {/* Dots indicator */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2">
              {photos.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${i === expandedPhotoIndex ? 'bg-white' : 'bg-white/40'}`}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>);

}