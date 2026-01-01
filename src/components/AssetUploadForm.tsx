import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
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
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';
import { createAsset, getCategoryDetails } from '@/services/asset.service';
import { AssetFormData, AssetCategory } from '@/types/asset.types';
import { Category } from '@/types/category.types';
import { ASSET_CATEGORIES, MONTHS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/utils/constants';
import { camelToTitle } from '@/utils/assetHelpers';

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

interface AssetUploadFormProps {
  onSuccess?: () => void;
}

const AssetUploadForm: React.FC<AssetUploadFormProps> = ({ onSuccess }) => {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categoryDetails, setCategoryDetails] = useState<Category | null>(null);
  const [loadingCategory, setLoadingCategory] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setError: setFormError,
    unregister,
  } = useForm<any>({
    resolver: yupResolver(yup.object().shape(baseSchema)),
    mode: 'onBlur',
  });

  const category = watch('category');

  // Load category details when category changes
  useEffect(() => {
    if (category && category !== selectedCategory) {
      setSelectedCategory(category);
      loadCategoryDetails(category);
    }
  }, [category]);

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
    if (!userData) {
      toast.error('Please sign in to upload assets');
      return;
    }

    // Validate dynamic category-specific fields
    if (categoryDetails && categoryDetails.requiredFields) {
      let hasErrors = false;
      categoryDetails.requiredFields.forEach((field) => {
        if (!data[field] || data[field].trim() === '') {
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
      // Combine date fields into AssetDate object
      const assetFormData: AssetFormData = {
        assetId: data.assetId?.trim() || undefined,
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
          assetFormData[field] = data[field];
        });
      }

      // Create asset
      await createAsset(assetFormData, userData.userId, userData.agencyName);

      // Success
      toast.success(SUCCESS_MESSAGES.ASSETS.UPLOAD);
      reset();
      setSelectedCategory('');
      setCategoryDetails(null);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      const errorMessage = err.message || ERROR_MESSAGES.ASSETS.UPLOAD_FAILED;
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

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Asset ID (Optional) */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            id="assetId"
            label="Asset ID (Optional)"
            placeholder="e.g., AE-23-001"
            helperText="Leave empty to auto-generate"
            {...register('assetId')}
            error={!!errors.assetId}
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
            defaultValue=""
            {...register('category')}
            error={!!errors.category}
            helperText={errors.category?.message as string}
          >
            <MenuItem value="" disabled>
              Select category
            </MenuItem>
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
              startAdornment: <InputAdornment position="start">₦</InputAdornment>,
            }}
            {...register('purchaseCost')}
            error={!!errors.purchaseCost}
            helperText={errors.purchaseCost?.message as string}
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
              startAdornment: <InputAdornment position="start">₦</InputAdornment>,
            }}
            {...register('marketValue')}
            error={!!errors.marketValue}
            helperText={errors.marketValue?.message as string || 'Current market worth of the asset'}
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
            defaultValue=""
            {...register('purchaseDay')}
            error={!!errors.purchaseDay}
            helperText={errors.purchaseDay?.message as string}
          >
            <MenuItem value="" disabled>
              Day
            </MenuItem>
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
            defaultValue=""
            {...register('purchaseMonth')}
            error={!!errors.purchaseMonth}
            helperText={errors.purchaseMonth?.message as string}
          >
            <MenuItem value="" disabled>
              Month
            </MenuItem>
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
            defaultValue=""
            {...register('purchaseYear')}
            error={!!errors.purchaseYear}
            helperText={errors.purchaseYear?.message as string}
          >
            <MenuItem value="" disabled>
              Year
            </MenuItem>
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
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Loading category fields...
              </Typography>
            </Box>
          </Grid>
        )}

        {categoryDetails && categoryDetails.requiredFields?.length > 0 && (
          <>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" sx={{ mt: 1 }}>
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
            sx={{ mt: 2 }}
          >
            {loading ? 'Uploading...' : 'Upload Asset'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AssetUploadForm;
