package com.ametis.newsletter.viewer.api;

import com.ametis.newsletter.viewer.service.ViewerService;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/newsletter/viewer")
public class ViewerController {
  private final ViewerService viewerService;

  public ViewerController(ViewerService viewerService) {
    this.viewerService = viewerService;
  }

  @GetMapping("/projects/{projectId}/publications")
  public List<ViewerPublicationResponse> list(@PathVariable UUID projectId) {
    return viewerService.listPublished(projectId).stream().map(ViewerPublicationResponse::from).toList();
  }

  @GetMapping("/publications/{slug}")
  public ViewerPublicationResponse get(@PathVariable String slug) {
    return ViewerPublicationResponse.from(viewerService.getBySlug(slug));
  }
}
