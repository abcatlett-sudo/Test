exports.handler = async (event) => {
  const postcode = (event.queryStringParameters?.postcode || '').trim();

  if (!postcode) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No postcode provided' }) };
  }

  const apiKey = 'acPBS3fpEkSijq1JhbnOcA52031';
  const url    = `https://api.getaddress.io/autocomplete/${encodeURIComponent(postcode)}?api-key=${apiKey}`;

  try {
    const res  = await fetch(url);
    const body = await res.text();
    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json' },
      body,
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
