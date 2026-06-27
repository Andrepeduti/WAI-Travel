-- Create itinerary_sales table to track marketplace purchases
CREATE TABLE public.itinerary_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  itinerary_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  gross_cents INTEGER NOT NULL DEFAULT 0,
  fee_cents INTEGER NOT NULL DEFAULT 0,
  net_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_itinerary_sales_seller ON public.itinerary_sales(seller_id, created_at DESC);
CREATE INDEX idx_itinerary_sales_itinerary ON public.itinerary_sales(itinerary_id);

ALTER TABLE public.itinerary_sales ENABLE ROW LEVEL SECURITY;

-- Sellers can see sales of their itineraries
CREATE POLICY "Sellers can view their sales"
  ON public.itinerary_sales
  FOR SELECT
  TO authenticated
  USING (auth.uid() = seller_id);

-- Buyers can see their own purchases
CREATE POLICY "Buyers can view their purchases"
  ON public.itinerary_sales
  FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id);

-- Buyers create the sale at checkout
CREATE POLICY "Buyers can create purchases"
  ON public.itinerary_sales
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);