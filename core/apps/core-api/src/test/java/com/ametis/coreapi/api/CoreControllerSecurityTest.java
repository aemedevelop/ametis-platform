package com.ametis.coreapi.api;

import com.ametis.coreapi.config.SecurityConfig;
import com.ametis.coreapi.service.AuthorizationService;
import com.ametis.coreapi.service.MembershipService;
import com.ametis.coreapi.service.TenantService;
import com.ametis.coreapi.service.UserContextService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = CoreController.class)
@Import(SecurityConfig.class)
class CoreControllerSecurityTest {
  @Autowired
  private MockMvc mockMvc;

  @MockBean
  private UserContextService userContextService;
  @MockBean
  private TenantService tenantService;
  @MockBean
  private MembershipService membershipService;
  @MockBean
  private AuthorizationService authorizationService;

  @Test
  void healthIsPublic() throws Exception {
    mockMvc.perform(get("/v1/health"))
        .andExpect(status().isOk());
  }

  @Test
  void tenantsRequiresAuthentication() throws Exception {
    mockMvc.perform(get("/v1/tenants"))
        .andExpect(status().isUnauthorized());
  }
}
