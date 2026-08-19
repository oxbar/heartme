package com.himeros.recommendation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;

class ImplicitPreferenceServiceTest {
    @Test
    void behaviorWeightsStayExplicitAndExplainable() {
        assertEquals(0.05, ImplicitPreferenceService.signalWeight(BehaviorSignalType.VIEW));
        assertEquals(1.00, ImplicitPreferenceService.signalWeight(BehaviorSignalType.LIKE));
        assertEquals(2.00, ImplicitPreferenceService.signalWeight(BehaviorSignalType.SUPER_LIKE));
        assertEquals(3.00, ImplicitPreferenceService.signalWeight(BehaviorSignalType.MATCH));
        assertEquals(4.00, ImplicitPreferenceService.signalWeight(BehaviorSignalType.MESSAGE));
        assertEquals(6.00, ImplicitPreferenceService.signalWeight(BehaviorSignalType.CONVERSATION));
        assertEquals(-0.50, ImplicitPreferenceService.signalWeight(BehaviorSignalType.PASS));
        assertEquals(-3.00, ImplicitPreferenceService.signalWeight(BehaviorSignalType.UNMATCH));
        assertEquals(-8.00, ImplicitPreferenceService.signalWeight(BehaviorSignalType.BLOCK));
        assertEquals(-10.00, ImplicitPreferenceService.signalWeight(BehaviorSignalType.REPORT));
    }
}
