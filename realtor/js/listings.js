/* Wendy Realtor: the properties on the site. Edit this file to add, change or remove a property.

   id        short name used in the address: property.html?id=harbor-drive
   ref       reference number shown on the card and searchable on the properties page
   op        'sale' or 'rent' (for rentals, price is per month)
   type      'house', 'condo' or 'penthouse'
   area      'miami-beach', 'key-biscayne', 'coral-gables', 'coconut-grove', 'pinecrest', 'north-beaches' or 'brickell'
   status    'new', 'sale', 'contract', 'sold', 'private' (address and photos on request) or 'rent'
   exclusive true when Wendy has the exclusive listing
   water     'ocean', 'bay', 'canal' or 'none'; frontage in feet (0 if not on the water)
   lot       acres (0 for a condo)
   listed    date the property came on the market, YYYY-MM-DD
   imgs      photos in img/; the first one is the main photo
   PLACEHOLDER: every property below is a sample. Replace them with real listings. */
window.LISTINGS = [
  {
    id: 'harbor-drive', ref: 'WR-2611', op: 'sale', type: 'house', area: 'key-biscayne', place: 'Key Biscayne',
    title: { en: 'Bayfront new construction with private dock', es: 'Obra nueva frente a la bahía con muelle privado' },
    price: 18950000, beds: 7, baths: 8.5, sqft: 9850, lot: 0.52, water: 'bay', frontage: 120, year: 2025,
    status: 'new', exclusive: true, listed: '2026-09-12',
    imgs: ['img/listing-1.jpg', 'img/listing-1-2.jpg', 'img/listing-1-3.jpg'],
    desc: {
      en: 'New construction on the bay side of the island, finished this summer. Floor-to-ceiling impact glass on three sides, a 75 ft pool at the level of the water and a dock for a 60 ft yacht.',
      es: 'Construcción nueva en el lado de la bahía, terminada este verano. Vidrio de impacto de piso a techo en tres fachadas, una piscina de 75 pies a nivel del agua y un muelle para un yate de 60 pies.'
    },
    features: {
      en: ['120 ft of bay frontage with new seawall', 'Elevator, wine room and summer kitchen', 'Whole-home generator', 'Flood zone AE, built above base flood elevation'],
      es: ['120 pies frente a la bahía con muro nuevo', 'Ascensor, cava y cocina de verano', 'Generador para toda la casa', 'Zona de inundación AE, construida sobre la cota base']
    }
  },
  {
    id: 'sunset-island', ref: 'WR-2598', op: 'sale', type: 'house', area: 'miami-beach', place: 'Sunset Islands, Miami Beach',
    title: { en: 'Gated-island modern with 150 ft of deep water', es: 'Moderna en isla privada con 150 pies de aguas profundas' },
    price: 32500000, beds: 8, baths: 10.5, sqft: 12400, lot: 0.61, water: 'bay', frontage: 150, year: 2023,
    status: 'sale', exclusive: true, listed: '2026-06-02',
    imgs: ['img/listing-2.jpg', 'img/listing-2-2.jpg', 'img/listing-2-3.jpg'],
    desc: {
      en: 'A gated island, sunset views across the bay to the downtown skyline and 150 ft of deep water with no fixed bridges to the ocean.',
      es: 'Una isla con acceso controlado, atardeceres sobre la bahía con vista al skyline y 150 pies de agua profunda sin puentes fijos hasta el océano.'
    },
    features: {
      en: ['No fixed bridges to open water', 'Rooftop terrace with bay and skyline views', 'Staff quarters and 4-car garage', 'Built 2023'],
      es: ['Sin puentes fijos hasta mar abierto', 'Terraza en la azotea con vista a la bahía y al skyline', 'Área de servicio y garaje para 4 autos', 'Construida en 2023']
    }
  },
  {
    id: 'golden-beach', ref: 'WR-2587', op: 'sale', type: 'house', area: 'north-beaches', place: 'Golden Beach',
    title: { en: 'Oceanfront estate with private beach', es: 'Residencia frente al océano con playa privada' },
    price: 26000000, beds: 7, baths: 9.5, sqft: 11000, lot: 0.7, water: 'ocean', frontage: 100, year: 2021,
    status: 'sale', exclusive: false, listed: '2026-04-18',
    imgs: ['img/listing-8.jpg', 'img/listing-8-2.jpg', 'img/listing-8-3.jpg'],
    desc: {
      en: 'Direct beach access in a small town with its own police and no high-rises. Every main room faces the Atlantic.',
      es: 'Acceso directo a la playa en un pequeño municipio con policía propia y sin torres. Cada estancia principal mira al Atlántico.'
    },
    features: {
      en: ['100 ft of private beach frontage', 'Primary suite with ocean terrace', 'Gym, spa and cinema', 'Built 2021'],
      es: ['100 pies de playa privada', 'Suite principal con terraza al océano', 'Gimnasio, spa y cine', 'Construida en 2021']
    }
  },
  {
    id: 'old-cutler', ref: 'WR-2574', op: 'sale', type: 'house', area: 'coral-gables', place: 'Coral Gables',
    title: { en: 'Canal-front estate on more than an acre', es: 'Finca sobre canal en más de un acre' },
    price: 14200000, beds: 6, baths: 7.5, sqft: 8900, lot: 1.1, water: 'canal', frontage: 180, year: 2019,
    status: 'contract', exclusive: true, listed: '2026-05-07',
    imgs: ['img/listing-3.jpg', 'img/listing-3-2.jpg', 'img/listing-3-3.jpg'],
    desc: {
      en: 'More than an acre in a guard-gated community, on a wide canal with direct ocean access and room for a second dock.',
      es: 'Más de un acre en una comunidad con garita, sobre un canal ancho con salida directa al mar y espacio para un segundo muelle.'
    },
    features: {
      en: ['Guard-gated community', '180 ft on a wide canal, ocean access', 'Guest house over the garage', 'Top-rated public and private schools nearby'],
      es: ['Comunidad con garita de seguridad', '180 pies sobre canal ancho con salida al mar', 'Casa de huéspedes sobre el garaje', 'Colegios públicos y privados de primer nivel cerca']
    }
  },
  {
    id: 'venetian', ref: 'WR-2541', op: 'sale', type: 'house', area: 'miami-beach', place: 'Venetian Islands, Miami Beach',
    title: { en: 'Venetian Islands modern with bay views', es: 'Moderna en las Venetian Islands con vista a la bahía' },
    price: 12850000, beds: 6, baths: 7, sqft: 7400, lot: 0.3, water: 'bay', frontage: 75, year: 2020,
    status: 'sold', exclusive: true, listed: '2026-01-20',
    imgs: ['img/listing-7.jpg', 'img/listing-7-2.jpg', 'img/listing-7-3.jpg'],
    desc: {
      en: 'Sold off-market in 23 days to a buyer from New York. Wide bay views toward the Miami Beach skyline.',
      es: 'Vendida fuera del mercado en 23 días a un comprador de Nueva York. Amplias vistas a la bahía hacia el skyline de Miami Beach.'
    },
    features: {
      en: ['Sold off-market', '75 ft of bay frontage', 'Walk to the Venetian Causeway', 'Built 2020'],
      es: ['Vendida fuera del mercado', '75 pies frente a la bahía', 'A pasos de la Venetian Causeway', 'Construida en 2020']
    }
  },
  {
    id: 'sunny-isles-ph', ref: 'WR-2605', op: 'sale', type: 'penthouse', area: 'north-beaches', place: 'Sunny Isles Beach',
    title: { en: 'Full-floor oceanfront penthouse with rooftop pool', es: 'Penthouse de piso completo frente al océano con piscina en la azotea' },
    price: 11900000, beds: 5, baths: 6.5, sqft: 6000, lot: 0, water: 'ocean', frontage: 0, year: 2022,
    status: 'sale', exclusive: false, listed: '2026-08-27',
    imgs: ['img/listing-4.jpg', 'img/listing-4-2.jpg', 'img/listing-4-3.jpg'],
    desc: {
      en: 'A full-floor penthouse with a private elevator, 360° views and a rooftop pool, in a tower with beach service and a spa.',
      es: 'Penthouse de piso completo con ascensor privado, vistas de 360° y piscina en la azotea, en una torre con servicio de playa y spa.'
    },
    features: {
      en: ['Full floor, private elevator', 'Rooftop pool and summer kitchen', 'Beach service, spa and valet', 'Two assigned parking spaces and a cabana'],
      es: ['Piso completo, ascensor privado', 'Piscina y cocina de verano en la azotea', 'Servicio de playa, spa y valet', 'Dos plazas de estacionamiento y una cabaña']
    }
  },
  {
    id: 'pinecrest', ref: 'WR-2602', op: 'sale', type: 'house', area: 'pinecrest', place: 'Pinecrest',
    title: { en: 'Private garden estate, details on request', es: 'Finca privada con jardines, detalles a solicitud' },
    price: 9400000, beds: 7, baths: 8, sqft: 10200, lot: 1.4, water: 'none', frontage: 0, year: 2018,
    status: 'private', exclusive: true, listed: '2026-09-01',
    imgs: ['img/listing-5.jpg', 'img/listing-5-2.jpg', 'img/listing-5-3.jpg'],
    desc: {
      en: 'Offered privately. Details, photos and the address are shared with qualified buyers after a short call.',
      es: 'Oferta privada. Los detalles, fotos y la dirección se comparten con compradores calificados después de una breve llamada.'
    },
    features: {
      en: ['1.4 acres of mature gardens', 'Tennis court', 'Near top-rated schools', 'Details on request'],
      es: ['1.4 acres de jardines maduros', 'Cancha de tenis', 'Cerca de colegios de primer nivel', 'Detalles a solicitud']
    }
  },
  {
    id: 'tigertail', ref: 'WR-2593', op: 'sale', type: 'house', area: 'coconut-grove', place: 'Coconut Grove',
    title: { en: 'New villa under the oaks, a walk from the bay', es: 'Villa nueva bajo los robles, a pasos de la bahía' },
    price: 8750000, beds: 5, baths: 6.5, sqft: 6300, lot: 0.35, water: 'none', frontage: 0, year: 2024,
    status: 'sale', exclusive: false, listed: '2026-07-15',
    imgs: ['img/listing-6.jpg', 'img/listing-6-2.jpg', 'img/listing-6-3.jpg'],
    desc: {
      en: 'A new modern villa under the oak canopy, a short walk to the sailing clubs, Peacock Park and the village center.',
      es: 'Una villa moderna nueva bajo la sombra de los robles, a poca distancia de los clubes de vela, Peacock Park y el centro del barrio.'
    },
    features: {
      en: ['Built 2024', 'Heated pool and outdoor living room', 'Walk to the bay and the village', 'Impact glass throughout'],
      es: ['Construida en 2024', 'Piscina climatizada y sala exterior', 'A pie de la bahía y del centro', 'Vidrio de impacto en toda la casa']
    }
  },
  {
    id: 'brickell-penthouse', ref: 'WR-2614', op: 'sale', type: 'penthouse', area: 'brickell', place: 'Brickell',
    title: { en: 'Bay-view penthouse with a private terrace', es: 'Penthouse con vista a la bahía y terraza privada' },
    price: 7900000, beds: 4, baths: 5.5, sqft: 5200, lot: 0, water: 'bay', frontage: 0, year: 2024,
    status: 'new', exclusive: true, listed: '2026-09-24',
    imgs: ['img/listing-9.jpg', 'img/listing-9-2.jpg', 'img/listing-9-3.jpg'],
    desc: {
      en: 'The top floor of a new branded tower on Brickell Bay Drive, with a 1,400 sf terrace facing Key Biscayne and the Atlantic.',
      es: 'El último piso de una torre de marca nueva en Brickell Bay Drive, con una terraza de 1,400 pies² hacia Key Biscayne y el Atlántico.'
    },
    features: {
      en: ['1,400 sf terrace with plunge pool', 'Private elevator foyer', 'Hotel services, spa and residents’ club', 'Three parking spaces and storage'],
      es: ['Terraza de 1,400 pies² con piscina', 'Vestíbulo con ascensor privado', 'Servicios de hotel, spa y club de residentes', 'Tres plazas de estacionamiento y depósito']
    }
  },
  {
    id: 'brickell-lease', ref: 'WR-2616', op: 'rent', type: 'condo', area: 'brickell', place: 'Brickell',
    title: { en: 'Furnished residence in a branded tower, annual lease', es: 'Residencia amueblada en torre de marca, alquiler anual' },
    price: 32000, beds: 3, baths: 3.5, sqft: 3100, lot: 0, water: 'bay', frontage: 0, year: 2023,
    status: 'rent', exclusive: true, listed: '2026-09-28',
    imgs: ['img/listing-10.jpg', 'img/listing-10-2.jpg', 'img/listing-10-3.jpg'],
    desc: {
      en: 'Fully furnished by an interior designer, on a high floor with bay and skyline views. Available from November on a twelve-month lease.',
      es: 'Amueblada por completo por una interiorista, en un piso alto con vista a la bahía y al skyline. Disponible desde noviembre con contrato de doce meses.'
    },
    features: {
      en: ['Furnished and equipped', 'Twelve-month lease', 'Concierge, valet and spa', 'Two parking spaces'],
      es: ['Amueblada y equipada', 'Contrato de doce meses', 'Conserjería, valet y spa', 'Dos plazas de estacionamiento']
    }
  },
  {
    id: 'star-island-lease', ref: 'WR-2609', op: 'rent', type: 'house', area: 'miami-beach', place: 'Star Island, Miami Beach',
    title: { en: 'Waterfront estate on a guard-gated island, furnished', es: 'Mansión frente al agua en isla con garita, amueblada' },
    price: 145000, beds: 8, baths: 9.5, sqft: 11800, lot: 0.8, water: 'bay', frontage: 140, year: 2022,
    status: 'rent', exclusive: true, listed: '2026-09-18',
    imgs: ['img/listing-11.jpg', 'img/listing-11-2.jpg', 'img/listing-11-3.jpg'],
    desc: {
      en: 'Furnished and staffed on request, with a dock for a 90 ft yacht. Available from November on a lease of six months or longer.',
      es: 'Amueblada y con personal a solicitud, con muelle para un yate de 90 pies. Disponible desde noviembre con contrato de seis meses o más.'
    },
    features: {
      en: ['140 ft of bay frontage and dock', 'Lease of six months or longer', 'Guard-gated island', 'Staff quarters and 6-car garage'],
      es: ['140 pies frente a la bahía con muelle', 'Contrato de seis meses o más', 'Isla con garita de seguridad', 'Área de servicio y garaje para 6 autos']
    }
  },
  {
    id: 'granada', ref: 'WR-2584', op: 'sale', type: 'house', area: 'coral-gables', place: 'Coral Gables',
    title: { en: 'Mediterranean Revival home on a tree-lined street', es: 'Casa de estilo mediterráneo en una calle arbolada' },
    price: 6950000, beds: 6, baths: 6.5, sqft: 7100, lot: 0.6, water: 'none', frontage: 0, year: 2017,
    status: 'sale', exclusive: true, listed: '2026-05-29',
    imgs: ['img/listing-12.jpg', 'img/listing-12-2.jpg', 'img/listing-12-3.jpg'],
    desc: {
      en: 'Barrel-tile roofs, a loggia over the pool and a library with coffered ceilings, a few minutes from the Biltmore and Granada golf course.',
      es: 'Techos de teja, una logia sobre la piscina y una biblioteca con techos artesonados, a pocos minutos del Biltmore y del campo de golf Granada.'
    },
    features: {
      en: ['Loggia and summer kitchen', 'Library and home office', 'Minutes from the Biltmore', 'Built 2017'],
      es: ['Logia y cocina de verano', 'Biblioteca y oficina', 'A minutos del Biltmore', 'Construida en 2017']
    }
  },
  {
    id: 'mashta', ref: 'WR-2596', op: 'sale', type: 'house', area: 'key-biscayne', place: 'Key Biscayne',
    title: { en: 'Island-style home a short walk from the beach', es: 'Casa de estilo isleño a pocos pasos de la playa' },
    price: 8450000, beds: 5, baths: 6, sqft: 5900, lot: 0.4, water: 'none', frontage: 0, year: 2020,
    status: 'sale', exclusive: false, listed: '2026-07-02',
    imgs: ['img/listing-13.jpg', 'img/listing-13-2.jpg', 'img/listing-13-3.jpg'],
    desc: {
      en: 'Wide porches, louvered shutters and a guest cottage by the pool, on a quiet street three blocks from the beach and the village green.',
      es: 'Porches amplios, contraventanas y una casa de huéspedes junto a la piscina, en una calle tranquila a tres cuadras de la playa y del parque del pueblo.'
    },
    features: {
      en: ['Guest cottage by the pool', 'Three blocks to the beach', 'Island schools and parks', 'Built 2020'],
      es: ['Casa de huéspedes junto a la piscina', 'A tres cuadras de la playa', 'Colegios y parques de la isla', 'Construida en 2020']
    }
  },
  {
    id: 'grove-bayfront', ref: 'WR-2612', op: 'sale', type: 'house', area: 'coconut-grove', place: 'Coconut Grove',
    title: { en: 'New bayfront residence with 100 ft on the water', es: 'Residencia nueva frente a la bahía con 100 pies de agua' },
    price: 15900000, beds: 6, baths: 7.5, sqft: 8600, lot: 0.55, water: 'bay', frontage: 100, year: 2026,
    status: 'new', exclusive: true, listed: '2026-09-20',
    imgs: ['img/listing-14.jpg', 'img/listing-14-2.jpg', 'img/listing-14-3.jpg'],
    desc: {
      en: 'Completed this year on one of the few bayfront streets in the Grove, with a deep-water dock and a lawn that runs down to the seawall.',
      es: 'Terminada este año en una de las pocas calles frente a la bahía en el Grove, con muelle de aguas profundas y un jardín que llega hasta el muro.'
    },
    features: {
      en: ['100 ft of bay frontage', 'Deep-water dock', 'Smart-home and solar ready', 'Built 2026'],
      es: ['100 pies frente a la bahía', 'Muelle de aguas profundas', 'Domótica y preparación para paneles solares', 'Construida en 2026']
    }
  },
  {
    id: 'golden-beach-lease', ref: 'WR-2607', op: 'rent', type: 'house', area: 'north-beaches', place: 'Golden Beach',
    title: { en: 'Oceanfront beach house, furnished lease', es: 'Casa de playa frente al océano, alquiler amueblado' },
    price: 68000, beds: 6, baths: 7, sqft: 7800, lot: 0.5, water: 'ocean', frontage: 100, year: 2019,
    status: 'rent', exclusive: false, listed: '2026-09-08',
    imgs: ['img/listing-15.jpg', 'img/listing-15-2.jpg', 'img/listing-15-3.jpg'],
    desc: {
      en: 'Steps from the sand, furnished and ready, with beach service through the town. Available from December on a lease of six months or longer.',
      es: 'A pasos de la arena, amueblada y lista, con servicio de playa del municipio. Disponible desde diciembre con contrato de seis meses o más.'
    },
    features: {
      en: ['Direct beach access', 'Furnished and equipped', 'Lease of six months or longer', 'Pool and outdoor kitchen'],
      es: ['Acceso directo a la playa', 'Amueblada y equipada', 'Contrato de seis meses o más', 'Piscina y cocina exterior']
    }
  },
  {
    id: 'pinecrest-modern', ref: 'WR-2615', op: 'sale', type: 'house', area: 'pinecrest', place: 'Pinecrest',
    title: { en: 'New modern home on a one-acre lot', es: 'Casa moderna nueva en un lote de un acre' },
    price: 7250000, beds: 6, baths: 7, sqft: 7600, lot: 1, water: 'none', frontage: 0, year: 2026,
    status: 'new', exclusive: false, listed: '2026-09-26',
    imgs: ['img/listing-16.jpg', 'img/listing-16-2.jpg', 'img/listing-16-3.jpg'],
    desc: {
      en: 'A new build with a two-story great room, a 60 ft pool and a full acre of lawn and gardens, close to the best schools in Miami-Dade.',
      es: 'Construcción nueva con un salón de doble altura, una piscina de 60 pies y un acre de jardines, cerca de los mejores colegios de Miami-Dade.'
    },
    features: {
      en: ['One acre', '60 ft pool and cabana', 'Near top-rated schools', 'Built 2026'],
      es: ['Un acre', 'Piscina de 60 pies y cabaña', 'Cerca de colegios de primer nivel', 'Construida en 2026']
    }
  },
  {
    id: 'sunny-isles-lease', ref: 'WR-2610', op: 'rent', type: 'condo', area: 'north-beaches', place: 'Sunny Isles Beach',
    title: { en: 'Oceanfront residence in a full-service tower, annual lease', es: 'Residencia frente al océano en torre con servicios, alquiler anual' },
    price: 24000, beds: 3, baths: 4, sqft: 3400, lot: 0, water: 'ocean', frontage: 0, year: 2021,
    status: 'rent', exclusive: false, listed: '2026-09-14',
    imgs: ['img/listing-17.jpg', 'img/listing-17-2.jpg', 'img/listing-17-3.jpg'],
    desc: {
      en: 'A corner residence with wraparound ocean views, in a tower with beach service, a spa and a children’s club. Unfurnished, twelve-month lease.',
      es: 'Una residencia en esquina con vistas al océano en tres lados, en una torre con servicio de playa, spa y club infantil. Sin amueblar, contrato de doce meses.'
    },
    features: {
      en: ['Corner unit, ocean on three sides', 'Twelve-month lease', 'Beach service and spa', 'Two parking spaces'],
      es: ['Unidad en esquina, océano en tres lados', 'Contrato de doce meses', 'Servicio de playa y spa', 'Dos plazas de estacionamiento']
    }
  },
  {
    id: 'gables-estates', ref: 'WR-2578', op: 'sale', type: 'house', area: 'coral-gables', place: 'Gables Estates, Coral Gables',
    title: { en: 'Mediterranean estate on deep water in a guard-gated enclave', es: 'Finca mediterránea sobre aguas profundas en un enclave con garita' },
    price: 22500000, beds: 7, baths: 9, sqft: 11200, lot: 1.3, water: 'canal', frontage: 250, year: 2016,
    status: 'sale', exclusive: true, listed: '2026-03-11',
    imgs: ['img/listing-18.jpg', 'img/listing-18-2.jpg', 'img/listing-18-3.jpg'],
    desc: {
      en: '250 ft on a deep-water canal with no bridges to Biscayne Bay, inside one of the most private guard-gated enclaves in Miami.',
      es: '250 pies sobre un canal de aguas profundas sin puentes hasta la bahía de Biscayne, dentro de uno de los enclaves con garita más privados de Miami.'
    },
    features: {
      en: ['250 ft on deep water, no bridges', 'Guard-gated with police patrol', 'Guest house and staff quarters', 'Built 2016'],
      es: ['250 pies sobre aguas profundas, sin puentes', 'Con garita y patrulla policial', 'Casa de huéspedes y área de servicio', 'Construida en 2016']
    }
  }
];
