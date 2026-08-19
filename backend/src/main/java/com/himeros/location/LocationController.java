package com.himeros.location;

import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/locations")
public class LocationController {
    private final LocationService service;

    public LocationController(LocationService service) {
        this.service = service;
    }

    @GetMapping("/states")
    List<LocationService.StateView> states() {
        return service.states();
    }

    @GetMapping("/states/{state}/cities")
    List<LocationService.CityView> cities(@PathVariable String state) {
        return service.cities(state);
    }
}
