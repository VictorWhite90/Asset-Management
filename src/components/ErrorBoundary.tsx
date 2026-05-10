import React from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import { ErrorOutline } from '@/components/icons';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="sm">
          <Box
            sx={{
              minHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: 2,
            }}
          >
            <ErrorOutline sx={{ fontSize: 64, color: '#f44336' }} />
            <Typography variant="h4" sx={{ color: '#143625', fontWeight: 700 }}>
              Something went wrong
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(15,48,31,0.68)', maxWidth: 400 }}>
              An unexpected error occurred. Please try refreshing the page or return to the homepage.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                variant="outlined"
                onClick={() => window.location.reload()}
                sx={{ borderColor: 'rgba(0,135,81,0.5)', color: '#008751' }}
              >
                Refresh Page
              </Button>
              <Button
                variant="contained"
                onClick={this.handleReset}
                sx={{ backgroundColor: '#008751' }}
              >
                Go to Homepage
              </Button>
            </Box>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
