import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Container,
  Paper,
  Box,
  Button,
  TextField,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Typography,
  InputAdornment,
} from '@mui/material';
import { ArrowBack, Save } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import { getAssetById, getCategoryDetails, updateRejectedAsset } from '@/services/asset.service';
import { Asset, AssetFormData, AssetCategory } from '@/types/asset.types';
import { Category } from '@/types/category.types';
import { ASSET_CATEGORIES, MONTHS, ERROR_MESSAGES } from '@/utils/constants';
import { camelToTitle } from '@/utils/assetHelpers';
import AppLayout from '@/components/AppLayout';

// Base validation schema (applies to all assets)
const baseSchema = {
  assetId: yup.string().optional(),
  description: yup
    .string()
    .required('Description is required')
    .min(3, 'Description must be at least 3 characters'),
  category: yup.string().required('Category is required').oneOf(ASSET_CATEGORIES),
  location: yup.string().required('Location is required').min(3, 'Location must be at least 3 characters'),
  purchaseDay: yup
    .number()
    .required('Day is required')
    .min(1, 'Day must be between 1 and 31')
    .max(31, 'Day must be between 1 and 31'),
  purchaseMonth: yup
    .number()
    .required('Month is required')
    .min(1, 'Month must be between 1 and 12')
    .max(12, 'Month must be between 1 and 12'),
  purchaseYear: yup
    .number()
    .required('Year is required')
    .min(1900, 'Year must be after 1900')
    .max(new Date().getFullYear() + 1, 'Year cannot be in the future'),
  purchaseCost: yup
    .number()
    .required('Purchase cost is required')
    .positive('Purchase cost must be greater than 0')
    .typeError('Please enter a valid number'),
  marketValue: yup
    .number()
    .optional()
    .positive('Market value must be greater than 0')
    .typeError('Please enter a valid number')
    .nullable()
    .transform((value, originalValue) => (originalValue === '' ? null : value)),
  remarks: yup.string().optional(),
};

const EditAssetPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingAsset, setFetchingAsset] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categoryDetails, setCategoryDetails] = useState<Category | null>(null);
  const [loadingCategory, setLoadingCategory] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    setError: setFormError,
    unregister,
  } = useForm<any>({
    resolver: yupResolver(yup.object().shape(baseSchema)),
    mode: 'onBlur',
  });

  const category = watch('category');

  // Fetch asset data on mount
  useEffect(() => {
    fetchAssetData();
  }, [id]);

  // Load category details when category changes
  useEffect(() => {
    if (category && category !== selectedCategory) {
      setSelectedCategory(category);
      loadCategoryDetails(category);
    }
  }, [category]);

  const fetchAssetData = async () => {
    if (!id) {
      setError('Asset ID not provided');
      setFetchingAsset(false);
      return;
    }

    if (!userData) {
      setError('Please sign in to continue');
      setFetchingAsset(false);
      return;
    }

    setFetchingAsset(true);
    setError(null);
    try {
      const assetData = await getAssetById(id);

      // Verify asset is rejected
      if (assetData.status !== 'rejected') {
        setError('Only rejected assets can be edited');
        setFetchingAsset(false);
        return;
      }

      // Verify user is the uploader
      if (assetData.uploadedBy !== userData.userId) {
        setError('You can only edit your own assets');
        setFetchingAsset(false);
        return;
      }

      setAsset(assetData);

      // Pre-fill form with asset data
      setValue('assetId', assetData.assetId);
      setValue('description', assetData.description);
      setValue('category', assetData.category);
      setValue('location', assetData.location);
      setValue('purchaseDay', assetData.purchasedDate.day);
      setValue('purchaseMonth', assetData.purchasedDate.month);
      setValue('purchaseYear', assetData.purchasedDate.year);
      setValue('purchaseCost', assetData.purchaseCost);
      setValue('marketValue', assetData.marketValue || '');
      setValue('remarks', assetData.remarks || '');

      // Load category details and pre-fill category-specific fields
      await loadCategoryDetailsAndFields(assetData.category, assetData);
    } catch (err: any) {
      setError(err.message || 'Failed to load asset');
      toast.error(err.message || 'Failed to load asset');
    } finally {
      setFetchingAsset(false);
    }
  };

  const loadCategoryDetailsAndFields = async (categoryName: string, assetData: Asset) => {
    setLoadingCategory(true);
    try {
      const details = await getCategoryDetails(categoryName);
      setCategoryDetails(details);

      // Pre-fill category-specific fields
      if (details.requiredFields && details.requiredFields.length > 0) {
        details.requiredFields.forEach((field) => {
          if (assetData[field]) {
            setValue(field, assetData[field]);
          }
        });
      }
    } catch (err: any) {
      console.error('Error loading category details:', err);
      toast.error(err.message || ERROR_MESSAGES.ASSETS.CATEGORY_LOAD_FAILED);
      setCategoryDetails(null);
    } finally {
      setLoadingCategory(false);
    }
  };

  const loadCategoryDetails = async (categoryName: string) => {
    setLoadingCategory(true);
    setError(null);

    // Unregister old category-specific fields before loading new ones
    if (categoryDetails && categoryDetails.requiredFields) {
      categoryDetails.requiredFields.forEach((field) => {
        unregister(field);
      });
    }

    try {
      const details = await getCategoryDetails(categoryName);
      setCategoryDetails(details);
    } catch (err: any) {
      setError(err.message || ERROR_MESSAGES.ASSETS.CATEGORY_LOAD_FAILED);
      toast.error(err.message || ERROR_MESSAGES.ASSETS.CATEGORY_LOAD_FAILED);
      setCategoryDetails(null);
    } finally {
      setLoadingCategory(false);
    }
  };

  const onSubmit = async (data: any) => {
    if (!userData || !id) {
      toast.error('Please sign in to continue');
      return;
    }

    // Validate dynamic category-specific fields
    if (categoryDetails && categoryDetails.requiredFields) {
      let hasErrors = false;
      categoryDetails.requiredFields.forEach((field) => {
        if (!data[field] || data[field].toString().trim() === '') {
          setFormError(field, {
            type: 'required',
            message: `${camelToTitle(field)} is required`,
          });
          hasErrors = true;
        }
      });

      if (hasErrors) {
        toast.error(ERROR_MESSAGES.ASSETS.MISSING_REQUIRED_FIELDS);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // Prepare updated asset data
      const assetUpdateData: Partial<AssetFormData> = {
        description: data.description,
        category: data.category as AssetCategory,
        location: data.location,
        purchasedDate: {
          day: parseInt(data.purchaseDay, 10),
          month: parseInt(data.purchaseMonth, 10),
          year: parseInt(data.purchaseYear, 10),
        },
        purchaseCost: parseFloat(data.purchaseCost),
        marketValue: data.marketValue ? parseFloat(data.marketValue) : undefined,
        remarks: data.remarks || undefined,
      };

      // Include dynamic category-specific fields
      if (categoryDetails && categoryDetails.requiredFields) {
        categoryDetails.requiredFields.forEach((field) => {
          assetUpdateData[field] = data[field];
        });
      }

      // Update asset
      await updateRejectedAsset(
        id,
        assetUpdateData,
        userData.userId,
        currentUser?.email || undefined,
        userData.agencyName
      );

      // Success
      toast.success('Asset updated and resubmitted successfully!');
      navigate('/assets/my-assets');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update asset';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Generate year options (1900 to current year)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => 1900 + i).reverse();

  // Generate day options (1 to 31)
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  // Dark theme input styles
  const inputStyles = {
    '& .MuiOutlinedInput-root': {
      color: '#FFFFFF',
      '& fieldset': { borderColor: 'rgba(0, 135, 81, 0.3)' },
      '&:hover fieldset': { borderColor: 'rgba(0, 135, 81, 0.5)' },
      '&.Mui-focused fieldset': { borderColor: '#008751' },
    },
    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.6)' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#00ff88' },
    '& .MuiFormHelperText-root': { color: 'rgba(255, 255, 255, 0.5)' },
    '& .MuiSelect-icon': { color: 'rgba(255, 255, 255, 0.6)' },
  };

  const menuProps = {
    PaperProps: {
      sx: {
        backgroundColor: '#0d2818',
        border: '1px solid rgba(0, 135, 81, 0.3)',
        '& .MuiMenuItem-root': {
          color: '#FFFFFF',
          '&:hover': { backgroundColor: 'rgba(0, 135, 81, 0.2)' },
          '&.Mui-selected': {
            backgroundColor: 'rgba(0, 135, 81, 0.3)',
            '&:hover': { backgroundColor: 'rgba(0, 135, 81, 0.4)' },
          },
        },
      },
    },
  };

  if (fetchingAsset) {
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

  if (error && !asset) {
    return (
      <AppLayout>
        <Container component="main" maxWidth="lg">
          <Box sx={{ mb: 3 }}>
            <Button
              component={Link}
              to="/assets/my-assets"
              startIcon={<ArrowBack />}
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': {
                  color: '#00ff88',
                  backgroundColor: 'transparent',
                },
              }}
            >
              Back to My Assets
            </Button>
          </Box>
          <Alert
            severity="error"
            sx={{
              backgroundColor: 'rgba(211, 47, 47, 0.1)',
              color: '#ef5350',
              border: '1px solid rgba(211, 47, 47, 0.3)',
            }}
          >
            {error}
          </Alert>
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
            to={`/assets/view/${id}`}
            startIcon={<ArrowBack />}
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                color: '#00ff88',
                backgroundColor: 'transparent',
              },
            }}
          >
            Back to Asset Details
          </Button>
        </Box>

        {/* Page Header */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            background: 'linear-gradient(135deg, rgba(0, 135, 81, 0.2) 0%, rgba(0, 135, 81, 0.05) 100%)',
            borderLeft: '4px solid #008751',
          }}
        >
          <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 700, mb: 1 }}>
            Edit Asset
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Fix the issues and resubmit for approval
          </Typography>
        </Paper>

        {/* Rejection Reason Alert */}
        {asset?.rejectionReason && (
          <Alert
            severity="warning"
            sx={{
              mb: 3,
              backgroundColor: 'rgba(255, 167, 38, 0.1)',
              color: '#ffa726',
              border: '1px solid rgba(255, 167, 38, 0.3)',
              '& .MuiAlert-icon': { color: '#ffa726' },
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Rejection Reason:
            </Typography>
            <Typography variant="body2">{asset.rejectionReason}</Typography>
          </Alert>
        )}

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              backgroundColor: 'rgba(211, 47, 47, 0.1)',
              color: '#ef5350',
              border: '1px solid rgba(211, 47, 47, 0.3)',
            }}
          >
            {error}
          </Alert>
        )}

        {/* Edit Form */}
        <Paper elevation={0} sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Grid container spacing={2}>
              {/* Asset ID (Readonly) */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="assetId"
                  label="Asset ID"
                  {...register('assetId')}
                  InputProps={{
                    readOnly: true,
                  }}
                  disabled
                  helperText="Asset ID cannot be changed"
                  sx={{
                    ...inputStyles,
                    '& .Mui-disabled': {
                      color: 'rgba(255, 255, 255, 0.4)',
                      '-webkit-text-fill-color': 'rgba(255, 255, 255, 0.4)',
                    },
                  }}
                />
              </Grid>

              {/* Category (Required) */}
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  select
                  id="category"
                  label="Category"
                  {...register('category')}
                  error={!!errors.category}
                  helperText={errors.category?.message as string}
                  SelectProps={{ MenuProps: menuProps }}
                  sx={inputStyles}
                >
                  {ASSET_CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Description (Required) */}
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id="description"
                  label="Description"
                  placeholder="e.g., Toyota Camry 2020 LE"
                  multiline
                  rows={2}
                  {...register('description')}
                  error={!!errors.description}
                  helperText={errors.description?.message as string}
                  sx={inputStyles}
                />
              </Grid>

              {/* Location (Required) */}
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  id="location"
                  label="Location"
                  placeholder="e.g., Ikorodu, Lagos"
                  {...register('location')}
                  error={!!errors.location}
                  helperText={errors.location?.message as string}
                  sx={inputStyles}
                />
              </Grid>

              {/* Purchase Cost (Required) */}
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  id="purchaseCost"
                  label="Purchase Cost"
                  type="number"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start" sx={{ color: '#00ff88' }}>
                        ₦
                      </InputAdornment>
                    ),
                  }}
                  {...register('purchaseCost')}
                  error={!!errors.purchaseCost}
                  helperText={errors.purchaseCost?.message as string}
                  sx={inputStyles}
                />
              </Grid>

              {/* Market Value (Optional) */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="marketValue"
                  label="Market Value (Optional)"
                  type="number"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start" sx={{ color: '#00ff88' }}>
                        ₦
                      </InputAdornment>
                    ),
                  }}
                  {...register('marketValue')}
                  error={!!errors.marketValue}
                  helperText={(errors.marketValue?.message as string) || 'Current market worth of the asset'}
                  sx={inputStyles}
                />
              </Grid>

              {/* Purchase Date - Day, Month, Year Dropdowns */}
              <Grid item xs={12} sm={4}>
                <TextField
                  required
                  fullWidth
                  select
                  id="purchaseDay"
                  label="Purchase Day"
                  {...register('purchaseDay')}
                  error={!!errors.purchaseDay}
                  helperText={errors.purchaseDay?.message as string}
                  SelectProps={{ MenuProps: menuProps }}
                  sx={inputStyles}
                >
                  {days.map((day) => (
                    <MenuItem key={day} value={day}>
                      {day}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  required
                  fullWidth
                  select
                  id="purchaseMonth"
                  label="Purchase Month"
                  {...register('purchaseMonth')}
                  error={!!errors.purchaseMonth}
                  helperText={errors.purchaseMonth?.message as string}
                  SelectProps={{ MenuProps: menuProps }}
                  sx={inputStyles}
                >
                  {MONTHS.map((month, index) => (
                    <MenuItem key={month} value={index + 1}>
                      {month}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  required
                  fullWidth
                  select
                  id="purchaseYear"
                  label="Purchase Year"
                  {...register('purchaseYear')}
                  error={!!errors.purchaseYear}
                  helperText={errors.purchaseYear?.message as string}
                  SelectProps={{ MenuProps: menuProps }}
                  sx={inputStyles}
                >
                  {years.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Dynamic Category-Specific Fields */}
              {loadingCategory && (
                <Grid item xs={12}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <CircularProgress size={20} sx={{ color: '#00ff88' }} />
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      Loading category fields...
                    </Typography>
                  </Box>
                </Grid>
              )}

              {categoryDetails && categoryDetails.requiredFields?.length > 0 && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ color: '#00ff88', mt: 1, fontWeight: 600 }}>
                      Category-Specific Information
                    </Typography>
                  </Grid>

                  {categoryDetails.requiredFields.map((field) => (
                    <Grid item xs={12} sm={6} key={field}>
                      <TextField
                        required
                        fullWidth
                        id={field}
                        label={camelToTitle(field)}
                        {...register(field, {
                          required: `${camelToTitle(field)} is required`,
                        })}
                        error={!!errors[field]}
                        helperText={errors[field]?.message as string}
                        sx={inputStyles}
                      />
                    </Grid>
                  ))}
                </>
              )}

              {/* Remarks (Optional) */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="remarks"
                  label="Remarks (Optional)"
                  placeholder="Additional notes or comments"
                  multiline
                  rows={2}
                  {...register('remarks')}
                  sx={inputStyles}
                />
              </Grid>

              {/* Submit Button */}
              <Grid item xs={12}>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading || loadingCategory}
                  startIcon={loading ? <CircularProgress size={20} sx={{ color: '#FFFFFF' }} /> : <Save />}
                  sx={{
                    mt: 2,
                    backgroundColor: '#008751',
                    '&:hover': { backgroundColor: '#006038' },
                    '&.Mui-disabled': {
                      backgroundColor: 'rgba(0, 135, 81, 0.3)',
                      color: 'rgba(255, 255, 255, 0.5)',
                    },
                  }}
                >
                  {loading ? 'Updating...' : 'Update and Resubmit Asset'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Container>
    </AppLayout>
  );
};

export default EditAssetPage;
