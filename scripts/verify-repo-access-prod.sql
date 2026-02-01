select to_regtype('public."RepoRole"') as repo_role_type;
select to_regtype('public."RepoAccessRequestStatus"') as status_type;

select column_name, data_type, udt_name, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'User'
  and column_name = 'repoRole';

select to_regclass('public."RepoAccessRequest"') as repo_access_request_table;

select indexname
from pg_indexes
where schemaname = 'public'
  and tablename = 'RepoAccessRequest'
order by indexname;
