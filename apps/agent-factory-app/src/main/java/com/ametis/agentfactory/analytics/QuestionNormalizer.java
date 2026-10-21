package com.ametis.agentfactory.analytics;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Clave de agrupación de una pregunta para el Top de analíticas: dos
 * preguntas que solo difieren en mayúsculas, tildes, signos o espacios
 * ("¿Dónde se encuentran?" / "donde se encuentran") cuentan como la misma.
 * El texto que se muestra sigue siendo el original (question_sample).
 *
 * <p>La migración V26 aplica la misma regla en SQL a las filas ya guardadas;
 * si se cambia aquí, las filas históricas quedan con la clave anterior.
 */
final class QuestionNormalizer {
  // Agudo, grave, circunflejo y diéresis. La virgulilla (U+0303) se conserva
  // a propósito: "año" y "ano" no son la misma palabra.
  private static final Pattern ACCENT_MARKS = Pattern.compile("[\\u0300\\u0301\\u0302\\u0308]");
  private static final Pattern PUNCTUATION_AND_SYMBOLS = Pattern.compile("[\\p{P}\\p{S}]");
  private static final Pattern WHITESPACE = Pattern.compile("\\s+");

  private QuestionNormalizer() {}

  static String key(String question) {
    String lowered = question.trim().toLowerCase(Locale.ROOT);
    String withoutAccents = Normalizer.normalize(
        ACCENT_MARKS.matcher(Normalizer.normalize(lowered, Normalizer.Form.NFD)).replaceAll(""),
        Normalizer.Form.NFC);
    String key = WHITESPACE
        .matcher(PUNCTUATION_AND_SYMBOLS.matcher(withoutAccents).replaceAll(" "))
        .replaceAll(" ")
        .trim();
    // Una pregunta hecha solo de signos ("???") se queda como está, para no
    // juntar bajo una misma clave vacía cosas distintas.
    return key.isEmpty() ? lowered : key;
  }
}
