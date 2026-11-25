/**
 * Format date based on locale ('ar' -> 'ar-EG', 'en' -> 'en-US')
 */
export const formatDate = (date, lang = 'ar', options = {}) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };

  return new Intl.DateTimeFormat(locale, defaultOptions).format(d);
};

/**
 * Format date with time
 */
export const formatDateTime = (date, lang = 'ar') => {
  return formatDate(date, lang, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format numbers according to locale ('ar' -> 'ar-EG', 'en' -> 'en-US')
 */
export const formatNumber = (number, lang = 'ar') => {
  if (number === null || number === undefined || number === '') return '';
  const num = Number(number);
  if (isNaN(num)) return number;
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
  return new Intl.NumberFormat(locale).format(num);
};

/**
 * Format percentage
 */
export const formatPercentage = (percent, lang = 'ar') => {
  if (percent === null || percent === undefined || percent === '') return '0%';
  const num = Number(percent);
  if (isNaN(num)) return `${percent}%`;
  return `${formatNumber(num, lang)}%`;
};
