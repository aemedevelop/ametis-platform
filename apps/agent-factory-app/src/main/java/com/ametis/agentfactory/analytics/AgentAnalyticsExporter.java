package com.ametis.agentfactory.analytics;

import com.ametis.agentfactory.deployments.DeploymentChannelType;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

/**
 * Exporta a Excel exactamente lo que muestra el dashboard de analíticas de un
 * agente: una hoja por bloque. Los textos van en el idioma pedido ("es" por
 * defecto); el backend no tiene i18n general, así que las etiquetas de este
 * archivo viven aquí.
 */
@Component
public class AgentAnalyticsExporter {
  private static final Map<String, String> ES = Map.ofEntries(
      Map.entry("summary", "Resumen"),
      Map.entry("agent", "Agente"),
      Map.entry("period", "Periodo"),
      Map.entry("previousPeriod", "Periodo anterior"),
      Map.entry("metric", "Indicador"),
      Map.entry("current", "Periodo"),
      Map.entry("previous", "Periodo anterior"),
      Map.entry("totalQuestions", "Preguntas totales"),
      Map.entry("uniqueVisitors", "Visitantes únicos"),
      Map.entry("returningVisitors", "Visitantes recurrentes"),
      Map.entry("fallbackCount", "Preguntas sin conocimiento"),
      Map.entry("fallbackRate", "% sin conocimiento"),
      Map.entry("suggestionUsed", "Usaron una sugerencia"),
      Map.entry("byDay", "Por día"),
      Map.entry("date", "Fecha"),
      Map.entry("questions", "Preguntas"),
      Map.entry("byHour", "Por hora"),
      Map.entry("hour", "Hora"),
      Map.entry("byDeployment", "Por despliegue"),
      Map.entry("deployment", "Despliegue"),
      Map.entry("channel", "Canal"),
      Map.entry("withKnowledge", "Con conocimiento"),
      Map.entry("withoutKnowledge", "Sin conocimiento"),
      Map.entry("deploymentDeleted", "Despliegue eliminado"),
      Map.entry("byTopic", "Por tema"),
      Map.entry("topic", "Tema"),
      Map.entry("share", "% del total"),
      Map.entry("topicNone", "Sin tema"),
      Map.entry("topicDeleted", "Tema eliminado"),
      Map.entry("topQuestions", "Top preguntas"),
      Map.entry("topFallback", "Top sin conocimiento"),
      Map.entry("question", "Pregunta"),
      Map.entry("times", "Veces"),
      Map.entry("channel.WEB_CHAT", "Web chat"),
      Map.entry("channel.API", "API"),
      Map.entry("channel.INTERNAL_TEST", "Prueba interna"));

  private static final Map<String, String> EN = Map.ofEntries(
      Map.entry("summary", "Summary"),
      Map.entry("agent", "Agent"),
      Map.entry("period", "Period"),
      Map.entry("previousPeriod", "Previous period"),
      Map.entry("metric", "Metric"),
      Map.entry("current", "Period"),
      Map.entry("previous", "Previous period"),
      Map.entry("totalQuestions", "Total questions"),
      Map.entry("uniqueVisitors", "Unique visitors"),
      Map.entry("returningVisitors", "Returning visitors"),
      Map.entry("fallbackCount", "Questions with no knowledge"),
      Map.entry("fallbackRate", "% with no knowledge"),
      Map.entry("suggestionUsed", "Used a suggestion"),
      Map.entry("byDay", "By day"),
      Map.entry("date", "Date"),
      Map.entry("questions", "Questions"),
      Map.entry("byHour", "By hour"),
      Map.entry("hour", "Hour"),
      Map.entry("byDeployment", "By deployment"),
      Map.entry("deployment", "Deployment"),
      Map.entry("channel", "Channel"),
      Map.entry("withKnowledge", "With knowledge"),
      Map.entry("withoutKnowledge", "No knowledge"),
      Map.entry("deploymentDeleted", "Deleted deployment"),
      Map.entry("byTopic", "By topic"),
      Map.entry("topic", "Topic"),
      Map.entry("share", "% of total"),
      Map.entry("topicNone", "No topic"),
      Map.entry("topicDeleted", "Deleted topic"),
      Map.entry("topQuestions", "Top questions"),
      Map.entry("topFallback", "Top no knowledge"),
      Map.entry("question", "Question"),
      Map.entry("times", "Times"),
      Map.entry("channel.WEB_CHAT", "Web chat"),
      Map.entry("channel.API", "API"),
      Map.entry("channel.INTERNAL_TEST", "Internal test"));

  public byte[] toXlsx(AgentAnalyticsResponse data, String agentName, String lang) {
    Map<String, String> labels = lang != null && lang.toLowerCase().startsWith("en") ? EN : ES;
    try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
      Styles styles = new Styles(workbook);
      summarySheet(workbook, styles, labels, data, agentName);
      tableSheet(workbook, styles, labels.get("byDay"),
          List.of(labels.get("date"), labels.get("questions")),
          filledDays(data),
          (row, point) -> {
            row.createCell(0).setCellValue(point.date().toString());
            row.createCell(1).setCellValue(point.count());
          });
      tableSheet(workbook, styles, labels.get("byHour"),
          List.of(labels.get("hour"), labels.get("questions")),
          filledHours(data),
          (row, point) -> {
            row.createCell(0).setCellValue(point.hour());
            row.createCell(1).setCellValue(point.count());
          });
      tableSheet(workbook, styles, labels.get("byDeployment"),
          List.of(labels.get("deployment"), labels.get("channel"), labels.get("questions"),
              labels.get("withKnowledge"), labels.get("withoutKnowledge"), labels.get("fallbackRate")),
          data.byDeployment(),
          (row, point) -> {
            row.createCell(0).setCellValue(point.name() == null ? labels.get("deploymentDeleted") : point.name());
            row.createCell(1).setCellValue(channelLabel(labels, point.channelType()));
            row.createCell(2).setCellValue(point.totalQuestions());
            row.createCell(3).setCellValue(point.totalQuestions() - point.fallbackCount());
            row.createCell(4).setCellValue(point.fallbackCount());
            percentCell(row, 5, point.fallbackRate(), styles);
          });
      long topicTotal = data.byTopic().stream().mapToLong(AgentAnalyticsResponse.TopicPoint::count).sum();
      tableSheet(workbook, styles, labels.get("byTopic"),
          List.of(labels.get("topic"), labels.get("questions"), labels.get("share")),
          data.byTopic().stream().filter(point -> point.count() > 0).toList(),
          (row, point) -> {
            row.createCell(0).setCellValue(topicLabel(labels, point));
            row.createCell(1).setCellValue(point.count());
            percentCell(row, 2, topicTotal == 0 ? 0 : (double) point.count() / topicTotal, styles);
          });
      questionsSheet(workbook, styles, labels, labels.get("topQuestions"), data.topQuestions());
      questionsSheet(workbook, styles, labels, labels.get("topFallback"), data.topFallbackQuestions());
      workbook.write(output);
      return output.toByteArray();
    } catch (IOException exception) {
      throw new UncheckedIOException(exception);
    }
  }

  private void summarySheet(
      XSSFWorkbook workbook, Styles styles, Map<String, String> labels, AgentAnalyticsResponse data, String agentName) {
    Sheet sheet = workbook.createSheet(labels.get("summary"));
    textRow(sheet, 0, styles, labels.get("agent"), agentName);
    textRow(sheet, 1, styles, labels.get("period"),
        data.from().toLocalDate() + " – " + data.to().toLocalDate());
    textRow(sheet, 2, styles, labels.get("previousPeriod"), data.previousFrom() + " – " + data.previousTo());

    Row header = sheet.createRow(4);
    headerCell(header, 0, labels.get("metric"), styles);
    headerCell(header, 1, labels.get("current"), styles);
    headerCell(header, 2, labels.get("previous"), styles);

    AgentAnalyticsResponse.PeriodSummary previous = data.previous();
    numberRow(sheet, 5, labels.get("totalQuestions"), data.totalQuestions(), previous.totalQuestions());
    numberRow(sheet, 6, labels.get("uniqueVisitors"), data.uniqueVisitors(), previous.uniqueVisitors());
    numberRow(sheet, 7, labels.get("returningVisitors"), data.returningVisitors(), previous.returningVisitors());
    numberRow(sheet, 8, labels.get("fallbackCount"), data.fallbackCount(), previous.fallbackCount());
    Row rate = sheet.createRow(9);
    rate.createCell(0).setCellValue(labels.get("fallbackRate"));
    percentCell(rate, 1, data.fallbackRate(), styles);
    percentCell(rate, 2, previous.fallbackRate(), styles);
    numberRow(sheet, 10, labels.get("suggestionUsed"), data.suggestionUsedCount(), previous.suggestionUsedCount());

    sheet.setColumnWidth(0, 32 * 256);
    sheet.setColumnWidth(1, 28 * 256);
    sheet.setColumnWidth(2, 28 * 256);
  }

  private void questionsSheet(
      XSSFWorkbook workbook,
      Styles styles,
      Map<String, String> labels,
      String name,
      List<AgentAnalyticsResponse.TopQuestion> questions) {
    Sheet sheet = tableSheet(workbook, styles, name,
        List.of(labels.get("question"), labels.get("times")),
        questions,
        (row, item) -> {
          row.createCell(0).setCellValue(item.question());
          row.createCell(1).setCellValue(item.count());
        });
    sheet.setColumnWidth(0, 90 * 256);
  }

  private <T> Sheet tableSheet(
      XSSFWorkbook workbook, Styles styles, String name, List<String> headers, List<T> items, BiConsumer<Row, T> writer) {
    Sheet sheet = workbook.createSheet(name);
    Row header = sheet.createRow(0);
    for (int column = 0; column < headers.size(); column++) {
      headerCell(header, column, headers.get(column), styles);
      sheet.setColumnWidth(column, 24 * 256);
    }
    int rowIndex = 1;
    for (T item : items) {
      writer.accept(sheet.createRow(rowIndex++), item);
    }
    sheet.createFreezePane(0, 1);
    return sheet;
  }

  /** El servicio solo devuelve los días con preguntas; aquí se rellenan con 0 los demás, como hace la gráfica. */
  private List<AgentAnalyticsResponse.DailyPoint> filledDays(AgentAnalyticsResponse data) {
    Map<LocalDate, Long> countByDate = data.byDay().stream()
        .collect(java.util.stream.Collectors.toMap(
            AgentAnalyticsResponse.DailyPoint::date, AgentAnalyticsResponse.DailyPoint::count, Long::sum));
    return data.from().toLocalDate().datesUntil(data.to().toLocalDate().plusDays(1))
        .map(date -> new AgentAnalyticsResponse.DailyPoint(date, countByDate.getOrDefault(date, 0L)))
        .toList();
  }

  private List<AgentAnalyticsResponse.HourlyPoint> filledHours(AgentAnalyticsResponse data) {
    Map<Integer, Long> countByHour = data.byHour().stream()
        .collect(java.util.stream.Collectors.toMap(
            AgentAnalyticsResponse.HourlyPoint::hour, AgentAnalyticsResponse.HourlyPoint::count, Long::sum));
    return java.util.stream.IntStream.range(0, 24)
        .mapToObj(hour -> new AgentAnalyticsResponse.HourlyPoint(hour, countByHour.getOrDefault(hour, 0L)))
        .toList();
  }

  private String channelLabel(Map<String, String> labels, DeploymentChannelType channelType) {
    return channelType == null ? "" : labels.getOrDefault("channel." + channelType.name(), channelType.name());
  }

  private String topicLabel(Map<String, String> labels, AgentAnalyticsResponse.TopicPoint point) {
    if (point.topicId() == null || point.topicId().isEmpty()) {
      return labels.get("topicNone");
    }
    return point.label() == null ? labels.get("topicDeleted") + " (" + point.topicId() + ")" : point.label();
  }

  private void textRow(Sheet sheet, int rowIndex, Styles styles, String label, String value) {
    Row row = sheet.createRow(rowIndex);
    headerCell(row, 0, label, styles);
    row.createCell(1).setCellValue(value);
  }

  private void numberRow(Sheet sheet, int rowIndex, String label, long current, long previous) {
    Row row = sheet.createRow(rowIndex);
    row.createCell(0).setCellValue(label);
    row.createCell(1).setCellValue(current);
    row.createCell(2).setCellValue(previous);
  }

  private void headerCell(Row row, int column, String value, Styles styles) {
    Cell cell = row.createCell(column);
    cell.setCellValue(value);
    cell.setCellStyle(styles.header);
  }

  private void percentCell(Row row, int column, double ratio, Styles styles) {
    Cell cell = row.createCell(column);
    cell.setCellValue(ratio);
    cell.setCellStyle(styles.percent);
  }

  private static final class Styles {
    private final CellStyle header;
    private final CellStyle percent;

    private Styles(XSSFWorkbook workbook) {
      Font bold = workbook.createFont();
      bold.setBold(true);
      header = workbook.createCellStyle();
      header.setFont(bold);
      percent = workbook.createCellStyle();
      percent.setDataFormat(workbook.createDataFormat().getFormat("0%"));
    }
  }
}
