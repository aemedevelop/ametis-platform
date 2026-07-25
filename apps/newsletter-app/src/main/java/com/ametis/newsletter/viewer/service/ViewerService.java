package com.ametis.newsletter.viewer.service;

import com.ametis.newsletter.publications.domain.Publication;
import com.ametis.newsletter.publications.service.PublicationService;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class ViewerService {
  private final PublicationService publicationService;

  public ViewerService(PublicationService publicationService) {
    this.publicationService = publicationService;
  }

  public List<Publication> listPublished(UUID projectId) {
    return publicationService.listPublishedForViewer(projectId);
  }

  public Publication getBySlug(String slug) {
    return publicationService.getPublishedBySlug(slug);
  }
}
