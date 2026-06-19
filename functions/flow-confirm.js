const crypto = require('crypto');

const FLOW_API_KEY = '3E0F39DF-2F1C-4243-8B34-338L45035136';
const FLOW_SECRET = '90ac9abf0ffc89967897e64ec1fa31fa8bc20336';

function firmarFlow(params) {
  const keys = Object.keys(params).sort();
  let toSign = '';
  keys.forEach(k => toSign += k + params[k]);
  return crypto.createHmac('sha256', FLOW_SECRET).update(toSign).digest('hex');
}

exports.handler = async (event) => {
  try {
    const token = event.queryStringParameters?.token || 
                  new URLSearchParams(event.body).get('token');

    if (!token) {
      return { statusCode: 400, body: 'Token requerido' };
    }

    const params = { apiKey: FLOW_API_KEY, token };
    params.s = firmarFlow(params);

    const response = await fetch(
      `https://www.flow.cl/app/web/getPaymentData.php?${new URLSearchParams(params)}`,
      { method: 'GET' }
    );

    const data = await response.json();

    // status 2 = pagado
    if (data.status === 2) {
      return {
        statusCode: 200,
        body: JSON.stringify({ pagado: true, orden: data.commerceOrder, data })
      };
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({ pagado: false, status: data.status })
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
