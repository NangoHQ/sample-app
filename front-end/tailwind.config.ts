import type { Config } from 'tailwindcss';

export default {
    content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
    plugins: [require('@headlessui/tailwindcss'), require('@tailwindcss/aspect-ratio'), require('@tailwindcss/line-clamp')],
    theme: {
        fontFamily: {
            sans: ['var(--font-inter)'],
            mono: ['var(--font-roboto-mono)']
        }
    }
} satisfies Config;
