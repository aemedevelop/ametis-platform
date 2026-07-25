package com.ametis.coreapi.api.dto;

import java.util.List;

public record AuthorizationCheckResponse(boolean allowed, List<String> reasons) {
}
