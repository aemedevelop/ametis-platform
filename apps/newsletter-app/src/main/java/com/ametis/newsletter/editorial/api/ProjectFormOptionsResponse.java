package com.ametis.newsletter.editorial.api;

import com.ametis.newsletter.editorial.service.NewsletterProjectService;
import java.util.List;

public record ProjectFormOptionsResponse(
    List<String> tones,
    List<String> audiences
) {
  public static ProjectFormOptionsResponse from(NewsletterProjectService.ProjectFormOptions options) {
    return new ProjectFormOptionsResponse(options.tones(), options.audiences());
  }
}
