exports.handler = async (event) => {
  const postcode = (event.queryStringParameters?.postcode || '').trim().toUpperCase();

  if (!postcode) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No postcode provided' }) };
  }

  const token = 'dtoken_hEDzcyiWMr2RKmx5bEJGy5bofuck2nS8LH7WTFnLfogkDCXvGBp5BI1eyhADhPZyfzU2sJaORWkvEP54-YPKurEEZYQULGcTUWz7M17gTdyLyFxSO1UBqxgGFxFO_SgqCBTxNEmj2CC0YlCW7f1O27HgM4F4EMSCybW4NE7eeIjbhEqSBvQkMA5SrkwqnSgiWUkDab0A-mE';
  const url   = `https://api.getaddress.io/find/${encodeURIComponent(postcode)}?api-key=${token}&expand=true`;

  try {
    const res  = await fetch(url, {
      headers: {
        'Origin':  'https://willsassured.co.uk',
        'Referer': 'https://willsassured.co.uk/',
      },
    });
    const data = await res.json();

    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify(data) };
    }

    // Normalise to {suggestions:[{address,postcode}]} shape the client expects
    const addresses   = data.addresses || [];
    const postcodeFmt = data.postcode  || postcode;
    const suggestions = addresses.map(a => {
      const parts = [a.line_1, a.line_2, a.line_3, a.town_or_city, a.county]
        .filter(p => p && p.trim());
      return { address: [...parts, postcodeFmt].join(', '), parts, postcode: postcodeFmt };
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestions }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
