// Metro config — stubs les modules natifs (Stripe, react-native-maps)
// quand on bundle pour le web, pour permettre `expo export --platform web`.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const WEB_STUBS = {
  '@stripe/stripe-react-native': path.resolve(__dirname, 'src/web-stubs/stripe.js'),
  'react-native-maps': path.resolve(__dirname, 'src/web-stubs/maps.js'),
};

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_STUBS[moduleName]) {
    return {
      filePath: WEB_STUBS[moduleName],
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
