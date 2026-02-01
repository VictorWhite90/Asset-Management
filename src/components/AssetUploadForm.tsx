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
import {
  ASSET_CATEGORIES,
  LAND_TITLE_TYPES,
  LAND_CONDITIONS,
  BUILDING_CONDITIONS,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES
} from '@/utils/constants';
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
  const { userData, currentUser } = useAuth();
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
      // Create asset form data with year only (day and month default to 1)
      const assetFormData: AssetFormData = {
        assetId: data.assetId?.trim() || undefined,
        description: data.description,
        category: data.category as AssetCategory,
        location: data.location,
        purchasedDate: {
          day: 1,
          month: 1,
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

      // Include land acquisition purpose for Land category
      if (data.category === 'Land' && data.landAcquisitionPurpose) {
        assetFormData.landAcquisitionPurpose = data.landAcquisitionPurpose;
      }

      // Include optional capacity for Plant/Generator category
      if (data.category === 'Plant/Generator' && data.capacity) {
        assetFormData.capacity = data.capacity;
      }

      // Create asset
      await createAsset(
        assetFormData,
        userData.userId,
        userData.agencyName,
        false,
        currentUser?.email || undefined,
        userData.role,
        userData.ministryId, // Pass ministry ID for access control
        userData.ministryType // Pass uploader's ministry type
      );

      // Success
      toast.success(SUCCESS_MESSAGES.ASSETS.UPLOAD);
      toast.info(
        `Upload sent to your ministry/department head for approval. Ensure your ${userData.agencyName} has an approver account registered.`,
        { autoClose: 8000 }
      );
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
            placeholder="Please give brief but concise description of the asset"
            multiline
            rows={2}
            {...register('description')}
            error={!!errors.description}
            helperText={errors.description?.message as string}
          />
        </Grid>

        {/* Location/Address (Required) */}
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            id="location"
            label="Location/Address"
            placeholder="e.g., Plot 123, Ikorodu, Lagos"
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
            sx={{
              '& input[type=number]': {
                MozAppearance: 'textfield',
              },
              '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
                WebkitAppearance: 'none',
                margin: 0,
              },
            }}
            {...register('purchaseCost')}
            error={!!errors.purchaseCost}
            helperText={errors.purchaseCost?.message as string}
          />
        </Grid>

        {/* Predicted/Estimated Price Value */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            id="marketValue"
            label="Predicted/Estimated Price Value"
            type="number"
            InputProps={{
              startAdornment: <InputAdornment position="start">₦</InputAdornment>,
            }}
            sx={{
              '& input[type=number]': {
                MozAppearance: 'textfield',
              },
              '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
                WebkitAppearance: 'none',
                margin: 0,
              },
            }}
            {...register('marketValue')}
            error={!!errors.marketValue}
            helperText={errors.marketValue?.message as string || 'Estimated current market value of the asset'}
          />
        </Grid>

        {/* Year Purchased */}
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            select
            id="purchaseYear"
            label="Year Purchased"
            defaultValue=""
            {...register('purchaseYear')}
            error={!!errors.purchaseYear}
            helperText={errors.purchaseYear?.message as string}
          >
            <MenuItem value="" disabled>
              Select Year
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

            {categoryDetails.requiredFields.map((field) => {
              // Custom rendering for Land Title Type
              if (field === 'landTitleType') {
                return (
                  <Grid item xs={12} sm={6} key={field}>
                    <TextField
                      required
                      fullWidth
                      select
                      id={field}
                      label="Land Title Type"
                      defaultValue=""
                      {...register(field, {
                        required: 'Land Title Type is required',
                      })}
                      error={!!errors[field]}
                      helperText={errors[field]?.message as string}
                    >
                      <MenuItem value="" disabled>
                        Select Land Title Type
                      </MenuItem>
                      {LAND_TITLE_TYPES.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                );
              }

              // Custom rendering for Condition (only for Land and Building)
              if (field === 'condition') {
                // Get appropriate conditions based on category
                let conditionOptions = LAND_CONDITIONS;
                if (category === 'Land') {
                  conditionOptions = LAND_CONDITIONS;
                } else if (category === 'Building') {
                  conditionOptions = BUILDING_CONDITIONS;
                }

                return (
                  <Grid item xs={12} sm={6} key={field}>
                    <TextField
                      required
                      fullWidth
                      select
                      id={field}
                      label="Current Condition"
                      defaultValue=""
                      {...register(field, {
                        required: 'Current Condition is required',
                      })}
                      error={!!errors[field]}
                      helperText={errors[field]?.message as string}
                    >
                      <MenuItem value="" disabled>
                        Select Condition
                      </MenuItem>
                      {conditionOptions.map((condition) => (
                        <MenuItem key={condition} value={condition}>
                          {condition}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                );
              }

              // Custom rendering for Quantity field (number input without spinners)
              if (field === 'quantity') {
                return (
                  <Grid item xs={12} sm={6} key={field}>
                    <TextField
                      required
                      fullWidth
                      id={field}
                      label="Number of Equipment"
                      type="number"
                      placeholder="e.g., 50"
                      inputProps={{ min: 1 }}
                      sx={{
                        '& input[type=number]': {
                          MozAppearance: 'textfield',
                        },
                        '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
                          WebkitAppearance: 'none',
                          margin: 0,
                        },
                      }}
                      {...register(field, {
                        required: 'Number of equipment is required',
                      })}
                      error={!!errors[field]}
                      helperText={errors[field]?.message as string || 'Total quantity of this equipment'}
                    />
                  </Grid>
                );
              }

              // Custom rendering for itemType field (category-specific placeholders)
              if (field === 'itemType') {
                let placeholder = 'e.g., Desktop Computer, Printer, Scanner';
                if (category === 'Office Equipment') {
                  placeholder = 'e.g., Desktop Computer, Printer, Scanner';
                } else if (category === 'Furniture & Fittings') {
                  placeholder = 'e.g., Office Desk, Chair, Cabinet';
                }

                return (
                  <Grid item xs={12} sm={6} key={field}>
                    <TextField
                      required
                      fullWidth
                      id={field}
                      label={category === 'Office Equipment' ? 'Equipment Type' : 'Furniture Type'}
                      placeholder={placeholder}
                      {...register(field, {
                        required: `${category === 'Office Equipment' ? 'Equipment Type' : 'Furniture Type'} is required`,
                      })}
                      error={!!errors[field]}
                      helperText={errors[field]?.message as string}
                    />
                  </Grid>
                );
              }

              // Custom rendering for equipmentType field
              if (field === 'equipmentType') {
                return (
                  <Grid item xs={12} sm={6} key={field}>
                    <TextField
                      required
                      fullWidth
                      id={field}
                      label="Generator/Plant Type"
                      placeholder="e.g., Diesel Generator, Power Plant"
                      {...register(field, {
                        required: 'Generator/Plant Type is required',
                      })}
                      error={!!errors[field]}
                      helperText={errors[field]?.message as string}
                    />
                  </Grid>
                );
              }

              // Default text field for other fields
              return (
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
              );
            })}

            {/* Add Land Acquisition Purpose field after landTitleType for Land category */}
            {category === 'Land' && (
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id="landAcquisitionPurpose"
                  label="What purpose was the land acquired for?"
                  placeholder="e.g., Construction of office complex, Agricultural use, etc."
                  multiline
                  rows={2}
                  {...register('landAcquisitionPurpose', {
                    required: 'Land acquisition purpose is required',
                  })}
                  error={!!errors.landAcquisitionPurpose}
                  helperText={errors.landAcquisitionPurpose?.message as string}
                />
              </Grid>
            )}

            {/* Add optional Capacity field for Plant/Generator category */}
            {category === 'Plant/Generator' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="capacity"
                  label="Capacity (Optional)"
                  placeholder="e.g., 500 KVA, 1000 KW"
                  {...register('capacity')}
                  error={!!errors.capacity}
                  helperText={errors.capacity?.message as string || 'Power capacity of the generator/plant'}
                />
              </Grid>
            )}
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
