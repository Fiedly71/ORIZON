module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated v4 / Worklets: le plugin doit etre dernier.
    plugins: ['react-native-worklets/plugin'],
  };
};
