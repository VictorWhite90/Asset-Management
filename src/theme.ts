import { createTheme } from '@mui/material/styles';

const headingFont = '"Playfair Display", "Georgia", "Times New Roman", serif';
const bodyFont = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

/** Surfaces: white app shell, translucent glass panels, brand greens unchanged. */
export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#008751',
      light: '#00a862',
      dark: '#006038',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#00ff88',
      light: '#66ffaa',
      dark: '#00cc6a',
      contrastText: '#0a1a0d',
    },
    error: {
      main: '#c62828',
      light: '#e53935',
      dark: '#8e0000',
    },
    warning: {
      main: '#b8860b',
      light: '#daa520',
      dark: '#8b6508',
    },
    success: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
    },
    background: {
      default: '#f8fbf8',
      paper: 'rgba(255, 255, 255, 0.72)',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)',
    },
    divider: 'rgba(0, 135, 81, 0.12)',
  },
  typography: {
    fontFamily: bodyFont,
    h1: { fontFamily: headingFont, fontWeight: 800, color: '#143625', letterSpacing: 0 },
    h2: { fontFamily: headingFont, fontWeight: 800, color: '#143625', letterSpacing: 0 },
    h3: { fontFamily: headingFont, fontWeight: 800, color: '#143625', letterSpacing: 0 },
    h4: { fontFamily: headingFont, fontWeight: 800, color: '#143625', letterSpacing: 0 },
    h5: { fontFamily: headingFont, fontWeight: 750, color: '#143625', letterSpacing: 0 },
    h6: { fontFamily: bodyFont, fontWeight: 750, color: '#143625', letterSpacing: 0 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f8fbf8',
          backgroundImage:
            'radial-gradient(circle at 12% 10%, rgba(0, 135, 81, 0.08), transparent 28%), radial-gradient(circle at 88% 18%, rgba(184, 134, 11, 0.08), transparent 26%), linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(244,250,246,0.92) 52%, rgba(255,255,255,0.96) 100%)',
          minHeight: '100vh',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.74)',
          backgroundImage: 'none',
          border: '1px solid rgba(0, 135, 81, 0.16)',
          boxShadow: '0 18px 50px rgba(20, 54, 37, 0.08)',
          backdropFilter: 'blur(18px)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.68)',
          border: '1px solid rgba(0, 135, 81, 0.16)',
          boxShadow: '0 16px 42px rgba(20, 54, 37, 0.08)',
          backdropFilter: 'blur(16px)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          boxShadow: '0 2px 8px rgba(0, 135, 81, 0.25)',
          '&:hover': {
            boxShadow: '0 4px 14px rgba(0, 135, 81, 0.35)',
          },
        },
        outlined: {
          borderColor: 'rgba(0, 135, 81, 0.45)',
          color: '#006038',
          '&:hover': {
            borderColor: '#008751',
            backgroundColor: 'rgba(0, 135, 81, 0.06)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(255, 255, 255, 0.72)',
            backdropFilter: 'blur(12px)',
            borderRadius: 10,
            '& fieldset': {
              borderColor: 'rgba(0, 135, 81, 0.24)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0, 135, 81, 0.4)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#008751',
            },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(0, 135, 81, 0.1)',
        },
        head: {
          backgroundColor: 'rgba(0, 135, 81, 0.08)',
          fontWeight: 700,
          color: '#0d331f',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(0, 135, 81, 0.04) !important',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(0, 135, 81, 0.25)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        standardInfo: {
          backgroundColor: 'rgba(0, 135, 81, 0.08)',
          color: '#004d2e',
          border: '1px solid rgba(0, 135, 81, 0.2)',
        },
        standardSuccess: {
          backgroundColor: 'rgba(46, 125, 50, 0.08)',
          color: '#1b5e20',
          border: '1px solid rgba(46, 125, 50, 0.25)',
        },
        standardWarning: {
          backgroundColor: 'rgba(184, 134, 11, 0.1)',
          color: '#6d5200',
          border: '1px solid rgba(184, 134, 11, 0.3)',
        },
        standardError: {
          backgroundColor: 'rgba(198, 40, 40, 0.08)',
          color: '#b71c1c',
          border: '1px solid rgba(198, 40, 40, 0.25)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid rgba(0, 135, 81, 0.15)',
          backdropFilter: 'blur(18px)',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          border: '1px solid rgba(0, 135, 81, 0.15)',
          backdropFilter: 'blur(18px)',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          backgroundColor: '#fafcfb',
        },
      },
    },
    MuiFilledInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#f5faf7',
          '&:hover': {
            backgroundColor: '#eef5f0',
          },
          '&.Mui-focused': {
            backgroundColor: '#eef5f0',
          },
          '&.Mui-disabled': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          '&.Mui-focused': {
            backgroundColor: 'transparent',
          },
        },
        input: {
          '&:-webkit-autofill': {
            WebkitBoxShadow: '0 0 0 100px #fafcfb inset !important',
            WebkitTextFillColor: 'rgba(0, 0, 0, 0.87) !important',
            caretColor: '#006038',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#008751',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            color: '#006038',
            fontWeight: 600,
          },
        },
      },
    },
  },
});
