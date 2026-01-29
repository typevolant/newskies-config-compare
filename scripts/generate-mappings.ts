/**
 * Script to suggest endpoint-to-documentation mappings
 *
 * This script analyzes the documentation files and the endpoints list
 * to suggest which docs might be relevant for each endpoint.
 *
 * Run with: npx tsx scripts/generate-mappings.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface DocMetadata {
  filename: string;
  title: string;
  breadcrumbs: string[];
  keywords: string[];
}

interface Endpoint {
  path: string;
  name: string;
  category: string;
  roleRequired: boolean;
}

// Load processed metadata
const metadataPath = path.join(process.cwd(), 'public', 'docs-processed', 'metadata.json');
const metadata: DocMetadata[] = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

// Define endpoints (from src/utils/endpoints.ts)
const ROLE_BASED_ENDPOINTS: Endpoint[] = [
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

const ENVIRONMENT_ENDPOINTS: Endpoint[] = [
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

const ALL_ENDPOINTS = [...ROLE_BASED_ENDPOINTS, ...ENVIRONMENT_ENDPOINTS];

// Extract search terms from endpoint
function getEndpointSearchTerms(endpoint: Endpoint): string[] {
  const terms: string[] = [];

  // Add endpoint name words
  endpoint.name.toLowerCase().split(/\s+/).forEach(t => {
    if (t.length > 2) terms.push(t);
  });

  // Add category
  terms.push(endpoint.category.toLowerCase());

  // Extract terms from path
  const pathParts = endpoint.path.split('/').filter(p => p && !['api', 'nsk', 'v1', 'v2', 'settings'].includes(p));
  pathParts.forEach(p => {
    // Split camelCase
    const words = p.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/\s+/);
    words.forEach(w => {
      if (w.length > 2) terms.push(w);
    });
  });

  return [...new Set(terms)];
}

// Score a document against search terms
function scoreDoc(doc: DocMetadata, searchTerms: string[]): number {
  let score = 0;
  const titleLower = doc.title.toLowerCase();
  const filenameLower = doc.filename.toLowerCase();

  for (const term of searchTerms) {
    // Title match (high value)
    if (titleLower.includes(term)) {
      score += 10;
      if (titleLower.includes('setting')) score += 5;  // Bonus for settings docs
    }

    // Filename match
    if (filenameLower.includes(term)) {
      score += 5;
    }

    // Keyword match
    if (doc.keywords.some(k => k.includes(term))) {
      score += 3;
    }

    // Breadcrumb match
    if (doc.breadcrumbs.some(b => b.toLowerCase().includes(term))) {
      score += 2;
    }
  }

  return score;
}

// Find best matching docs for an endpoint
function findMatchingDocs(endpoint: Endpoint, limit: number = 5): { doc: DocMetadata; score: number }[] {
  const searchTerms = getEndpointSearchTerms(endpoint);

  const scored = metadata
    .map(doc => ({ doc, score: scoreDoc(doc, searchTerms) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

// Generate mapping suggestions
function generateSuggestions() {
  console.log('Endpoint to Documentation Mapping Suggestions');
  console.log('='.repeat(60));
  console.log('');

  for (const endpoint of ALL_ENDPOINTS) {
    console.log(`\n${endpoint.path}`);
    console.log(`  Name: ${endpoint.name}`);
    console.log(`  Category: ${endpoint.category}`);
    console.log(`  Search terms: ${getEndpointSearchTerms(endpoint).join(', ')}`);
    console.log('  Suggested docs:');

    const matches = findMatchingDocs(endpoint);
    if (matches.length === 0) {
      console.log('    (no matches found)');
    } else {
      for (const { doc, score } of matches) {
        console.log(`    [${score}] ${doc.filename}: ${doc.title}`);
      }
    }
  }
}

// Generate TypeScript mapping code
function generateMappingCode() {
  console.log('\n\n// Generated mapping suggestions (review and curate)');
  console.log('export const ENDPOINT_DOC_MAPPINGS_SUGGESTED = [');

  for (const endpoint of ALL_ENDPOINTS) {
    const matches = findMatchingDocs(endpoint, 4);
    if (matches.length > 0) {
      const primary = matches[0].doc.filename;
      const related = matches.slice(1).map(m => m.doc.filename);

      console.log('  {');
      console.log(`    endpoint: '${endpoint.path}',`);
      console.log(`    primaryDoc: '${primary}',`);
      if (related.length > 0) {
        console.log(`    relatedDocs: [${related.map(r => `'${r}'`).join(', ')}]`);
      }
      console.log('  },');
    }
  }

  console.log('];');
}

// Run
generateSuggestions();
generateMappingCode();
