const crypto = require('crypto');

const FLOW_API_KEY = '3E0F39DF-2F1C-4243-8B34-338L45035136';
const FLOW_SECRET = '90ac9abf0ffc89967897e64ec1fa31fa8bc20336';
const FLOW_API_URL = 'https://www.flow.cl/app/web/pay.php';
const WEB_URL = 'https://barberialaromana.netlify.app';

function firmarFlow(params) {
  const keys = Object.keys(params).sort();
  let toSign = '';
  keys.forEach(k => toSign += k + params[k]);
  return crypto.createHmac('sha256', FLOW_SECRET).update(toSign).digest('hex');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const { codigo, nombre, email, servicio, total } = body;

    const params = {
      apiKey: FLOW_API_KEY,
      commerceOrder: codigo,
      subject: `Reserva Barbería La Romana - ${servicio}`,
      currency: 'CLP',
      amount: String(total),
      email: email,
      paymentMethod: '9',
      urlConfirmation: `${WEB_URL}/.netlify/functions/flow-confirm`,
      urlReturn: `${WEB_URL}/?flow_return=1&orden=${codigo}`,
    };

    params.s = firmarFlow(params);

    const formData = new URLSearchParams(params).toString();

    const response = await fetch('https://www.flow.cl/app/web/create.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });

    const data = await response.json();

    if (data.url && data.token) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          url: `${data.url}?token=${data.token}`,
          token: data.token
        })
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: data })
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
