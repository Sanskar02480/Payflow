package com.payflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * Entry point. @SpringBootApplication = component scan + auto-config + @Configuration.
 * Equivalent to "const app = express(); app.listen(8080)" in Node.
 */
@SpringBootApplication
@EnableTransactionManagement
@EnableAsync
public class PayflowApplication {
    public static void main(String[] args) {
        SpringApplication.run(PayflowApplication.class, args);
    }
}
