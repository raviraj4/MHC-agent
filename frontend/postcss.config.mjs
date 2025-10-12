/** @type {import('postcss').ProcessOptions} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},  // ← Use the new plugin
    autoprefixer: {},
  },
}

export default config