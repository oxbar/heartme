package com.himeros.recommendation;

import com.himeros.interaction.InteractionService;
import com.himeros.shared.CurrentUser;
import com.himeros.shared.ResourceNotFoundException;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/discovery")
public class RecommendationController {
    private final RecommendationService service;
    private final InteractionService interactions;
    private final CurrentUser current;
    private final RecommendationProperties properties;

    public RecommendationController(RecommendationService service, InteractionService interactions, CurrentUser current, RecommendationProperties properties) {
        this.service = service; this.interactions = interactions; this.current = current; this.properties = properties;
    }

    /** Existing contract kept intact. */
    @GetMapping
    List<RecommendationService.Recommendation> discover(@RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return service.discover(current.id(), limit);
    }

    /** Cursor-based V2 contract for infinite discovery feeds. */
    @GetMapping("/page")
    RecommendationService.RecommendationPage page(
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit,
            @RequestParam(required = false) String cursor) {
        return service.discoverPage(current.id(), limit, cursor);
    }

    /** Development/support diagnostic: explains exactly why a candidate ranks or is excluded. */
    @GetMapping("/explain/{candidateId}")
    RecommendationService.Explanation explain(@PathVariable UUID candidateId) {
        if (!properties.isExplainEnabled()) throw new ResourceNotFoundException("Discovery explain is disabled");
        return service.explain(current.id(), candidateId);
    }

    /** Records a card impression without overwriting a stronger LIKE/PASS/SUPER_LIKE signal. */
    @PostMapping("/{candidateId}/view")
    void viewed(@PathVariable UUID candidateId) {
        interactions.recordView(current.id(), candidateId);
    }
}
