package com.himeros.recommendation;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "himeros.discovery")
public class RecommendationProperties {
    private int poolSize = 1000;
    private int poolMultiplier = 20;
    private int nonStrictRadiusKm = 250;
    private int maxRetrievalRadiusKm = 1000;
    private Duration cacheTtl = Duration.ofSeconds(45);
    private Duration unmatchCooldown = Duration.ofDays(90);
    private int coldStartInteractions = 20;
    private int implicitHistoryLimit = 200;
    private int newProfileDays = 7;
    private double newProfileShare = 0.10;
    private double explorationShare = 0.05;
    private double diversificationPenalty = 0.12;
    private boolean explainEnabled = false;

    public int getPoolSize() { return poolSize; }
    public void setPoolSize(int poolSize) { this.poolSize = poolSize; }
    public int getPoolMultiplier() { return poolMultiplier; }
    public void setPoolMultiplier(int poolMultiplier) { this.poolMultiplier = poolMultiplier; }
    public int getNonStrictRadiusKm() { return nonStrictRadiusKm; }
    public void setNonStrictRadiusKm(int nonStrictRadiusKm) { this.nonStrictRadiusKm = nonStrictRadiusKm; }
    public int getMaxRetrievalRadiusKm() { return maxRetrievalRadiusKm; }
    public void setMaxRetrievalRadiusKm(int maxRetrievalRadiusKm) { this.maxRetrievalRadiusKm = maxRetrievalRadiusKm; }
    public Duration getCacheTtl() { return cacheTtl; }
    public void setCacheTtl(Duration cacheTtl) { this.cacheTtl = cacheTtl; }
    public Duration getUnmatchCooldown() { return unmatchCooldown; }
    public void setUnmatchCooldown(Duration unmatchCooldown) { this.unmatchCooldown = unmatchCooldown; }
    public int getColdStartInteractions() { return coldStartInteractions; }
    public void setColdStartInteractions(int coldStartInteractions) { this.coldStartInteractions = coldStartInteractions; }
    public int getImplicitHistoryLimit() { return implicitHistoryLimit; }
    public void setImplicitHistoryLimit(int implicitHistoryLimit) { this.implicitHistoryLimit = implicitHistoryLimit; }
    public int getNewProfileDays() { return newProfileDays; }
    public void setNewProfileDays(int newProfileDays) { this.newProfileDays = newProfileDays; }
    public double getNewProfileShare() { return newProfileShare; }
    public void setNewProfileShare(double newProfileShare) { this.newProfileShare = newProfileShare; }
    public double getExplorationShare() { return explorationShare; }
    public void setExplorationShare(double explorationShare) { this.explorationShare = explorationShare; }
    public double getDiversificationPenalty() { return diversificationPenalty; }
    public void setDiversificationPenalty(double diversificationPenalty) { this.diversificationPenalty = diversificationPenalty; }
    public boolean isExplainEnabled() { return explainEnabled; }
    public void setExplainEnabled(boolean explainEnabled) { this.explainEnabled = explainEnabled; }
}
