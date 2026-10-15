// The city plan. Four districts, one building per RoadNa screen, all in an original,
// Jordanian-inspired neighbourhood. Coordinates are world units (x east, z south).

export const BOARD = { hx: 33, hz: 25, radius: 4.5 };
export const RING = { hx: 25, hz: 17, radius: 5 };
export const ROAD = { half: 1.7, lane: 0.85, walk: 1.1 };

export const DISTRICTS = {
  public: { id: 'public', name: 'Public Square', short: 'Public', color: '#4f9a6b', tint: '#e3f1e6', icon: 'map', blurb: 'Open to every visitor: the city map, community reports and the visitor centre.' },
  resident: { id: 'resident', name: 'Resident Quarter', short: 'Residents', color: '#e0862f', tint: '#fbecd9', icon: 'home', blurb: 'Where neighbours report problems and follow every fix.' },
  municipal: { id: 'municipal', name: 'Municipal District', short: 'Municipality', color: '#087f80', tint: '#d9f0ec', icon: 'columns', blurb: 'City Hall and the teams that triage, dispatch and repair.' },
  civic: { id: 'civic', name: 'Civic Services', short: 'Accounts', color: '#4f78a8', tint: '#e2eaf4', icon: 'idcard', blurb: 'Your account: sign in, register and recover access.' },
};

// front: direction the main facade faces (s, e, n, w). Footprints are [x0, z0, x1, z1].
export const PLACES = [
  // Public Square (south-east)
  { id: 'visitor', screen: 'landing-page', district: 'public', name: 'Visitor Centre', page: 'Landing page', icon: 'info', front: 's', box: [17.4, 9.7, 21.8, 13.7], floors: 2, desc: 'Start here. The RoadNa JO story and the front door of the city.' },
  { id: 'map', screen: 'public-guest-menu', district: 'public', name: 'Map Centre', page: 'Public report map', icon: 'map', front: 'e', box: [16.9, 3.4, 20.5, 8.2], floors: 2, desc: 'Every public report on one live-looking map. Filter by type and status.' },
  { id: 'community', screen: 'report-details', district: 'public', name: 'Community Centre', page: 'Report details', icon: 'megaphone', front: 's', box: [9.8, 9.4, 15.0, 12.6], floors: 2, desc: 'A single report up close: photos, timeline, votes and crew notes.' },
  // Resident Quarter (south-west)
  { id: 'apartments', screen: 'profile', district: 'resident', name: 'Yasmeen Apartments', page: 'Profile and settings', icon: 'user', front: 's', box: [-21.8, 8.9, -16.4, 13.8], floors: 4, desc: 'Your apartment and your account: profile, language and notification settings.' },
  { id: 'home', screen: 'home-menu', district: 'resident', name: 'Resident Home', page: 'Resident dashboard', icon: 'home', front: 's', box: [-14.6, 9.7, -10.4, 12.9], floors: 2, desc: 'Your neighbourhood at a glance: open reports, nearby issues and quick actions.' },
  { id: 'archive', screen: 'my-reports', district: 'resident', name: 'Reports Archive', page: 'My reports', icon: 'folder', front: 's', box: [-7.8, 9.2, -3.2, 13.8], floors: 3, desc: 'Every report you have filed, with its current status.' },
  { id: 'bell', screen: 'notifications', district: 'resident', name: 'Bell Tower', page: 'Notifications', icon: 'bell', front: 'n', box: [-21.6, 3.3, -18.2, 6.7], floors: 4, desc: 'Updates ring out here: assignments, repairs and replies.' },
  { id: 'kiosk', screen: 'create-report', district: 'resident', name: 'Report Kiosk', page: 'Create report', icon: 'plus', front: 'n', box: [-16.4, 3.3, -11.8, 6.4], floors: 1, desc: 'Spot it, snap it, pin it. The report form with photo and location.' },
  { id: 'dropbox', screen: 'report-submitted', district: 'resident', name: 'Drop Office', page: 'Report submitted', icon: 'parcel', front: 'n', box: [-9.4, 3.3, -4.6, 6.5], floors: 2, desc: 'Your report is in. Confirmation, reference number and next steps.' },
  // Municipal District (north-east)
  { id: 'hall', screen: 'admin-dashboard', district: 'municipal', name: 'City Hall', page: 'Admin dashboard', icon: 'columns', front: 's', box: [8.4, -13.9, 16.6, -8.6], floors: 3, desc: 'The operations overview for municipal teams: incidents, crews and service levels.' },
  { id: 'triage', screen: 'admin-incident-triage', district: 'municipal', name: 'Review Centre', page: 'Review and assign', icon: 'alert', front: 'e', box: [17.8, -13.9, 22.0, -9.1], floors: 3, desc: 'New reports are reviewed, merged and prioritised here.' },
  { id: 'depot', screen: 'admin-ops-map', district: 'municipal', name: 'Crew Depot', page: 'Operations map', icon: 'truck', front: 's', box: [17.4, -7.9, 22.0, -3.3], floors: 1, desc: 'Crews and vehicles roll out from here. See crews and follow them.' },
  { id: 'clock', screen: 'admin-sla-orders', district: 'municipal', name: 'Clock Tower', page: 'SLA and work orders', icon: 'clock', front: 's', box: [3.3, -6.7, 6.5, -3.4], floors: 2, desc: 'Every work order against the clock. Service-level targets and deadlines.' },
  { id: 'observatory', screen: 'admin-heatmap', district: 'municipal', name: 'Data Observatory', page: 'Incident heatmap', icon: 'heat', front: 's', box: [3.2, -13.4, 7.4, -9.0], floors: 2, desc: 'Where problems cluster. Density, forecasts and district hotspots.' },
  // Civic Services (north-west)
  { id: 'idcenter', screen: 'login', district: 'civic', name: 'Civic ID Centre', page: 'Login', icon: 'idcard', front: 's', box: [-8.4, -8.0, -3.2, -3.9], floors: 3, desc: 'Sign in as a resident, or preview the admin console.' },
  { id: 'welcome', screen: 'register', district: 'civic', name: 'Welcome Office', page: 'Register', icon: 'userplus', front: 's', box: [-14.6, -7.0, -9.8, -3.3], floors: 2, desc: 'New to the city? Create a resident account.' },
  { id: 'post', screen: 'check-email', district: 'civic', name: 'Post Office', page: 'Check email', icon: 'mail', front: 's', box: [-21.8, -7.4, -16.2, -3.3], floors: 2, desc: 'A letter is on its way. The check-your-email step.' },
  { id: 'lostfound', screen: 'forgot-password', district: 'civic', name: 'Lost & Found', page: 'Forgot password', icon: 'question', front: 's', box: [-21.8, -13.9, -17.4, -9.6], floors: 2, desc: 'Lost your password? Start the recovery here.' },
  { id: 'locksmith', screen: 'reset-password', district: 'civic', name: 'Locksmith', page: 'Reset password', icon: 'key', front: 's', box: [-16.0, -13.9, -11.6, -9.8], floors: 2, desc: 'Cut a new key: choose a new password.' },
  { id: 'vault', screen: 'password-updated', district: 'civic', name: 'Secure Vault', page: 'Password updated', icon: 'shield', front: 's', box: [-10.2, -13.9, -3.4, -9.6], floors: 2, desc: 'All set. Your new password is safely stored.' },
];

export const placeHref = (place) => `../${place.screen}/index.html`;
export const placeById = (id) => PLACES.find((p) => p.id === id);

// Key street features shared by the world builder, the story and the simulation.
export const SPOTS = {
  storyPothole: { x: 15.0, z: 0.85 },
  depotDoors: [{ x: 18.65, z: -3.3 }, { x: 20.75, z: -3.3 }],
  hallPlaza: { x: 12.5, z: -5.4 },
  parking: { x0: 9.8, x1: 16.6, z0: 3.1, z1: 8.4, entryX: 16.05, aisleZ: 4.35, spots: [10.5, 11.9, 13.3, 14.7], spotZ: 6.95 },
  park: { x0: 3.0, x1: 9.1, z0: 8.6, z1: 14.0 },
  cafe: { x: 5.6, z: 5.3 },
};

export const STREETS = {
  'C-E': 'Al-Zaytoun Avenue', 'C-W': 'Al-Zaytoun Avenue', 'C-N': 'Al-Yasmeen Street', 'C-S': 'Al-Yasmeen Street',
  'E-NE': 'East Ring Road', 'NE-N': 'North Ring Road', 'N-NW': 'North Ring Road', 'NW-W': 'West Ring Road',
  'W-SW': 'West Ring Road', 'SW-S': 'South Ring Road', 'S-SE': 'South Ring Road', 'SE-E': 'East Ring Road',
};
