
-- Create affiliate_applications table
CREATE TABLE public.affiliate_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  instagram_url TEXT,
  linkedin_url TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create custom_plan_requests table
CREATE TABLE public.custom_plan_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  company TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliate_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_plan_requests ENABLE ROW LEVEL SECURITY;

-- Public insert policies (anyone can submit)
CREATE POLICY "Anyone can submit affiliate application" ON public.affiliate_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can submit custom plan request" ON public.custom_plan_requests FOR INSERT WITH CHECK (true);

-- Admin read/manage policies
CREATE POLICY "Admins can view all affiliate applications" ON public.affiliate_applications FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can update affiliate applications" ON public.affiliate_applications FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete affiliate applications" ON public.affiliate_applications FOR DELETE USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view all custom plan requests" ON public.custom_plan_requests FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can update custom plan requests" ON public.custom_plan_requests FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete custom plan requests" ON public.custom_plan_requests FOR DELETE USING (is_admin(auth.uid()));
