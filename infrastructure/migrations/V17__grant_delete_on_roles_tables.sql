-- V17: Grant DELETE on roles management tables (REQ-F-011, REQ-F-013)
-- V14 only granted SELECT/INSERT/UPDATE. PUT /roles/{id} (replace permissions)
-- and DELETE /roles/{id} require DELETE on these two tables.
GRANT DELETE ON role_permissions TO his_app;
GRANT DELETE ON roles TO his_app;
