-- Migration: Add share_transactions table
-- Run this migration to add the share_transactions table to your database

CREATE TABLE IF NOT EXISTS share_transactions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMP NOT NULL,
  member_id VARCHAR NOT NULL REFERENCES members(id),
  contributions NUMERIC(14, 2) NOT NULL DEFAULT '0',
  shares NUMERIC(14, 2) NOT NULL DEFAULT '0',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR REFERENCES users(id),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by VARCHAR REFERENCES users(id)
);

-- Create index on member_id for faster queries
CREATE INDEX IF NOT EXISTS idx_share_transactions_member_id ON share_transactions(member_id);

-- Create index on date for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_share_transactions_date ON share_transactions(date);

