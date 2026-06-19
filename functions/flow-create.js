const crypto = require('crypto');

const FLOW_API_KEY = '3E0F39DF-2F1C-4243-8B34-338L45035136';
const FLOW_SECRET = '90ac9abf0ffc89967897e64ec1fa31fa8bc20336';
const WEB_URL = 'https://barberialaromana.netlify.app';

function firmarFlow(params) {
  const keys = Object.keys(params).sort();
  let toSign = '';
  keys.forEach(k => toSign += k + params[k]);
  console.log('Cadena a firmar:', toSign);
  return crypto.createHmac('sha256', FLOW_SECRET).update(toSign).digest('hex');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    console.log('Body recibido:', JSON.stringify(body));
    
    const { codigo, nombre, email, servicio, total } = body;

    const params = {
      apiKey: FLOW_API_KEY,
      commerceOrder: codigo,
      subject: `Reserva Barberia La Romana - ${servicio}`,
      currency: 'CLP',
      amount: String(Math.round(total || 10000)),
      email: email || 'cliente@barberialaromana.cl',
      paymentMethod: '9',
      urlConfirmation: `${WEB_URL}/.netlify/functions/flow-confirm`,
      urlReturn: `${WEB_URL}/?flow_return=1&orden=${codigo}`,
    };

    params.s = firmarFlow(params);
    console.log('Params con firma:', JSON.stringify(params));

    const formData = new URLSearchParams(params).toString();
    console.log('Enviando a Flow...');

    const response = await fetch('https://www.flow.cl/app/web/create.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });

    const responseText = await response.text();
    console.log('Respuesta Flow raw:', responseText);
    console.log('Status HTTP:', response.status);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch(e) {
      console.log('Error parseando JSON:', e.message);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Respuesta inválida de Flow', raw: responseText })
      };
    }

    console.log('Data Flow:', JSON.stringify(data));

    if (data.url && data.token) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          url: `${data.url}?token=${data.token}`,
          token: data.token
        })
      };
    } else {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: data })
      };
    }
  } catch (err) {
    console.log('Error general:', err.message);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
