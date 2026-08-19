package com.himeros.recommendation;

import com.himeros.profile.ProfileQuery;

final class DistanceCalculator {
    private DistanceCalculator() {}

    static Double km(ProfileQuery.ProfileView a, ProfileQuery.ProfileView b) {
        if (a.latitude() == null || a.longitude() == null || b.latitude() == null || b.longitude() == null) return null;
        double radiusKm = 6371.0088;
        double dLat = Math.toRadians(b.latitude() - a.latitude());
        double dLon = Math.toRadians(b.longitude() - a.longitude());
        double h = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(a.latitude())) * Math.cos(Math.toRadians(b.latitude()))
            * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return radiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    }
}
