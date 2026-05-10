import { Box, type SxProps, type Theme } from '@mui/material';
import type { ComponentType } from 'react';
import {
  Add as IconsaxAdd,
  ArrowLeft,
  ArrowDown2,
  ArrowForward as IconsaxArrowForward,
  ArrowSwapHorizontal,
  ArrowUp2,
  Bank,
  Box as BoxIcon,
  Building,
  Calendar,
  Category as IconsaxCategory,
  Chart2,
  ChartSquare,
  CloseCircle,
  Copy,
  Danger,
  DocumentDownload,
  DocumentText,
  DocumentUpload,
  Edit2,
  Eye,
  EyeSlash,
  FilterSearch,
  Forbidden,
  Grid2,
  HambergerMenu,
  Key,
  Lock as IconsaxLock,
  Login as IconsaxLogin,
  LogoutCurve,
  Location,
  Money,
  People as IconsaxPeople,
  Printer,
  Profile2User,
  ProfileDelete,
  Refresh2,
  Save2,
  SearchNormal1,
  Security as IconsaxSecurity,
  SecurityUser,
  Shield as IconsaxShield,
  ShieldTick,
  StatusUp,
  TableDocument,
  TaskSquare,
  TickCircle,
  TickSquare,
  Timer,
  Trash,
  TrendDown,
  TrendUp,
  Unlock,
  User,
  UserAdd,
  UserRemove,
  UserTag,
  Verify,
  Warning2,
} from 'iconsax-react';

type IconsaxBaseProps = {
  size?: string | number;
  color?: string;
  variant?: 'Linear' | 'Outline' | 'Broken' | 'Bold' | 'Bulk' | 'TwoTone';
  className?: string;
  style?: React.CSSProperties;
};

type AppIconProps = IconsaxBaseProps & {
  sx?: SxProps<Theme>;
  fontSize?: 'inherit' | 'small' | 'medium' | 'large' | number;
};

const fontSizeMap = {
  inherit: 'inherit',
  small: 20,
  medium: 24,
  large: 35,
} as const;

const createIcon = (Icon: ComponentType<IconsaxBaseProps>, defaultVariant: AppIconProps['variant'] = 'Linear') => {
  const WrappedIcon = ({ sx, fontSize, size, color = 'currentColor', variant = defaultVariant, ...props }: AppIconProps) => {
    const resolvedSize = size ?? (typeof fontSize === 'number' ? fontSize : fontSize ? fontSizeMap[fontSize] : 24);

    return (
      <Box
        component={Icon}
        size={resolvedSize}
        color={color}
        variant={variant}
        sx={{
          display: 'inline-block',
          flexShrink: 0,
          verticalAlign: 'middle',
          ...sx,
        }}
        {...props}
      />
    );
  };

  return WrappedIcon;
};

export const AccountBalance = createIcon(Bank);
export const AccountCircle = createIcon(User);
export const Add: ComponentType<AppIconProps> = createIcon(IconsaxAdd);
export const AdminPanelSettings = createIcon(SecurityUser, 'TwoTone');
export const ArrowBack = createIcon(ArrowLeft);
export const ArrowDropDown = createIcon(ArrowDown2);
export const ArrowForward = createIcon(IconsaxArrowForward);
export const AttachMoney = createIcon(Money);
export const Assessment = createIcon(Chart2);
export const Badge = createIcon(UserTag);
export const BarChart = createIcon(ChartSquare);
export const Block = createIcon(Forbidden);
export const Business = createIcon(Building);
export const CalendarToday = createIcon(Calendar);
export const Cancel = createIcon(CloseCircle);
export const Category = createIcon(IconsaxCategory);
export const CheckCircle = createIcon(TickCircle);
export const CheckCircleOutline = createIcon(TickCircle);
export const Clear = createIcon(CloseCircle);
export const CloudUpload = createIcon(DocumentUpload);
export const ContentCopy = createIcon(Copy);
export const Dashboard = createIcon(Grid2);
export const Delete = createIcon(Trash);
export const Description = createIcon(DocumentText);
export const DoneAll = createIcon(TickSquare);
export const Download = createIcon(DocumentDownload);
export const Edit = createIcon(Edit2);
export const Email = createIcon(DocumentText);
export const Error = createIcon(Danger);
export const ErrorOutline = createIcon(Danger);
export const FiberManualRecord = createIcon(TickCircle, 'Bold');
export const FilterList = createIcon(FilterSearch);
export const GppGood = createIcon(ShieldTick);
export const Groups = createIcon(Profile2User);
export const History = createIcon(Timer);
export const HourglassEmpty = createIcon(Timer);
export const Info = createIcon(IconsaxShield);
export const Inventory = createIcon(BoxIcon);
export const KeyboardArrowDown = createIcon(ArrowDown2);
export const KeyboardArrowUp = createIcon(ArrowUp2);
export const LocationOn = createIcon(Location);
export const Lock = createIcon(IconsaxLock);
export const LockOpen = createIcon(Unlock);
export const LockReset = createIcon(Key);
export const Login = createIcon(IconsaxLogin);
export const Logout = createIcon(LogoutCurve);
export const Menu = createIcon(HambergerMenu);
export const Pending = createIcon(Timer);
export const PendingActions = createIcon(Timer);
export const People = createIcon(IconsaxPeople);
export const Person = createIcon(User);
export const PersonAdd = createIcon(UserAdd);
export const PersonOff = createIcon(ProfileDelete);
export const PersonRemove = createIcon(UserRemove);
export const PictureAsPdf = createIcon(DocumentText);
export const PieChart = createIcon(Chart2);
export const Print = createIcon(Printer);
export const RateReview = createIcon(DocumentText);
export const Refresh = createIcon(Refresh2);
export const Save = createIcon(Save2);
export const Schedule = createIcon(Timer);
export const Search = createIcon(SearchNormal1);
export const Security = createIcon(IconsaxSecurity);
export const Shield = createIcon(IconsaxShield);
export const ShowChart = createIcon(TrendUp);
export const SwapHoriz = createIcon(ArrowSwapHorizontal);
export const TableChart = createIcon(TableDocument);
export const Timeline = createIcon(Timer);
export const TrendingDown = createIcon(TrendDown);
export const TrendingUp = createIcon(StatusUp);
export const Upload = createIcon(DocumentUpload);
export const UploadFile = createIcon(DocumentUpload);
export const Verified = createIcon(Verify);
export const VerifiedUser = createIcon(ShieldTick);
export const ViewList = createIcon(TaskSquare);
export const ViewModule = createIcon(Grid2);
export const Visibility = createIcon(Eye);
export const VisibilityOff = createIcon(EyeSlash);
export const VpnKey = createIcon(Key);
export const Warning = createIcon(Warning2);

