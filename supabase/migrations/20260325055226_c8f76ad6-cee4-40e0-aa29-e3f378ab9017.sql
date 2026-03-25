
UPDATE posts 
SET status = 'pending', approved = true, scheduled_time = now(), updated_at = now()
WHERE id = '8af444a0-2166-4a61-ba15-5246f83d9b7d'
AND user_id = 'e5b40a43-849c-47fa-914b-7ddf54056f28';
