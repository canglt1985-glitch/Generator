export default function handler(req, res) {
  if (req.method === 'POST') {
    return res.status(200).json({ status: 0, status_message: 'ok' });
  }
  return res.status(200).send('Viber Webhook Handler');
}
