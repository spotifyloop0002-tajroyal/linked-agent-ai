
-- 1. Fix admin_alert_settings: restrict public SELECT to service_role only
DROP POLICY "Service role reads admin settings" ON admin_alert_settings;
CREATE POLICY "Service role reads admin settings"
  ON admin_alert_settings FOR SELECT
  USING (auth.role() = 'service_role');

-- 2. Fix extension_alerts: restrict INSERT to service_role only
DROP POLICY "Service role inserts alerts" ON extension_alerts;
CREATE POLICY "Service role inserts alerts"
  ON extension_alerts FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- 3. Fix user_roles: prevent admins from escalating to super_admin
DROP POLICY "Admins can insert roles" ON user_roles;
CREATE POLICY "Admins can insert roles"
  ON user_roles FOR INSERT
  TO public
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND role NOT IN ('super_admin'::app_role, 'admin'::app_role)
  );

DROP POLICY "Admins can update roles" ON user_roles;
CREATE POLICY "Admins can update roles"
  ON user_roles FOR UPDATE
  TO public
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND role NOT IN ('super_admin'::app_role, 'admin'::app_role)
  );

DROP POLICY "Admins can delete roles" ON user_roles;
CREATE POLICY "Admins can delete roles"
  ON user_roles FOR DELETE
  TO public
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND role NOT IN ('super_admin'::app_role, 'admin'::app_role)
  );

-- 4. Fix research_cache: ensure only service_role can access
DROP POLICY "Service role manages research cache" ON research_cache;
CREATE POLICY "Service role manages research cache"
  ON research_cache FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
