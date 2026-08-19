package com.himeros.media;

import com.himeros.shared.*;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MediaService {
    private static final Set<String> TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private final PhotoRepository repo;
    private final HimerosProperties props;

    public MediaService(PhotoRepository repo, HimerosProperties props) {
        this.repo = repo;
        this.props = props;
    }

    @Transactional
    public PhotoView upload(UUID userId, MultipartFile file) {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Photo is required");
        if (!TYPES.contains(file.getContentType())) throw new IllegalArgumentException("Only JPEG, PNG and WEBP are accepted");
        if (repo.countByUserId(userId) >= 6) throw new ConflictException("Maximum of 6 photos reached");

        String ext = switch (file.getContentType()) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
        String key = userId + "/" + UUID.randomUUID() + ext;
        Path path = Path.of(props.directory()).resolve(key).normalize();
        Path root = Path.of(props.directory()).toAbsolutePath().normalize();
        if (!path.toAbsolutePath().startsWith(root)) throw new IllegalArgumentException("Invalid storage key");

        try {
            Files.createDirectories(path.getParent());
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, path, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to store photo", ex);
        }

        int pos = (int) repo.countByUserId(userId);
        String url = props.publicBaseUrl() + "/" + key;
        return view(repo.save(new Photo(UUID.randomUUID(), userId, url, key, pos)));
    }

    @Transactional(readOnly = true)
    public List<PhotoView> list(UUID userId) {
        return repo.findAllByUserIdOrderByPositionAsc(userId).stream().map(MediaService::view).toList();
    }

    @Transactional(readOnly = true)
    public Map<UUID, List<PhotoView>> listBatch(Set<UUID> userIds) {
        if (userIds == null || userIds.isEmpty()) return Map.of();
        if (userIds.size() > 100) throw new IllegalArgumentException("Maximum of 100 users per photo batch");

        return repo.findAllByUserIdIn(userIds).stream()
            .sorted(Comparator.comparing(Photo::userId).thenComparingInt(Photo::position))
            .collect(Collectors.groupingBy(
                Photo::userId,
                LinkedHashMap::new,
                Collectors.mapping(MediaService::view, Collectors.toList())
            ));
    }

    @Transactional
    public void delete(UUID userId, UUID photoId) {
        Photo p = repo.findById(photoId).orElseThrow(() -> new ResourceNotFoundException("Photo not found"));
        if (!p.userId().equals(userId)) throw new ForbiddenException("Not your photo");
        repo.delete(p);
        try {
            Files.deleteIfExists(Path.of(props.directory()).resolve(p.key()));
        } catch (IOException ignored) {}
    }

    private static PhotoView view(Photo p) {
        return new PhotoView(p.id(), p.url(), p.position());
    }

    public record PhotoView(UUID id, String url, int position) {}
}
