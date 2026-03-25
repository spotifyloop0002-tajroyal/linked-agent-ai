
-- Activate Minal's campaign
UPDATE campaigns 
SET status = 'active', auto_approve = true, updated_at = now()
WHERE id = 'cb03f223-94d0-450b-99a4-012c8a50cda3' 
AND user_id = 'e5b40a43-849c-47fa-914b-7ddf54056f28';

-- Move her draft posts to pending so auto-posting picks them up
UPDATE posts 
SET status = 'pending', approved = true, updated_at = now()
WHERE campaign_id = 'cb03f223-94d0-450b-99a4-012c8a50cda3'
AND user_id = 'e5b40a43-849c-47fa-914b-7ddf54056f28'
AND status = 'draft'
AND scheduled_time > now();
