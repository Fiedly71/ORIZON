import 'package:flutter/material.dart';

import 'data/properties.dart';
import 'i18n/translations.dart';
import 'widgets/property_card.dart';

void main() {
  runApp(const OrizonApp());
}

class OrizonApp extends StatelessWidget {
  const OrizonApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'ORIZON Mobile',
      theme: ThemeData(fontFamily: 'sans-serif', useMaterial3: true),
      home: const HomeScreen(),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String language = 'fr';
  String query = '';
  String activeTab = 'home';
  final Set<String> favorites = {};

  Map<String, String> get text =>
      Map<String, String>.from(translations[language] ?? translations['fr']!);

  List<Property> get filtered {
    final q = query.trim().toLowerCase();
    var list = properties.where((p) {
      if (q.isEmpty) return true;
      return p.title.toLowerCase().contains(q) ||
          p.location.toLowerCase().contains(q) ||
          p.type.toLowerCase().contains(q);
    }).toList();

    if (activeTab == 'fav') {
      list = list.where((p) => favorites.contains(p.id)).toList();
    }

    return list;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFDCE2E8),
      body: SafeArea(
        child: Stack(
          children: [
            ListView(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 94),
              children: [
                _topBar(),
                const SizedBox(height: 12),
                _hero(),
                const SizedBox(height: 12),
                _stats(),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      text['feedback'] ?? '',
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
                    ),
                    const Text('500+', style: TextStyle(color: Color(0xFF5A6670))),
                  ],
                ),
                const SizedBox(height: 10),
                if (filtered.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FBFC),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Center(
                      child: Text(
                        text['noResults'] ?? '',
                        style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF4E5A63)),
                      ),
                    ),
                  )
                else
                  ...filtered.map(
                    (item) => PropertyCard(
                      property: item,
                      text: text,
                      isFavorite: favorites.contains(item.id),
                      onToggleFavorite: () {
                        setState(() {
                          if (favorites.contains(item.id)) {
                            favorites.remove(item.id);
                          } else {
                            favorites.add(item.id);
                          }
                        });
                      },
                      onContact: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('${text['contact']}: ${item.title} (${item.location})')),
                        );
                      },
                    ),
                  ),
                const SizedBox(height: 4),
                _cta(),
              ],
            ),
            _bottomNav(),
          ],
        ),
      ),
    );
  }

  Widget _topBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.72),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFF6FAFF)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('ORIZON', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
              Text(text['tag'] ?? '', style: const TextStyle(color: Color(0xFF52606B), fontSize: 12)),
            ],
          ),
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: const Color(0xFFEFF4F8),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Row(
              children: [
                _langButton('fr', 'FR'),
                _langButton('ht', 'HT'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _langButton(String code, String label) {
    final isOn = language == code;
    return InkWell(
      onTap: () => setState(() => language = code),
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isOn ? const Color(0xFF131D18) : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            color: Color(0xFFB6C2CB),
          ),
        ),
      ),
    );
  }

  Widget _hero() {
    return Container(
      height: 370,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        image: const DecorationImage(
          image: NetworkImage('https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80'),
          fit: BoxFit.cover,
        ),
      ),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0x66000000), Color(0xD0000000)],
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            Align(
              alignment: Alignment.topRight,
              child: Container(
                margin: const EdgeInsets.only(bottom: 70),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFF98FF56),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Text('Se lancer', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
              ),
            ),
            Text(
              '${text['titleA']}\n${text['titleB']}',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 34,
                height: 1.0,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              text['subtitle'] ?? '',
              style: const TextStyle(color: Color(0xFFD5DEE8), fontSize: 13, height: 1.35),
            ),
            const SizedBox(height: 10),
            Container(
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.92),
                borderRadius: BorderRadius.circular(999),
              ),
              child: TextField(
                onChanged: (v) => setState(() => query = v),
                decoration: InputDecoration(
                  hintText: text['search'],
                  hintStyle: const TextStyle(color: Color(0xFF6A7278)),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _stats() {
    final cards = [
      ['1,500+', text['projects'] ?? ''],
      ['3,000+', text['clients'] ?? ''],
      ['2,000+', text['managed'] ?? ''],
      ['200+', text['partners'] ?? ''],
    ];

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FBFC),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(text['statsTitle'] ?? '', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 22)),
          const SizedBox(height: 4),
          Text(text['statsSub'] ?? '', style: const TextStyle(color: Color(0xFF58636C))),
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: cards
                .map(
                  (it) => Container(
                    width: MediaQuery.of(context).size.width * 0.42,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEEF4EF),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(it[0], style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
                        const SizedBox(height: 3),
                        Text(it[1], style: const TextStyle(fontSize: 12, color: Color(0xFF556269))),
                      ],
                    ),
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }

  Widget _cta() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF101612),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            text['ctaTitle'] ?? '',
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 24, height: 1.1),
          ),
          const SizedBox(height: 8),
          Text(
            text['ctaSub'] ?? '',
            style: const TextStyle(color: Color(0xFFC7D2CC), height: 1.3),
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFA2FF60),
              foregroundColor: const Color(0xFF101317),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
            ),
            onPressed: () {},
            child: Text(text['createAccount'] ?? ''),
          ),
        ],
      ),
    );
  }

  Widget _bottomNav() {
    final tabs = [
      ['home', text['home'] ?? ''],
      ['discover', text['discover'] ?? ''],
      ['fav', text['fav'] ?? ''],
      ['profile', text['profile'] ?? ''],
    ];

    return Positioned(
      left: 12,
      right: 12,
      bottom: 12,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.83),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFF4F9FF)),
        ),
        child: Row(
          children: tabs
              .map(
                (tab) => Expanded(
                  child: InkWell(
                    onTap: () => setState(() => activeTab = tab[0]),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 9),
                      decoration: BoxDecoration(
                        color: activeTab == tab[0] ? const Color(0xFF1D2B21) : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        tab[1],
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: activeTab == tab[0] ? const Color(0xFFDFFFC9) : const Color(0xFF404D58),
                        ),
                      ),
                    ),
                  ),
                ),
              )
              .toList(),
        ),
      ),
    );
  }
}
