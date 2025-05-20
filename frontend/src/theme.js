// src/theme.js - Centralized theme configuration for premium UI
const theme = {
  colors: {
    // Primary color palette - Modern deep blue gradient
    primary: {
      main: '#0f172a',
      light: '#1e293b',
      dark: '#0a1322',
      contrast: '#ffffff',
    },
    // Secondary color palette - Accent color
    secondary: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
      contrast: '#ffffff',
    },
    // Status colors
    status: {
      success: '#10b981', // Green
      warning: '#f59e0b', // Amber
      error: '#ef4444',   // Red
      info: '#3b82f6',    // Blue
    },
    // Background colors
    background: {
      default: '#0f172a',
      paper: '#1e293b',
      card: 'rgba(30, 41, 59, 0.8)',
      cardHover: 'rgba(51, 65, 85, 0.9)',
    },
    // Text colors
    text: {
      primary: '#f8fafc',
      secondary: '#cbd5e1',
      tertiary: '#94a3b8',
      disabled: 'rgba(203, 213, 225, 0.38)',
    },
    // Border colors
    border: {
      main: '#334155',
      light: '#475569',
    },
    // Gradient backgrounds
    gradients: {
      primary: 'linear-gradient(145deg, #1e293b, #0f172a)',
      card: 'linear-gradient(145deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9))',
      sidebar: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
      button: 'linear-gradient(90deg, #3b82f6, #2563eb)',
      success: 'linear-gradient(90deg, #10b981, #059669)',
      error: 'linear-gradient(90deg, #ef4444, #dc2626)',
    },
  },
  // Shadows for depth
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    card: '0 4px 12px rgba(0, 0, 0, 0.25), 0 1px 3px rgba(0, 0, 0, 0.3)',
    cardHover: '0 10px 20px rgba(0, 0, 0, 0.35), 0 3px 6px rgba(0, 0, 0, 0.3)',
  },
  // Border radius
  borderRadius: {
    sm: '0.25rem', // 4px
    md: '0.5rem',  // 8px
    lg: '0.75rem', // 12px
    xl: '1rem',    // 16px
    xxl: '1.5rem', // 24px
    round: '50%',
  },
  // Spacing scale
  spacing: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    xxl: '3rem',    // 48px
  },
  // Typography
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.01562em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      letterSpacing: '-0.00833em',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      letterSpacing: '0em',
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      letterSpacing: '0.00735em',
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 500,
      letterSpacing: '0em',
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      letterSpacing: '0.00938em',
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      letterSpacing: '0.01071em',
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      letterSpacing: '0.02857em',
      textTransform: 'uppercase',
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      letterSpacing: '0.03333em',
    },
  },
  // Transitions
  transitions: {
    default: 'all 0.2s ease-in-out',
    fast: 'all 0.1s ease-in-out',
    slow: 'all 0.3s ease-in-out',
  },
  // Animations
  animations: {
    fadeIn: '@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }',
    slideUp: '@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }',
    pulse: '@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }',
  },
  // Z-index values
  zIndex: {
    appBar: 1100,
    drawer: 1200,
    modal: 1300,
    snackbar: 1400,
    tooltip: 1500,
  },
};

export default theme; 