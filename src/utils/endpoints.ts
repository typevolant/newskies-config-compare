import type { SettingsEndpoint } from '../types';

// Role-based settings endpoints (require RoleCode parameter)
export const ROLE_BASED_ENDPOINTS: SettingsEndpoint[] = [
  { path: '/api/nsk/v1/settings/booking', name: 'Booking', category: 'Booking', roleRequired: true },
  { path: '/api/nsk/v1/settings/booking/checkin', name: 'Check-in', category: 'Booking', roleRequired: true },
  { path: '/api/nsk/v1/settings/booking/contact', name: 'Contact', category: 'Booking', roleRequired: true },
  { path: '/api/nsk/v1/settings/booking/customerAccount', name: 'Customer Account', category: 'Booking', roleRequired: true },
  { path: '/api/nsk/v1/settings/booking/fee', name: 'Fee', category: 'Booking', roleRequired: true },
  { path: '/api/nsk/v1/settings/booking/flightSearch', name: 'Flight Search', category: 'Booking', roleRequired: true },
  { path: '/api/nsk/v1/settings/booking/passenger', name: 'Passenger', category: 'Booking', roleRequired: true },
  { path: '/api/nsk/v2/settings/booking/payment', name: 'Payment', category: 'Booking', roleRequired: true },
  { path: '/api/nsk/v1/settings/booking/paymentCodes', name: 'Payment Codes', category: 'Booking', roleRequired: true },
  { path: '/api/nsk/v1/settings/booking/reserveFlights', name: 'Reserve Flights', category: 'Booking', roleRequired: true },
  { path: '/api/nsk/v1/settings/general/applicationLogon', name: 'Application Logon', category: 'General', roleRequired: true },
  { path: '/api/nsk/v1/settings/general/codes', name: 'Codes', category: 'General', roleRequired: true },
  { path: '/api/nsk/v1/settings/general/operations', name: 'Operations', category: 'General', roleRequired: true },
  { path: '/api/nsk/v1/settings/general/session', name: 'Session', category: 'General', roleRequired: true },
  { path: '/api/nsk/v1/settings/serviceBundles', name: 'Service Bundles', category: 'Services', roleRequired: true },
  { path: '/api/nsk/v2/settings/skySpeed', name: 'SkySpeed', category: 'Services', roleRequired: true },
  { path: '/api/nsk/v1/settings/system/general', name: 'System General', category: 'System', roleRequired: true },
  { path: '/api/nsk/v1/settings/systemConfiguration/finance', name: 'Finance', category: 'System', roleRequired: true },
];

// Environment-wide settings endpoints (no RoleCode needed)
export const ENVIRONMENT_ENDPOINTS: SettingsEndpoint[] = [
  { path: '/api/nsk/v1/settings/booking/general', name: 'Booking General', category: 'Booking', roleRequired: false },
  { path: '/api/nsk/v1/settings/customerPrograms', name: 'Customer Programs', category: 'Customer', roleRequired: false },
  { path: '/api/nsk/v1/settings/eTickets', name: 'E-Tickets', category: 'Tickets', roleRequired: false },
  { path: '/api/nsk/v1/settings/externalMessageControls', name: 'External Message Controls', category: 'Messaging', roleRequired: false },
  { path: '/api/nsk/v1/settings/general/organization', name: 'Organization', category: 'General', roleRequired: false },
  { path: '/api/nsk/v1/settings/itinerary', name: 'Itinerary', category: 'Booking', roleRequired: false },
  { path: '/api/nsk/v1/settings/loyalty', name: 'Loyalty', category: 'Customer', roleRequired: false },
  { path: '/api/nsk/v1/settings/notifications/general', name: 'Notifications', category: 'Messaging', roleRequired: false },
  { path: '/api/nsk/v1/settings/payment', name: 'Payment', category: 'Payment', roleRequired: false },
  { path: '/api/nsk/v1/settings/phoneNumberValidation', name: 'Phone Validation', category: 'Validation', roleRequired: false },
  { path: '/api/nsk/v2/settings/premiumServices', name: 'Premium Services', category: 'Services', roleRequired: false },
  { path: '/api/nsk/v1/settings/travelerNotification', name: 'Traveler Notification', category: 'Messaging', roleRequired: false },
  { path: '/api/nsk/v1/settings/user/agencyCreation', name: 'Agency Creation', category: 'User', roleRequired: false },
  { path: '/api/nsk/v1/settings/user/customerCreation', name: 'Customer Creation', category: 'User', roleRequired: false },
];

// All endpoints combined
export const ALL_ENDPOINTS = [...ROLE_BASED_ENDPOINTS, ...ENVIRONMENT_ENDPOINTS];

// Build full URL for an endpoint
export function buildEndpointUrl(baseUrl: string, endpoint: SettingsEndpoint, roleCode?: string): string {
  const url = `${baseUrl}${endpoint.path}`;
  if (endpoint.roleRequired && roleCode) {
    return `${url}?RoleCode=${encodeURIComponent(roleCode)}`;
  }
  return url;
}

// Group endpoints by category
export function getEndpointsByCategory(endpoints: SettingsEndpoint[]): Record<string, SettingsEndpoint[]> {
  return endpoints.reduce((acc, endpoint) => {
    if (!acc[endpoint.category]) {
      acc[endpoint.category] = [];
    }
    acc[endpoint.category].push(endpoint);
    return acc;
  }, {} as Record<string, SettingsEndpoint[]>);
}
