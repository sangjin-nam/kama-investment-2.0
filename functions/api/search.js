export async function onRequestGet(context) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=60, s-maxage=60'
    };

    const url = new URL(context.request.url);
    const query = (url.searchParams.get('q') || '').trim();

    if (!query) {
        return new Response(JSON.stringify({ results: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders }
        });
    }

    const results = [];
    const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(query);

    // 1. Query Naver Autocomplete for Korean Stocks & ETFs
    try {
        const naverUrl = `https://ac.stock.naver.com/ac?q=${encodeURIComponent(query)}&target=stock`;
        const naverRes = await fetch(naverUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://finance.naver.com'
            }
        });
        if (naverRes.ok) {
            const naverJson = await naverRes.json();
            const items = naverJson?.items || [];
            items.forEach(it => {
                if (it && it.code && it.name) {
                    results.push({
                        code: it.code,
                        name: it.name,
                        market: it.typeCode || 'KR',
                        country: 'KR',
                        type: it.category === 'stock' ? 'STOCK' : 'ETF'
                    });
                }
            });
        }
    } catch (e) {
        console.error("Naver Search Error:", e);
    }

    // 2. Query Yahoo Finance Search API for US Stocks & Global ETFs
    // Skip if query contains Korean to prevent Yahoo 400 Bad Request
    if (!isKorean) {
        try {
            const yahooUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
            const yahooRes = await fetch(yahooUrl, {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
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
        } catch (e) {
            console.error("Yahoo Search Error:", e);
        }
    }

    return new Response(JSON.stringify({ query, results }), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders }
    });
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
