import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				foreground: 'hsl(var(--warning-foreground))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			},
  			'pulse-glow': {
  				'0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
  				'50%': { opacity: '1', transform: 'scale(1.05)' }
  			},
  			'float': {
  				'0%, 100%': { transform: 'translateY(0px)' },
  				'50%': { transform: 'translateY(-24px)' }
  			},
  			'float-slow': {
  				'0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
  				'33%': { transform: 'translateY(-16px) translateX(8px)' },
  				'66%': { transform: 'translateY(8px) translateX(-12px)' }
  			},
  			'scanline': {
  				'0%': { transform: 'translateY(-100%)' },
  				'100%': { transform: 'translateY(100vh)' }
  			},
  			'shimmer': {
  				'0%': { backgroundPosition: '-200% 0' },
  				'100%': { backgroundPosition: '200% 0' }
  			},
  			'fade-slide-up': {
  				'0%': { opacity: '0', transform: 'translateY(20px)' },
  				'100%': { opacity: '1', transform: 'translateY(0)' }
  			},
  			'fade-slide-right': {
  				'0%': { opacity: '0', transform: 'translateX(20px)' },
  				'100%': { opacity: '1', transform: 'translateX(0)' }
  			},
  			'ring-pulse': {
  				'0%': { boxShadow: '0 0 0 0 rgba(0, 240, 255, 0.4)' },
  				'100%': { boxShadow: '0 0 0 12px rgba(0, 240, 255, 0)' }
  			},
  			'grid-pulse': {
  				'0%, 100%': { opacity: '0.3' },
  				'50%': { opacity: '0.6' }
  			},
  			'dot-move': {
  				'0%': { transform: 'translateY(0px) translateX(0px)', opacity: '0' },
  				'10%': { opacity: '1' },
  				'90%': { opacity: '1' },
  				'100%': { transform: 'translateY(-60px) translateX(20px)', opacity: '0' }
  			},
			'concentric': {
				'0%': { transform: 'scale(0.5)', opacity: '0.8' },
				'100%': { transform: 'scale(2)', opacity: '0' }
			},
			'blink': {
				'0%, 100%': { opacity: '1' },
				'50%': { opacity: '0' }
			},
			'orb-spin': {
				'0%': { transform: 'rotateX(60deg) rotateZ(0deg)' },
				'100%': { transform: 'rotateX(60deg) rotateZ(360deg)' }
			},
			'orb-spin-reverse': {
				'0%': { transform: 'rotateX(60deg) rotateZ(360deg)' },
				'100%': { transform: 'rotateX(60deg) rotateZ(0deg)' }
			},
			'orb-spin-y': {
				'0%': { transform: 'rotateY(70deg) rotateZ(0deg)' },
				'100%': { transform: 'rotateY(70deg) rotateZ(360deg)' }
			},
			'orb-breathe': {
				'0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
				'50%': { transform: 'scale(1.06)', opacity: '1' }
			},
			'orb-dot': {
				'0%': { transform: 'rotate(0deg) translateX(48px) rotate(0deg)', opacity: '0.9' },
				'50%': { opacity: '1' },
				'100%': { transform: 'rotate(360deg) translateX(48px) rotate(-360deg)', opacity: '0.9' }
			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
  			'float': 'float 20s ease-in-out infinite',
  			'float-slow': 'float-slow 25s ease-in-out infinite',
  			'scanline': 'scanline 10s linear infinite',
  			'shimmer': 'shimmer 2.5s linear infinite',
  			'fade-slide-up': 'fade-slide-up 0.6s ease-out forwards',
  			'fade-slide-right': 'fade-slide-right 0.5s ease-out forwards',
  			'ring-pulse': 'ring-pulse 2s ease-out infinite',
  			'grid-pulse': 'grid-pulse 4s ease-in-out infinite',
			'concentric': 'concentric 2.5s ease-out infinite',
			'blink': 'blink 1s step-end infinite',
			'orb-spin': 'orb-spin 8s linear infinite',
			'orb-spin-reverse': 'orb-spin-reverse 10s linear infinite',
			'orb-spin-y': 'orb-spin-y 12s linear infinite',
			'orb-breathe': 'orb-breathe 3s ease-in-out infinite',
			'orb-dot': 'orb-dot 4s linear infinite'
  		},
  		fontFamily: {
  			sans: [
  				'Inter',
  				'ui-sans-serif',
  				'system-ui',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'Roboto',
  				'Helvetica Neue',
  				'Arial',
  				'Noto Sans',
  				'sans-serif'
  			],
  			serif: [
  				'Lora',
  				'ui-serif',
  				'Georgia',
  				'Cambria',
  				'Times New Roman',
  				'Times',
  				'serif'
  			],
  			mono: [
  				'Space Mono',
  				'ui-monospace',
  				'SFMono-Regular',
  				'Menlo',
  				'Monaco',
  				'Consolas',
  				'Liberation Mono',
  				'Courier New',
  				'monospace'
  			]
  		},
  		boxShadow: {
  			'2xs': 'var(--shadow-2xs)',
  			xs: 'var(--shadow-xs)',
  			sm: 'var(--shadow-sm)',
  			md: 'var(--shadow-md)',
  			lg: 'var(--shadow-lg)',
  			xl: 'var(--shadow-xl)',
  			'2xl': 'var(--shadow-2xl)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
