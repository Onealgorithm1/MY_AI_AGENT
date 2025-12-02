/**
 * Calendar and Communication Integration Utilities
 */

/**
 * Generate Google Calendar URL for an event
 * @param {Object} event - Event details
 * @param {string} event.title - Event title
 * @param {string} event.description - Event description
 * @param {Date|string} event.startDate - Start date/time
 * @param {Date|string} event.endDate - End date/time (optional)
 * @param {string} event.location - Location (optional)
 * @returns {string} Google Calendar URL
 */
export const generateGoogleCalendarUrl = (event) => {
  const { title, description, startDate, endDate, location } = event;

  // Format dates for Google Calendar (YYYYMMDDTHHMMSSZ)
  const formatDate = (date) => {
    const d = new Date(date);
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const start = formatDate(startDate);
  // Default end date to 1 hour after start if not provided
  const end = endDate ? formatDate(endDate) : formatDate(new Date(new Date(startDate).getTime() + 60 * 60 * 1000));

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'Event',
    details: description || '',
    dates: `${start}/${end}`,
  });

  if (location) {
    params.append('location', location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * Generate .ics file content for calendar download
 * @param {Object} event - Event details
 * @returns {string} ICS file content
 */
export const generateICSFile = (event) => {
  const { title, description, startDate, endDate, location } = event;

  const formatICSDate = (date) => {
    const d = new Date(date);
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const start = formatICSDate(startDate);
  const end = endDate ? formatICSDate(endDate) : formatICSDate(new Date(new Date(startDate).getTime() + 60 * 60 * 1000));

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//GovCon Platform//EN
BEGIN:VEVENT
DTSTART:${start}
DTEND:${end}
SUMMARY:${title || 'Event'}
DESCRIPTION:${description || ''}
LOCATION:${location || ''}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;

  return icsContent;
};

/**
 * Download .ics calendar file
 * @param {Object} event - Event details
 */
export const downloadCalendarFile = (event) => {
  const icsContent = generateICSFile(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${(event.title || 'event').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Open Google Calendar to add event
 * @param {Object} event - Event details
 */
export const addToGoogleCalendar = (event) => {
  const url = generateGoogleCalendarUrl(event);
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Show calendar options menu (Google Calendar or Download ICS)
 * @param {Object} event - Event details
 * @returns {Promise<string>} Selected option ('google', 'download', or 'cancel')
 */
export const showCalendarOptions = async (event) => {
  return new Promise((resolve) => {
    // For now, just open Google Calendar directly
    // In a production app, you might show a menu with options
    resolve('google');
  });
};

/**
 * Open email client with pre-filled email
 * @param {string} email - Email address
 * @param {string} subject - Email subject (optional)
 * @param {string} body - Email body (optional)
 */
export const openEmailClient = (email, subject = '', body = '') => {
  if (!email) return;

  // Check if user prefers Gmail (you can add a preference setting)
  const useGmail = true; // Default to Gmail for better UX

  if (useGmail) {
    // Open in Gmail
    const params = new URLSearchParams();
    params.append('to', email);
    if (subject) params.append('su', subject);
    if (body) params.append('body', body);
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&${params.toString()}`, '_blank', 'noopener,noreferrer');
  } else {
    // Use default mailto
    const mailtoUrl = `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}${body ? `${subject ? '&' : '?'}body=${encodeURIComponent(body)}` : ''}`;
    window.location.href = mailtoUrl;
  }
};

/**
 * Open phone dialer (mobile) or copy number (desktop)
 * @param {string} phone - Phone number
 * @returns {Promise<boolean>} Success status
 */
export const initiatePhoneCall = async (phone) => {
  if (!phone) return false;

  // Clean phone number
  const cleanPhone = phone.replace(/[^0-9+]/g, '');

  // Check if mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    // On mobile, use tel: protocol
    window.location.href = `tel:${cleanPhone}`;
    return true;
  } else {
    // On desktop, try to use Google Voice or copy to clipboard
    try {
      await navigator.clipboard.writeText(cleanPhone);

      // Try to open Google Voice
      const useGoogleVoice = true; // Can be a preference
      if (useGoogleVoice) {
        window.open(`https://voice.google.com/u/0/calls?a=nc,${encodeURIComponent(cleanPhone)}`, '_blank', 'noopener,noreferrer');
      }

      return true;
    } catch (error) {
      console.error('Failed to copy phone number:', error);
      // Fallback: try tel: protocol anyway
      window.location.href = `tel:${cleanPhone}`;
      return false;
    }
  }
};

/**
 * Format phone number for display
 * @param {string} phone - Raw phone number
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';

  // Clean the number
  const cleaned = phone.replace(/[^0-9+]/g, '');

  // Format US numbers as (XXX) XXX-XXXX
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  // Return as-is if not a standard format
  return phone;
};

/**
 * Extract email from text
 * @param {string} text - Text that may contain email
 * @returns {string|null} Extracted email or null
 */
export const extractEmail = (text) => {
  if (!text) return null;
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
  const match = text.match(emailRegex);
  return match ? match[1] : null;
};

/**
 * Extract phone number from text
 * @param {string} text - Text that may contain phone number
 * @returns {string|null} Extracted phone or null
 */
export const extractPhone = (text) => {
  if (!text) return null;
  const phoneRegex = /(\+?1?\s*\(?[0-9]{3}\)?[\s.-]?[0-9]{3}[\s.-]?[0-9]{4})/;
  const match = text.match(phoneRegex);
  return match ? match[1] : null;
};

/**
 * Check if browser supports calendar APIs
 * @returns {boolean} Support status
 */
export const supportsCalendarAPI = () => {
  return typeof navigator !== 'undefined' && 'clipboard' in navigator;
};

export default {
  generateGoogleCalendarUrl,
  generateICSFile,
  downloadCalendarFile,
  addToGoogleCalendar,
  showCalendarOptions,
  openEmailClient,
  initiatePhoneCall,
  formatPhoneNumber,
  extractEmail,
  extractPhone,
  supportsCalendarAPI,
};
