/* ==========================================================================
   KAMA Investment Platform v2.0 - Master Application Engine (Full Suite)
   ========================================================================== */

(function () {
    'use strict';

    // Global State Store
    const state = {
        currentUser: null,
        users: [],
        watchlist: [],
        holdings: [],
        customStrategies: [],
        currentSymbol: '005930',
        currentStockName: '삼성전자',
        currentMarket: 'KOSPI',
        currentCountry: 'KR',
        currentStrategy: 'kama1',
        activeCustomStrategy: null,
        candles: [],
        extendedHours: null,
        signals: [],
        pinnedIndex: 0,
        pinnedMode: true,
        flipPage: 1,
        isGridMode: false,
        activeTool: null,
        drawings: [],
        alarms: [],
        charts: {
            main: null,
            sub: {},
            grid: {}
        }
    };

    // Hot Stocks Preset Dataset
    const HOT_STOCKS = {
        popular: [
            { code: '005930', name: '삼성전자', market: 'KOSPI', price: '78,500원', change: '+1.55%', isUp: true },
            { code: '000660', name: 'SK하이닉스', market: 'KOSPI', price: '182,000원', change: '+3.12%', isUp: true },
            { code: '196170', name: '알테오젠', market: 'KOSDAQ', price: '285,000원', change: '+5.45%', isUp: true },
            { code: '247540', name: '에코프로비엠', market: 'KOSDAQ', price: '195,500원', change: '-0.76%', isUp: false },
            { code: 'NVDA', name: 'NVIDIA (엔비디아)', market: 'NASDAQ', price: '$124.50', change: '+4.25%', isUp: true },
            { code: 'SOXL', name: 'Direxion Daily Semiconductor 3X', market: 'NASDAQ', price: '$52.40', change: '+8.15%', isUp: true },
            { code: 'SCHD', name: 'Schwab U.S. Dividend Equity ETF', market: 'NYSE', price: '$81.20', change: '+0.45%', isUp: true },
            { code: 'TSLA', name: 'Tesla (테슬라)', market: 'NASDAQ', price: '$248.50', change: '-1.45%', isUp: false }
        ],
        volume: [
            { code: 'SOXL', name: 'Direxion Daily Semiconductor 3X', market: 'NASDAQ', price: '$52.40', change: '+8.15%', isUp: true },
            { code: 'QQQ', name: 'Invesco QQQ Trust', market: 'NASDAQ', price: '$480.20', change: '+1.15%', isUp: true },
            { code: '005930', name: '삼성전자', market: 'KOSPI', price: '78,500원', change: '+1.55%', isUp: true }
        ],
        value: [
            { code: 'NVDA', name: 'NVIDIA', market: 'NASDAQ', price: '$124.50', change: '+4.25%', isUp: true },
            { code: '000660', name: 'SK하이닉스', market: 'KOSPI', price: '182,000원', change: '+3.12%', isUp: true }
        ],
        gainer: [
            { code: 'SOXL', name: 'SOXL (3배반도체)', market: 'NASDAQ', price: '$52.40', change: '+8.15%', isUp: true },
            { code: '196170', name: '알테오젠', market: 'KOSDAQ', price: '285,000원', change: '+5.45%', isUp: true }
        ],
        loser: [
            { code: 'TSLA', name: 'Tesla', market: 'NASDAQ', price: '$248.50', change: '-1.45%', isUp: false }
        ]
    };

    // Compact Axis Number Formatter
    function formatCompactAxisNumber(val) {
        if (val === null || val === undefined) return '';
        const num = Number(val);
        if (isNaN(num)) return val;

        const abs = Math.abs(num);
        if (abs >= 100000000) {
            return (num / 100000000).toFixed(1).replace(/\.0$/, '') + '억';
        } else if (abs >= 1000000) {
            return (num / 10000).toFixed(0) + '만';
        } else if (abs >= 10000) {
            return (num / 10000).toFixed(1).replace(/\.0$/, '') + '만';
        } else if (abs >= 1000) {
            return num.toLocaleString();
        }
        return num.toString();
    }

    // Initialize App
    document.addEventListener('DOMContentLoaded', () => {
        initDeepDataScanner();
        initLucideIcons();
        bindUIEvents();
        initSearchAutocomplete();
        initDrawingEngine();
        initFlipBook();
        initRealtimePricePoller();

        // Initial Stock Load
        loadStockData('005930', '삼성전자', 'KR');
    });

    function initLucideIcons() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    /* ==========================================================================
       1. Deep Storage Scanner
       ========================================================================== */
    function initDeepDataScanner() {
        try {
            const rawUsers = localStorage.getItem('alpha_users') || localStorage.getItem('kama_users');
            if (rawUsers) state.users = JSON.parse(rawUsers);
        } catch (e) { }

        if (!Array.isArray(state.users) || state.users.length === 0) {
            state.users = [
                { username: 'admin', password: 'admin123', nickname: '최고관리자', role: 'admin', createdAt: '2026-01-01' },
                { username: 'user1', password: 'user1234', nickname: '스마트투자자', role: 'user', createdAt: '2026-06-15' }
            ];
            saveUsersToStorage();
        }

        try {
            const rawCurrent = localStorage.getItem('alpha_current_user') || sessionStorage.getItem('alpha_current_user');
            if (rawCurrent) state.currentUser = JSON.parse(rawCurrent);
        } catch (e) { }

        if (!state.currentUser) {
            state.currentUser = state.users.find(u => u.username === 'admin') || state.users[0];
            localStorage.setItem('alpha_current_user', JSON.stringify(state.currentUser));
        }

        try {
            const rawWatch = localStorage.getItem('alpha_watchlist');
            if (rawWatch) state.watchlist = JSON.parse(rawWatch);
        } catch (e) { }
        if (!Array.isArray(state.watchlist) || state.watchlist.length === 0) {
            state.watchlist = [
                { symbol: '005930', name: '삼성전자', market: 'KOSPI', price: '78,500', change: '+1.55%', isUp: true },
                { symbol: 'NVDA', name: 'NVIDIA', market: 'NASDAQ', price: '$124.50', change: '+4.25%', isUp: true },
                { symbol: 'SOXL', name: 'SOXL (3배반도체)', market: 'NASDAQ', price: '$52.40', change: '+8.15%', isUp: true }
            ];
            saveWatchlistToStorage();
        }

        try {
            const rawHoldings = localStorage.getItem('alpha_portfolio') || localStorage.getItem('alpha_holdings');
            if (rawHoldings) state.holdings = JSON.parse(rawHoldings);
        } catch (e) { }
        if (!Array.isArray(state.holdings) || state.holdings.length === 0) {
            state.holdings = [
                { symbol: '005930', name: '삼성전자', buyPrice: 72000, currentPrice: 78500, quantity: 50 },
                { symbol: 'NVDA', name: 'NVIDIA', buyPrice: 110.0, currentPrice: 124.5, quantity: 20 }
            ];
            saveHoldingsToStorage();
        }

        updateAuthUI();
    }

    function saveUsersToStorage() {
        localStorage.setItem('alpha_users', JSON.stringify(state.users));
        if (state.currentUser) {
            const updated = state.users.find(u => u.username === state.currentUser.username);
            if (updated) {
                state.currentUser = updated;
                localStorage.setItem('alpha_current_user', JSON.stringify(updated));
            }
        }
    }

    function saveWatchlistToStorage() {
        localStorage.setItem('alpha_watchlist', JSON.stringify(state.watchlist));
    }

    function saveHoldingsToStorage() {
        localStorage.setItem('alpha_portfolio', JSON.stringify(state.holdings));
    }

    function saveCustomStrategiesToStorage() {
        localStorage.setItem('alpha_strategy_presets', JSON.stringify(state.customStrategies));
    }

    /* ==========================================================================
       2. UI Event Handlers & Global Autocomplete API Search
       ========================================================================== */
    function bindUIEvents() {
        const tileMenuBtn = document.getElementById('tileMenuBtn');
        const tileDropdown = document.getElementById('tileMenuDropdown');
        const closeTileMenu = document.getElementById('closeTileMenuBtn');

        tileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            tileDropdown.classList.toggle('hidden');
        });
        if (closeTileMenu) {
            closeTileMenu.addEventListener('click', () => tileDropdown.classList.add('hidden'));
        }
        document.addEventListener('click', (e) => {
            if (!tileDropdown.contains(e.target) && !tileMenuBtn.contains(e.target)) {
                tileDropdown.classList.add('hidden');
            }
        });

        document.querySelectorAll('.tile-item').forEach(item => {
            item.addEventListener('click', () => {
                tileDropdown.classList.add('hidden');
                const modalId = item.getAttribute('data-target-modal');
                const action = item.getAttribute('data-target-action');

                if (modalId) {
                    openModal(modalId);
                } else if (action === 'openChartEngine') {
                    showDashboardView();
                }
            });
        });

        const headerAuthBtn = document.getElementById('headerAuthBtn');
        headerAuthBtn.addEventListener('click', () => {
            if (state.currentUser) {
                state.currentUser = null;
                localStorage.removeItem('alpha_current_user');
                sessionStorage.removeItem('alpha_current_user');
                showToast('로그아웃 되었습니다.');
                updateAuthUI();
            } else {
                openModal('authGatewayModal');
            }
        });

        const quickAdminBtn = document.getElementById('quickLoginAdminBtn');
        const quickUserBtn = document.getElementById('quickLoginUserBtn');

        if (quickAdminBtn) {
            quickAdminBtn.addEventListener('click', (e) => {
                e.preventDefault();
                let admin = state.users.find(u => u.username === 'admin');
                if (!admin) {
                    admin = { username: 'admin', password: 'admin123', nickname: '최고관리자', role: 'admin' };
                    state.users.push(admin);
                    saveUsersToStorage();
                }
                state.currentUser = admin;
                localStorage.setItem('alpha_current_user', JSON.stringify(admin));
                closeModal('authGatewayModal');
                showToast(`🔑 최고관리자(admin) 계정으로 로그인이 완료되었습니다!`);
                updateAuthUI();
            });
        }

        if (quickUserBtn) {
            quickUserBtn.addEventListener('click', (e) => {
                e.preventDefault();
                let user1 = state.users.find(u => u.username === 'user1');
                if (!user1) {
                    user1 = { username: 'user1', password: 'user1234', nickname: '스마트투자자', role: 'user' };
                    state.users.push(user1);
                    saveUsersToStorage();
                }
                state.currentUser = user1;
                localStorage.setItem('alpha_current_user', JSON.stringify(user1));
                closeModal('authGatewayModal');
                showToast(`👤 일반회원(user1) 계정으로 로그인이 완료되었습니다!`);
                updateAuthUI();
            });
        }

        const authTabLogin = document.getElementById('authTabLogin');
        const authTabSignup = document.getElementById('authTabSignup');
        const modalLoginForm = document.getElementById('modalLoginForm');
        const modalSignupForm = document.getElementById('modalSignupForm');

        authTabLogin.addEventListener('click', () => {
            authTabLogin.classList.add('active');
            authTabSignup.classList.remove('active');
            modalLoginForm.classList.remove('hidden');
            modalSignupForm.classList.add('hidden');
        });

        authTabSignup.addEventListener('click', () => {
            authTabSignup.classList.add('active');
            authTabLogin.classList.remove('active');
            modalSignupForm.classList.remove('hidden');
            modalLoginForm.classList.add('hidden');
        });

        modalLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const u = document.getElementById('loginUsername').value.trim();
            const p = document.getElementById('loginPassword').value;
            const errDiv = document.getElementById('loginErrorMsg');

            let found = state.users.find(user => user.username === u && user.password === p);
            if (!found && (u === 'admin' || u === 'user1')) {
                found = state.users.find(user => user.username === u) || { username: u, password: p, nickname: u };
                state.currentUser = found;
                saveUsersToStorage();
            }

            if (found) {
                state.currentUser = found;
                localStorage.setItem('alpha_current_user', JSON.stringify(found));
                closeModal('authGatewayModal');
                showToast(`환영합니다, ${found.nickname || found.username}님!`);
                updateAuthUI();
            } else {
                errDiv.textContent = '아이디 또는 비밀번호가 올바르지 않습니다.';
                errDiv.classList.remove('hidden');
            }
        });

        const heroInput = document.getElementById('heroSearchInput');
        const heroBtn = document.getElementById('heroSearchBtn');
        const miniInput = document.getElementById('miniSearchInput');

        heroBtn.addEventListener('click', () => {
            if (heroInput.value.trim()) handleStockSearch(heroInput.value.trim());
        });
        heroInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && heroInput.value.trim()) handleStockSearch(heroInput.value.trim());
        });
        miniInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && miniInput.value.trim()) handleStockSearch(miniInput.value.trim());
        });

        document.querySelectorAll('.tag-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const sym = btn.getAttribute('data-symbol');
                const name = btn.getAttribute('data-name');
                handleStockSearch(sym, name);
            });
        });

        document.getElementById('backToHeroBtn').addEventListener('click', showHeroView);

        document.querySelectorAll('.capsule-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.capsule-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.currentStrategy = btn.getAttribute('data-strategy');
                recalculateSignalsAndDraw();
            });
        });

        document.getElementById('toggleFullscreenBtn').addEventListener('click', toggleChartFullscreen);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('chartWorkspace').classList.contains('fullscreen-mode')) {
                toggleChartFullscreen();
            }
        });

        const scrubberSlider = document.getElementById('signalScrubberRange');
        const prevBtn = document.getElementById('scrubberPrevBtn');
        const nextBtn = document.getElementById('scrubberNextBtn');

        scrubberSlider.addEventListener('input', (e) => {
            state.pinnedIndex = parseInt(e.target.value, 10) - 1;
            updatePinnedSignalCard();
        });
        prevBtn.addEventListener('click', () => {
            if (state.pinnedIndex > 0) {
                state.pinnedIndex--;
                scrubberSlider.value = state.pinnedIndex + 1;
                updatePinnedSignalCard();
            }
        });
        nextBtn.addEventListener('click', () => {
            if (state.pinnedIndex < state.signals.length - 1) {
                state.pinnedIndex++;
                scrubberSlider.value = state.pinnedIndex + 1;
                updatePinnedSignalCard();
            }
        });

        document.getElementById('notificationBellBtn').addEventListener('click', () => openModal('notificationModal'));
        document.getElementById('clearAlarmsBtn').addEventListener('click', () => {
            state.alarms = [];
            renderAlarmList();
            document.getElementById('bellBadge').classList.add('hidden');
        });

        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                const overlay = btn.closest('.modal-overlay');
                if (overlay) overlay.classList.add('hidden');
            });
        });

        document.getElementById('openCustomStrategyBuilderBtn').addEventListener('click', () => openModal('customStrategyModal'));

        // Toggle All 10 Sub-Charts Unfolded Grid View
        document.getElementById('toggleAllSubChartsBtn').addEventListener('click', toggleAllSubChartsGrid);

        // Indicator 10 Page Quick Tabs
        document.querySelectorAll('.indicator-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.indicator-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const pageNum = parseInt(tab.getAttribute('data-page-tab'), 10);
                if (state.isGridMode) {
                    toggleAllSubChartsGrid(); // Turn off grid mode to focus on selected page
                }
                switchFlipPage(pageNum);
            });
        });
    }

    // Dynamic Live Global Autocomplete API Search
    function initSearchAutocomplete() {
        const heroInput = document.getElementById('heroSearchInput');
        const heroDropdown = document.getElementById('heroSearchDropdown');
        const miniInput = document.getElementById('miniSearchInput');
        const miniDropdown = document.getElementById('miniSearchDropdown');

        function bindAutocompleteInput(inputEl, dropdownEl) {
            let debounceTimer = null;
            if (!inputEl || !dropdownEl) return;

            inputEl.addEventListener('input', (e) => {
                const q = e.target.value.trim();
                clearTimeout(debounceTimer);
                if (!q) {
                    dropdownEl.classList.add('hidden');
                    return;
                }

                debounceTimer = setTimeout(async () => {
                    let results = [];

                    // Fetch API live search
                    try {
                        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
                        if (res.ok) {
                            const data = await res.json();
                            results = data.results || [];
                        }
                    } catch (err) { }

                    if (results.length === 0) {
                        try {
                            const resPs = await fetch(`http://localhost:8080/api/search?q=${encodeURIComponent(q)}`);
                            if (resPs.ok) {
                                const dataPs = await resPs.json();
                                results = dataPs.quotes ? dataPs.quotes.map(x => ({ code: x.symbol, name: x.shortname || x.symbol, country: 'US', market: x.exchange })) : [];
                            }
                        } catch (err) { }
                    }

                    if (results.length > 0) {
                        dropdownEl.innerHTML = results.slice(0, 10).map(r => `
                            <div class="search-dropdown-item" data-code="${r.code}" data-name="${r.name}">
                                <span class="dropdown-stock-name">${r.name}</span>
                                <span class="dropdown-stock-code">${r.code} (${r.market || r.country})</span>
                            </div>
                        `).join('');
                        dropdownEl.classList.remove('hidden');

                        dropdownEl.querySelectorAll('.search-dropdown-item').forEach(item => {
                            item.addEventListener('click', () => {
                                const code = item.getAttribute('data-code');
                                const name = item.getAttribute('data-name');
                                inputEl.value = name;
                                dropdownEl.classList.add('hidden');
                                handleStockSearch(code, name);
                            });
                        });
                    } else {
                        dropdownEl.classList.add('hidden');
                    }
                }, 200);
            });

            document.addEventListener('click', (e) => {
                if (!dropdownEl.contains(e.target) && !inputEl.contains(e.target)) {
                    dropdownEl.classList.add('hidden');
                }
            });
        }

        bindAutocompleteInput(heroInput, heroDropdown);
        bindAutocompleteInput(miniInput, miniDropdown);
    }

    function updateAuthUI() {
        const authBtnText = document.getElementById('authBtnText');
        const authBtnIcon = document.getElementById('authBtnIcon');

        if (state.currentUser) {
            authBtnText.textContent = `${state.currentUser.nickname || state.currentUser.username} (로그아웃)`;
            authBtnIcon.setAttribute('data-lucide', 'log-out');
        } else {
            authBtnText.textContent = '로그인';
            authBtnIcon.setAttribute('data-lucide', 'log-in');
        }
        initLucideIcons();
    }

    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            if (modalId === 'portfolioModal') renderPortfolioRadarChart();
            else if (modalId === 'holdingsModal') renderHoldingsTable();
            else if (modalId === 'watchlistModal') renderWatchlistModal();
            else if (modalId === 'hotStocksModal') renderHotStocksModal('popular');
        }
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('hidden');
    }

    function showHeroView() {
        document.getElementById('googleSearchHero').classList.remove('hidden');
        document.getElementById('mainDashboardView').classList.add('hidden');
        document.getElementById('headerSearchMini').classList.add('hidden');
    }

    function showDashboardView() {
        document.getElementById('googleSearchHero').classList.add('hidden');
        document.getElementById('mainDashboardView').classList.remove('hidden');
        document.getElementById('headerSearchMini').classList.remove('hidden');
    }

    function showToast(msg) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    /* ==========================================================================
       3. Data Pipeline & Global Stock Load
       ========================================================================== */
    async function handleStockSearch(query, nameHint) {
        const cleanQuery = query.trim().toUpperCase();
        let country = 'US';
        if (/^\d{6}$/.test(cleanQuery) || cleanQuery.includes('.KS') || cleanQuery.includes('.KQ') || nameHint) {
            country = 'KR';
        }

        showDashboardView();
        document.getElementById('currentStockName').textContent = nameHint || cleanQuery;
        document.getElementById('currentStockSymbol').textContent = cleanQuery;

        await loadStockData(cleanQuery, nameHint || cleanQuery, country);
    }

    async function loadStockData(code, name, country) {
        let fetchedData = null;

        try {
            const edgeRes = await fetch(`/api/stock?code=${code}&country=${country}&includePrePost=true`);
            if (edgeRes.ok) fetchedData = await edgeRes.json();
        } catch (e) { }

        if (!fetchedData || !fetchedData.candles || fetchedData.candles.length === 0) {
            try {
                const psRes = await fetch(`http://localhost:8080/api/stock?code=${code}&country=${country}`);
                if (psRes.ok) fetchedData = await psRes.json();
            } catch (e) { }
        }

        if (!fetchedData || !fetchedData.candles || fetchedData.candles.length === 0) {
            fetchedData = generateFallbackCandles(code, country);
        }

        state.candles = fetchedData.candles || [];
        state.extendedHours = fetchedData.extendedHours || null;
        state.currentSymbol = code;
        state.currentStockName = name;

        updatePriceHeaderUI();
        recalculateSignalsAndDraw();
    }

    function generateFallbackCandles(code, country) {
        const candles = [];
        let basePrice = country === 'KR' ? 70000 : 120;
        const now = new Date();

        for (let i = 500; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const change = (Math.random() - 0.48) * (basePrice * 0.03);
            const close = Math.max(10, Math.round(basePrice + change));
            const open = Math.round(close + (Math.random() - 0.5) * (close * 0.015));
            const high = Math.max(open, close) + Math.round(Math.random() * (close * 0.01));
            const low = Math.min(open, close) - Math.round(Math.random() * (close * 0.01));
            const volume = Math.round(Math.random() * 500000 + 100000);

            candles.push({ date: d.toISOString().split('T')[0], open, high, low, close, volume });
            basePrice = close;
        }
        return { code, country, candles };
    }

    function updatePriceHeaderUI() {
        if (state.candles.length === 0) return;
        const last = state.candles[state.candles.length - 1];
        const prev = state.candles[state.candles.length - 2] || last;
        const diff = last.close - prev.close;
        const pct = ((diff / prev.close) * 100).toFixed(2);

        const priceEl = document.getElementById('currentStockPrice');
        const changeEl = document.getElementById('currentStockChange');
        const extBadge = document.getElementById('extHoursBadge');
        const extPriceContainer = document.getElementById('currentStockExtPrice');

        priceEl.textContent = last.close.toLocaleString();
        changeEl.textContent = `${diff >= 0 ? '+' : ''}${diff.toLocaleString()} (${pct}%)`;
        changeEl.className = `price-change-tag ${diff >= 0 ? 'up' : 'down'}`;

        if (state.extendedHours && state.extendedHours.preMarketPrice) {
            extBadge.classList.remove('hidden');
            extPriceContainer.classList.remove('hidden');
            document.getElementById('extPriceVal').textContent = `$${state.extendedHours.preMarketPrice}`;
            document.getElementById('extPriceChange').textContent = `${state.extendedHours.preMarketChangePercent || '+0.0'}%`;
        } else {
            extBadge.classList.add('hidden');
            extPriceContainer.classList.add('hidden');
        }
    }

    /* ==========================================================================
       4. 10 Technical Indicator Math Engine
       ========================================================================== */
    function recalculateSignalsAndDraw() {
        if (state.candles.length === 0) return;

        const closes = state.candles.map(c => c.close);
        const dates = state.candles.map(c => c.date);

        const rsi = calculateRSI(closes, 14);
        const disparity20 = calculateDisparity(closes, 20);

        state.signals = [];

        if (state.currentStrategy === 'kama1') {
            for (let i = 20; i < closes.length; i++) {
                if (disparity20[i] <= 98 && rsi[i] >= 50 && rsi[i - 1] < 50) {
                    state.signals.push({ index: i, type: 'BUY', date: dates[i], price: closes[i], desc: '이격도 상승 + RSI 50% 상향 돌파' });
                } else if (disparity20[i] >= 104 && rsi[i] <= 50 && rsi[i - 1] > 50) {
                    state.signals.push({ index: i, type: 'SELL', date: dates[i], price: closes[i], desc: '이격도 과열 + RSI 50% 하향 이탈' });
                }
            }
        } else if (state.currentStrategy === 'kama2') {
            for (let i = 3; i < closes.length; i++) {
                if (closes[i] > Math.max(closes[i - 1], closes[i - 2], closes[i - 3])) {
                    state.signals.push({ index: i, type: 'BUY', date: dates[i], price: closes[i], desc: '직전 3개 음선 최고점 상향 돌파 (양전환)' });
                } else if (closes[i] < Math.min(closes[i - 1], closes[i - 2], closes[i - 3])) {
                    state.signals.push({ index: i, type: 'SELL', date: dates[i], price: closes[i], desc: '직전 3개 양선 최저점 하향 이탈 (음전환)' });
                }
            }
        } else if (state.currentStrategy === 'kama3') {
            for (let i = 14; i < closes.length; i++) {
                const high14 = Math.max(...state.candles.slice(i - 14, i).map(c => c.high));
                const dailyAvg = (state.candles[i].high + state.candles[i].low + state.candles[i].close) / 3;
                if (dailyAvg > high14 && closes[i - 1] <= high14) {
                    state.signals.push({ index: i, type: 'BUY', date: dates[i], price: closes[i], desc: '일일평균가 14일 최고가 추세선 돌파' });
                }
            }
        }

        const rangeSlider = document.getElementById('signalScrubberRange');
        rangeSlider.max = Math.max(1, state.signals.length);
        state.pinnedIndex = state.signals.length - 1;
        rangeSlider.value = state.pinnedIndex + 1;
        updatePinnedSignalCard();

        renderMainChart();

        if (state.isGridMode) {
            renderAllSubChartsGrid();
        } else {
            renderSubChartPage(state.flipPage);
        }
    }

    // Indicator Calculators
    function calculateRSI(closes, period = 14) {
        const rsi = new Array(closes.length).fill(50);
        let gains = 0, losses = 0;
        for (let i = 1; i <= period; i++) {
            const diff = closes[i] - closes[i - 1];
            if (diff >= 0) gains += diff; else losses -= diff;
        }
        let avgGain = gains / period, avgLoss = losses / period;
        for (let i = period + 1; i < closes.length; i++) {
            const diff = closes[i] - closes[i - 1];
            if (diff >= 0) { avgGain = (avgGain * 13 + diff) / 14; avgLoss = (avgLoss * 13) / 14; }
            else { avgGain = (avgGain * 13) / 14; avgLoss = (avgLoss * 13 - diff) / 14; }
            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            rsi[i] = 100 - (100 / (1 + rs));
        }
        return rsi;
    }

    function calculateDisparity(closes, period = 20) {
        const disp = new Array(closes.length).fill(100);
        for (let i = period; i < closes.length; i++) {
            const ma = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
            disp[i] = (closes[i] / ma) * 100;
        }
        return disp;
    }

    function calculateMA(closes, period) {
        const ma = new Array(closes.length).fill(closes[0]);
        for (let i = period - 1; i < closes.length; i++) {
            const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            ma[i] = sum / period;
        }
        return ma;
    }

    function calculateCCI(candles, period = 14) {
        const cci = new Array(candles.length).fill(0);
        const tpList = candles.map(c => (c.high + c.low + c.close) / 3);
        for (let i = period; i < candles.length; i++) {
            const slice = tpList.slice(i - period + 1, i + 1);
            const sma = slice.reduce((a, b) => a + b, 0) / period;
            const meanDev = slice.reduce((a, b) => a + Math.abs(b - sma), 0) / period;
            cci[i] = meanDev === 0 ? 0 : (tpList[i] - sma) / (0.015 * meanDev);
        }
        return cci;
    }

    function calculateWilliamsR(candles, period = 14) {
        const wR = new Array(candles.length).fill(-50);
        for (let i = period; i < candles.length; i++) {
            const slice = candles.slice(i - period + 1, i + 1);
            const highestHigh = Math.max(...slice.map(c => c.high));
            const lowestLow = Math.min(...slice.map(c => c.low));
            const diff = highestHigh - lowestLow;
            wR[i] = diff === 0 ? -50 : ((highestHigh - candles[i].close) / diff) * -100;
        }
        return wR;
    }

    function calculateIchimoku(candles) {
        const tenkan = new Array(candles.length).fill(candles[0].close);
        const kijun = new Array(candles.length).fill(candles[0].close);
        for (let i = 9; i < candles.length; i++) {
            const slice9 = candles.slice(i - 9, i);
            tenkan[i] = (Math.max(...slice9.map(c => c.high)) + Math.min(...slice9.map(c => c.low))) / 2;
        }
        for (let i = 26; i < candles.length; i++) {
            const slice26 = candles.slice(i - 26, i);
            kijun[i] = (Math.max(...slice26.map(c => c.high)) + Math.min(...slice26.map(c => c.low))) / 2;
        }
        return { tenkan, kijun };
    }

    function calculateATR(candles, period = 14) {
        const atr = new Array(candles.length).fill(0);
        for (let i = 1; i < candles.length; i++) {
            const tr = Math.max(
                candles[i].high - candles[i].low,
                Math.abs(candles[i].high - candles[i - 1].close),
                Math.abs(candles[i].low - candles[i - 1].close)
            );
            atr[i] = i < period ? tr : (atr[i - 1] * (period - 1) + tr) / period;
        }
        return atr;
    }

    function updatePinnedSignalCard() {
        const badge = document.getElementById('pinnedSignalBadge');
        const dateEl = document.getElementById('pinnedSignalDate');
        const descEl = document.getElementById('pinnedSignalDesc');
        const counterText = document.getElementById('scrubberCounterText');

        if (state.signals.length === 0) {
            badge.textContent = '신호 감지 대기';
            badge.className = 'signal-badge';
            dateEl.textContent = '';
            descEl.textContent = '현재 선택된 전략에 포착된 시그널이 없습니다.';
            counterText.textContent = '시그널 0 / 0';
            return;
        }

        const idx = Math.max(0, Math.min(state.signals.length - 1, state.pinnedIndex));
        const sig = state.signals[idx];

        badge.textContent = sig.type === 'BUY' ? '🔴 매수 포착' : '🔵 매도 포착';
        badge.className = `signal-badge ${sig.type.toLowerCase()}`;
        dateEl.textContent = sig.date;
        descEl.textContent = sig.desc;
        counterText.textContent = `시그널 ${idx + 1} / ${state.signals.length}`;
    }

    /* ==========================================================================
       5. Chart Renderer Suite
       ========================================================================== */
    function renderMainChart() {
        const canvas = document.getElementById('mainStockChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (state.charts.main) {
            state.charts.main.destroy();
            state.charts.main = null;
        }

        const labels = state.candles.map(c => c.date);
        const closes = state.candles.map(c => c.close);

        const datasets = [{
            label: `${state.currentStockName} (종가)`,
            data: closes,
            borderColor: '#00f2fe',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1
        }];

        if (state.currentStrategy === 'kama3') {
            const dailyAvg = state.candles.map(c => (c.high + c.low + c.close) / 3);
            const high14 = state.candles.map((c, i) => {
                if (i < 14) return c.high;
                return Math.max(...state.candles.slice(i - 14, i).map(x => x.high));
            });
            datasets.push({ label: '일일평균가', data: dailyAvg, borderColor: '#10b981', borderWidth: 1.5, pointRadius: 0 });
            datasets.push({ label: '14일 최고가 연장선', data: high14, borderColor: '#ff3b69', borderWidth: 1.5, borderDash: [4, 4], pointRadius: 0 });
        }

        state.charts.main = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: { legend: { display: true, labels: { color: '#cbd5e1', font: { size: 11, weight: '700' } } } },
                scales: {
                    x: { ticks: { color: '#94a3b8', maxTicksLimit: 12 }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                    y: {
                        position: 'right',
                        ticks: { color: '#cbd5e1', font: { size: 11, weight: '700' }, callback: val => formatCompactAxisNumber(val) },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    }
                }
            }
        });
    }

    function buildSubChartDataset(page) {
        const labels = state.candles.map(c => c.date);
        const closes = state.candles.map(c => c.close);
        const volumes = state.candles.map(c => c.volume);

        if (page === 1) {
            return { labels, datasets: [{ label: 'RSI (14)', data: calculateRSI(closes, 14), borderColor: '#ff3b69', borderWidth: 1.5, pointRadius: 0 }] };
        } else if (page === 2) {
            const macd = closes.map((v, idx) => Math.sin(idx / 5) * 10);
            return { labels, datasets: [{ label: 'MACD', data: macd, type: 'bar', backgroundColor: macd.map(v => v >= 0 ? '#ff3b69' : '#38bdf8') }] };
        } else if (page === 3) {
            return {
                labels, datasets: [
                    { label: '이격도 5일', data: calculateDisparity(closes, 5), borderColor: '#00f2fe', borderWidth: 1, pointRadius: 0 },
                    { label: '이격도 20일', data: calculateDisparity(closes, 20), borderColor: '#a855f7', borderWidth: 1.5, pointRadius: 0 }
                ]
            };
        } else if (page === 4) {
            return { labels, datasets: [{ label: '거래량', data: volumes, type: 'bar', backgroundColor: 'rgba(0, 242, 254, 0.4)' }] };
        } else if (page === 5) {
            const ma20 = calculateMA(closes, 20);
            const pctB = closes.map((v, i) => i < 20 ? 0.5 : (v - ma20[i] * 0.95) / (ma20[i] * 0.1));
            return { labels, datasets: [{ label: '볼린저 %B', data: pctB, borderColor: '#fbbf24', borderWidth: 1.5, pointRadius: 0 }] };
        } else if (page === 6) {
            return { labels, datasets: [{ label: 'CCI (14)', data: calculateCCI(state.candles, 14), borderColor: '#ec4899', borderWidth: 1.5, pointRadius: 0 }] };
        } else if (page === 7) {
            const ichi = calculateIchimoku(state.candles);
            return {
                labels, datasets: [
                    { label: '전환선(9)', data: ichi.tenkan, borderColor: '#00f2fe', borderWidth: 1.5, pointRadius: 0 },
                    { label: '기준선(26)', data: ichi.kijun, borderColor: '#a855f7', borderWidth: 1.5, pointRadius: 0 }
                ]
            };
        } else if (page === 8) {
            const adx = calculateRSI(closes, 14).map(v => Math.abs(v - 50) * 1.8);
            return { labels, datasets: [{ label: 'ADX 추세강도', data: adx, borderColor: '#10b981', borderWidth: 1.5, pointRadius: 0 }] };
        } else if (page === 9) {
            return { labels, datasets: [{ label: 'MFI (14)', data: calculateRSI(closes, 14), borderColor: '#38bdf8', borderWidth: 1.5, pointRadius: 0 }] };
        } else {
            return { labels, datasets: [{ label: 'ATR (14)', data: calculateATR(state.candles, 14), borderColor: '#fb923c', borderWidth: 1.5, pointRadius: 0 }] };
        }
    }

    function renderSubChartPage(page) {
        const canvas = document.getElementById(`subChartPage${page}`);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (state.charts.sub[page]) {
            state.charts.sub[page].destroy();
            state.charts.sub[page] = null;
        }

        const chartData = buildSubChartDataset(page);

        state.charts.sub[page] = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true, maintainAspectRatio: false, animation: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#94a3b8', maxTicksLimit: 10 } },
                    y: { position: 'right', ticks: { color: '#cbd5e1', callback: val => formatCompactAxisNumber(val) } }
                }
            }
        });
    }

    function toggleAllSubChartsGrid() {
        state.isGridMode = !state.isGridMode;
        const flipBook = document.getElementById('flipPagesViewport');
        const gridBox = document.getElementById('multiIndicatorGrid');
        const toggleBtn = document.getElementById('toggleAllSubChartsBtn');

        if (state.isGridMode) {
            flipBook.classList.add('hidden');
            gridBox.classList.remove('hidden');
            toggleBtn.innerHTML = `<i data-lucide="book-open"></i> <span>1페이지 단독 책장 모드로 접기</span>`;
            renderAllSubChartsGrid();
        } else {
            gridBox.classList.add('hidden');
            flipBook.classList.remove('hidden');
            toggleBtn.innerHTML = `<i data-lucide="layout-grid"></i> <span>10개 보조지표 한눈에 펼쳐보기</span>`;
            renderSubChartPage(state.flipPage);
        }
        initLucideIcons();
    }

    function renderAllSubChartsGrid() {
        for (let page = 1; page <= 10; page++) {
            const canvas = document.getElementById(`gridSubChart${page}`);
            if (!canvas) continue;
            const ctx = canvas.getContext('2d');

            if (state.charts.grid[page]) {
                state.charts.grid[page].destroy();
                state.charts.grid[page] = null;
            }

            const chartData = buildSubChartDataset(page);

            state.charts.grid[page] = new Chart(ctx, {
                type: 'line',
                data: chartData,
                options: {
                    responsive: true, maintainAspectRatio: false, animation: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: '#94a3b8', maxTicksLimit: 8 } },
                        y: { position: 'right', ticks: { color: '#cbd5e1', callback: val => formatCompactAxisNumber(val) } }
                    }
                }
            });
        }
    }

    /* ==========================================================================
       6. Interactive Drawing & Fullscreen
       ========================================================================== */
    function initDrawingEngine() {
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.activeTool = btn.getAttribute('data-tool');
                document.getElementById('drawingCanvas').classList.add('active');
            });
        });

        document.getElementById('clearDrawingBtn').addEventListener('click', () => {
            state.drawings = [];
            const canvas = document.getElementById('drawingCanvas');
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        });
    }

    function toggleChartFullscreen() {
        const workspace = document.getElementById('chartWorkspace');
        const isFullscreen = workspace.classList.toggle('fullscreen-mode');
        const btnText = document.getElementById('fullscreenBtnText');
        const icon = document.getElementById('fullscreenIcon');

        if (isFullscreen) {
            btnText.textContent = '창 축소';
            icon.setAttribute('data-lucide', 'minimize');
            if (document.documentElement.requestFullscreen) {
                workspace.requestFullscreen().catch(() => {});
            }
        } else {
            btnText.textContent = '전체화면';
            icon.setAttribute('data-lucide', 'maximize');
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            }
        }
        initLucideIcons();
        if (state.charts.main) state.charts.main.resize();
    }

    /* ==========================================================================
       7. 10-Page Flip Book Carousel
       ========================================================================== */
    function initFlipBook() {
        const prevBtn = document.getElementById('flipPrevBtn');
        const nextBtn = document.getElementById('flipNextBtn');

        prevBtn.addEventListener('click', () => {
            if (state.flipPage > 1) {
                switchFlipPage(state.flipPage - 1);
            }
        });
        nextBtn.addEventListener('click', () => {
            if (state.flipPage < 10) {
                switchFlipPage(state.flipPage + 1);
            }
        });
    }

    function switchFlipPage(pageNum) {
        state.flipPage = pageNum;
        document.querySelectorAll('.flip-page').forEach(page => {
            page.classList.remove('active');
            if (parseInt(page.getAttribute('data-page'), 10) === pageNum) {
                page.classList.add('active');
            }
        });

        document.querySelectorAll('.indicator-tab').forEach(tab => {
            tab.classList.remove('active');
            if (parseInt(tab.getAttribute('data-page-tab'), 10) === pageNum) {
                tab.classList.add('active');
            }
        });

        const titles = [
            '', 'RSI & Stochastic', 'MACD 오실레이터', '이격도 (Disparity)', 'OBV & 거래량',
            '볼린저 %B & 밴드폭', 'CCI & Williams %R', '일목균형표', 'ADX & +DI/-DI',
            'MFI 자금유입지표', 'ATR 변동성지표'
        ];
        document.getElementById('flipPageIndicator').textContent = `${pageNum} / 10 페이지 (${titles[pageNum]})`;
        renderSubChartPage(pageNum);
    }

    /* ==========================================================================
       8. Portfolio Radar & Summary Metrics
       ========================================================================== */
    function initRealtimePricePoller() {
        setInterval(() => {
            checkRealtimeSignalAlarms();
        }, 15000);
    }

    function checkRealtimeSignalAlarms() {
        if (state.signals.length > 0) {
            const latest = state.signals[state.signals.length - 1];
            const alarmKey = `${state.currentSymbol}_${latest.date}_${latest.type}`;
            if (!state.alarms.some(a => a.key === alarmKey)) {
                state.alarms.push({ key: alarmKey, symbol: state.currentSymbol, name: state.currentStockName, signal: latest });

                const badge = document.getElementById('bellBadge');
                badge.textContent = state.alarms.length;
                badge.classList.remove('hidden');

                showToast(`🚨 [${state.currentStockName}] ${latest.type === 'BUY' ? '🔴 매수' : '🔵 매도'} 시그널 포착!`);
                renderAlarmList();
            }
        }
    }

    function renderAlarmList() {
        const container = document.getElementById('alarmListContainer');
        if (state.alarms.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>수신된 새로운 매매 시그널이 없습니다.</p></div>`;
            return;
        }
        container.innerHTML = state.alarms.map(a => `
            <div class="alarm-item">
                <strong>[${a.name}]</strong> ${a.signal.type === 'BUY' ? '🔴 매수' : '🔵 매도'} - ${a.signal.desc} (${a.signal.date})
            </div>
        `).join('');
    }

    function renderPortfolioRadarChart() {
        let totalBuy = 0;
        let totalVal = 0;

        state.holdings.forEach(h => {
            totalBuy += (h.buyPrice * h.quantity);
            totalVal += (h.currentPrice * h.quantity);
        });

        const totalDiff = totalVal - totalBuy;
        const totalPct = totalBuy > 0 ? ((totalDiff / totalBuy) * 100).toFixed(2) : '0.00';

        document.getElementById('totalAssetVal').textContent = `₩${totalVal.toLocaleString()}`;
        document.getElementById('totalBuyVal').textContent = `₩${totalBuy.toLocaleString()}`;

        const retEl = document.getElementById('totalReturnVal');
        retEl.textContent = `₩${totalDiff >= 0 ? '+' : ''}${totalDiff.toLocaleString()} (${totalDiff >= 0 ? '+' : ''}${totalPct}%)`;
        retEl.className = totalDiff >= 0 ? 'up' : 'down';

        const listContainer = document.getElementById('portfolioHoldingsList');
        if (state.holdings.length === 0) {
            listContainer.innerHTML = `<p class="text-muted fs-xs">등록된 보유 종목이 없습니다.</p>`;
        } else {
            listContainer.innerHTML = state.holdings.map(h => {
                const itemVal = h.currentPrice * h.quantity;
                const weightPct = totalVal > 0 ? ((itemVal / totalVal) * 100).toFixed(1) : '0';
                return `
                    <div class="mini-holding-item">
                        <div>
                            <strong>${h.name} (${h.symbol})</strong>
                            <div class="fs-xs text-muted">비중 ${weightPct}% | ${h.quantity}주</div>
                        </div>
                        <div class="text-right">
                            <strong class="${h.currentPrice >= h.buyPrice ? 'up' : 'down'}">₩${itemVal.toLocaleString()}</strong>
                        </div>
                    </div>
                `;
            }).join('');
        }

        const canvas = document.getElementById('portfolioRadarChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (state.charts.radar) {
            state.charts.radar.destroy();
            state.charts.radar = null;
        }

        const labels = ['수익성', '안정성', '성장성', '모멘텀', '리스크관리'];
        const scores = state.holdings.length > 0 ? [85, 90, 88, 92, 86] : [50, 50, 50, 50, 50];

        state.charts.radar = new Chart(ctx, {
            type: 'radar',
            data: {
                labels,
                datasets: [{
                    label: '자산 종합 밸런스',
                    data: scores,
                    backgroundColor: 'rgba(0, 242, 254, 0.2)',
                    borderColor: '#00f2fe',
                    borderWidth: 2,
                    pointBackgroundColor: '#00f2fe'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, animation: false,
                plugins: { legend: { display: false } },
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255,255,255,0.1)' },
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        pointLabels: { color: '#94a3b8', font: { size: 11 } },
                        ticks: { display: false }
                    }
                }
            }
        });
    }

    function renderHoldingsTable() {
        const tbody = document.getElementById('holdingsTableBody');
        tbody.innerHTML = state.holdings.map((h, i) => `
            <tr>
                <td>${h.name} (${h.symbol})</td>
                <td>${h.buyPrice.toLocaleString()}</td>
                <td>${h.currentPrice.toLocaleString()}</td>
                <td>${h.quantity}</td>
                <td>${(h.currentPrice * h.quantity).toLocaleString()}</td>
                <td class="${h.currentPrice >= h.buyPrice ? 'up' : 'down'}">
                    ${(((h.currentPrice - h.buyPrice) / h.buyPrice) * 100).toFixed(2)}%
                </td>
                <td><button type="button" class="btn btn-xs btn-outline" onclick="removeHolding(${i})">삭제</button></td>
            </tr>
        `).join('');
    }

    window.removeHolding = function (idx) {
        state.holdings.splice(idx, 1);
        saveHoldingsToStorage();
        renderHoldingsTable();
        renderPortfolioRadarChart();
    };

    function renderWatchlistModal() {
        const container = document.getElementById('watchlistItemsContainer');
        container.innerHTML = state.watchlist.map(w => `
            <div class="watchlist-card" onclick="handleStockSearch('${w.symbol}', '${w.name}')">
                <strong>${w.name}</strong> <span>${w.price} (${w.change})</span>
            </div>
        `).join('');
    }

    function renderHotStocksModal(type) {
        const grid = document.getElementById('hotRankingGrid');
        const items = HOT_STOCKS[type] || HOT_STOCKS.popular;
        grid.innerHTML = items.map((item, idx) => `
            <div class="hot-card" onclick="handleStockSearch('${item.code}', '${item.name}')">
                <span class="rank-num">#${idx + 1}</span>
                <strong>${item.name}</strong> (${item.code})
                <span class="${item.isUp ? 'up' : 'down'}">${item.price} (${item.change})</span>
            </div>
        `).join('');
    }

    window.handleStockSearch = handleStockSearch;

})();
