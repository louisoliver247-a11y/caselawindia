import type { Config } from "tailwindcss";
export default { content: ["./index.html", "./src/**/*.{ts,tsx}"], theme: { extend: { colors: { ink: "#142b26", forest: "#173f37", saffron: "#c95f35", paper: "#f7f7f3", mist: "#e8eee9", line: "#d9e1dc" }, fontFamily: { sans: ["Inter", "system-ui", "sans-serif"], serif: ["Literata", "Georgia", "serif"] } } }, plugins: [] } satisfies Config;
