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
  const url    = `https://api.getaddress.io/find/${encodeURIComponent(postcode)}?api-key=${apiKey}&expand=true`;

  try {
    const { status, body } = await httpsGet(url);

    if (status !== 200) {
      return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body };
    }

    const data        = JSON.parse(body);
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
