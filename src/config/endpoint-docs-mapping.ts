// Mapping between API endpoints and their documentation
export interface EndpointDocMapping {
  endpoint: string;           // API path
  primaryDoc: string;         // Main doc filename
  relatedDocs?: string[];     // Additional relevant docs
}

export const ENDPOINT_DOC_MAPPINGS: EndpointDocMapping[] = [
  // Role-based Booking endpoints
  {
    endpoint: '/api/nsk/v1/settings/booking',
    primaryDoc: 'BookingSettings.html',
    relatedDocs: ['GlobalInterlineBookingSettings.html', 'About_System_Settings.html']
  },
  {
    endpoint: '/api/nsk/v1/settings/booking/checkin',
    primaryDoc: 'DepartureControlSettings.html',
    relatedDocs: ['SkyPort_Settings.html', 'About_DCS_Status.html']
  },
  {
    endpoint: '/api/nsk/v1/settings/booking/contact',
    primaryDoc: 'BookingSettings.html',
    relatedDocs: ['NotificationSettings.html']
  },
  {
    endpoint: '/api/nsk/v1/settings/booking/customerAccount',
    primaryDoc: 'About_Customer_Programs.html',
    relatedDocs: ['customerprogramsettings.html', 'CustomerProgramLevelSettings.html']
  },
  {
    endpoint: '/api/nsk/v1/settings/booking/fee',
    primaryDoc: 'feetaxsettings.html',
    relatedDocs: ['feeTaxSettingsSkyManager.html', 'aboutfeetaxmanager.html', 'About_Fee_Zones.html']
  },
  {
    endpoint: '/api/nsk/v1/settings/booking/flightSearch',
    primaryDoc: 'BookingSettings.html',
    relatedDocs: ['About_Flight_Queues.html']
  },
  {
    endpoint: '/api/nsk/v1/settings/booking/passenger',
    primaryDoc: 'BookingSettings.html',
    relatedDocs: ['reseatingpassengersdialog.html']
  },
  {
    endpoint: '/api/nsk/v2/settings/booking/payment',
    primaryDoc: 'paymentsettings.html',
    relatedDocs: ['paymentsettingsparameters.html', 'paymentsystemsettings.html', 'SkyPaySettings.html']
  },
  {
    endpoint: '/api/nsk/v1/settings/booking/paymentCodes',
    primaryDoc: 'paymentsettings.html',
    relatedDocs: ['Configuring_Payment_Types.html', 'about_payment_types.html']
  },
  {
    endpoint: '/api/nsk/v1/settings/booking/reserveFlights',
    primaryDoc: 'BookingSettings.html',
    relatedDocs: ['Booking_Reserve_Flights_Role.html']
  },

  // Role-based General endpoints
  {
    endpoint: '/api/nsk/v1/settings/general/applicationLogon',
    primaryDoc: 'SessionSettings.html',
    relatedDocs: ['About_System_Settings.html']
  },
  {
    endpoint: '/api/nsk/v1/settings/general/codes',
    primaryDoc: 'about_codes.html',
    relatedDocs: ['Codes_Role_Setting_Types.html', 'Codes_Agent_Setting_Types.html']
  },
  {
    endpoint: '/api/nsk/v1/settings/general/operations',
    primaryDoc: 'System_Configuration_Operations_Role.html',
    relatedDocs: ['About_System_Settings.html']
  },
  {
    endpoint: '/api/nsk/v1/settings/general/session',
    primaryDoc: 'SessionSettings.html',
    relatedDocs: ['About_System_Settings.html']
  },

  // Role-based Services endpoints
  {
    endpoint: '/api/nsk/v1/settings/serviceBundles',
    primaryDoc: 'serviceBundleFees.html',
    relatedDocs: ['aboutfeetaxmanager.html']
  },
  {
    endpoint: '/api/nsk/v2/settings/skySpeed',
    primaryDoc: 'skyspeedsettings.html',
    relatedDocs: []
  },

  // Role-based System endpoints
  {
    endpoint: '/api/nsk/v1/settings/system/general',
    primaryDoc: 'About_System_Settings.html',
    relatedDocs: ['SkyManager_System_Settings_Role.html']
  },
  {
    endpoint: '/api/nsk/v1/settings/systemConfiguration/finance',
    primaryDoc: 'CommissionSettings.html',
    relatedDocs: ['About_Booking_Commissions.html', 'multicurrencysettings.html']
  },

  // Environment-wide endpoints
  {
    endpoint: '/api/nsk/v1/settings/booking/general',
    primaryDoc: 'BookingSettings.html',
    relatedDocs: ['GlobalInterlineBookingSettings.html']
  },
  {
    endpoint: '/api/nsk/v1/settings/customerPrograms',
    primaryDoc: 'About_Customer_Programs.html',
    relatedDocs: ['customerprogramsettings.html', 'CustomerProgramLevelSettings.html']
  },
  {
    endpoint: '/api/nsk/v1/settings/eTickets',
    primaryDoc: 'EMDsettings.html',
    relatedDocs: ['ATPCOsettings.html']
  },
  {
    endpoint: '/api/nsk/v1/settings/externalMessageControls',
    primaryDoc: 'ExternalMessageSettings.html',
    relatedDocs: ['About_External_Message_Settings.html']
  },
  {
    endpoint: '/api/nsk/v1/settings/general/organization',
    primaryDoc: 'about_organizations.html',
    relatedDocs: ['About_System_Settings.html']
  },
  {
    endpoint: '/api/nsk/v1/settings/itinerary',
    primaryDoc: 'Itinerary_Settings.html',
    relatedDocs: []
  },
  {
    endpoint: '/api/nsk/v1/settings/loyalty',
    primaryDoc: 'LoyaltySettings.html',
    relatedDocs: ['About_Customer_Programs.html']
  },
  {
    endpoint: '/api/nsk/v1/settings/notifications/general',
    primaryDoc: 'NotificationSettings.html',
    relatedDocs: ['TravelerNotificationSettingsView.html', 'DeliveryMethodSettingsDialog.html']
  },
  {
    endpoint: '/api/nsk/v1/settings/payment',
    primaryDoc: 'paymentsettings.html',
    relatedDocs: ['paymentsettingsparameters.html', 'paymentsystemsettings.html']
  },
  {
    endpoint: '/api/nsk/v1/settings/phoneNumberValidation',
    primaryDoc: 'NumberValidationSettings.html',
    relatedDocs: []
  },
  {
    endpoint: '/api/nsk/v2/settings/premiumServices',
    primaryDoc: 'feetaxsettings.html',
    relatedDocs: ['servicefees.html']
  },
  {
    endpoint: '/api/nsk/v1/settings/travelerNotification',
    primaryDoc: 'TravelerNotificationSettingsView.html',
    relatedDocs: ['NotificationSettings.html', 'DeliveryMethodSettingsDialog.html']
  },
  {
    endpoint: '/api/nsk/v1/settings/user/agencyCreation',
    primaryDoc: 'about_agents.html',
    relatedDocs: ['searching_for_agents.html']
  },
  {
    endpoint: '/api/nsk/v1/settings/user/customerCreation',
    primaryDoc: 'About_Customer_Programs.html',
    relatedDocs: ['guestrecognitionsettings.html']
  }
];

// Helper function to get mapping for an endpoint
export function getEndpointDocMapping(endpoint: string): EndpointDocMapping | undefined {
  return ENDPOINT_DOC_MAPPINGS.find(m => m.endpoint === endpoint);
}

// Helper function to get all docs for an endpoint (primary + related)
export function getAllDocsForEndpoint(endpoint: string): string[] {
  const mapping = getEndpointDocMapping(endpoint);
  if (!mapping) return [];

  const docs = [mapping.primaryDoc];
  if (mapping.relatedDocs) {
    docs.push(...mapping.relatedDocs);
  }
  return docs;
}
