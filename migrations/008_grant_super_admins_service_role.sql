-- Ensure service_role can access all public tables (for REST API with service role key)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
