// Cloudflare Pages Serverless Edge API: /api/stock & /api/search
// Ultra-fast stock candle data & live global search for KR (KOSPI/KOSDAQ/ETFs) and US (NASDAQ/NYSE/AMEX/ETFs)

export async function onRequestGet(context) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=60, s-maxage=60'
    };

    const url = new URL(context.request.url);
    const pathname = url.pathname;

    // 1. Live Global Search Route: /api/search?q={query}
    if (pathname === '/api/search' || url.searchParams.has('q')) {
        const query = (url.searchParams.get('q') || '').trim();
        if (!query) {
            return new Response(JSON.stringify({ results: [] }), {
                status: 200,
                headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders }
            });
        }

        const results = [];

        try {
            // Query Naver Autocomplete for Korean Stocks & ETFs
            const naverUrl = `https://ac.stock.naver.com/ac?q=${encodeURIComponent(query)}&target=market`;
            const naverRes = await fetch(naverUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            if (naverRes.ok) {
                const naverJson = await naverRes.json();
                const items = naverJson?.items?.[0] || [];
                items.forEach(it => {
                    if (it && it.code && it.name) {
                        results.push({
                            code: it.code,
                            name: it.name,
                            market: it.typeName || 'KR',
                            country: 'KR',
                            type: it.type || 'STOCK'
                        });
                    }
                });
            }
        } catch (e) { }

        try {
            // Query Yahoo Finance Search API for US Stocks & Global ETFs
            const yahooUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
            const yahooRes = await fetch(yahooUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            if (yahooRes.ok) {
                const yahooJson = await yahooRes.json();
                const quotes = yahooJson?.quotes || [];
                quotes.forEach(q => {
                    if (q && q.symbol && (q.shortname || q.longname)) {
                        results.push({
                            code: q.symbol,
                            name: q.shortname || q.longname || q.symbol,
                            market: q.exchange || 'US',
                            country: 'US',
                            type: q.quoteType || 'EQUITY'
                        });
                    }
                });
            }
        } catch (e) { }

        return new Response(JSON.stringify({ query, results }), {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders }
        });
    }

    // 2. Stock Daily Candles Route: /api/stock?code={code}&country={country}
    const code = (url.searchParams.get('code') || '005930').trim().toUpperCase();
    const country = (url.searchParams.get('country') || (/\d{6}/.test(code) ? 'KR' : 'US')).toUpperCase();
    const includePrePost = url.searchParams.get('includePrePost') !== 'false';
    const isKrStock = country === 'KR' || /^\d{6}$/.test(code);

    try {
        if (isKrStock) {
            // 🇰🇷 Korean Stock / ETF: Naver Securities Official Chart XML API
            const targetUrl = `https://fchart.stock.naver.com/sise.nhn?symbol=${code}&timeframe=day&count=600&requestType=0`;
            const res = await fetch(targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/xml,application/xml,text/plain,*/*'
                }
            });

            if (!res.ok) {
                return new Response(JSON.stringify({ error: `Naver API returned status ${res.status}` }), {
                    status: res.status,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }

            const xmlText = await res.text();
            const matches = [...xmlText.matchAll(/<item data="([^"]+)"/g)];

            if (!matches || matches.length === 0) {
                return new Response(JSON.stringify({ error: 'No candle items found in Naver XML' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }

            const candles = [];
            matches.forEach(m => {
                const parts = m[1].split('|');
                if (parts.length >= 6) {
                    const d = parts[0];
                    const openPrice = parseInt(parts[1], 10);
                    const highPrice = parseInt(parts[2], 10);
                    const lowPrice = parseInt(parts[3], 10);
                    const closePrice = parseInt(parts[4], 10);
                    const volumeVal = parseInt(parts[5], 10);

                    if (d && !isNaN(closePrice) && closePrice > 0) {
                        candles.push({
                            date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
                            open: isNaN(openPrice) ? closePrice : openPrice,
                            high: isNaN(highPrice) ? closePrice : highPrice,
                            low: isNaN(lowPrice) ? closePrice : lowPrice,
                            close: closePrice,
                            volume: isNaN(volumeVal) ? 0 : volumeVal
                        });
                    }
                }
            });

            return new Response(JSON.stringify({ code, country: 'KR', candles }), {
                status: 200,
                headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders }
            });
        } else {
            // 🇺🇸 US Stock & Global ETFs: Yahoo Finance Chart API with includePrePost
            const prePostParam = includePrePost ? '&includePrePost=true' : '';
            const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${code}?range=5y&interval=1d${prePostParam}`;

            const res = await fetch(targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json'
                }
            });

            if (!res.ok) {
                return new Response(JSON.stringify({ error: `Yahoo API returned status ${res.status}` }), {
                    status: res.status,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }

            const json = await res.json();
            const result = json?.chart?.result?.[0];

            if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
                return new Response(JSON.stringify({ error: 'Invalid Yahoo Finance response format' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }

            const timestamps = result.timestamp;
            const quote = result.indicators.quote[0];
            const meta = result.meta || {};
            const candles = [];

            for (let i = 0; i < timestamps.length; i++) {
                if (quote.close[i] == null || isNaN(quote.close[i])) continue;
                const dateStr = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
                const openVal = quote.open[i] || quote.close[i];
                const highVal = quote.high[i] || quote.close[i];
                const lowVal = quote.low[i] || quote.close[i];
                const closeVal = quote.close[i];
                const volumeVal = quote.volume[i] || 0;

                candles.push({
                    date: dateStr,
                    open: Number(openVal.toFixed(2)),
                    high: Number(highVal.toFixed(2)),
                    low: Number(lowVal.toFixed(2)),
                    close: Number(closeVal.toFixed(2)),
                    volume: Math.round(volumeVal)
                });
            }

            let extendedHours = {
                regularMarketPrice: meta.regularMarketPrice,
                regularMarketChange: 0,
                regularMarketChangePercent: 0,
                extendedMarketPrice: null,
                extendedMarketChange: 0,
                extendedMarketChangePercent: 0,
                currentMarketState: 'CLOSED'
            };

            try {
                const rtUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${code}?range=1d&interval=1m&includePrePost=true`;
                const rtRes = await fetch(rtUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'application/json'
                    }
                });
                if (rtRes.ok) {
                    const rtJson = await rtRes.json();
                    const rtResult = rtJson?.chart?.result?.[0];
                    if (rtResult && rtResult.timestamp && rtResult.timestamp.length > 0) {
                        const rtMeta = rtResult.meta || {};
                        const rtQuote = rtResult.indicators?.quote?.[0] || {};
                        const lastClose = rtQuote.close ? rtQuote.close[rtQuote.close.length - 1] : null;
                        const lastTs = rtResult.timestamp[rtResult.timestamp.length - 1];

                        const pre = rtMeta.currentTradingPeriod?.pre || {};
                        const reg = rtMeta.currentTradingPeriod?.regular || {};
                        const post = rtMeta.currentTradingPeriod?.post || {};

                        let marketState = 'CLOSED';
                        if (lastTs >= pre.start && lastTs < pre.end) {
                            marketState = 'PRE';
                        } else if (lastTs >= reg.start && lastTs < reg.end) {
                            marketState = 'REGULAR';
                        } else if (lastTs >= post.start && lastTs <= post.end) {
                            marketState = 'POST';
                        }

                        const prevClose = rtMeta.chartPreviousClose || rtMeta.previousClose || lastClose;
                        const regularChange = (rtMeta.regularMarketPrice && prevClose) ? (rtMeta.regularMarketPrice - prevClose) : 0;
                        const regularChangePercent = prevClose ? (regularChange / prevClose) * 100 : 0;
                        const extendedChange = (lastClose && rtMeta.regularMarketPrice) ? (lastClose - rtMeta.regularMarketPrice) : 0;
                        const extendedChangePercent = rtMeta.regularMarketPrice ? (extendedChange / rtMeta.regularMarketPrice) * 100 : 0;

                        extendedHours = {
                            regularMarketPrice: rtMeta.regularMarketPrice || lastClose || prevClose,
                            regularMarketChange: Number(regularChange.toFixed(2)),
                            regularMarketChangePercent: Number(regularChangePercent.toFixed(2)),
                            extendedMarketPrice: lastClose ? Number(lastClose.toFixed(2)) : null,
                            extendedMarketChange: Number(extendedChange.toFixed(2)),
                            extendedMarketChangePercent: Number(extendedChangePercent.toFixed(2)),
                            currentMarketState: marketState
                        };
                    }
                }
            } catch (e) {
                // Ignore and use default metadata
            }

            return new Response(JSON.stringify({ code, country: 'US', candles, extendedHours }), {
                status: 200,
                headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders }
            });
        }
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
