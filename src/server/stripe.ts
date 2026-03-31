import express from 'express';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { supabase } from '../lib/supabase';

dotenv.config({ path: '.env.local' });
dotenv.config();

const PORT = 3002;
// Use dummy secret key if not set to prevent crashes in dev.
const stripeSecret = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';
const stripe = new Stripe(stripeSecret, { apiVersion: '2025-02-24.acacia' as any });

const FRONTEND_URL = process.env.VITE_APP_URL || 'http://localhost:3000';

async function main() {
  const app = express();

  // Use raw body for webhook signature verification
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['stripe-signature'];
    
    // In local dev without CLI, we might bypass webhook verification
    // but in prod this MUST be verified.
    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        signature as string,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );

      // Handle the event
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Fulfill the purchase...
        const userId = session.client_reference_id;
        if (userId) {
          // Update user's profile in Supabase to active!
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
      
      return res.json({ received: true });
    } catch (err: any) {
      console.error('Webhook error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });

  // Standard JSON middleware for other endpoints
  app.use(express.json());

  // CORS
  app.use((_req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      next();
  });
  app.options('*', (_req, res) => res.sendStatus(204));

  app.post('/api/stripe/create-checkout', async (req, res) => {
    try {
      const { priceId, userId } = req.body;
      if (!priceId || !userId) {
        return res.status(400).json({ error: 'Missing priceId or userId' });
      }

      // Create Checkout Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: priceId.includes('recur') || priceId.includes('month') ? 'subscription' : 'payment',
        success_url: `${FRONTEND_URL}/dashboard?checkout=success`,
        cancel_url: `${FRONTEND_URL}/pricing?checkout=cancel`,
        client_reference_id: userId,
      });

      return res.json({ url: session.url });
    } catch (error: any) {
      console.error('Stripe checkout error:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  app.listen(PORT, () => {
    console.log(`\n💳 Stripe API running on http://localhost:${PORT}`);
    console.log(`   POST /api/stripe/create-checkout`);
    console.log(`   POST /api/stripe/webhook\n`);
  });
}

main().catch(err => {
    console.error('✗ Server failed to start:', err.message);
    process.exit(1);
});
