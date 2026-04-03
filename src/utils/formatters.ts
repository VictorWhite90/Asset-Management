// /**
//  * Format currency in Nigerian Naira (₦)
//  */
// export const formatCurrency = (amount: number): string => {
//   if (amount == null || isNaN(amount)) return '₦0';

//   return new Intl.NumberFormat('en-NG', {
//     style: 'currency',
//     currency: 'NGN',
//     minimumFractionDigits: 0,
//     maximumFractionDigits: 0,
//   }).format(amount);
// };