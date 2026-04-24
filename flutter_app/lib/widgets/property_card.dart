import 'package:flutter/material.dart';

import '../data/properties.dart';

class PropertyCard extends StatelessWidget {
  final Property property;
  final Map<String, String> text;
  final bool isFavorite;
  final VoidCallback onToggleFavorite;
  final VoidCallback onContact;

  const PropertyCard({
    super.key,
    required this.property,
    required this.text,
    required this.isFavorite,
    required this.onToggleFavorite,
    required this.onContact,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 210,
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        image: DecorationImage(
          image: NetworkImage(property.image),
          fit: BoxFit.cover,
        ),
      ),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0x55000000), Color(0xC3000000)],
          ),
        ),
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.86),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    property.type,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11),
                  ),
                ),
                InkWell(
                  onTap: onToggleFavorite,
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    width: 28,
                    height: 28,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.9),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Text(
                      isFavorite ? '★' : '☆',
                      style: const TextStyle(fontSize: 15),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              property.title,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w900,
                fontSize: 18,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              '${text['location']}: ${property.location}',
              style: const TextStyle(color: Color(0xFFD0DCE4), fontSize: 12),
            ),
            const SizedBox(height: 2),
            Text(
              '${text['price']}: \\$${property.price}',
              style: const TextStyle(
                color: Color(0xFFA5FF62),
                fontWeight: FontWeight.w800,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 8),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: const Color(0xFF111418),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              ),
              onPressed: onContact,
              child: Text(text['contact'] ?? 'Contacter'),
            ),
          ],
        ),
      ),
    );
  }
}
