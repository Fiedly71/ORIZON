class Property {
  final String id;
  final String title;
  final String location;
  final int price;
  final String type;
  final String image;

  const Property({
    required this.id,
    required this.title,
    required this.location,
    required this.price,
    required this.type,
    required this.image,
  });
}

const properties = [
  Property(
    id: '1',
    title: 'Villa Moderne a Petion-Ville',
    location: 'Petion-Ville',
    price: 140000,
    type: 'Maison',
    image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80',
  ),
  Property(
    id: '2',
    title: 'Appartement Vue Mer',
    location: 'Cap-Haitien',
    price: 92000,
    type: 'Appartement',
    image: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80',
  ),
  Property(
    id: '3',
    title: 'Hotel Boutique 14 Chambres',
    location: 'Jacmel',
    price: 325000,
    type: 'Hotel',
    image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80',
  ),
  Property(
    id: '4',
    title: 'Terrain constructible 800m2',
    location: 'Mirebalais',
    price: 48000,
    type: 'Terrain',
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
  ),
];
