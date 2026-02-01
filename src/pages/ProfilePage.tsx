import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack,
  Person,
  Email,
  Business,
  LocationOn,
  VpnKey,
  History,
  CheckCircle,
  Cancel,
  Verified,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAuditSummary } from '@/services/auditLog.service';
import { AuditLogSummary } from '@/types/auditLog.types';
import ChangePasswordDialog from '@/components/ChangePasswordDialog';
import AppLayout from '@/components/AppLayout';

const ProfilePage = () => {
  const { currentUser, userData } = useAuth();
  const [summary, setSummary] = useState<AuditLogSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  useEffect(() => {
    if (userData?.userId) {
      fetchActivitySummary();
    }
  }, [userData]);

  const fetchActivitySummary = async () => {
    if (!userData?.userId) return;

    setLoadingSummary(true);
    try {
      const auditSummary = await getUserAuditSummary(userData.userId);
      setSummary(auditSummary);
    } catch (error) {
      console.error('Failed to load activity summary:', error);
    } finally {
      setLoadingSummary(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      agency: 'Asset Uploader',
      'agency-approver': 'Agency Approver',
      'ministry-admin': 'Ministry Administrator',
      admin: 'Federal Administrator',
    };
    return roleMap[role] || role;
  };

  if (!userData || !currentUser) {
    return (
      <AppLayout>
        <Container component="main" maxWidth="lg">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress sx={{ color: '#00ff88' }} />
          </Box>
        </Container>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Container component="main" maxWidth="lg">
        {/* Back Button */}
        <Box sx={{ mb: 3 }}>
          <Button
            component={Link}
            to="/dashboard"
            startIcon={<ArrowBack />}
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                color: '#00ff88',
                backgroundColor: 'transparent',
              },
            }}
          >
            Back to Dashboard
          </Button>
        </Box>

        <Grid container spacing={3}>
          {/* Profile Card */}
          <Grid item xs={12} md={4}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                textAlign: 'center',
                background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.15) 0%, rgba(0, 135, 81, 0.05) 100%)',
                borderLeft: '4px solid #008751',
              }}
            >
              <Avatar
                sx={{
                  width: 120,
                  height: 120,
                  margin: '0 auto 16px',
                  bgcolor: '#008751',
                  fontSize: '3rem',
                  border: '3px solid #00ff88',
                  boxShadow: '0 0 20px rgba(0, 135, 81, 0.4)',
                }}
              >
                {(userData.name || userData.agencyName || 'U').charAt(0).toUpperCase()}
              </Avatar>

              <Typography variant="h5" sx={{ color: '#FFFFFF', fontWeight: 700, mb: 1 }}>
                {userData.name || userData.agencyName}
              </Typography>

              <Chip
                label={getRoleLabel(userData.role)}
                sx={{
                  mb: 2,
                  backgroundColor: 'rgba(0, 135, 81, 0.2)',
                  color: '#00ff88',
                  border: '1px solid rgba(0, 135, 81, 0.4)',
                  fontWeight: 600,
                }}
              />

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 1 }}>
                {currentUser.emailVerified ? (
                  <>
                    <CheckCircle sx={{ color: '#00ff88', fontSize: 18 }} />
                    <Typography variant="body2" sx={{ color: '#00ff88' }}>
                      Email Verified
                    </Typography>
                  </>
                ) : (
                  <>
                    <Cancel sx={{ color: '#ef5350', fontSize: 18 }} />
                    <Typography variant="body2" sx={{ color: '#ef5350' }}>
                      Email Not Verified
                    </Typography>
                  </>
                )}
              </Box>

              <Divider sx={{ my: 2, borderColor: 'rgba(0, 135, 81, 0.3)' }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<VpnKey />}
                  fullWidth
                  onClick={() => setChangePasswordOpen(true)}
                >
                  Change Password
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<History />}
                  fullWidth
                  component={Link}
                  to="/activity"
                >
                  View Activity
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* Account Information */}
          <Grid item xs={12} md={8}>
            <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ color: '#00ff88', fontWeight: 600, mb: 2 }}>
                Account Information
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Card
                    sx={{
                      backgroundColor: 'rgba(0, 135, 81, 0.1)',
                      border: '1px solid rgba(0, 135, 81, 0.2)',
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Email sx={{ mr: 1, color: '#00ff88' }} />
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                          Email Address
                        </Typography>
                      </Box>
                      <Typography variant="body1" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                        {currentUser.email}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Card
                    sx={{
                      backgroundColor: 'rgba(0, 135, 81, 0.1)',
                      border: '1px solid rgba(0, 135, 81, 0.2)',
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Business sx={{ mr: 1, color: '#00ff88' }} />
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                          Agency/Ministry
                        </Typography>
                      </Box>
                      <Typography variant="body1" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                        {userData.agencyName || 'Federal Administration'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Card
                    sx={{
                      backgroundColor: 'rgba(0, 135, 81, 0.1)',
                      border: '1px solid rgba(0, 135, 81, 0.2)',
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <LocationOn sx={{ mr: 1, color: '#00ff88' }} />
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                          Location
                        </Typography>
                      </Box>
                      <Typography variant="body1" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                        {userData.location || 'N/A'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Card
                    sx={{
                      backgroundColor: 'rgba(0, 135, 81, 0.1)',
                      border: '1px solid rgba(0, 135, 81, 0.2)',
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Person sx={{ mr: 1, color: '#00ff88' }} />
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                          Ministry Type
                        </Typography>
                      </Box>
                      <Typography variant="body1" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                        {userData.ministryType || 'N/A'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Card
                    sx={{
                      backgroundColor: 'rgba(0, 135, 81, 0.1)',
                      border: '1px solid rgba(0, 135, 81, 0.2)',
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Verified sx={{ mr: 1, color: '#00ff88' }} />
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                          Account Created
                        </Typography>
                      </Box>
                      <Typography variant="body1" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                        {currentUser.metadata.creationTime
                          ? new Date(currentUser.metadata.creationTime).toLocaleDateString('en-NG', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'N/A'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>

            {/* Activity Summary */}
            <Paper elevation={0} sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ color: '#00ff88', fontWeight: 600, mb: 2 }}>
                Activity Summary
              </Typography>

              {loadingSummary ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress sx={{ color: '#00ff88' }} size={40} />
                </Box>
              ) : summary ? (
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Card sx={{ background: 'linear-gradient(135deg, #008751 0%, #006038 100%)', border: 'none' }}>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                          {summary.totalActions}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                          Total Actions
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  {userData.role === 'agency' && (
                    <Grid item xs={6} sm={3}>
                      <Card sx={{ background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', border: 'none' }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                            {summary.assetUploads}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                            Uploads
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}

                  {userData.role === 'agency-approver' && (
                    <>
                      <Grid item xs={6} sm={3}>
                        <Card sx={{ background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)', border: 'none' }}>
                          <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                              {summary.assetApprovals}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                              Approvals
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid item xs={6} sm={3}>
                        <Card sx={{ background: 'linear-gradient(135deg, #c62828 0%, #8e0000 100%)', border: 'none' }}>
                          <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                              {summary.assetRejections}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                              Rejections
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </>
                  )}

                  <Grid item xs={12} sm={summary.lastLoginAt ? 6 : 12}>
                    <Card
                      sx={{
                        backgroundColor: 'rgba(0, 135, 81, 0.1)',
                        border: '1px solid rgba(0, 135, 81, 0.2)',
                      }}
                    >
                      <CardContent>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                          Last Login
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#FFFFFF', fontWeight: 600 }}>
                          {summary.lastLoginAt
                            ? new Date(summary.lastLoginAt).toLocaleDateString('en-NG', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'No login activity yet'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              ) : (
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', py: 2 }}>
                  No activity summary available
                </Typography>
              )}

              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Button
                  variant="contained"
                  startIcon={<History />}
                  component={Link}
                  to="/activity"
                >
                  View Full Activity History
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Change Password Dialog */}
        <ChangePasswordDialog
          open={changePasswordOpen}
          onClose={() => setChangePasswordOpen(false)}
        />
      </Container>
    </AppLayout>
  );
};

export default ProfilePage;
