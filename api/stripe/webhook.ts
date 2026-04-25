import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase ENV missing');
    return createClient(supabaseUrl, supabaseKey);
};
// Disable Vercel's default JSON body parser for this route
// Stripe requires the raw, unparsed body for webhook signature verification.
export const config = {
  api: {
    bodyParser: false,
  },
};

const stripeSecret = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';
const stripe = new Stripe(stripeSecret, { apiVersion: '2025-02-24.acacia' as any });

// Helper function to read the raw body from a stream
async function buffer(readable: NodeJS.ReadableStream) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const buf = await buffer(req);
  const signature = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(
      buf,
      signature as string,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const userId = session.client_reference_id;
      if (userId) {
        const supabase = getSupabase();
        // Provide the user access in Supabase
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'active',
            subscription_tier: 'pro'
          })
          .eq('id', userId);
          
        console.log(`✅ Provisioned Pro subscription for user ${userId}`);
      }
    }
    
    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
}
