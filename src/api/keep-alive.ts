import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function (req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'Telegram bot is alive',
    timestamp: new Date().toISOString()
  });
} 