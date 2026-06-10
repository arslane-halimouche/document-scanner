/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#4F8EF7",
          light: "#6BA3F9",
          dark: "#3B7AE8",
        },
      },
    },
  },
  plugins: [],
};
