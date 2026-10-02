package com.ametis.agentfactory.deployments;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PublicQueryRequest(
    @NotBlank @Size(max = 500) String question,
    // Generado por el propio widget (localStorage del visitante); nunca
    // requerido -- sin él la pregunta igual se responde, solo queda fuera de
    // las analíticas de visitantes únicos/recurrentes.
    @Size(max = 80) String visitorId,
    // true si la pregunta vino de tocar un chip de sugerencia en vez de
    // tipearla -- para medir cuánto se usan las preguntas sugeridas.
    Boolean usedSuggestion) {}
