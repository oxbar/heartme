package com.himeros.billing;

import com.himeros.shared.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/billing")
public class BillingController {
    private final BillingService service;
    private final CurrentUser current;

    public BillingController(BillingService s, CurrentUser c) {
        service = s;
        current = c;
    }

    @PostMapping("/purchase")
    @ResponseStatus(HttpStatus.CREATED)
    BillingService.PaymentView purchase(@Valid @RequestBody Request r) {
        return service.purchase(current.id(), r.plan());
    }

    public record Request(
            @jakarta.validation.constraints.NotBlank @Pattern(regexp = "(?i)MONTHLY|QUARTERLY|YEARLY") String plan) {
    }
}
