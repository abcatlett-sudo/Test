const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    https.get({ hostname: opts.hostname, path: opts.pathname + opts.search }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

exports.handler = async (event) => {
  const postcode = (event.queryStringParameters?.postcode || '').trim().toUpperCase();

  if (!postcode) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No postcode provided' }) };
  }

  const apiKey = 'acPBS3fpEkSijq1JhbnOcA52031';
  const url    = `https://api.getaddress.io/autocomplete/${encodeURIComponent(postcode)}?api-key=${apiKey}`;

  try {
    const { status, body } = await httpsGet(url);

    if (status !== 200) {
      return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body };
    }

    const data        = JSON.parse(body);
    const suggestions = (data.suggestions || []).map(s => ({
      address:  s.address,
      id:       s.id,
      postcode: postcode,
    }));

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
