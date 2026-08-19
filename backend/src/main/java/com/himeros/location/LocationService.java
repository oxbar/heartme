package com.himeros.location;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class LocationService {
    private static final String IBGE_BASE = "https://servicodados.ibge.gov.br/api/v1/localidades";
    private final RestClient client;
    private volatile List<StateView> statesCache;

    public LocationService() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(2000);
        requestFactory.setReadTimeout(3500);
        this.client = RestClient.builder().baseUrl(IBGE_BASE).requestFactory(requestFactory).build();
    }
    private final Map<String, List<CityView>> citiesCache = new ConcurrentHashMap<>();

    public List<StateView> states() {
        List<StateView> cached = statesCache;
        if (cached != null) return cached;
        cached = fallbackStates().stream().sorted(Comparator.comparing(StateView::name)).toList();
        statesCache = cached;
        return cached;
    }

    public List<CityView> cities(String state) {
        String code = resolveCode(state).orElseThrow(() -> new IllegalArgumentException("Unknown Brazilian state"));
        return citiesCache.computeIfAbsent(code, this::loadCities);
    }

    private List<CityView> loadCities(String code) {
        try {
            JsonNode[] rows = client.get().uri("/estados/{uf}/municipios?orderBy=nome", code)
                .retrieve().body(JsonNode[].class);
            if (rows == null) return List.of();
            return Arrays.stream(rows)
                .map(node -> new CityView(node.path("id").asLong(), node.path("nome").asText()))
                .filter(city -> !city.name().isBlank())
                .sorted(Comparator.comparing(CityView::name))
                .toList();
        } catch (RuntimeException ignored) {
            return List.of();
        }
    }

    private Optional<String> resolveCode(String value) {
        if (value == null || value.isBlank()) return Optional.empty();
        String normalized = normalize(value);
        return states().stream()
            .filter(state -> normalize(state.code()).equals(normalized) || normalize(state.name()).equals(normalized))
            .map(StateView::code)
            .findFirst();
    }

    private static String normalize(String value) {
        String n = java.text.Normalizer.normalize(value.trim(), java.text.Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .toLowerCase(Locale.ROOT);
        return n.replaceAll("\\s+", " ");
    }

    private static List<StateView> fallbackStates() {
        return List.of(
            new StateView("AC", "Acre"), new StateView("AL", "Alagoas"), new StateView("AP", "Amapá"),
            new StateView("AM", "Amazonas"), new StateView("BA", "Bahia"), new StateView("CE", "Ceará"),
            new StateView("DF", "Distrito Federal"), new StateView("ES", "Espírito Santo"), new StateView("GO", "Goiás"),
            new StateView("MA", "Maranhão"), new StateView("MT", "Mato Grosso"), new StateView("MS", "Mato Grosso do Sul"),
            new StateView("MG", "Minas Gerais"), new StateView("PA", "Pará"), new StateView("PB", "Paraíba"),
            new StateView("PR", "Paraná"), new StateView("PE", "Pernambuco"), new StateView("PI", "Piauí"),
            new StateView("RJ", "Rio de Janeiro"), new StateView("RN", "Rio Grande do Norte"),
            new StateView("RS", "Rio Grande do Sul"), new StateView("RO", "Rondônia"), new StateView("RR", "Roraima"),
            new StateView("SC", "Santa Catarina"), new StateView("SP", "São Paulo"), new StateView("SE", "Sergipe"),
            new StateView("TO", "Tocantins")
        );
    }

    public record StateView(String code, String name) {}
    public record CityView(long id, String name) {}
}
