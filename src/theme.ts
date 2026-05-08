import { createTheme } from '@mui/material/styles';

export const appTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#008751',
      light: '#00ff88',
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
      main: '#ff4444',
      light: '#ff6666',
      dark: '#cc0000',
    },
    warning: {
      main: '#b8860b',
      light: '#daa520',
      dark: '#8b6508',
    },
    success: {
      main: '#00ff88',
      light: '#66ffaa',
      dark: '#00cc6a',
    },
    background: {
      default: '#0a1a0d',
      paper: '#0d2818',
    },
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.7)',
      disabled: 'rgba(255, 255, 255, 0.4)',
    },
    divider: 'rgba(0, 135, 81, 0.2)',
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0a1a0d',
          backgroundImage: 'linear-gradient(180deg, #0a1a0d 0%, #0d2818 50%, #0a1a0d 100%)',
          minHeight: '100vh',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(13, 40, 24, 0.9)',
          backgroundImage: 'none',
          border: '1px solid rgba(0, 135, 81, 0.2)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(13, 40, 24, 0.9)',
          border: '1px solid rgba(0, 135, 81, 0.3)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          boxShadow: '0 4px 15px rgba(0, 135, 81, 0.3)',
          '&:hover': {
            boxShadow: '0 6px 20px rgba(0, 135, 81, 0.4)',
          },
        },
        outlined: {
          borderColor: 'rgba(0, 135, 81, 0.5)',
          '&:hover': {
            borderColor: '#00ff88',
            backgroundColor: 'rgba(0, 135, 81, 0.1)',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(0, 135, 81, 0.15)',
        },
        head: {
          backgroundColor: 'rgba(0, 135, 81, 0.1)',
          fontWeight: 700,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#00ff88',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            color: '#00ff88',
          },
        },
      },
    },
  },
});
