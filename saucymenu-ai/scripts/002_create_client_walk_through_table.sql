-- Create client_walk_through table
CREATE TABLE client_walk_through (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  restaurant_name TEXT NOT NULL,
  email TEXT NOT NULL,
  country TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);