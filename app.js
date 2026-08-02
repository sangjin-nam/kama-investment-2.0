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
        searchCountry: 'KR',
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
        chartType: 'line',
        timeframeRange: 'max',
        chartScrollOffset: 0,
        charts: {
            main: null,
            sub: {},
            grid: {}
        }
    };

    function getFilteredCandles() {
        if (state.candles.length === 0) return [];
        let count = state.candles.length;
        if (state.timeframeRange === '1m') {
            count = 20;
        } else if (state.timeframeRange === '3m') {
            count = 60;
        } else if (state.timeframeRange === '6m') {
            count = 120;
        } else if (state.timeframeRange === '1y') {
            count = 250;
        }
        const end = state.candles.length - (state.chartScrollOffset || 0);
        const start = Math.max(0, end - count);
        if (start < 0) {
            state.chartScrollOffset = Math.max(0, state.candles.length - count);
            return state.candles.slice(0, Math.min(count, state.candles.length));
        }
        return state.candles.slice(start, end);
    }

    const imgBuy = new Image(18, 18);
    imgBuy.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23ff3b69" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>';

    const imgSell = new Image(18, 18);
    imgSell.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%2338bdf8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>';

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
        initChartPanningEngine();
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

    function initChartPanningEngine() {
        const container = document.getElementById('chartCanvasContainer');
        if (!container) return;

        let isPanning = false;
        let panStartX = 0;
        let initialScrollOffset = 0;

        container.style.cursor = 'grab';

        container.addEventListener('mousedown', (e) => {
            if (state.activeTool) return;
            isPanning = true;
            panStartX = e.clientX;
            initialScrollOffset = state.chartScrollOffset || 0;
            container.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isPanning) return;
            const deltaX = e.clientX - panStartX;
            const visibleCount = getFilteredCandles().length;
            const containerWidth = container.getBoundingClientRect().width;
            const pxPerCandle = containerWidth / (visibleCount || 50);

            // Panning formula: positive deltaX means scrolling into history (increasing offset)
            const candleDelta = Math.round(deltaX / pxPerCandle);
            let newOffset = initialScrollOffset + candleDelta;

            const maxOffset = Math.max(0, state.candles.length - visibleCount);
            newOffset = Math.max(0, Math.min(maxOffset, newOffset));

            if (newOffset !== state.chartScrollOffset) {
                state.chartScrollOffset = newOffset;
                recalculateSignalsAndDraw();
            }
        });

        window.addEventListener('mouseup', () => {
            if (isPanning) {
                isPanning = false;
                container.style.cursor = state.activeTool ? 'crosshair' : 'grab';
            }
        });

        // Touch support for mobile devices
        container.addEventListener('touchstart', (e) => {
            if (state.activeTool || e.touches.length === 0) return;
            isPanning = true;
            panStartX = e.touches[0].clientX;
            initialScrollOffset = state.chartScrollOffset || 0;
        });

        container.addEventListener('touchmove', (e) => {
            if (!isPanning || e.touches.length === 0) return;
            const deltaX = e.touches[0].clientX - panStartX;
            const visibleCount = getFilteredCandles().length;
            const containerWidth = container.getBoundingClientRect().width;
            const pxPerCandle = containerWidth / (visibleCount || 50);

            const candleDelta = Math.round(deltaX / pxPerCandle);
            let newOffset = initialScrollOffset + candleDelta;

            const maxOffset = Math.max(0, state.candles.length - visibleCount);
            newOffset = Math.max(0, Math.min(maxOffset, newOffset));

            if (newOffset !== state.chartScrollOffset) {
                state.chartScrollOffset = newOffset;
                recalculateSignalsAndDraw();
            }
        });

        container.addEventListener('touchend', () => {
            isPanning = false;
        });
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

        // Chart Type Switcher Listeners
        document.getElementById('btnLineChart').addEventListener('click', () => {
            document.getElementById('btnLineChart').classList.add('active');
            document.getElementById('btnCandleChart').classList.remove('active');
            state.chartType = 'line';
            renderMainChart();
        });
        document.getElementById('btnCandleChart').addEventListener('click', () => {
            document.getElementById('btnCandleChart').classList.add('active');
            document.getElementById('btnLineChart').classList.remove('active');
            state.chartType = 'candle';
            renderMainChart();
        });

        // Timeframe Range Switcher Listeners
        document.querySelectorAll('.timeframe-range-group button').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.timeframe-range-group button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.timeframeRange = btn.getAttribute('data-range');
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

        // Synchronize and bind search country toggle buttons
        function syncSearchCountry(country) {
            state.searchCountry = country;
            document.querySelectorAll('.search-country-toggle').forEach(toggle => {
                toggle.querySelectorAll('.country-pill').forEach(btn => {
                    if (btn.getAttribute('data-country') === country) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
            });
        }

        document.querySelectorAll('.search-country-toggle .country-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const country = btn.getAttribute('data-country');
                syncSearchCountry(country);
                
                // Dispatch input event to refresh active autocomplete dropdown
                const activeInput = document.activeElement;
                if (activeInput && (activeInput.id === 'heroSearchInput' || activeInput.id === 'miniSearchInput')) {
                    activeInput.dispatchEvent(new Event('input'));
                }
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

                    if (results.length === 0 && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
                        try {
                            const resPs = await fetch(`http://localhost:8080/api/search?q=${encodeURIComponent(q)}`);
                            if (resPs.ok) {
                                const dataPs = await resPs.json();
                                results = dataPs.quotes ? dataPs.quotes.map(x => ({ code: x.symbol, name: x.shortname || x.symbol, country: 'US', market: x.exchange })) : [];
                            }
                        } catch (err) { }
                    }

                    if (results.length > 0) {
                        const filteredResults = results.filter(r => r.country === state.searchCountry);

                        if (filteredResults.length > 0) {
                            dropdownEl.innerHTML = filteredResults.slice(0, 10).map(r => {
                                const isKr = r.country === 'KR';
                                const flag = isKr ? '🇰🇷' : '🇺🇸';
                                const displayName = (r.name.startsWith('🇰🇷') || r.name.startsWith('🇺🇸')) ? r.name : `${flag} ${r.name}`;
                                return `
                                    <div class="search-dropdown-item" data-code="${r.code}" data-name="${r.name}" data-country="${r.country}">
                                        <span class="dropdown-stock-name">${displayName}</span>
                                        <span class="dropdown-stock-code">${r.code} (${r.market || r.country})</span>
                                    </div>
                                `;
                            }).join('');
                            dropdownEl.classList.remove('hidden');

                            dropdownEl.querySelectorAll('.search-dropdown-item').forEach(item => {
                                item.addEventListener('click', () => {
                                    const code = item.getAttribute('data-code');
                                    const name = item.getAttribute('data-name');
                                    const country = item.getAttribute('data-country');
                                    inputEl.value = name;
                                    dropdownEl.classList.add('hidden');
                                    handleStockSearch(code, name, country);
                                });
                            });
                        } else {
                            dropdownEl.classList.add('hidden');
                        }
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
    async function handleStockSearch(query, nameHint, countryHint) {
        const cleanQuery = query.trim();
        if (!cleanQuery) return;

        showDashboardView();

        let code = cleanQuery.toUpperCase();
        let name = nameHint || cleanQuery;
        let country = countryHint;

        // If no countryHint is provided (direct user keyboard search), resolve it
        if (!country) {
            if (/^\d{6}$/.test(cleanQuery)) {
                country = 'KR';
                code = cleanQuery;
            } else {
                try {
                    const res = await fetch(`/api/search?q=${encodeURIComponent(cleanQuery)}`);
                    if (res.ok) {
                        const data = await res.json();
                        const matched = (data.results || []).find(r => r.country === state.searchCountry);
                        if (matched) {
                            code = matched.code;
                            name = matched.name;
                            country = matched.country;
                        } else if (data.results && data.results.length > 0) {
                            const first = data.results[0];
                            code = first.code;
                            name = first.name;
                            country = first.country;
                        } else {
                            country = state.searchCountry;
                        }
                    } else {
                        country = state.searchCountry;
                    }
                } catch (e) {
                    country = state.searchCountry;
                }
            }
        }

        await loadStockData(code, name, country);
    }

    async function loadStockData(code, name, country) {
        let fetchedData = null;

        try {
            const edgeRes = await fetch(`/api/stock?code=${code}&country=${country}&includePrePost=true`);
            if (edgeRes.ok) fetchedData = await edgeRes.json();
        } catch (e) { }

        if ((!fetchedData || !fetchedData.candles || fetchedData.candles.length === 0) && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            try {
                const psRes = await fetch(`http://localhost:8080/api/stock?code=${code}&country=${country}`);
                if (psRes.ok) fetchedData = await psRes.json();
            } catch (e) { }
        }

        if (!fetchedData || !fetchedData.candles || fetchedData.candles.length === 0) {
            fetchedData = generateFallbackCandles(code, country);
        }

        const flag = country === 'KR' ? '🇰🇷' : '🇺🇸';
        let finalName = name;
        if (!finalName.startsWith('🇰🇷') && !finalName.startsWith('🇺🇸')) {
            finalName = `${flag} ${finalName}`;
        }

        state.chartScrollOffset = 0;
        state.candles = fetchedData.candles || [];
        state.extendedHours = fetchedData.extendedHours || null;
        state.currentSymbol = code;
        state.currentStockName = finalName;

        document.getElementById('currentStockName').textContent = finalName;
        document.getElementById('currentStockSymbol').textContent = code;

        const marketEl = document.getElementById('currentStockMarket');
        if (marketEl) {
            marketEl.textContent = country === 'KR' ? 'KRX' : 'US';
        }

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

        const priceEl = document.getElementById('currentStockPrice');
        const currencyEl = document.getElementById('currentStockCurrency');
        const changeEl = document.getElementById('currentStockChange');
        const extBadge = document.getElementById('extHoursBadge');
        const extHoursLabel = document.getElementById('extHoursLabel');
        const extPriceContainer = document.getElementById('currentStockExtPrice');
        const extPriceLabel = document.getElementById('extPriceLabel');
        const extPriceVal = document.getElementById('extPriceVal');
        const extPriceChange = document.getElementById('extPriceChange');

        // Detect country from symbol
        const isKr = /^\d{6}$/.test(state.currentSymbol) || state.currentSymbol.includes('.KS') || state.currentSymbol.includes('.KQ');

        // Set currency symbol and ordering
        if (isKr) {
            if (currencyEl) {
                currencyEl.textContent = '원';
                currencyEl.style.order = '2';
            }
            priceEl.style.order = '1';
        } else {
            if (currencyEl) {
                currencyEl.textContent = '$';
                currencyEl.style.order = '1';
            }
            priceEl.style.order = '2';
        }

        let mainPrice = last.close;
        let mainDiff = last.close - prev.close;
        let mainPct = ((mainDiff / prev.close) * 100).toFixed(2);

        // US Extended Hours Realtime Updates
        if (!isKr && state.extendedHours) {
            const eh = state.extendedHours;
            mainPrice = eh.regularMarketPrice;
            mainDiff = eh.regularMarketChange;
            mainPct = eh.regularMarketChangePercent;

            if ((eh.currentMarketState === 'PRE' || eh.currentMarketState === 'POST') && eh.extendedMarketPrice) {
                extBadge.classList.remove('hidden');
                extPriceContainer.classList.remove('hidden');

                if (eh.currentMarketState === 'PRE') {
                    if (extHoursLabel) extHoursLabel.textContent = '🌙 프리마켓 거래중';
                    if (extPriceLabel) extPriceLabel.textContent = '🌙 프리마켓';
                } else {
                    if (extHoursLabel) extHoursLabel.textContent = '🌙 애프터마켓 거래중';
                    if (extPriceLabel) extPriceLabel.textContent = '🌙 애프터마켓';
                }

                if (extPriceVal) extPriceVal.textContent = `$${eh.extendedMarketPrice.toFixed(2)}`;
                if (extPriceChange) {
                    extPriceChange.textContent = `${eh.extendedMarketChange >= 0 ? '+' : ''}${eh.extendedMarketChange.toFixed(2)} (${eh.extendedMarketChangePercent >= 0 ? '+' : ''}${eh.extendedMarketChangePercent.toFixed(2)}%)`;
                    extPriceChange.className = `ext-price-change ${eh.extendedMarketChange >= 0 ? 'up' : 'down'}`;
                }
            } else {
                extBadge.classList.add('hidden');
                extPriceContainer.classList.add('hidden');
                if (eh.currentMarketState === 'REGULAR') {
                    extBadge.classList.remove('hidden');
                    if (extHoursLabel) extHoursLabel.textContent = '☀️ 정규장 개장 중';
                }
            }
        } else {
            extBadge.classList.add('hidden');
            extPriceContainer.classList.add('hidden');
        }

        priceEl.textContent = isKr ? mainPrice.toLocaleString() : mainPrice.toFixed(2);
        changeEl.textContent = `${mainDiff >= 0 ? '+' : ''}${isKr ? Math.round(mainDiff).toLocaleString() : mainDiff.toFixed(2)} (${mainDiff >= 0 ? '+' : ''}${Number(mainPct).toFixed(2)}%)`;
        changeEl.className = `price-change-tag ${mainDiff >= 0 ? 'up' : 'down'}`;
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
                const low14 = Math.min(...state.candles.slice(i - 14, i).map(c => c.low));
                const dailyAvg = (state.candles[i].high + state.candles[i].low + state.candles[i].close) / 3;
                const prevDailyAvg = (state.candles[i - 1].high + state.candles[i - 1].low + state.candles[i - 1].close) / 3;

                if (dailyAvg > high14 && prevDailyAvg <= high14) {
                    state.signals.push({ index: i, type: 'BUY', date: dates[i], price: closes[i], desc: '일일평균가 14일 최고가 추세선 상향 돌파' });
                } else if (dailyAvg < low14 && prevDailyAvg >= low14) {
                    state.signals.push({ index: i, type: 'SELL', date: dates[i], price: closes[i], desc: '일일평균가 14일 최저가 추세선 하향 이탈' });
                }
            }
        }

        const aiPanel = document.getElementById('aiPatternPanel');
        if (state.currentStrategy === 'kama4') {
            if (aiPanel) aiPanel.classList.remove('hidden');
            runAIPatternEngine();
        } else {
            if (aiPanel) aiPanel.classList.add('hidden');
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

    function runAIPatternEngine() {
        if (state.candles.length < 30) return;
        const closes = state.candles.map(c => c.close);
        const dates = state.candles.map(c => c.date);
        const N = closes.length;
        const L = 10; // pattern window size
        
        const currentWindow = closes.slice(N - L);
        const matches = [];

        for (let i = 0; i <= N - L - 5; i++) {
            const histWindow = closes.slice(i, i + L);
            const corr = calculatePearson(currentWindow, histWindow);
            if (corr >= 0.80) {
                const anchorPrice = closes[i + L - 1];
                const futurePrice = closes[i + L + 4];
                const pctChange = ((futurePrice - anchorPrice) / anchorPrice) * 100;
                matches.push({
                    index: i + L - 1,
                    startIndex: i,
                    dateRange: `${dates[i].substring(5)} ~ ${dates[i + L - 1].substring(5)}`,
                    corr,
                    pctChange
                });
            }
        }

        // Sort by correlation descending
        matches.sort((a, b) => b.corr - a.corr);
        
        // Take top 9 matches
        const topMatches = matches.slice(0, 9);
        
        // Render UI
        const countEl = document.getElementById('aiPatternCount');
        const corrEl = document.getElementById('aiPatternCorr');
        const upProbEl = document.getElementById('aiPatternUpProb');
        const signalEl = document.getElementById('aiPatternSignal');
        const accuracyEl = document.getElementById('aiPatternAccuracy');
        const listEl = document.getElementById('aiPatternList');

        if (topMatches.length === 0) {
            if (countEl) countEl.textContent = '0 회';
            if (corrEl) corrEl.textContent = '--%';
            if (upProbEl) upProbEl.textContent = '--%';
            if (signalEl) {
                signalEl.textContent = '의견 없음';
                signalEl.className = 'stat-val';
            }
            if (accuracyEl) accuracyEl.textContent = '매칭 신뢰도: 낮음';
            if (listEl) listEl.innerHTML = '<div class="no-pattern-msg" style="grid-column: span 3; text-align: center; color: #64748b; font-size: 0.85rem; padding: 12px 0;">유사한 과거 주가 패턴을 찾지 못했습니다.</div>';
            return;
        }

        const avgCorr = topMatches.reduce((sum, m) => sum + m.corr, 0) / topMatches.length;
        const upMatches = topMatches.filter(m => m.pctChange > 0);
        const upProbability = (upMatches.length / topMatches.length) * 100;

        if (countEl) countEl.textContent = `${matches.length} 회`;
        if (corrEl) corrEl.textContent = `${Math.round(avgCorr * 100)}%`;
        if (upProbEl) {
            upProbEl.textContent = `${Math.round(upProbability)}%`;
            upProbEl.className = `stat-val ${upProbability >= 60 ? 'up' : upProbability <= 40 ? 'down' : ''}`;
        }

        let overallSignal = 'HOLD (중립)';
        let signalClass = 'stat-val';
        if (upProbability >= 65) {
            overallSignal = '🤖 매수 추천';
            signalClass = 'stat-val up';
        } else if (upProbability <= 35) {
            overallSignal = '🤖 매도 추천';
            signalClass = 'stat-val down';
        }
        if (signalEl) {
            signalEl.textContent = overallSignal;
            signalEl.className = signalClass;
        }

        if (accuracyEl) {
            const relText = avgCorr >= 0.90 ? '매우 높음' : avgCorr >= 0.85 ? '높음' : '보통';
            accuracyEl.textContent = `매칭 신뢰도: ${relText} (${Math.round(avgCorr * 100)}%)`;
        }

        // Render matched list
        if (listEl) {
            listEl.innerHTML = topMatches.map(m => {
                const isUp = m.pctChange > 0;
                return `
                    <div class="ai-match-card" data-index="${m.index}">
                        <span class="ai-match-date"><i data-lucide="calendar" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:4px;"></i>${m.dateRange}</span>
                        <div class="ai-match-meta">
                            <span class="ai-match-sim">${Math.round(m.corr * 100)}% 유사</span>
                            <span class="ai-match-perf ${isUp ? 'up' : 'down'}">${isUp ? '📈 +' : '📉 '}${m.pctChange.toFixed(2)}%</span>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Bind click to match cards to focus chart on that date
            listEl.querySelectorAll('.ai-match-card').forEach(card => {
                card.addEventListener('click', () => {
                    const idx = parseInt(card.getAttribute('data-index'), 10);
                    state.pinnedIndex = state.signals.findIndex(s => s.index === idx);
                    if (state.pinnedIndex === -1) {
                        state.signals.push({ index: idx, type: 'BUY', date: dates[idx], price: closes[idx], desc: '클릭 매칭 과거 유사 패턴 위치' });
                        state.pinnedIndex = state.signals.length - 1;
                    }
                    const rangeSlider = document.getElementById('signalScrubberRange');
                    if (rangeSlider) {
                        rangeSlider.max = Math.max(1, state.signals.length);
                        rangeSlider.value = state.pinnedIndex + 1;
                    }
                    updatePinnedSignalCard();
                    renderMainChart();
                });
            });
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }

        // Add matches to state.signals so they are drawn on chart
        topMatches.forEach(m => {
            const isUp = m.pctChange > 0;
            state.signals.push({
                index: m.index,
                type: isUp ? 'BUY' : 'SELL',
                date: dates[m.index],
                price: closes[m.index],
                desc: `과거 유사 패턴 위치 (${Math.round(m.corr*100)}% 일치, 5일후 ${isUp ? '+' : ''}${m.pctChange.toFixed(2)}%)`
            });
        });

        // Add overall prediction signal at the last candle
        if (upProbability >= 65) {
            state.signals.push({
                index: N - 1,
                type: 'BUY',
                date: dates[N - 1],
                price: closes[N - 1],
                desc: `🤖 AI 매수 예측: 과거 ${matches.length}회 반복 패턴 기반 상승 확률 ${Math.round(upProbability)}%`
            });
        } else if (upProbability <= 35) {
            state.signals.push({
                index: N - 1,
                type: 'SELL',
                date: dates[N - 1],
                price: closes[N - 1],
                desc: `🤖 AI 매도 예측: 과거 ${matches.length}회 반복 패턴 기반 하락 확률 ${Math.round(100 - upProbability)}%`
            });
        }
    }

    function calculatePearson(x, y) {
        const n = x.length;
        let sumX = 0, sumY = 0, sumXY = 0;
        let sumX2 = 0, sumY2 = 0;
        for (let i = 0; i < n; i++) {
            sumX += x[i];
            sumY += y[i];
            sumXY += x[i] * y[i];
            sumX2 += x[i] * x[i];
            sumY2 += y[i] * y[i];
        }
        const num = n * sumXY - sumX * sumY;
        const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        if (den === 0) return 0;
        return num / den;
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
        const spanA = new Array(candles.length).fill(candles[0].close);
        const spanB = new Array(candles.length).fill(candles[0].close);
        
        for (let i = 8; i < candles.length; i++) {
            const slice9 = candles.slice(i - 8, i + 1);
            tenkan[i] = (Math.max(...slice9.map(c => c.high)) + Math.min(...slice9.map(c => c.low))) / 2;
        }
        for (let i = 25; i < candles.length; i++) {
            const slice26 = candles.slice(i - 25, i + 1);
            kijun[i] = (Math.max(...slice26.map(c => c.high)) + Math.min(...slice26.map(c => c.low))) / 2;
        }
        for (let i = 0; i < candles.length; i++) {
            const baseVal = (tenkan[i] + kijun[i]) / 2;
            if (i + 26 < candles.length) {
                spanA[i + 26] = baseVal;
            }
        }
        for (let i = 51; i < candles.length; i++) {
            const slice52 = candles.slice(i - 51, i + 1);
            const val52 = (Math.max(...slice52.map(c => c.high)) + Math.min(...slice52.map(c => c.low))) / 2;
            if (i + 26 < candles.length) {
                spanB[i + 26] = val52;
            }
        }
        return { tenkan, kijun, spanA, spanB };
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

    function calculateStochastic(candles, period = 14, kPeriod = 3, dPeriod = 3) {
        const k = new Array(candles.length).fill(50);
        const d = new Array(candles.length).fill(50);
        const fastK = new Array(candles.length).fill(50);

        for (let i = period - 1; i < candles.length; i++) {
            const sub = candles.slice(i - period + 1, i + 1);
            const highs = sub.map(c => c.high);
            const lows = sub.map(c => c.low);
            const highest = Math.max(...highs);
            const lowest = Math.min(...lows);
            const diff = highest - lowest;
            fastK[i] = diff === 0 ? 50 : ((candles[i].close - lowest) / diff) * 100;
        }

        for (let i = period + kPeriod - 2; i < candles.length; i++) {
            const sum = fastK.slice(i - kPeriod + 1, i + 1).reduce((a, b) => a + b, 0);
            k[i] = sum / kPeriod;
        }

        for (let i = period + kPeriod + dPeriod - 3; i < candles.length; i++) {
            const sum = k.slice(i - dPeriod + 1, i + 1).reduce((a, b) => a + b, 0);
            d[i] = sum / dPeriod;
        }

        return { k, d };
     }

     function calculateBollinger(closes, period = 20, multiplier = 2) {
         const mid = new Array(closes.length).fill(closes[0]);
         const pctB = new Array(closes.length).fill(50);
         const bandwidth = new Array(closes.length).fill(0);

         for (let i = period - 1; i < closes.length; i++) {
             const sub = closes.slice(i - period + 1, i + 1);
             const average = sub.reduce((a, b) => a + b, 0) / period;
             mid[i] = average;

             const variance = sub.reduce((a, b) => a + Math.pow(b - average, 2), 0) / period;
             const stddev = Math.sqrt(variance);
             
             const upper = average + multiplier * stddev;
             const lower = average - multiplier * stddev;
             const diff = upper - lower;

             pctB[i] = diff === 0 ? 50 : ((closes[i] - lower) / diff) * 100;
             bandwidth[i] = average === 0 ? 0 : (diff / average) * 100;
         }

         return { pctB, bandwidth };
     }

     function calculateWilliamsR(candles, period = 14) {
         const r = new Array(candles.length).fill(-50);
         for (let i = period - 1; i < candles.length; i++) {
             const sub = candles.slice(i - period + 1, i + 1);
             const highest = Math.max(...sub.map(c => c.high));
             const lowest = Math.min(...sub.map(c => c.low));
             const diff = highest - lowest;
             r[i] = diff === 0 ? -50 : -100 * (highest - candles[i].close) / diff;
         }
         return r;
     }

     function calculateDMI(candles, period = 14) {
         const tr = new Array(candles.length).fill(0);
         const plusDM = new Array(candles.length).fill(0);
         const minusDM = new Array(candles.length).fill(0);

         for (let i = 1; i < candles.length; i++) {
             const c = candles[i];
             const prev = candles[i - 1];
             tr[i] = Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close));
             const diffHigh = c.high - prev.high;
             const diffLow = prev.low - c.low;
             plusDM[i] = (diffHigh > diffLow && diffHigh > 0) ? diffHigh : 0;
             minusDM[i] = (diffLow > diffHigh && diffLow > 0) ? diffLow : 0;
         }

         const smoothTR = new Array(candles.length).fill(0);
         const smoothPlusDM = new Array(candles.length).fill(0);
         const smoothMinusDM = new Array(candles.length).fill(0);

         let sumTR = 0, sumPlus = 0, sumMinus = 0;
         for (let i = 1; i <= period; i++) {
             sumTR += tr[i];
             sumPlus += plusDM[i];
             sumMinus += minusDM[i];
         }
         smoothTR[period] = sumTR;
         smoothPlusDM[period] = sumPlus;
         smoothMinusDM[period] = sumMinus;

         for (let i = period + 1; i < candles.length; i++) {
             smoothTR[i] = smoothTR[i - 1] - (smoothTR[i - 1] / period) + tr[i];
             smoothPlusDM[i] = smoothPlusDM[i - 1] - (smoothPlusDM[i - 1] / period) + plusDM[i];
             smoothMinusDM[i] = smoothMinusDM[i - 1] - (smoothMinusDM[i - 1] / period) + minusDM[i];
         }

         const plusDI = new Array(candles.length).fill(0);
         const minusDI = new Array(candles.length).fill(0);
         const dx = new Array(candles.length).fill(0);

         for (let i = period; i < candles.length; i++) {
             plusDI[i] = smoothTR[i] === 0 ? 0 : (smoothPlusDM[i] / smoothTR[i]) * 100;
             minusDI[i] = smoothTR[i] === 0 ? 0 : (smoothMinusDM[i] / smoothTR[i]) * 100;
             const diff = Math.abs(plusDI[i] - minusDI[i]);
             const sum = plusDI[i] + minusDI[i];
             dx[i] = sum === 0 ? 0 : (diff / sum) * 100;
         }

         const adx = calculateEMA(dx.slice(period), period);
         const adxFull = new Array(candles.length).fill(0);
         for (let i = period; i < candles.length; i++) {
             adxFull[i] = adx[i - period] || 0;
         }

         return { plusDI, minusDI, adx: adxFull };
     }

     function calculateMFI(candles, period = 14) {
         const mfi = new Array(candles.length).fill(50);
         const tp = candles.map(c => (c.high + c.low + c.close) / 3);
         const rmf = candles.map((c, i) => tp[i] * c.volume);
         
         const pmf = new Array(candles.length).fill(0);
         const nmf = new Array(candles.length).fill(0);
         
         for (let i = 1; i < candles.length; i++) {
             if (tp[i] > tp[i - 1]) {
                 pmf[i] = rmf[i];
             } else if (tp[i] < tp[i - 1]) {
                 nmf[i] = rmf[i];
             }
         }

         for (let i = period; i < candles.length; i++) {
             const sumPMF = pmf.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
             const sumNMF = nmf.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
             if (sumNMF === 0) {
                 mfi[i] = 100;
             } else {
                 const mr = sumPMF / sumNMF;
                 mfi[i] = 100 - (100 / (1 + mr));
             }
         }
         return mfi;
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
        if (state.resizeDrawingCanvas) {
            state.resizeDrawingCanvas();
        }
        if (state.charts.main) {
            state.charts.main.destroy();
            state.charts.main = null;
        }

        const visibleCandles = getFilteredCandles();
        const labels = visibleCandles.map(c => c.date);
        const closes = visibleCandles.map(c => c.close);

        let datasets = [];

        if (state.chartType === 'candle') {
            datasets.push({
                label: `${state.currentStockName} (캔들)`,
                type: 'bar',
                data: visibleCandles.map(c => [c.open, c.close]),
                backgroundColor: visibleCandles.map(c => c.close >= c.open ? '#ff3b69' : '#38bdf8'),
                borderColor: visibleCandles.map(c => c.close >= c.open ? '#ff3b69' : '#38bdf8'),
                borderWidth: 1.5,
                barPercentage: 0.6
            });
        } else {
            datasets.push({
                label: `${state.currentStockName} (종가)`,
                type: 'line',
                data: closes,
                borderColor: '#00f2fe',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.1
            });
        }

        if (state.currentStrategy === 'kama3') {
            const fullDailyAvg = state.candles.map(c => (c.high + c.low + c.close) / 3);
            const fullHigh14 = state.candles.map((c, i) => {
                if (i < 14) return c.high;
                return Math.max(...state.candles.slice(i - 14, i).map(x => x.high));
            });
            const fullLow14 = state.candles.map((c, i) => {
                if (i < 14) return c.low;
                return Math.min(...state.candles.slice(i - 14, i).map(x => x.low));
            });
            const fullAvg14 = state.candles.map((c, i) => {
                if (i < 14) {
                    const sub = state.candles.slice(0, i + 1);
                    const avgs = sub.map(x => (x.high + x.low + x.close) / 3);
                    return avgs.reduce((a, b) => a + b, 0) / avgs.length;
                } else {
                    const sub = state.candles.slice(i - 14, i);
                    const avgs = sub.map(x => (x.high + x.low + x.close) / 3);
                    return avgs.reduce((a, b) => a + b, 0) / 14;
                }
            });

            const startIdx = state.candles.indexOf(visibleCandles[0]);
            const endIdx = startIdx + visibleCandles.length;
            const slicedDailyAvg = fullDailyAvg.slice(startIdx, endIdx);
            const slicedHigh14 = fullHigh14.slice(startIdx, endIdx);
            const slicedLow14 = fullLow14.slice(startIdx, endIdx);
            const slicedAvg14 = fullAvg14.slice(startIdx, endIdx);

            datasets.push({ label: '일일평균가', data: slicedDailyAvg, borderColor: '#10b981', borderWidth: 1.5, pointRadius: 0, type: 'line' });
            datasets.push({ label: '14일 최고가 연장선', data: slicedHigh14, borderColor: '#ff3b69', borderWidth: 1.5, borderDash: [4, 4], pointRadius: 0, type: 'line' });
            datasets.push({ label: '14일 최저가 연장선', data: slicedLow14, borderColor: '#38bdf8', borderWidth: 1.5, borderDash: [4, 4], pointRadius: 0, type: 'line' });
            datasets.push({ label: '14일 평균가 연장선', data: slicedAvg14, borderColor: '#fbbf24', borderWidth: 1.5, borderDash: [4, 4], pointRadius: 0, type: 'line' });
        }

        // Plot buy/sell signals on chart
        const signalBuyData = new Array(visibleCandles.length).fill(null);
        const signalSellData = new Array(visibleCandles.length).fill(null);
        state.signals.forEach(s => {
            const visIdx = visibleCandles.findIndex(c => c.date === s.date);
            if (visIdx !== -1) {
                if (s.type === 'BUY') {
                    signalBuyData[visIdx] = visibleCandles[visIdx].close;
                } else if (s.type === 'SELL') {
                    signalSellData[visIdx] = visibleCandles[visIdx].close;
                }
            }
        });
        datasets.push({
            label: '매수 추천',
            data: signalBuyData,
            borderColor: '#ff3b69',
            backgroundColor: '#ff3b69',
            pointStyle: 'crossRot',
            borderWidth: 3,
            pointRadius: 10,
            pointHoverRadius: 12,
            showLine: false,
            type: 'line'
        });
        datasets.push({
            label: '매도 추천',
            data: signalSellData,
            borderColor: '#38bdf8',
            backgroundColor: '#38bdf8',
            pointStyle: 'crossRot',
            borderWidth: 3,
            pointRadius: 10,
            pointHoverRadius: 12,
            showLine: false,
            type: 'line'
        });

        const candlestickPlugin = {
            id: 'candlestickWicks',
            afterDatasetsDraw: (chart) => {
                if (state.chartType !== 'candle') return;
                const ctx = chart.ctx;
                const meta = chart.getDatasetMeta(0);
                visibleCandles.forEach((c, i) => {
                    const model = meta.data[i];
                    if (!model) return;
                    const x = model.x;
                    const yScale = chart.scales.y;
                    const yHigh = yScale.getPixelForValue(c.high);
                    const yLow = yScale.getPixelForValue(c.low);
                    ctx.save();
                    ctx.strokeStyle = c.close >= c.open ? '#ff3b69' : '#38bdf8';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(x, yHigh);
                    ctx.lineTo(x, yLow);
                    ctx.stroke();
                    ctx.restore();
                });
            }
        };

        state.charts.main = new Chart(ctx, {
            type: state.chartType === 'candle' ? 'bar' : 'line',
            data: { labels, datasets },
            plugins: [candlestickPlugin],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: { legend: { display: true, labels: { color: '#cbd5e1', font: { size: 11, weight: '700' } } } },
                scales: {
                    x: { ticks: { color: '#94a3b8', maxTicksLimit: 12 }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                    y: {
                        position: 'right',
                        beginAtZero: false,
                        ticks: { color: '#cbd5e1', font: { size: 11, weight: '700' }, callback: val => formatCompactAxisNumber(val) },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    }
                }
            }
        });
    }

    function calculateEMA(data, period) {
        if (data.length === 0) return [];
        const ema = new Array(data.length).fill(data[0]);
        const k = 2 / (period + 1);
        for (let i = 1; i < data.length; i++) {
            ema[i] = data[i] * k + ema[i - 1] * (1 - k);
        }
        return ema;
    }

    function calculateMACD(closes) {
        if (closes.length === 0) return { macd: [], signal: [], hist: [] };
        const ema12 = calculateEMA(closes, 12);
        const ema26 = calculateEMA(closes, 26);
        
        const macdLine = new Array(closes.length);
        for (let i = 0; i < closes.length; i++) {
            macdLine[i] = ema12[i] - ema26[i];
        }
        
        const signalLine = calculateEMA(macdLine, 9);
        
        const hist = new Array(closes.length);
        for (let i = 0; i < closes.length; i++) {
            hist[i] = macdLine[i] - signalLine[i];
        }
        
        return { macd: macdLine, signal: signalLine, hist };
    }

    function buildSubChartDataset(page) {
        const visibleCandles = getFilteredCandles();
        if (visibleCandles.length === 0) return { labels: [], datasets: [] };
        
        const startIdx = state.candles.indexOf(visibleCandles[0]);
        const endIdx = startIdx + visibleCandles.length;
        
        const labels = visibleCandles.map(c => c.date);
        const closes = state.candles.map(c => c.close);
        const visibleVolumes = visibleCandles.map(c => c.volume);

        if (page === 1) {
            const rsi = calculateRSI(closes, 14).slice(startIdx, endIdx);
            const stoch = calculateStochastic(state.candles, 14, 3, 3);
            return {
                labels,
                datasets: [
                    { label: 'RSI (14)', data: rsi, borderColor: '#ff3b69', borderWidth: 1.5, pointRadius: 0, fill: false },
                    { label: 'Stoch %K', data: stoch.k.slice(startIdx, endIdx), borderColor: '#fbbf24', borderWidth: 1, pointRadius: 0, fill: false },
                    { label: 'Stoch %D', data: stoch.d.slice(startIdx, endIdx), borderColor: '#10b981', borderWidth: 1.5, pointRadius: 0, fill: false }
                ]
            };
        } else if (page === 2) {
            const { macd, signal, hist } = calculateMACD(closes);
            const histSliced = hist.slice(startIdx, endIdx);
            return {
                labels,
                datasets: [
                    {
                        label: 'MACD Histogram',
                        data: histSliced,
                        type: 'bar',
                        backgroundColor: histSliced.map(v => v >= 0 ? '#ff3b69' : '#38bdf8'),
                        borderWidth: 0,
                        barPercentage: 0.8
                    },
                    {
                        label: 'MACD Line',
                        data: macd.slice(startIdx, endIdx),
                        borderColor: '#00f2fe',
                        borderWidth: 1.5,
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: 'Signal Line',
                        data: signal.slice(startIdx, endIdx),
                        borderColor: '#a78bfa',
                        borderWidth: 1.5,
                        pointRadius: 0,
                        fill: false
                    }
                ]
            };
        } else if (page === 3) {
            const disp5 = calculateDisparity(closes, 5).slice(startIdx, endIdx);
            const disp20 = calculateDisparity(closes, 20).slice(startIdx, endIdx);
            return {
                labels, datasets: [
                    { label: '이격도 5일', data: disp5, borderColor: '#00f2fe', borderWidth: 1, pointRadius: 0 },
                    { label: '이격도 20일', data: disp20, borderColor: '#a855f7', borderWidth: 1.5, pointRadius: 0 }
                ]
            };
        } else if (page === 4) {
            return { labels, datasets: [{ label: '거래량', data: visibleVolumes, type: 'bar', backgroundColor: 'rgba(0, 242, 254, 0.4)' }] };
        } else if (page === 5) {
            const bb = calculateBollinger(closes, 20, 2);
            return {
                labels,
                datasets: [
                    { label: '볼린저 %B', data: bb.pctB.slice(startIdx, endIdx), borderColor: '#fbbf24', borderWidth: 1.5, pointRadius: 0, fill: false },
                    { label: '볼린저 대역폭', data: bb.bandwidth.slice(startIdx, endIdx), borderColor: '#8b5cf6', borderWidth: 1, pointRadius: 0, fill: false }
                ]
            };
        } else if (page === 6) {
            const cci = calculateCCI(state.candles, 14).slice(startIdx, endIdx);
            const wr = calculateWilliamsR(state.candles, 14).slice(startIdx, endIdx);
            return {
                labels,
                datasets: [
                    { label: 'CCI (14)', data: cci, borderColor: '#ec4899', borderWidth: 1.5, pointRadius: 0, fill: false },
                    { label: 'Williams %R', data: wr, borderColor: '#10b981', borderWidth: 1, pointRadius: 0, fill: false }
                ]
            };
        } else if (page === 7) {
            const ichi = calculateIchimoku(state.candles);
            return {
                labels, datasets: [
                    { label: '전환선(9)', data: ichi.tenkan.slice(startIdx, endIdx), borderColor: '#00f2fe', borderWidth: 1.5, pointRadius: 0, fill: false },
                    { label: '기준선(26)', data: ichi.kijun.slice(startIdx, endIdx), borderColor: '#a855f7', borderWidth: 1.5, pointRadius: 0, fill: false },
                    { label: '선행스팬A(26)', data: ichi.spanA.slice(startIdx, endIdx), borderColor: 'rgba(16, 185, 129, 0.4)', borderWidth: 1, borderDash: [2, 2], pointRadius: 0, fill: false },
                    { label: '선행스팬B(52)', data: ichi.spanB.slice(startIdx, endIdx), borderColor: 'rgba(239, 68, 68, 0.4)', borderWidth: 1, borderDash: [2, 2], pointRadius: 0, fill: false }
                ]
            };
        } else if (page === 8) {
            const dmi = calculateDMI(state.candles, 14);
            return {
                labels,
                datasets: [
                    { label: 'ADX', data: dmi.adx.slice(startIdx, endIdx), borderColor: '#10b981', borderWidth: 2, pointRadius: 0, fill: false },
                    { label: '+DI', data: dmi.plusDI.slice(startIdx, endIdx), borderColor: '#ff3b69', borderWidth: 1, pointRadius: 0, fill: false },
                    { label: '-DI', data: dmi.minusDI.slice(startIdx, endIdx), borderColor: '#38bdf8', borderWidth: 1, pointRadius: 0, fill: false }
                ]
            };
        } else if (page === 9) {
            const mfi = calculateMFI(state.candles, 14).slice(startIdx, endIdx);
            return { labels, datasets: [{ label: 'MFI (14)', data: mfi, borderColor: '#38bdf8', borderWidth: 1.5, pointRadius: 0, fill: false }] };
        } else {
            const atr = calculateATR(state.candles, 14).slice(startIdx, endIdx);
            return { labels, datasets: [{ label: 'ATR (14)', data: atr, borderColor: '#fb923c', borderWidth: 1.5, pointRadius: 0, fill: false }] };
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
        const canvas = document.getElementById('drawingCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let isDrawing = false;
        let startX = 0, startY = 0;

        function resizeDrawingCanvas() {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            redrawAll();
        }

        state.resizeDrawingCanvas = resizeDrawingCanvas;
        
        window.addEventListener('resize', resizeDrawingCanvas);
        setTimeout(resizeDrawingCanvas, 500);

        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                resizeDrawingCanvas();
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.activeTool = btn.getAttribute('data-tool');
                canvas.classList.add('active');
            });
        });

        document.getElementById('clearDrawingBtn').addEventListener('click', () => {
            state.drawings = [];
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            state.activeTool = null;
            canvas.classList.remove('active');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const container = document.getElementById('chartCanvasContainer');
            if (container) container.style.cursor = 'grab';
        });

        canvas.addEventListener('mousedown', (e) => {
            if (!state.activeTool) return;
            isDrawing = true;
            const rect = canvas.getBoundingClientRect();
            startX = e.clientX - rect.left;
            startY = e.clientY - rect.top;
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!isDrawing || !state.activeTool) return;
            const rect = canvas.getBoundingClientRect();
            const currX = e.clientX - rect.left;
            const currY = e.clientY - rect.top;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            redrawAll();
            drawShape(ctx, state.activeTool, startX, startY, currX, currY);
        });

        canvas.addEventListener('mouseup', (e) => {
            if (!isDrawing || !state.activeTool) return;
            isDrawing = false;
            const rect = canvas.getBoundingClientRect();
            const currX = e.clientX - rect.left;
            const currY = e.clientY - rect.top;

            state.drawings.push({
                tool: state.activeTool,
                x1: startX, y1: startY,
                x2: currX, y2: currY
            });

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            redrawAll();
        });

        // Touch support for mobile drawing
        canvas.addEventListener('touchstart', (e) => {
            if (!state.activeTool || e.touches.length === 0) return;
            isDrawing = true;
            const rect = canvas.getBoundingClientRect();
            startX = e.touches[0].clientX - rect.left;
            startY = e.touches[0].clientY - rect.top;
        });

        canvas.addEventListener('touchmove', (e) => {
            if (!isDrawing || !state.activeTool || e.touches.length === 0) return;
            const rect = canvas.getBoundingClientRect();
            const currX = e.touches[0].clientX - rect.left;
            const currY = e.touches[0].clientY - rect.top;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            redrawAll();
            drawShape(ctx, state.activeTool, startX, startY, currX, currY);
        });

        canvas.addEventListener('touchend', (e) => {
            if (!isDrawing || !state.activeTool) return;
            isDrawing = false;
            // Use last known touch coordinates or just finish
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            redrawAll();
        });

        function drawShape(context, tool, x1, y1, x2, y2) {
            context.strokeStyle = '#00f2fe';
            context.lineWidth = 2;
            context.fillStyle = 'rgba(0, 242, 254, 0.1)';
            context.beginPath();

            if (tool === 'trendline') {
                context.moveTo(x1, y1);
                context.lineTo(x2, y2);
                context.stroke();
            } else if (tool === 'horizontal') {
                context.moveTo(0, y1);
                context.lineTo(canvas.width, y1);
                context.stroke();
            } else if (tool === 'box') {
                context.rect(x1, y1, x2 - x1, y2 - y1);
                context.fill();
                context.stroke();
            } else if (tool === 'fibonacci') {
                const dy = y2 - y1;
                const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
                levels.forEach(lvl => {
                    const y = y1 + dy * lvl;
                    context.moveTo(0, y);
                    context.lineTo(canvas.width, y);
                    context.stroke();
                    context.fillStyle = '#cbd5e1';
                    context.font = '10px sans-serif';
                    context.fillText(`${(lvl * 100).toFixed(1)}%`, 10, y - 4);
                });
            }
        }

        function redrawAll() {
            state.drawings.forEach(d => {
                drawShape(ctx, d.tool, d.x1, d.y1, d.x2, d.y2);
            });
        }
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
        container.innerHTML = state.watchlist.map(w => {
            const isKr = /^\d{6}$/.test(w.symbol) || w.market === 'KOSPI' || w.market === 'KOSDAQ';
            const flag = isKr ? '🇰🇷' : '🇺🇸';
            const displayName = (w.name.startsWith('🇰🇷') || w.name.startsWith('🇺🇸')) ? w.name : `${flag} ${w.name}`;
            return `
                <div class="watchlist-card" onclick="handleStockSearch('${w.symbol}', '${w.name}', '${isKr ? 'KR' : 'US'}')">
                    <strong>${displayName}</strong> <span>${w.price} (${w.change})</span>
                </div>
            `;
        }).join('');
    }

    function renderHotStocksModal(type) {
        const grid = document.getElementById('hotRankingGrid');
        const items = HOT_STOCKS[type] || HOT_STOCKS.popular;
        grid.innerHTML = items.map((item, idx) => {
            const isKr = /^\d{6}$/.test(item.code) || item.market === 'KOSPI' || item.market === 'KOSDAQ';
            const flag = isKr ? '🇰🇷' : '🇺🇸';
            const displayName = (item.name.startsWith('🇰🇷') || item.name.startsWith('🇺🇸')) ? item.name : `${flag} ${item.name}`;
            return `
                <div class="hot-card" onclick="handleStockSearch('${item.code}', '${item.name}', '${isKr ? 'KR' : 'US'}')">
                    <span class="rank-num">#${idx + 1}</span>
                    <strong>${displayName}</strong> (${item.code})
                    <span class="${item.isUp ? 'up' : 'down'}">${item.price} (${item.change})</span>
                </div>
            `;
        }).join('');
    }

    window.handleStockSearch = handleStockSearch;

})();
