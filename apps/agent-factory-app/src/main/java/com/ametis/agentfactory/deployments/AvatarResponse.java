package com.ametis.agentfactory.deployments;

/**
 * Respuesta minima de subir/quitar el logo: solo lo que el panel necesita
 * para refrescar la vista previa, sin el resto de campos del despliegue
 * (slug, allowedOrigins, embedSnippet, etc.) que no vienen al caso aqui.
 */
public record AvatarResponse(String avatarUrl) {}
