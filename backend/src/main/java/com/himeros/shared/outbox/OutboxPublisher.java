package com.himeros.shared.outbox;

import java.time.Duration;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.springframework.data.domain.PageRequest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class OutboxPublisher {
    private final OutboxRepository repo; private final KafkaTemplate<String,String> kafka;
    public OutboxPublisher(OutboxRepository repo, KafkaTemplate<String,String> kafka){this.repo=repo;this.kafka=kafka;}

    @Scheduled(fixedDelayString="${himeros.outbox.fixed-delay-ms:1000}")
    @Transactional
    public void publishBatch() {
        for (OutboxEvent event : repo.lockPending(OutboxEvent.Status.PENDING, PageRequest.of(0,50))) {
            try {
                ProducerRecord<String,String> record=new ProducerRecord<>(event.getTopic(),event.getMessageKey(),event.getPayloadJson());
                record.headers().add("himeros-event-id", event.getId().toString().getBytes());
                kafka.send(record).get(Duration.ofSeconds(5).toMillis(), java.util.concurrent.TimeUnit.MILLISECONDS);
                event.published();
            } catch (Exception ex) { event.failed(ex.getMessage()); }
        }
    }
}
