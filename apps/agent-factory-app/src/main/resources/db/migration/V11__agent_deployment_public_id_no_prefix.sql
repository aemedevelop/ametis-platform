update agent_deployments
set public_id = substr(public_id, 5)
where left(public_id, 4) = 'dep_';
