package com.ametis.coreapi.repository.authorization;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcAuthorizationRepository implements AuthorizationRepository {
  private final NamedParameterJdbcTemplate jdbcTemplate;
  private final String countAuthorizationMatchesSql;

  public JdbcAuthorizationRepository(NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
    this.countAuthorizationMatchesSql = loadSql("sql/authorization/count_authorization_matches.sql");
  }

  @Override
  public int countAuthorizationMatches(UUID userId, UUID tenantId, String permissionCode) {
    Integer count = jdbcTemplate.queryForObject(countAuthorizationMatchesSql, Map.of(
        "userId", userId,
        "tenantId", tenantId,
        "permissionCode", permissionCode
    ), Integer.class);
    return count == null ? 0 : count;
  }

  private String loadSql(String classpathLocation) {
    try {
      ClassPathResource resource = new ClassPathResource(classpathLocation);
      byte[] bytes = resource.getInputStream().readAllBytes();
      return new String(bytes, StandardCharsets.UTF_8);
    } catch (IOException exception) {
      throw new IllegalStateException("Cannot load SQL file: " + classpathLocation, exception);
    }
  }
}
