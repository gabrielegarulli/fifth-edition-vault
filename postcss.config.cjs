module.exports = {
  plugins: [
    require('@tailwindcss/postcss'),
    require('./postcss/scope-to-plugin-root.cjs'),
  ],
};
