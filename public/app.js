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
  searchInProgress: false,
  profileSaveInProgress: false,
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
  settings: document.getElementById('routeSettings')
};

const el = {
  publicArea: document.getElementById('publicArea'),
  appArea: document.getElementById('appArea'),
  goToAuthBtn: document.getElementById('goToAuthBtn'),
  heroGetStartedBtn: document.getElementById('heroGetStartedBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  sideNav: document.getElementById('sideNav'),
  loginForm: document.getElementById('loginForm'),
  signupForm: document.getElementById('signupForm'),
  rewardForm: document.getElementById('rewardForm'),
  profileForm: document.getElementById('profileForm'),
  paymentForm: document.getElementById('paymentForm'),
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
  rewardCards: document.getElementById('rewardCards'),
  paymentList: document.getElementById('paymentList'),
  preferenceChips: document.getElementById('preferenceChips'),
  chatFeed: document.getElementById('chatFeed'),
  historyList: document.getElementById('historyList'),
  historyDetail: document.getElementById('historyDetail'),
  bookingsList: document.getElementById('bookingsList'),
  twoFactorToggle: document.getElementById('twoFactorToggle')
};

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
  el.publicArea.classList.toggle('hidden', loggedIn);
  el.appArea.classList.toggle('hidden', !loggedIn);
  el.goToAuthBtn.classList.toggle('hidden', loggedIn);
  el.logoutBtn.classList.toggle('hidden', !loggedIn);
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

  await ensureSearchSession();

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

  state.searchInProgress = true;
  showFeedback(el.searchMessage, '');
  addChatMessage('user', trimmed);
  el.aiMessageInput.value = '';

  try {
    const data = await api('/api/flights/ai-search', {
      method: 'POST',
      body: JSON.stringify({
        message: trimmed,
        preferences: Array.isArray(state.user?.preferences) ? state.user.preferences : []
      })
    });

    addChatMessage('assistant', `${data.agent.provider === 'ota_crawler' ? 'OTA agent' : 'Duffel agent'}: ${data.agent.note}`);
    addChatMessage('assistant', data.reply || 'I found options.');
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
  addChatMessage('assistant', `Booking confirmed: ${data.booking.flight.airline} ${data.booking.flight.flightNumber}. Paid with ${data.booking.payment.brand} ${data.booking.payment.last4Masked}.${refText}`);
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

    const outboundTop = document.createElement('div');
    outboundTop.className = 'flight-top';
    outboundTop.innerHTML = `<strong>${flight.outboundAirline || flight.airline} ${flight.outboundFlightNumber || flight.flightNumber}</strong><span>${flight.depTime || '--:--'} - ${flight.arrTime || '--:--'}</span>`;

    const outboundMid = document.createElement('h5');
    outboundMid.textContent = `${flight.outboundFrom || flight.from} - ${flight.outboundTo || flight.to}`;

    card.append(outboundTop, outboundMid);

    if (flight.roundTrip || flight.returnDate) {
      const combinedAirlineParts = String(flight.airline || '').split('/').map(v => v.trim()).filter(Boolean);
      const combinedFlightParts = String(flight.flightNumber || '').split('+').map(v => v.trim()).filter(Boolean);
      const returnAirlineName = flight.returnAirline || combinedAirlineParts[1] || combinedAirlineParts[0] || 'Return flight';
      const returnFlightNo = flight.returnFlightNumber || combinedFlightParts[1] || combinedFlightParts[0] || 'Flight';

      const divider = document.createElement('div');
      divider.className = 'leg-divider';

      const returnLabel = document.createElement('p');
      returnLabel.className = 'leg-label';
      returnLabel.textContent = 'Return flight';

      const returnTop = document.createElement('div');
      returnTop.className = 'flight-top';
      returnTop.innerHTML = `<strong>${returnAirlineName} ${returnFlightNo}</strong><span>${flight.returnDepTime || '--:--'} - ${flight.returnArrTime || '--:--'}</span>`;

      const returnMid = document.createElement('h5');
      returnMid.textContent = `${flight.returnFrom || flight.to} - ${flight.returnTo || flight.from}`;

      const returnInfo = document.createElement('p');
      returnInfo.textContent = flight.returnDate ? `Return ${flight.returnDate}` : '';

      card.append(divider, returnLabel, returnTop, returnMid);
      if (returnInfo.textContent) {
        card.append(returnInfo);
      }
    }

    const price = document.createElement('div');
    price.className = 'flight-price';
    const fareLabel = flight.roundTrip || flight.returnDate ? 'Total round-trip fare' : 'One-way fare';
    price.innerHTML = `<strong>${fareLabel}: ${flight.cashPrice} ${flight.currency || 'EUR'}</strong>`;

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
    card.append(price, actions);
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
    card.innerHTML = `
      <h5>${reward.programName}</h5>
      <div class="reward-meta">${reward.memberId || 'No member id'} | ${Number(reward.points).toLocaleString()} miles${reward.tier ? ` | ${reward.tier}` : ''}</div>
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
    info.innerHTML = `<strong>${payment.brand}${payment.primary ? ' <span class="badge">Primary</span>' : ''}</strong><p>${payment.last4Masked}</p>`;

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
      <div class="flight-top"><strong>${outboundAirline} ${outboundFlight}</strong><span>Booking date: ${bookingDate}</span></div>
      <h5>${outboundFrom} - ${outboundTo}</h5>
      ${outboundDate ? `<p>Departure date: ${outboundDate}</p>` : ''}
      ${hasReturn ? `
      <div class="leg-divider"></div>
      <p class="leg-label">Return flight</p>
      <div class="flight-top"><strong>${returnAirline || 'Airline'} ${returnFlight || 'Flight'}</strong></div>
      <h5>${returnFrom} - ${returnTo}</h5>
      ${returnDate ? `<p>Departure date: ${returnDate}</p>` : ''}
      ` : ''}
      <p>Status: ${booking.status}${referencePart}${ticketPart} | Paid with ${booking.payment.brand} ${booking.payment.last4Masked}</p>
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
  el.twoFactorToggle.checked = !!state.user.twoFactorEnabled;

  state.selectedPreferences = new Set(Array.isArray(state.user.preferences) ? state.user.preferences : []);
  renderPreferenceChips();
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

      const outboundTop = document.createElement('div');
      outboundTop.className = 'flight-top';
      outboundTop.innerHTML = `<strong>${flight.outboundAirline || flight.airline} ${flight.outboundFlightNumber || flight.flightNumber}</strong><span>${flight.depTime || '--:--'} - ${flight.arrTime || '--:--'}</span>`;

      const outboundMid = document.createElement('h5');
      outboundMid.textContent = `${flight.outboundFrom || flight.from} - ${flight.outboundTo || flight.to}`;
      card.append(outboundTop, outboundMid);

      if (flight.roundTrip || flight.returnDate) {
        const divider = document.createElement('div');
        divider.className = 'leg-divider';

        const returnLabel = document.createElement('p');
        returnLabel.className = 'leg-label';
        returnLabel.textContent = 'Return flight';

        const returnTop = document.createElement('div');
        returnTop.className = 'flight-top';
        returnTop.innerHTML = `<strong>${flight.returnAirline || 'Airline'} ${flight.returnFlightNumber || 'Flight'}</strong><span>${flight.returnDepTime || '--:--'} - ${flight.returnArrTime || '--:--'}</span>`;

        const returnMid = document.createElement('h5');
        returnMid.textContent = `${flight.returnFrom || flight.to} - ${flight.returnTo || flight.from}`;
        card.append(divider, returnLabel, returnTop, returnMid);
      }

      const price = document.createElement('div');
      price.className = 'flight-price';
      price.innerHTML = `<strong>${flight.cashPrice} ${flight.currency || 'EUR'}</strong>`;
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
  state.selectedFlightId = null;
  state.lastSearchResults = [];
  el.aiMessageInput.value = '';
  showFeedback(el.searchMessage, '');
  await createSearchSession();
  renderChatFeedFromMessages();
  addChatMessage('assistant', 'I am your flight search agent. Ask me to find reward flights and then select or buy directly.');
}

async function handleAuthenticatedBoot() {
  await refreshUser();
  await Promise.all([refreshRewards(), refreshPayments(), refreshBookings(), refreshSearchHistory()]);
  if (state.searchHistory.length) {
    await openSearchSession(state.searchHistory[0].id, false);
  } else {
    await startNewSearchSession();
  }
  renderShell();
  setRoute('discover');
}

async function boot() {
  renderPreferenceChips();

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
    showFeedback(el.personalizationMessage, 'Frequent flyer program added.');
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

  try {
    const payload = Object.fromEntries(new FormData(el.paymentForm).entries());
    await api('/api/payments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    el.paymentForm.reset();
    await refreshPayments();
    showFeedback(el.paymentMessage, 'Payment method added.');
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
    payload.twoFactorEnabled = el.twoFactorToggle.checked;

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
  el.paymentList.innerHTML = '';
  el.rewardCards.innerHTML = '';
  el.bookingsList.innerHTML = '';
  el.chatFeed.innerHTML = '';
  el.historyList.innerHTML = '';
  el.historyDetail.innerHTML = '';
  renderShell();
});

initVoiceRecognition();
boot();
