import React from 'react';
import { ThemeProvider as MUIThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';

// Convert our custom theme to MUI theme
const muiTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: theme.colors.secondary.main,
      light: theme.colors.secondary.light,
      dark: theme.colors.secondary.dark,
      contrastText: theme.colors.secondary.contrast,
    },
    secondary: {
      main: theme.colors.secondary.main,
      light: theme.colors.secondary.light,
      dark: theme.colors.secondary.dark,
      contrastText: theme.colors.secondary.contrast,
    },
    background: {
      default: theme.colors.background.default,
      paper: theme.colors.background.paper,
    },
    text: {
      primary: theme.colors.text.primary,
      secondary: theme.colors.text.secondary,
    },
    success: {
      main: theme.colors.status.success,
    },
    error: {
      main: theme.colors.status.error,
    },
    warning: {
      main: theme.colors.status.warning,
    },
    info: {
      main: theme.colors.status.info,
    },
  },
  typography: {
    fontFamily: theme.typography.fontFamily,
    h1: theme.typography.h1,
    h2: theme.typography.h2,
    h3: theme.typography.h3,
    h4: theme.typography.h4,
    h5: theme.typography.h5,
    body1: theme.typography.body1,
    body2: theme.typography.body2,
    button: theme.typography.button,
    caption: theme.typography.caption,
  },
  shape: {
    borderRadius: parseInt(theme.borderRadius.md.replace('rem', '')) * 16,
  },
  shadows: [
    'none',
    theme.shadows.sm,
    theme.shadows.md,
    theme.shadows.lg,
    theme.shadows.xl,
    ...Array(20).fill(theme.shadows.xl), // Fill the rest with xl shadow
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: theme.borderRadius.md,
          fontWeight: theme.typography.fontWeightMedium,
          boxShadow: theme.shadows.md,
          padding: '0.5rem 1.25rem',
          transition: theme.transitions.default,
        },
        containedPrimary: {
          background: theme.colors.gradients.button,
          '&:hover': {
            background: theme.colors.gradients.button,
            filter: 'brightness(1.1)',
            boxShadow: theme.shadows.lg,
          },
        },
        containedSuccess: {
          background: theme.colors.gradients.success,
          '&:hover': {
            background: theme.colors.gradients.success,
            filter: 'brightness(1.1)',
            boxShadow: theme.shadows.lg,
          },
        },
        containedError: {
          background: theme.colors.gradients.error,
          '&:hover': {
            background: theme.colors.gradients.error,
            filter: 'brightness(1.1)',
            boxShadow: theme.shadows.lg,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: theme.colors.gradients.card,
          borderRadius: theme.borderRadius.lg,
          boxShadow: theme.shadows.card,
          border: `1px solid ${theme.colors.border.main}`,
          backdropFilter: 'blur(10px)',
          transition: theme.transitions.default,
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: theme.shadows.cardHover,
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: theme.borderRadius.md,
            '& fieldset': {
              borderColor: theme.colors.border.main,
            },
            '&:hover fieldset': {
              borderColor: theme.colors.secondary.main,
            },
            '&.Mui-focused fieldset': {
              borderColor: theme.colors.secondary.main,
            },
            '& input': {
              padding: '0.75rem 1rem',
            },
          },
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          borderCollapse: 'separate',
          borderSpacing: 0,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: 'rgba(15, 23, 42, 0.3)',
          color: theme.colors.text.secondary,
          fontWeight: 600,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          borderBottom: `1px solid ${theme.colors.border.main}`,
        },
        body: {
          padding: '1rem',
          borderBottom: `1px solid rgba(51, 65, 85, 0.3)`,
          color: theme.colors.text.secondary,
          fontSize: '0.875rem',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(51, 65, 85, 0.2)',
          },
          '&:last-child td': {
            borderBottom: 'none',
          },
        },
      },
    },
  },
});

const ThemeProvider = ({ children }) => {
  return (
    <MUIThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </MUIThemeProvider>
  );
};

export default ThemeProvider; 