const state = {
  user: null,
  rewards: [],
  payments: [],
  bookings: [],
  searchHistory: [],
  activeSearchSessionId: '',
  activeSearchMessages: [],
  route: 'discover',
  selectedPreferences: new Set(),
  selectedFlightId: null,
  lastSearchResults: [],
  lastParsedSearch: null,
  trendingDestination: null,
  adminStats: null,
  pricingConfig: null,
  twoFactorSetup: null,
  searchInProgress: false,
  profileSaveInProgress: false,
  paymentMethod: 'card',
  voice: {
    supported: false,
    listening: false,
    recognition: null,
    stopTimer: null,
    requestedStop: false,
    transcriptBuffer: '',
    autoSent: false
  }
};

const preferenceOptions = [
  'Eco',
  'Premium eco',
  'Business',
  'First',
  'Aisle',
  'Explore',
  'Window',
  'Non-refundable',
  'Flex',
  'Full flex'
];

const routes = {
  discover: document.getElementById('routeDiscover'),
  search: document.getElementById('routeSearch'),
  searchHistory: document.getElementById('routeSearchHistory'),
  personalization: document.getElementById('routePersonalization'),
  payment: document.getElementById('routePayment'),
  bookings: document.getElementById('routeBookings'),
  admin: document.getElementById('routeAdmin')
};

const el = {
  publicArea: document.getElementById('publicArea'),
  appArea: document.getElementById('appArea'),
  goToAuthBtn: document.getElementById('goToAuthBtn'),
  heroGetStartedBtn: document.getElementById('heroGetStartedBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  adminNavBtn: document.getElementById('adminNavBtn'),
  sideNav: document.getElementById('sideNav'),
  loginForm: document.getElementById('loginForm'),
  signupForm: document.getElementById('signupForm'),
  oauthGoogleBtn: document.getElementById('oauthGoogleBtn'),
  oauthAppleBtn: document.getElementById('oauthAppleBtn'),
  oauthMessage: document.getElementById('oauthMessage'),
  rewardForm: document.getElementById('rewardForm'),
  profileForm: document.getElementById('profileForm'),
  paymentForm: document.getElementById('paymentForm'),
  paymentMethodPicker: document.getElementById('paymentMethodPicker'),
  paymentMethodInput: document.getElementById('paymentMethodInput'),
  cardFields: document.getElementById('cardFields'),
  paypalFields: document.getElementById('paypalFields'),
  applePayFields: document.getElementById('applePayFields'),
  paymentSubmitBtn: document.getElementById('paymentSubmitBtn'),
  settingsForm: document.getElementById('settingsForm'),
  aiSearchForm: document.getElementById('aiSearchForm'),
  aiMessageInput: document.getElementById('aiMessageInput'),
  newSearchSessionBtn: document.getElementById('newSearchSessionBtn'),
  voiceBtn: document.getElementById('voiceBtn'),
  loginMessage: document.getElementById('loginMessage'),
  signupMessage: document.getElementById('signupMessage'),
  personalizationMessage: document.getElementById('personalizationMessage'),
  paymentMessage: document.getElementById('paymentMessage'),
  settingsMessage: document.getElementById('settingsMessage'),
  searchMessage: document.getElementById('searchMessage'),
  discoverName: document.getElementById('discoverName'),
  discoverGrid: document.getElementById('discoverGrid'),
  discoverRecoTitle: document.getElementById('discoverRecoTitle'),
  discoverRecoText: document.getElementById('discoverRecoText'),
  discoverRecoMeta: document.getElementById('discoverRecoMeta'),
  discoverRecoBtn: document.getElementById('discoverRecoBtn'),
  rewardCards: document.getElementById('rewardCards'),
  paymentList: document.getElementById('paymentList'),
  preferenceChips: document.getElementById('preferenceChips'),
  chatFeed: document.getElementById('chatFeed'),
  historyList: document.getElementById('historyList'),
  historyDetail: document.getElementById('historyDetail'),
  bookingsList: document.getElementById('bookingsList'),
  twoFactorStatus: document.getElementById('twoFactorStatus'),
  twoFactorSetupBtn: document.getElementById('twoFactorSetupBtn'),
  twoFactorSetupPanel: document.getElementById('twoFactorSetupPanel'),
  twoFactorSecretKey: document.getElementById('twoFactorSecretKey'),
  twoFactorQrImage: document.getElementById('twoFactorQrImage'),
  twoFactorEnableCode: document.getElementById('twoFactorEnableCode'),
  twoFactorEnableBtn: document.getElementById('twoFactorEnableBtn'),
  twoFactorSetupCancelBtn: document.getElementById('twoFactorSetupCancelBtn'),
  twoFactorDisablePanel: document.getElementById('twoFactorDisablePanel'),
  twoFactorDisableCode: document.getElementById('twoFactorDisableCode'),
  twoFactorDisableBtn: document.getElementById('twoFactorDisableBtn'),
  twoFactorMessage: document.getElementById('twoFactorMessage'),
  adminKpis: document.getElementById('adminKpis'),
  adminStripeKpis: document.getElementById('adminStripeKpis'),
  adminStripeStatus: document.getElementById('adminStripeStatus'),
  adminRouteStats: document.getElementById('adminRouteStats'),
  adminFfpStats: document.getElementById('adminFfpStats'),
  adminPricingForm: document.getElementById('adminPricingForm'),
  adminFeeEconomyInput: document.getElementById('adminFeeEconomyInput'),
  adminFeePremiumEconomyInput: document.getElementById('adminFeePremiumEconomyInput'),
  adminFeeBusinessInput: document.getElementById('adminFeeBusinessInput'),
  adminFeeFirstInput: document.getElementById('adminFeeFirstInput'),
  adminPricingMessage: document.getElementById('adminPricingMessage')
};

function setRequiredForSection(section, enabled) {
  if (!section) return;
  section.querySelectorAll('input').forEach(input => {
    if (enabled) {
      if (input.dataset.wasRequired === 'true') {
        input.required = true;
      }
      return;
    }
    if (input.required) {
      input.dataset.wasRequired = 'true';
    }
    input.required = false;
  });
}

function setPaymentMethod(method) {
  const next = ['card', 'paypal', 'apple_pay'].includes(method) ? method : 'card';
  state.paymentMethod = next;
  if (el.paymentMethodInput) {
    el.paymentMethodInput.value = next;
  }

  if (el.paymentMethodPicker) {
    el.paymentMethodPicker.querySelectorAll('button[data-pay-method]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.payMethod === next);
    });
  }

  el.cardFields.classList.toggle('hidden', next !== 'card');
  el.paypalFields.classList.toggle('hidden', next !== 'paypal');
  el.applePayFields.classList.toggle('hidden', next !== 'apple_pay');

  setRequiredForSection(el.cardFields, next === 'card');
  setRequiredForSection(el.paypalFields, next === 'paypal');
  setRequiredForSection(el.applePayFields, next === 'apple_pay');

  const paypalEmailInput = el.paypalFields?.querySelector('input[name="paypalEmail"]');
  const paypalPasswordInput = el.paypalFields?.querySelector('input[name="paypalPassword"]');
  const appleEmailInput = el.applePayFields?.querySelector('input[name="applePayEmail"]');
  const applePasswordInput = el.applePayFields?.querySelector('input[name="applePayPassword"]');
  if (paypalEmailInput) {
    paypalEmailInput.required = next === 'paypal';
  }
  if (paypalPasswordInput) {
    paypalPasswordInput.required = next === 'paypal';
  }
  if (appleEmailInput) {
    appleEmailInput.required = next === 'apple_pay';
  }
  if (applePasswordInput) {
    applePasswordInput.required = next === 'apple_pay';
  }

  if (el.paymentSubmitBtn) {
    el.paymentSubmitBtn.textContent = next === 'card'
      ? 'Save payment method'
      : (next === 'paypal' ? 'Connect PayPal' : 'Connect Apple Pay');
  }
}

function showFeedback(node, text, isError = false) {
  node.textContent = text;
  node.classList.toggle('error', isError);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Request failed');
  }
  return payload;
}

function setRoute(route) {
  const isAdmin = state.user?.role === 'admin';
  if (route === 'admin' && !isAdmin) {
    route = 'discover';
  }
  if (isAdmin && route !== 'admin') {
    route = 'admin';
  }
  state.route = route;
  Object.entries(routes).forEach(([key, panel]) => {
    panel.classList.toggle('active', key === route);
  });

  [...el.sideNav.querySelectorAll('button[data-route]')].forEach(btn => {
    btn.classList.toggle('active', btn.dataset.route === route);
  });
}

function renderShell() {
  const loggedIn = Boolean(state.user);
  const isAdmin = state.user?.role === 'admin';
  el.publicArea.classList.toggle('hidden', loggedIn);
  el.appArea.classList.toggle('hidden', !loggedIn);
  el.goToAuthBtn.classList.toggle('hidden', loggedIn);
  el.logoutBtn.classList.toggle('hidden', !loggedIn);
  if (el.adminNavBtn) {
    el.adminNavBtn.classList.toggle('hidden', !isAdmin);
  }
  if (el.sideNav) {
    el.sideNav.querySelectorAll('button[data-route]').forEach(btn => {
      const route = btn.dataset.route;
      if (!route) return;
      if (isAdmin) {
        btn.classList.toggle('hidden', route !== 'admin');
      } else {
        btn.classList.toggle('hidden', route === 'admin');
      }
    });
  }
  if (!isAdmin && state.route === 'admin') {
    setRoute('discover');
    return;
  }
  if (isAdmin && state.route !== 'admin') {
    setRoute('admin');
  }
}

function renderDiscoverRecommendation() {
  const hasRewards = Array.isArray(state.rewards) && state.rewards.length > 0;
  el.discoverGrid.classList.toggle('discover-grid-unlocked', hasRewards);

  if (!hasRewards) {
    el.discoverRecoTitle.textContent = 'Recommendation';
    el.discoverRecoText.textContent = 'Add your frequent flyer details to unlock smarter suggestions.';
    el.discoverRecoMeta.textContent = '';
    el.discoverRecoBtn.textContent = 'Add';
    return;
  }

  const trending = state.trendingDestination;
  el.discoverRecoTitle.textContent = 'Trending Destination Of The Day';
  if (trending) {
    el.discoverRecoText.textContent = `${trending.toName} (${trending.to}) is trending today from ${trending.fromName} (${trending.from}).`;
    el.discoverRecoMeta.textContent = trending.sample
      ? `${trending.searches} searches today. Sample flight: ${trending.sample.airline} ${trending.sample.flightNumber}, ${trending.sample.cabin}, ${trending.sample.cashPrice} ${trending.sample.currency}.`
      : `${trending.searches} searches today.`;
  } else {
    el.discoverRecoText.textContent = 'Your profile is ready. We are collecting today’s trend data.';
    el.discoverRecoMeta.textContent = '';
  }
  el.discoverRecoBtn.textContent = 'Search this route';
}

function formatMoney(amount) {
  const value = Number(amount || 0);
  return `${value.toFixed(2)} EUR`;
}

function renderAdminBars(target, items, labelKey) {
  if (!target) return;
  target.innerHTML = '';
  if (!Array.isArray(items) || !items.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-block';
    empty.textContent = 'No data yet.';
    target.appendChild(empty);
    return;
  }

  const maxValue = Math.max(...items.map(item => Number(item.count || 0)), 1);
  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'admin-bar-row';
    const width = Math.max(8, Math.round((Number(item.count || 0) / maxValue) * 100));
    row.innerHTML = `
      <div class="admin-bar-head"><strong>${item[labelKey]}</strong><span>${item.count}</span></div>
      <div class="admin-bar-track"><div class="admin-bar-fill" style="width:${width}%"></div></div>
    `;
    target.appendChild(row);
  }
}

function renderAdminDashboard() {
  if (!el.adminKpis || !state.adminStats) return;
  const stats = state.adminStats;
  const stripe = stats.stripe || {};
  el.adminKpis.innerHTML = `
    <article class="admin-kpi"><p>Registered users</p><strong>${stats.usersCount || 0}</strong></article>
    <article class="admin-kpi"><p>Searches</p><strong>${stats.searchCount || 0}</strong></article>
    <article class="admin-kpi"><p>Number of bookings</p><strong>${stats.bookingsCount || 0}</strong></article>
    <article class="admin-kpi"><p>Total Sales Amount</p><strong>${formatMoney(stats.totalSalesAmount)}</strong></article>
    <article class="admin-kpi"><p>Total amount collected</p><strong>${formatMoney(stats.totalAmountCollected)}</strong></article>
    <article class="admin-kpi"><p>Total amount paid to Duffel</p><strong>${formatMoney(stats.totalAmountPaidToDuffel)}</strong></article>
    <article class="admin-kpi"><p>Fee earned</p><strong>${formatMoney(stats.totalFeeAmount)}</strong></article>
  `;

  if (el.adminStripeKpis) {
    el.adminStripeKpis.innerHTML = `
      <article class="admin-kpi"><p>Authorized</p><strong>${stripe.authorizedCount || 0}</strong></article>
      <article class="admin-kpi"><p>Captured</p><strong>${stripe.capturedCount || 0}</strong></article>
      <article class="admin-kpi"><p>Pending capture</p><strong>${stripe.pendingCaptureCount || 0}</strong></article>
      <article class="admin-kpi"><p>Capture failed</p><strong>${stripe.captureFailedCount || 0}</strong></article>
      <article class="admin-kpi"><p>Authorized amount</p><strong>${formatMoney(stripe.authorizedAmount)}</strong></article>
      <article class="admin-kpi"><p>Captured amount</p><strong>${formatMoney(stripe.capturedAmount)}</strong></article>
      <article class="admin-kpi"><p>Live authorizations</p><strong>${stripe.authorizedLiveCount || 0}</strong></article>
      <article class="admin-kpi"><p>Mock authorizations</p><strong>${stripe.authorizedMockCount || 0}</strong></article>
    `;
  }

  renderAdminBars(el.adminStripeStatus, stripe.statusBreakdown || [], 'stage');
  renderAdminBars(el.adminRouteStats, stats.topRoutes || [], 'route');
  renderAdminBars(el.adminFfpStats, stats.frequentFlyerPrograms || [], 'program');

  const feeByCabin = stats.pricing?.feeByCabin || state.pricingConfig?.feeByCabin || {};
  if (el.adminFeeEconomyInput) {
    el.adminFeeEconomyInput.value = String(Number(feeByCabin.economy ?? 0));
  }
  if (el.adminFeePremiumEconomyInput) {
    el.adminFeePremiumEconomyInput.value = String(Number(feeByCabin.premium_economy ?? 0));
  }
  if (el.adminFeeBusinessInput) {
    el.adminFeeBusinessInput.value = String(Number(feeByCabin.business ?? 0));
  }
  if (el.adminFeeFirstInput) {
    el.adminFeeFirstInput.value = String(Number(feeByCabin.first ?? 0));
  }
}

function setVoiceIdle(message = '') {
  state.voice.listening = false;
  state.voice.requestedStop = false;
  if (state.voice.stopTimer) {
    clearTimeout(state.voice.stopTimer);
    state.voice.stopTimer = null;
  }
  el.voiceBtn.classList.remove('recording');
  el.voiceBtn.textContent = 'Mic';
  if (message) {
    showFeedback(el.searchMessage, message);
  } else {
    showFeedback(el.searchMessage, '');
  }
}

function stopVoiceRecognition() {
  if (!state.voice.recognition) return;
  state.voice.requestedStop = true;
  showFeedback(el.searchMessage, 'Processing voice...');

  try {
    state.voice.recognition.stop();
  } catch {
    // noop: recognition may already be stopped internally
  }

  // Chrome occasionally misses onend; force release the mic state.
  state.voice.stopTimer = setTimeout(() => {
    if (state.voice.listening) {
      try {
        state.voice.recognition.abort();
      } catch {
        // noop
      }
      const fallbackText = (state.voice.transcriptBuffer || el.aiMessageInput.value || '').trim();
      setVoiceIdle('');
      triggerVoiceSearchIfPossible(fallbackText);
    }
  }, 2500);
}

function triggerVoiceSearchIfPossible(text) {
  const capturedText = String(text || '').trim();
  if (!capturedText || state.voice.autoSent) {
    return false;
  }
  state.voice.autoSent = true;
  el.aiMessageInput.value = capturedText;
  showFeedback(el.searchMessage, 'Voice captured. Sending search...');
  void runAiSearch(capturedText);
  return true;
}

function initVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    el.voiceBtn.disabled = true;
    el.voiceBtn.title = 'Voice input is not supported in this browser.';
    el.voiceBtn.textContent = 'Mic off';
    state.voice.supported = false;
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    if (state.voice.stopTimer) {
      clearTimeout(state.voice.stopTimer);
      state.voice.stopTimer = null;
    }
    state.voice.listening = true;
    state.voice.transcriptBuffer = '';
    state.voice.autoSent = false;
    el.voiceBtn.classList.add('recording');
    el.voiceBtn.textContent = 'Stop';
    showFeedback(el.searchMessage, 'Listening...');
  };

  recognition.onresult = event => {
    const transcript = Array.from(event.results)
      .map(result => result[0].transcript)
      .join(' ')
      .trim();

    state.voice.transcriptBuffer = transcript;
    el.aiMessageInput.value = transcript;
  };

  recognition.onerror = event => {
    setVoiceIdle();
    showFeedback(el.searchMessage, `Voice error: ${event.error}`, true);
  };

  recognition.onend = () => {
    const wasRequestedStop = state.voice.requestedStop;
    const capturedText = (state.voice.transcriptBuffer || el.aiMessageInput.value || '').trim();
    setVoiceIdle();
    const sent = triggerVoiceSearchIfPossible(capturedText);
    if (!sent && wasRequestedStop) {
      showFeedback(el.searchMessage, 'No speech detected. Please try again.', true);
    }
    state.voice.transcriptBuffer = '';
  };

  state.voice.supported = true;
  state.voice.recognition = recognition;
}

async function createSearchSession() {
  const data = await api('/api/search-history', {
    method: 'POST',
    body: JSON.stringify({ title: 'AI Search' })
  });
  state.activeSearchSessionId = data.session.id;
  state.activeSearchMessages = [];
  await refreshSearchHistory();
  return data.session.id;
}

async function ensureSearchSession() {
  if (state.activeSearchSessionId) return state.activeSearchSessionId;
  return createSearchSession();
}

async function persistActiveSearchSession() {
  if (!state.activeSearchSessionId) return;
  await api(`/api/search-history/${state.activeSearchSessionId}`, {
    method: 'PUT',
    body: JSON.stringify({
      messages: state.activeSearchMessages,
      latestResults: state.lastSearchResults,
      selectedFlightId: state.selectedFlightId || ''
    })
  });
}

function renderChatFeedFromMessages() {
  el.chatFeed.innerHTML = '';
  for (const message of state.activeSearchMessages) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${message.role === 'user' ? 'chat-user' : 'chat-assistant'}`;
    bubble.textContent = message.text;
    el.chatFeed.appendChild(bubble);
  }
  el.chatFeed.scrollTop = el.chatFeed.scrollHeight;
}

function addChatMessage(role, text, persist = true) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role === 'user' ? 'chat-user' : 'chat-assistant'}`;
  bubble.textContent = text;
  el.chatFeed.appendChild(bubble);
  el.chatFeed.scrollTop = el.chatFeed.scrollHeight;

  if (persist && state.activeSearchSessionId) {
    state.activeSearchMessages.push({
      role,
      text,
      createdAt: new Date().toISOString()
    });
    void persistActiveSearchSession()
      .then(() => refreshSearchHistory())
      .catch(() => {});
  }
}

function airlineLogoUrl(airlineName = '', flightNumber = '') {
  const known = {
    lufthansa: 'LH',
    emirates: 'EK',
    'air france': 'AF',
    klm: 'KL',
    'british airways': 'BA',
    'virgin atlantic': 'VS',
    'fly dubai': 'FZ',
    united: 'UA',
    delta: 'DL',
    american: 'AA',
    qatar: 'QR',
    singapore: 'SQ',
    ana: 'NH'
  };

  const cleanName = String(airlineName || '').toLowerCase().trim();
  let code = known[cleanName] || '';

  if (!code) {
    const flightCode = String(flightNumber || '').trim().toUpperCase().match(/^([A-Z0-9]{2})/);
    if (flightCode) code = flightCode[1];
  }

  if (!code) return '';
  return `https://images.kiwi.com/airlines/64/${code}.png`;
}

function airlineLogoHtml(airlineName = 'Airline', flightNumber = 'Flight', className = 'airline-logo') {
  const safeName = String(airlineName || 'Airline').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeFlight = String(flightNumber || 'Flight').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const logo = airlineLogoUrl(safeName, safeFlight);
  return logo
    ? `<img class="${className}" src="${logo}" alt="${safeName} logo" onerror="this.style.display='none'" />`
    : '';
}

function airlineLabelHtml(airlineName = 'Airline', flightNumber = 'Flight') {
  const safeName = String(airlineName || 'Airline').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeFlight = String(flightNumber || 'Flight').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const logoHtml = airlineLogoHtml(safeName, safeFlight);
  return `<strong class="airline-line">${logoHtml}<span>${safeName} ${safeFlight}</span></strong>`;
}

function formatFlightDateLabel(dateValue) {
  const raw = String(dateValue || '').trim();
  if (!raw) return '';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(parsed);
}

function formatMilesLabel(pointsValue) {
  const points = Number(pointsValue || 0);
  if (!Number.isFinite(points) || points <= 0) return '';
  return `${Math.round(points).toLocaleString()} miles`;
}

function createFlightLegElement({
  legType = 'Departing',
  travelDate = '',
  airlineName = 'Airline',
  flightNumber = 'Flight',
  depTime = '--:--',
  arrTime = '--:--',
  from = '---',
  to = '---'
}) {
  const leg = document.createElement('div');
  leg.className = 'flight-leg-head';

  const logo = document.createElement('div');
  logo.className = 'airline-logo-slot';
  logo.innerHTML = airlineLogoHtml(airlineName, flightNumber, 'airline-logo leg-logo');

  const body = document.createElement('div');
  body.className = 'flight-leg-body';

  const meta = document.createElement('div');
  meta.className = 'flight-leg-meta';

  const type = document.createElement('span');
  type.className = 'flight-leg-type';
  type.textContent = legType;

  const date = document.createElement('span');
  date.className = 'flight-leg-date';
  date.textContent = formatFlightDateLabel(travelDate);

  meta.append(type);
  if (date.textContent) {
    meta.append(date);
  }

  const top = document.createElement('div');
  top.className = 'flight-top';

  const airlineLine = document.createElement('strong');
  airlineLine.className = 'airline-line';
  const airlineText = document.createElement('span');
  airlineText.textContent = `${airlineName} ${flightNumber}`;
  airlineLine.appendChild(airlineText);

  const timeLine = document.createElement('span');
  timeLine.textContent = `${depTime} - ${arrTime}`;

  top.append(airlineLine, timeLine);

  const route = document.createElement('h5');
  route.className = 'flight-route';
  route.textContent = `${from} - ${to}`;

  body.append(meta, top, route);
  leg.append(logo, body);
  return leg;
}

function detectBookingIntent(message) {
  const text = String(message || '').toLowerCase().trim();
  return /\b(book|buy|purchase|checkout|reserve|confirm)\b/.test(text);
}

function getSelectedFlightForBooking() {
  if (!state.lastSearchResults.length) {
    return null;
  }
  if (state.selectedFlightId) {
    return state.lastSearchResults.find(f => f.id === state.selectedFlightId) || null;
  }
  return state.lastSearchResults[0] || null;
}

async function runAiSearch(message) {
  const trimmed = String(message || '').trim();
  if (!trimmed || state.searchInProgress) {
    return;
  }

  if (detectBookingIntent(trimmed)) {
    const selectedFlight = getSelectedFlightForBooking();
    addChatMessage('user', trimmed);
    if (!selectedFlight) {
      addChatMessage('assistant', 'No selected flight yet. Please search and select an offer first.');
      showFeedback(el.searchMessage, 'Select a flight first before booking.', true);
      return;
    }

    try {
      await buyFlight(selectedFlight);
      setRoute('bookings');
      showFeedback(el.searchMessage, '');
    } catch (error) {
      addChatMessage('assistant', error.message);
      showFeedback(el.searchMessage, error.message, true);
    }
    return;
  }

  await ensureSearchSession();
  state.searchInProgress = true;
  showFeedback(el.searchMessage, '');
  addChatMessage('user', trimmed);
  el.aiMessageInput.value = '';

  try {
    const data = await api('/api/flights/ai-search', {
      method: 'POST',
      body: JSON.stringify({
        message: trimmed,
        preferences: Array.isArray(state.user?.preferences) ? state.user.preferences : [],
        context: state.lastParsedSearch || {}
      })
    });

    addChatMessage('assistant', `${data.agent.provider === 'ota_crawler' ? 'OTA agent' : 'Duffel agent'}: ${data.agent.note}`);
    addChatMessage('assistant', data.reply || 'I found options.');
    state.lastParsedSearch = data.parsed || state.lastParsedSearch;
    if (data.warning) {
      addChatMessage('assistant', data.warning);
    }
    renderFlightChoices(data.results || []);
    try {
      await persistActiveSearchSession();
      await refreshSearchHistory();
    } catch {
      // Keep the search UX responsive even if history persistence fails.
    }
    showFeedback(el.searchMessage, '');
  } catch (error) {
    addChatMessage('assistant', error.message);
    showFeedback(el.searchMessage, error.message, true);
  } finally {
    state.searchInProgress = false;
  }
}

async function buyFlight(flight) {
  const primary = state.payments.find(p => p.primary);
  const payload = {
    flightId: flight.id,
    offerId: flight.offerId || '',
    flight,
    paymentId: primary ? primary.id : ''
  };

  const data = await api('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  await refreshBookings();
  const refText = data.booking.bookingReference ? ` Duffel reference: ${data.booking.bookingReference}.` : '';
  const paymentLabel = data.booking.payment.displayLabel || data.booking.payment.last4Masked || data.booking.payment.methodLabel || '';
  addChatMessage('assistant', `Booking confirmed: ${data.booking.flight.airline} ${data.booking.flight.flightNumber}. Paid with ${data.booking.payment.brand}${paymentLabel ? ` ${paymentLabel}` : ''}.${refText}`);
  return data;
}

function renderFlightChoices(results) {
  state.lastSearchResults = Array.isArray(results) ? results : [];
  const wrap = document.createElement('div');
  wrap.className = 'chat-cards';

  if (!results.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-block';
    empty.textContent = 'No flights found for this request.';
    wrap.appendChild(empty);
    el.chatFeed.appendChild(wrap);
    return;
  }

  for (const flight of results) {
    const card = document.createElement('article');
    card.className = 'flight-card';
    if (state.selectedFlightId === flight.id) {
      card.classList.add('selected');
    }

    const outboundLeg = createFlightLegElement({
      legType: 'Departing',
      travelDate: flight.outboundDate || flight.date,
      airlineName: flight.outboundAirline || flight.airline,
      flightNumber: flight.outboundFlightNumber || flight.flightNumber,
      depTime: flight.depTime || '--:--',
      arrTime: flight.arrTime || '--:--',
      from: flight.outboundFrom || flight.from,
      to: flight.outboundTo || flight.to
    });

    card.append(outboundLeg);

    if (flight.roundTrip || flight.returnDate) {
      const combinedAirlineParts = String(flight.airline || '').split('/').map(v => v.trim()).filter(Boolean);
      const combinedFlightParts = String(flight.flightNumber || '').split('+').map(v => v.trim()).filter(Boolean);
      const returnAirlineName = flight.returnAirline || combinedAirlineParts[1] || combinedAirlineParts[0] || 'Return flight';
      const returnFlightNo = flight.returnFlightNumber || combinedFlightParts[1] || combinedFlightParts[0] || 'Flight';

      const divider = document.createElement('div');
      divider.className = 'leg-divider';

      const returnLeg = createFlightLegElement({
        legType: 'Returning',
        travelDate: flight.returnDate,
        airlineName: returnAirlineName,
        flightNumber: returnFlightNo,
        depTime: flight.returnDepTime || '--:--',
        arrTime: flight.returnArrTime || '--:--',
        from: flight.returnFrom || flight.to,
        to: flight.returnTo || flight.from
      });
      card.append(divider, returnLeg);
    }

    const price = document.createElement('div');
    price.className = 'flight-price';
    const fareLabel = flight.roundTrip || flight.returnDate ? 'Total round-trip fare' : 'One-way fare';
    const milesLabel = formatMilesLabel(flight.pointsRequired);
    price.innerHTML = `<strong>${fareLabel}: ${flight.cashPrice} ${flight.currency || 'EUR'}</strong>${milesLabel ? `<span class="flight-miles">${milesLabel}</span>` : ''}`;

    const actions = document.createElement('div');
    actions.className = 'flight-actions';

    const selectBtn = document.createElement('button');
    selectBtn.type = 'button';
    selectBtn.className = 'ghost-btn compact';
    selectBtn.textContent = state.selectedFlightId === flight.id ? 'Selected' : 'Select';
    selectBtn.addEventListener('click', () => {
      state.selectedFlightId = flight.id;
      renderFlightChoices(results);
      const selected = state.lastSearchResults.find(item => item.id === flight.id);
      if (selected) {
        addChatMessage('assistant', `Selected ${selected.outboundAirline || selected.airline} ${selected.outboundFlightNumber || selected.flightNumber}. Click Buy now or say "book selected flight".`);
        showFeedback(el.searchMessage, 'Flight selected. Ready to book.');
      }
    });

    const buyBtn = document.createElement('button');
    buyBtn.type = 'button';
    buyBtn.className = 'primary-btn compact';
    buyBtn.textContent = 'Buy now';
    buyBtn.addEventListener('click', async () => {
      try {
        await buyFlight(flight);
        setRoute('bookings');
      } catch (error) {
        showFeedback(el.searchMessage, error.message, true);
      }
    });

    actions.append(selectBtn, buyBtn);

    const footer = document.createElement('div');
    footer.className = 'flight-offer-footer';
    footer.append(actions, price);

    card.append(footer);
    wrap.appendChild(card);
  }

  const existing = el.chatFeed.querySelector('.chat-cards');
  if (existing) existing.remove();
  el.chatFeed.appendChild(wrap);
  el.chatFeed.scrollTop = el.chatFeed.scrollHeight;
}

function renderPreferenceChips() {
  el.preferenceChips.innerHTML = '';
  for (const pref of preferenceOptions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.textContent = pref;
    if (state.selectedPreferences.has(pref)) {
      button.classList.add('selected');
    }
    button.addEventListener('click', () => {
      if (state.selectedPreferences.has(pref)) {
        state.selectedPreferences.delete(pref);
      } else {
        state.selectedPreferences.add(pref);
      }
      renderPreferenceChips();
    });
    el.preferenceChips.appendChild(button);
  }
}

function renderRewardCards() {
  el.rewardCards.innerHTML = '';

  if (!state.rewards.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-block';
    empty.textContent = 'No frequent flyer program yet. Add one below.';
    el.rewardCards.appendChild(empty);
    return;
  }

  for (const reward of state.rewards) {
    const card = document.createElement('article');
    card.className = 'reward-card';
    const isMilesAndMore = reward.programName === 'Miles & More';
    const isAnaMileageClub = reward.programName === 'ANA Mileage Club';
    if (isMilesAndMore) {
      card.classList.add('reward-card-miles-more');
    }
    if (isAnaMileageClub) {
      card.classList.add('reward-card-ana');
    }
    const points = Number(reward.points || 0);
    const milesText = Number.isFinite(points) && points > 0
      ? `${points.toLocaleString()} miles`
      : (isMilesAndMore ? '150,000 miles' : (isAnaMileageClub ? '1,000,000 miles' : '0 miles'));
    const tierText = reward.tier || (isMilesAndMore ? 'Senator' : (isAnaMileageClub ? 'Diamond' : 'Tier pending'));
    card.innerHTML = `
      <div class="reward-card-head">
        <span class="reward-program">${reward.programName}</span>
        <span class="reward-chip">${tierText}</span>
      </div>
      <div class="reward-card-foot">
        <span class="reward-miles">${milesText}</span>
      </div>
    `;

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'tiny-btn danger';
    del.textContent = 'Delete';
    del.addEventListener('click', async () => {
      await api(`/api/rewards/${reward.id}`, { method: 'DELETE' });
      await refreshRewards();
    });

    card.appendChild(del);
    el.rewardCards.appendChild(card);
  }
}

function renderPayments() {
  el.paymentList.innerHTML = '';

  if (!state.payments.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-block';
    empty.textContent = 'No payment method yet. Add one from the payment page.';
    el.paymentList.appendChild(empty);
    return;
  }

  for (const payment of state.payments) {
    const row = document.createElement('article');
    row.className = 'payment-card';

    const info = document.createElement('div');
    const paymentSubtitle = payment.displayLabel || payment.last4Masked || payment.methodLabel || 'Connected';
    info.innerHTML = `<strong>${payment.brand}${payment.primary ? ' <span class="badge">Primary</span>' : ''}</strong><p>${paymentSubtitle}</p>`;

    const actions = document.createElement('div');
    actions.className = 'payment-actions';

    if (!payment.primary) {
      const makePrimary = document.createElement('button');
      makePrimary.type = 'button';
      makePrimary.className = 'tiny-btn';
      makePrimary.textContent = 'Set primary';
      makePrimary.addEventListener('click', async () => {
        await api(`/api/payments/${payment.id}/primary`, { method: 'PUT' });
        await refreshPayments();
      });
      actions.appendChild(makePrimary);
    }

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'tiny-btn danger';
    remove.textContent = 'Delete';
    remove.addEventListener('click', async () => {
      await api(`/api/payments/${payment.id}`, { method: 'DELETE' });
      await refreshPayments();
    });

    actions.appendChild(remove);
    row.append(info, actions);
    el.paymentList.appendChild(row);
  }
}

function renderBookings() {
  el.bookingsList.innerHTML = '';
  if (!state.bookings.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-block';
    empty.textContent = 'No bookings yet. Use AI Search and click Buy now on a flight result.';
    el.bookingsList.appendChild(empty);
    return;
  }

  for (const booking of state.bookings) {
    const card = document.createElement('article');
    card.className = 'flight-card';
    const referencePart = booking.bookingReference ? ` | Ref ${booking.bookingReference}` : '';
    const ticketPart = Array.isArray(booking.ticketNumbers) && booking.ticketNumbers.length
      ? ` | Ticket ${booking.ticketNumbers.join(', ')}`
      : '';
    const outboundAirline = booking.flight.outboundAirline || booking.flight.airline || 'Airline';
    const outboundFlight = booking.flight.outboundFlightNumber || booking.flight.flightNumber || 'Flight';
    const outboundFrom = booking.flight.outboundFrom || booking.flight.from || '';
    const outboundTo = booking.flight.outboundTo || booking.flight.to || '';
    const hasReturn = Boolean(booking.flight.returnDate || booking.flight.roundTrip);
    const returnAirline = booking.flight.returnAirline || '';
    const returnFlight = booking.flight.returnFlightNumber || '';
    const returnFrom = booking.flight.returnFrom || booking.flight.to || '';
    const returnTo = booking.flight.returnTo || booking.flight.from || '';
    const outboundDate = booking.flight.date || '';
    const returnDate = booking.flight.returnDate || '';
    const bookingDate = new Date(booking.createdAt).toLocaleDateString();

    card.innerHTML = `
      <div class="flight-top">${airlineLabelHtml(outboundAirline, outboundFlight)}<span>Booking date: ${bookingDate}</span></div>
      <h5>${outboundFrom} - ${outboundTo}</h5>
      ${outboundDate ? `<p>Departure date: ${outboundDate}</p>` : ''}
      ${hasReturn ? `
      <div class="leg-divider"></div>
      <p class="leg-label">Return flight</p>
      <div class="flight-top">${airlineLabelHtml(returnAirline || 'Airline', returnFlight || 'Flight')}</div>
      <h5>${returnFrom} - ${returnTo}</h5>
      ${returnDate ? `<p>Departure date: ${returnDate}</p>` : ''}
      ` : ''}
      <p>Status: ${booking.status}${referencePart}${ticketPart} | Paid with ${booking.payment.brand}${(booking.payment.displayLabel || booking.payment.last4Masked || booking.payment.methodLabel) ? ` ${booking.payment.displayLabel || booking.payment.last4Masked || booking.payment.methodLabel}` : ''}</p>
      <div class="flight-price"><strong>${booking.totalAmount} ${booking.flight.currency || 'EUR'}</strong></div>
    `;
    el.bookingsList.appendChild(card);
  }
}

function hydrateFormsFromUser() {
  if (!state.user) return;

  el.discoverName.textContent = `Hi, ${state.user.firstName || state.user.name || 'Traveler'}`;

  const profile = el.profileForm;
  profile.firstName.value = state.user.firstName || '';
  profile.middleName.value = state.user.middleName || '';
  profile.title.value = state.user.title || '';
  profile.gender.value = state.user.gender || '';
  profile.lastName.value = state.user.lastName || '';
  profile.address.value = state.user.address || '';
  profile.bornOn.value = state.user.bornOn || '';
  profile.passportNumber.value = state.user.passportNumber || '';
  profile.passportExpiry.value = state.user.passportExpiry || '';
  profile.passportCountry.value = state.user.passportCountry || '';
  profile.homeAirport.value = state.user.homeAirport || '';

  const settings = el.settingsForm;
  settings.language.value = state.user.language || 'English';
  settings.email.value = state.user.email || '';
  settings.phone.value = state.user.phone || '';

  state.selectedPreferences = new Set(Array.isArray(state.user.preferences) ? state.user.preferences : []);
  renderPreferenceChips();
  renderTwoFactorSection();
}

function renderTwoFactorSection() {
  if (!el.twoFactorStatus) return;
  const enabled = Boolean(state.user?.twoFactorEnabled);
  const hasSetup = Boolean(state.twoFactorSetup?.secret);
  const setupPending = Boolean(state.user?.twoFactorSetupPending);

  el.twoFactorStatus.textContent = enabled
    ? 'Two-factor authentication is enabled.'
    : (setupPending
      ? 'Setup started. Enter a valid code to finish activation.'
      : 'Two-factor authentication is disabled.');

  if (el.twoFactorSetupBtn) {
    el.twoFactorSetupBtn.classList.toggle('hidden', enabled);
  }
  if (el.twoFactorSetupPanel) {
    el.twoFactorSetupPanel.classList.toggle('hidden', enabled || !hasSetup);
  }
  if (el.twoFactorDisablePanel) {
    el.twoFactorDisablePanel.classList.toggle('hidden', !enabled);
  }
  if (el.twoFactorSecretKey) {
    el.twoFactorSecretKey.textContent = hasSetup ? state.twoFactorSetup.secret : '';
  }
  if (el.twoFactorQrImage) {
    const qrSrc = hasSetup ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(state.twoFactorSetup.otpauthUrl)}` : '';
    if (qrSrc) {
      el.twoFactorQrImage.src = qrSrc;
    } else {
      el.twoFactorQrImage.removeAttribute('src');
    }
    el.twoFactorQrImage.classList.toggle('hidden', !hasSetup);
  }
}

async function refreshUser() {
  const data = await api('/api/me');
  state.user = data.user;
  hydrateFormsFromUser();
}

async function refreshRewards() {
  const data = await api('/api/rewards');
  state.rewards = data.rewards || [];
  renderRewardCards();
  renderDiscoverRecommendation();
}

async function refreshPayments() {
  const data = await api('/api/payments');
  state.payments = data.payments || [];
  renderPayments();
}

async function refreshBookings() {
  const data = await api('/api/bookings');
  state.bookings = data.bookings || [];
  renderBookings();
}

async function refreshTrendingDestination() {
  const data = await api('/api/discover/trending');
  state.trendingDestination = data.trending || null;
  renderDiscoverRecommendation();
}

async function refreshAdminData() {
  if (state.user?.role !== 'admin') {
    state.adminStats = null;
    state.pricingConfig = null;
    if (el.adminKpis) el.adminKpis.innerHTML = '';
    if (el.adminStripeKpis) el.adminStripeKpis.innerHTML = '';
    if (el.adminStripeStatus) el.adminStripeStatus.innerHTML = '';
    if (el.adminRouteStats) el.adminRouteStats.innerHTML = '';
    if (el.adminFfpStats) el.adminFfpStats.innerHTML = '';
    return;
  }

  const [statsData, pricingData] = await Promise.all([
    api('/api/admin/stats'),
    api('/api/admin/pricing-config')
  ]);
  state.adminStats = statsData.stats || null;
  state.pricingConfig = pricingData.pricing || null;
  renderAdminDashboard();
}

function formatHistoryDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

function renderSearchHistoryDetail(session) {
  if (!session) {
    el.historyDetail.innerHTML = '<div class="empty-block">Select a search session to view the full discussion.</div>';
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'history-thread';

  const title = document.createElement('div');
  title.className = 'history-thread-head';
  title.innerHTML = `<strong>${session.title || 'AI Search'}</strong><span>${formatHistoryDate(session.updatedAt || session.createdAt)}</span>`;
  wrap.appendChild(title);

  const feed = document.createElement('div');
  feed.className = 'history-thread-feed';

  const messages = Array.isArray(session.messages) ? session.messages : [];
  if (!messages.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-block';
    empty.textContent = 'No messages in this search yet.';
    feed.appendChild(empty);
  } else {
    for (const message of messages) {
      const bubble = document.createElement('div');
      bubble.className = `chat-bubble ${message.role === 'user' ? 'chat-user' : 'chat-assistant'}`;
      bubble.textContent = message.text;
      feed.appendChild(bubble);
    }
  }

  wrap.appendChild(feed);

  const results = Array.isArray(session.latestResults) ? session.latestResults : [];
  const resultsWrap = document.createElement('div');
  resultsWrap.className = 'history-results';

  const resultsTitle = document.createElement('h4');
  resultsTitle.textContent = 'Duffel results';
  resultsWrap.appendChild(resultsTitle);

  if (!results.length) {
    const emptyResults = document.createElement('div');
    emptyResults.className = 'empty-block';
    emptyResults.textContent = 'No stored search results in this session.';
    resultsWrap.appendChild(emptyResults);
  } else {
    for (const flight of results) {
      const card = document.createElement('article');
      card.className = 'flight-card';
      if (session.selectedFlightId && session.selectedFlightId === flight.id) {
        card.classList.add('selected');
      }

      const outboundLeg = createFlightLegElement({
        legType: 'Departing',
        travelDate: flight.outboundDate || flight.date,
        airlineName: flight.outboundAirline || flight.airline,
        flightNumber: flight.outboundFlightNumber || flight.flightNumber,
        depTime: flight.depTime || '--:--',
        arrTime: flight.arrTime || '--:--',
        from: flight.outboundFrom || flight.from,
        to: flight.outboundTo || flight.to
      });
      card.append(outboundLeg);

      if (flight.roundTrip || flight.returnDate) {
        const divider = document.createElement('div');
        divider.className = 'leg-divider';

        const returnLeg = createFlightLegElement({
          legType: 'Returning',
          travelDate: flight.returnDate,
          airlineName: flight.returnAirline || 'Airline',
          flightNumber: flight.returnFlightNumber || 'Flight',
          depTime: flight.returnDepTime || '--:--',
          arrTime: flight.returnArrTime || '--:--',
          from: flight.returnFrom || flight.to,
          to: flight.returnTo || flight.from
        });
        card.append(divider, returnLeg);
      }

      const price = document.createElement('div');
      price.className = 'flight-price';
      const milesLabel = formatMilesLabel(flight.pointsRequired);
      price.innerHTML = `<strong>${flight.cashPrice} ${flight.currency || 'EUR'}</strong>${milesLabel ? `<span class="flight-miles">${milesLabel}</span>` : ''}`;
      card.append(price);

      resultsWrap.appendChild(card);
    }
  }

  wrap.appendChild(resultsWrap);
  el.historyDetail.innerHTML = '';
  el.historyDetail.appendChild(wrap);
}

async function openSearchSession(sessionId, switchToSearch = false) {
  const data = await api(`/api/search-history/${sessionId}`);
  const session = data.session;
  state.activeSearchSessionId = session.id;
  state.activeSearchMessages = Array.isArray(session.messages) ? session.messages : [];
  state.lastSearchResults = Array.isArray(session.latestResults) ? session.latestResults : [];
  state.selectedFlightId = session.selectedFlightId || null;
  renderChatFeedFromMessages();
  if (state.lastSearchResults.length) {
    renderFlightChoices(state.lastSearchResults);
  }
  renderSearchHistoryList();
  renderSearchHistoryDetail(session);
  if (switchToSearch) {
    setRoute('search');
  }
}

function renderSearchHistoryList() {
  el.historyList.innerHTML = '';
  if (!state.searchHistory.length) {
    el.historyList.innerHTML = '<div class="empty-block">No AI searches yet.</div>';
    renderSearchHistoryDetail(null);
    return;
  }

  for (const session of state.searchHistory) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'history-item';
    if (session.id === state.activeSearchSessionId) {
      item.classList.add('active');
    }

    const dateText = formatHistoryDate(session.updatedAt || session.createdAt);
    item.innerHTML = `<strong>${dateText}</strong><p>${session.lastMessage || 'No messages yet'}</p>`;
    item.addEventListener('click', async () => {
      await openSearchSession(session.id, false);
    });
    el.historyList.appendChild(item);
  }

  const activeMeta = state.searchHistory.find(s => s.id === state.activeSearchSessionId);
  if (activeMeta) {
    renderSearchHistoryDetail({
      ...activeMeta,
      messages: state.activeSearchMessages,
      latestResults: state.lastSearchResults,
      selectedFlightId: state.selectedFlightId || ''
    });
  }
}

async function refreshSearchHistory() {
  const data = await api('/api/search-history');
  state.searchHistory = data.sessions || [];
  renderSearchHistoryList();
}

async function startNewSearchSession() {
  state.activeSearchSessionId = '';
  state.activeSearchMessages = [];
  state.selectedFlightId = null;
  state.lastSearchResults = [];
  state.lastParsedSearch = null;
  el.aiMessageInput.value = '';
  showFeedback(el.searchMessage, '');
  renderChatFeedFromMessages();
  addChatMessage('assistant', 'I am your flight search agent. Ask me to find reward flights and then select or buy directly.', false);
  renderSearchHistoryList();
  renderSearchHistoryDetail(null);
}

async function handleAuthenticatedBoot() {
  await refreshUser();
  await Promise.all([
    refreshRewards(),
    refreshPayments(),
    refreshBookings(),
    refreshSearchHistory(),
    refreshTrendingDestination(),
    refreshAdminData()
  ]);
  if (state.searchHistory.length) {
    await openSearchSession(state.searchHistory[0].id, false);
  } else {
    await startNewSearchSession();
  }
  renderShell();
  setRoute(state.user?.role === 'admin' ? 'admin' : 'discover');
}

async function boot() {
  setPaymentMethod('card');
  renderPreferenceChips();
  const params = new URLSearchParams(window.location.search);
  const authError = params.get('auth_error');
  if (authError) {
    showFeedback(el.loginMessage, authError, true);
    if (el.oauthMessage) {
      showFeedback(el.oauthMessage, authError, true);
    }
    const cleanUrl = `${window.location.pathname}${window.location.hash || ''}`;
    window.history.replaceState({}, document.title, cleanUrl);
  }

  try {
    await handleAuthenticatedBoot();
  } catch {
    state.user = null;
    renderShell();
  }
}

el.goToAuthBtn.addEventListener('click', () => {
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
});

el.heroGetStartedBtn.addEventListener('click', () => {
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
});

el.sideNav.addEventListener('click', event => {
  const button = event.target.closest('button[data-route]');
  if (!button) return;
  setRoute(button.dataset.route);
});

document.querySelectorAll('[data-route-jump]').forEach(btn => {
  btn.addEventListener('click', () => {
    setRoute(btn.dataset.routeJump);
  });
});

if (el.paymentMethodPicker) {
  el.paymentMethodPicker.addEventListener('click', event => {
    const button = event.target.closest('button[data-pay-method]');
    if (!button) return;
    setPaymentMethod(button.dataset.payMethod);
  });
}

if (el.discoverRecoBtn) {
  el.discoverRecoBtn.addEventListener('click', () => {
    const hasRewards = Array.isArray(state.rewards) && state.rewards.length > 0;
    if (!hasRewards) {
      setRoute('personalization');
      return;
    }
    if (state.trendingDestination) {
      const { from, to } = state.trendingDestination;
      el.aiMessageInput.value = `Find flights from ${from} to ${to}`;
      setRoute('search');
      return;
    }
    setRoute('search');
  });
}

el.loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  showFeedback(el.loginMessage, '');

  try {
    const data = Object.fromEntries(new FormData(el.loginForm).entries());
    await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    await handleAuthenticatedBoot();
    showFeedback(el.loginMessage, '');
  } catch (error) {
    showFeedback(el.loginMessage, error.message, true);
  }
});

el.signupForm.addEventListener('submit', async event => {
  event.preventDefault();
  showFeedback(el.signupMessage, '');

  try {
    const data = Object.fromEntries(new FormData(el.signupForm).entries());
    await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    await handleAuthenticatedBoot();
    showFeedback(el.signupMessage, '');
  } catch (error) {
    showFeedback(el.signupMessage, error.message, true);
  }
});

async function continueWithProvider(provider, feedbackNode) {
  showFeedback(feedbackNode, '');
  window.location.href = provider === 'google' ? '/api/auth/google/start' : '/api/auth/apple/start';
}

if (el.oauthGoogleBtn) {
  el.oauthGoogleBtn.addEventListener('click', async () => continueWithProvider('google', el.oauthMessage || el.loginMessage));
}
if (el.oauthAppleBtn) {
  el.oauthAppleBtn.addEventListener('click', async () => continueWithProvider('apple', el.oauthMessage || el.loginMessage));
}

el.rewardForm.addEventListener('submit', async event => {
  event.preventDefault();
  showFeedback(el.personalizationMessage, '');

  try {
    const payload = Object.fromEntries(new FormData(el.rewardForm).entries());
    await api('/api/rewards', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    el.rewardForm.reset();
    await refreshRewards();
    showFeedback(el.personalizationMessage, 'Frequent flyer program added. Miles and tier retrieved.');
  } catch (error) {
    showFeedback(el.personalizationMessage, error.message, true);
  }
});

el.profileForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (state.profileSaveInProgress) return;
  if (!el.profileForm.reportValidity()) return;

  const submitBtn = el.profileForm.querySelector('button[type="submit"]');
  const originalText = submitBtn ? submitBtn.textContent : '';
  state.profileSaveInProgress = true;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
  }

  showFeedback(el.personalizationMessage, 'Saving...');

  try {
    const payload = Object.fromEntries(new FormData(el.profileForm).entries());
    payload.preferences = [...state.selectedPreferences];

    await api('/api/me', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    await refreshUser();
    showFeedback(el.personalizationMessage, 'Personalization saved.');
  } catch (error) {
    showFeedback(el.personalizationMessage, error.message, true);
  } finally {
    state.profileSaveInProgress = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText || 'Save personalization';
    }
  }
});

el.paymentForm.addEventListener('submit', async event => {
  event.preventDefault();
  showFeedback(el.paymentMessage, '');
  if (!el.paymentForm.reportValidity()) return;

  try {
    const payload = Object.fromEntries(new FormData(el.paymentForm).entries());
    const data = await api('/api/payments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    el.paymentForm.reset();
    setPaymentMethod(state.paymentMethod);
    await refreshPayments();
    showFeedback(el.paymentMessage, data.redirectUrl ? 'Payment method added. Redirecting to provider...' : 'Payment method added.');
    if (data.redirectUrl) {
      window.open(data.redirectUrl, '_blank', 'noopener,noreferrer');
    }
    setRoute('personalization');
  } catch (error) {
    showFeedback(el.paymentMessage, error.message, true);
  }
});

el.settingsForm.addEventListener('submit', async event => {
  event.preventDefault();
  showFeedback(el.settingsMessage, '');

  try {
    const payload = Object.fromEntries(new FormData(el.settingsForm).entries());

    await api('/api/me', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    await refreshUser();
    showFeedback(el.settingsMessage, 'Settings saved.');
  } catch (error) {
    showFeedback(el.settingsMessage, error.message, true);
  }
});

if (el.twoFactorSetupBtn) {
  el.twoFactorSetupBtn.addEventListener('click', async () => {
    showFeedback(el.twoFactorMessage, '');
    try {
      const data = await api('/api/2fa/setup', { method: 'POST', body: JSON.stringify({}) });
      state.twoFactorSetup = {
        secret: data.secret || '',
        otpauthUrl: data.otpauthUrl || ''
      };
      renderTwoFactorSection();
      showFeedback(el.twoFactorMessage, 'Authenticator setup generated. Add it to Google Authenticator, then enter the 6-digit code.');
    } catch (error) {
      showFeedback(el.twoFactorMessage, error.message, true);
    }
  });
}

if (el.twoFactorSetupCancelBtn) {
  el.twoFactorSetupCancelBtn.addEventListener('click', () => {
    state.twoFactorSetup = null;
    if (el.twoFactorEnableCode) {
      el.twoFactorEnableCode.value = '';
    }
    renderTwoFactorSection();
  });
}

if (el.twoFactorEnableBtn) {
  el.twoFactorEnableBtn.addEventListener('click', async () => {
    showFeedback(el.twoFactorMessage, '');
    try {
      const code = String(el.twoFactorEnableCode?.value || '').trim();
      const data = await api('/api/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ code })
      });
      state.user = data.user || state.user;
      state.twoFactorSetup = null;
      if (el.twoFactorEnableCode) {
        el.twoFactorEnableCode.value = '';
      }
      renderTwoFactorSection();
      showFeedback(el.twoFactorMessage, 'Two-factor authentication enabled.');
    } catch (error) {
      showFeedback(el.twoFactorMessage, error.message, true);
    }
  });
}

if (el.twoFactorDisableBtn) {
  el.twoFactorDisableBtn.addEventListener('click', async () => {
    showFeedback(el.twoFactorMessage, '');
    try {
      const code = String(el.twoFactorDisableCode?.value || '').trim();
      const data = await api('/api/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ code })
      });
      state.user = data.user || state.user;
      state.twoFactorSetup = null;
      if (el.twoFactorDisableCode) {
        el.twoFactorDisableCode.value = '';
      }
      renderTwoFactorSection();
      showFeedback(el.twoFactorMessage, 'Two-factor authentication disabled.');
    } catch (error) {
      showFeedback(el.twoFactorMessage, error.message, true);
    }
  });
}

if (el.adminPricingForm) {
  el.adminPricingForm.addEventListener('submit', async event => {
    event.preventDefault();
    showFeedback(el.adminPricingMessage, '');
    if (state.user?.role !== 'admin') {
      showFeedback(el.adminPricingMessage, 'Admin access required.', true);
      return;
    }
    if (!el.adminPricingForm.reportValidity()) return;

    try {
      const payload = Object.fromEntries(new FormData(el.adminPricingForm).entries());
      const feeByCabin = {
        economy: Number(payload.feeEconomy),
        premium_economy: Number(payload.feePremiumEconomy),
        business: Number(payload.feeBusiness),
        first: Number(payload.feeFirst)
      };
      const data = await api('/api/admin/pricing-config', {
        method: 'PUT',
        body: JSON.stringify({
          feeByCabin,
          // Backward compatibility for any older running server process.
          duffelFeePercent: feeByCabin.economy
        })
      });
      state.pricingConfig = data.pricing;
      await refreshAdminData();
      showFeedback(el.adminPricingMessage, 'Fee configuration updated.');
    } catch (error) {
      showFeedback(el.adminPricingMessage, error.message, true);
    }
  });
}

el.aiSearchForm.addEventListener('submit', async event => {
  event.preventDefault();
  const message = el.aiMessageInput.value;
  await runAiSearch(message);
});

el.newSearchSessionBtn.addEventListener('click', async () => {
  await startNewSearchSession();
});

el.voiceBtn.addEventListener('click', () => {
  if (!state.voice.supported || !state.voice.recognition) {
    showFeedback(el.searchMessage, 'Voice input is not available in this browser.', true);
    return;
  }

  if (state.voice.listening) {
    stopVoiceRecognition();
    return;
  }

  try {
    state.voice.recognition.start();
  } catch {
    showFeedback(el.searchMessage, 'Unable to start voice input. Try again.', true);
  }
});

el.logoutBtn.addEventListener('click', async () => {
  if (state.voice.listening && state.voice.recognition) {
    stopVoiceRecognition();
  }
  await api('/api/auth/logout', { method: 'POST' });
  state.user = null;
  state.rewards = [];
  state.payments = [];
  state.bookings = [];
  state.searchHistory = [];
  state.activeSearchSessionId = '';
  state.activeSearchMessages = [];
  state.selectedFlightId = null;
  state.lastParsedSearch = null;
  state.twoFactorSetup = null;
  state.adminStats = null;
  state.pricingConfig = null;
  el.paymentList.innerHTML = '';
  el.rewardCards.innerHTML = '';
  el.bookingsList.innerHTML = '';
  el.chatFeed.innerHTML = '';
  el.historyList.innerHTML = '';
  el.historyDetail.innerHTML = '';
  if (el.adminKpis) el.adminKpis.innerHTML = '';
  if (el.adminStripeKpis) el.adminStripeKpis.innerHTML = '';
  if (el.adminStripeStatus) el.adminStripeStatus.innerHTML = '';
  if (el.adminRouteStats) el.adminRouteStats.innerHTML = '';
  if (el.adminFfpStats) el.adminFfpStats.innerHTML = '';
  renderShell();
});

initVoiceRecognition();
boot();
