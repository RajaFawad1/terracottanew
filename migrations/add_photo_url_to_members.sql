-- Migration: Add photo_url column to members table
-- Run this migration to add the photo_url column to store member profile photos

ALTER TABLE members 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN members.photo_url IS 'Base64 encoded profile photo data URL';

