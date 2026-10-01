import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/responsive.dart';
import '../../explore/provider_explore_page.dart';

class ProviderBrand {
  final String id;
  final String name;

  const ProviderBrand({
    required this.id,
    required this.name,
  });
}

class ProvidersSection extends StatefulWidget {
  const ProvidersSection({super.key});

  @override
  State<ProvidersSection> createState() => _ProvidersSectionState();
}

class _ProvidersSectionState extends State<ProvidersSection> {
  static const List<ProviderBrand> _providers = [
    ProviderBrand(id: '8', name: 'Netflix'),
    ProviderBrand(id: '9', name: 'Prime Video'),
    ProviderBrand(id: '337', name: 'Disney+'),
    ProviderBrand(id: '350', name: 'Apple TV+'),
    ProviderBrand(id: '384', name: 'Max (HBO)'),
    ProviderBrand(id: '15', name: 'Hulu'),
    ProviderBrand(id: '531', name: 'Paramount+'),
  ];

  @override
  Widget build(BuildContext context) {
    final isMobile = Responsive.isMobile(context);

    return Container(
      margin: EdgeInsets.symmetric(
        horizontal: isMobile ? 16 : 32,
        vertical: 16,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 4,
                height: 18,
                decoration: BoxDecoration(
                  color: AppTheme.watchYellow,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 10),
              const Text(
                'Streaming Networks',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                  letterSpacing: -0.3,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          SizedBox(
            height: 52,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: _providers.length,
              itemBuilder: (context, index) {
                final provider = _providers[index];

                return _ProviderPill(
                  provider: provider,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ProviderExplorePage(
                          providerId: provider.id,
                          providerName: provider.name,
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _ProviderPill extends StatefulWidget {
  final ProviderBrand provider;
  final VoidCallback onTap;

  const _ProviderPill({
    required this.provider,
    required this.onTap,
  });

  @override
  State<_ProviderPill> createState() => _ProviderPillState();
}

class _ProviderPillState extends State<_ProviderPill> {
  bool _isFocused = false;

  @override
  Widget build(BuildContext context) {
    return Focus(
      onFocusChange: (focused) => setState(() => _isFocused = focused),
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedScale(
          scale: _isFocused ? 1.06 : 1.0,
          duration: const Duration(milliseconds: 150),
          child: Container(
            margin: const EdgeInsets.only(right: 12, top: 4, bottom: 4),
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
            decoration: BoxDecoration(
              color: AppTheme.cardBg,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: _isFocused ? AppTheme.watchYellow : AppTheme.cardBorder,
                width: _isFocused ? 1.5 : 1,
              ),
              boxShadow: _isFocused
                  ? [
                      BoxShadow(
                        color: AppTheme.watchYellow.withValues(alpha: 0.25),
                        blurRadius: 10,
                        offset: const Offset(0, 2),
                      )
                    ]
                  : null,
            ),
            child: Center(
              child: Text(
                widget.provider.name,
                style: TextStyle(
                  color: _isFocused ? Colors.white : AppTheme.textMuted,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
