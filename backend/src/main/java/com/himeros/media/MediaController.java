package com.himeros.media;

import com.himeros.shared.*;
import com.himeros.trustsafety.TrustSafetyQuery;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/media/photos")
public class MediaController {
    private final MediaService service;
    private final CurrentUser current;
    private final TrustSafetyQuery safety;

    public MediaController(MediaService service, CurrentUser current, TrustSafetyQuery safety) {
        this.service = service;
        this.current = current;
        this.safety = safety;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    MediaService.PhotoView upload(@RequestPart("file") MultipartFile file) {
        return service.upload(current.id(), file);
    }

    @GetMapping
    List<MediaService.PhotoView> list() {
        return service.list(current.id());
    }

    @GetMapping("/users/{userId}")
    List<MediaService.PhotoView> listForUser(@PathVariable UUID userId) {
        if (safety.blockedEitherWay(current.id(), userId)) {
            throw new ResourceNotFoundException("Photos not found");
        }
        return service.list(userId);
    }


    @PostMapping("/batch")
    Map<UUID, List<MediaService.PhotoView>> batch(@RequestBody BatchRequest request) {
        Set<UUID> excluded = safety.excluded(current.id());
        Set<UUID> permitted = new LinkedHashSet<>(request.userIds() == null ? Set.of() : request.userIds());
        permitted.removeAll(excluded);
        return service.listBatch(permitted);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable UUID id) {
        service.delete(current.id(), id);
    }

    public record BatchRequest(Set<UUID> userIds) {}
}

