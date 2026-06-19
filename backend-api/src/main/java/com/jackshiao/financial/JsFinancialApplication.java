package com.jackshiao.financial;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class JsFinancialApplication {

	public static void main(String[] args) {
		SpringApplication.run(JsFinancialApplication.class, args);
	}

}
